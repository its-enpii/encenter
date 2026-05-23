# 01 — Overview

## Apa itu EnCenter / EnVault

**EnCenter** (sering juga disebut **EnVault**) adalah aplikasi self-hosted yang menggabungkan empat fungsi utama dalam satu paket:

1. **Credential Vault** — penyimpanan terenkripsi untuk kredensial SSH server dan koneksi database.
2. **Server Control Center** — dashboard web untuk memantau dan mengelola server fleet.
3. **Backup Engine** — eksekusi `mysqldump` jarak jauh via SSH, kompresi `gzip`, dan upload otomatis ke Google Drive (dengan struktur folder per tanggal).
4. **Notification Hub** — webhook bertanda HMAC-SHA256 yang memancarkan event ke n8n, lalu diteruskan ke WhatsApp.

## Tujuan dan Filosofi

- **VPS hanya execution engine.** Semua data sumber kebenaran (kredensial, log) tetap aman di Postgres + Google Drive. Jika VPS mati, sistem dapat dihidupkan kembali tanpa kehilangan data selama `APP_KEY` masih ada.
- **API-first.** Semua fitur diekspos melalui REST API, sehingga dapat dipanggil dari frontend Next.js atau dari workflow n8n.
- **Encrypt everything.** Semua field sensitif (password, private key, token OAuth, secret webhook) dienkripsi `AES-256-CBC` melalui Laravel Crypt sebelum masuk ke database.
- **Zero scheduler internal.** Laravel tidak menjalankan cron sendiri. Trigger backup datang dari luar (manual lewat dashboard atau lewat scheduler n8n).

## Fitur Utama

### Credential Vault
- CRUD server SSH (host, port, username, password atau private key + passphrase).
- CRUD database connection (MySQL, MariaDB, PostgreSQL).
- Pengelompokan server (Server Groups) dengan label warna.
- Decryption on-demand dengan modal "Reveal Credential" beserta tombol copy & toggle visibility.
- Test SSH (handshake `phpseclib`) dan test database (`mysqladmin ping`, `pg_isready`) langsung dari UI.

### Backup Engine
- Trigger manual lewat tombol di vault, atau dispatch via API.
- Mendukung backup database tunggal (`.sql.gz`) atau **semua** database dalam satu server (dibundel ke `.tar.gz`).
- Job dijalankan di queue worker (`envault-worker`) sehingga request HTTP tidak time-out untuk dump berukuran besar.
- Resumable upload chunk 20MB ke Google Drive untuk database 3GB+.
- Folder Google Drive dibuat otomatis: `<root>/<YYYYMMDD>/<file>`.
- Cleanup endpoint untuk menghapus folder yang lebih tua dari N hari.

### Webhook & Notifikasi
- Multiple webhook per user (mis. n8n production + n8n staging).
- Setiap event ditandai HMAC-SHA256 di header `X-Webhook-Signature`.
- Dukungan event: `backup.success`, `backup.failed`, `test`.
- Optional `target_whatsapp_id` per webhook (group JID atau nomor pribadi).

### Audit Log
- Semua aksi sensitif (REGISTER, UPDATE, DELETE, VIEW_CREDENTIALS, VAULT_*, TEST_CONNECTION, PURGE) dicatat ke tabel `activity_logs`.
- Disertai metadata `user_agent`, `status_code`, `ip_address`.
- Bisa di-purge dengan retention window (7/30/90/180/365 hari, atau ALL).

### Integrasi phpMyAdmin
- phpMyAdmin di-Dockerize sendiri dengan custom `autologin.php` yang menerima POST kredensial dari frontend dan auto-login ke server target tanpa menampilkan kredensial di URL.

### Layanan Pendukung
- **n8n** — automation engine untuk scheduler dan WhatsApp dispatch.
- **Evolution API** — bridge ke WhatsApp Web (Postgres + Redis).
- **OpenClaw** — gateway agent (port 18789).

## Arsitektur Tingkat Tinggi

```
                ┌──────────────────────────────┐
                │     Browser / WhatsApp       │
                └──────┬───────────────────┬───┘
                       │ HTTPS              │ inbound msg
                       ▼                    ▼
   ┌──────────────────────────┐    ┌────────────────────┐
   │     Next.js Frontend     │    │   Evolution API    │
   │      (port 3000)         │    │    (port 8080)     │
   └──────────────┬───────────┘    └─────────┬──────────┘
                  │ REST /api/v1             │
                  ▼                          │
       ┌─────────────────────┐               │
       │  Nginx (port 8000)  │               │
       └──────────┬──────────┘               │
                  │ FastCGI                   │
                  ▼                          │
       ┌─────────────────────┐               │
       │   Laravel Backend   │               │
       │   (PHP-FPM 8.4)     │               │
       └────┬─────────┬──────┘               │
            │ Queue   │ HTTP                  │
            │         │ webhook               │
            ▼         ▼                       │
   ┌───────────────┐  ┌────────────────┐      │
   │ envault-worker│  │   n8n (5678)   │◄─────┘
   │ (RunBackupJob)│  └────────┬───────┘
   └───┬─────┬─────┘           │
       │     │ Google Drive    │ outbound msg
       │     ▼ API             ▼
       │  ┌──────────┐      ┌────────────────┐
       │  │  GDrive  │      │ Evolution API  │ ──► WhatsApp
       │  └──────────┘      └────────────────┘
       │
       │ SSH (phpseclib)
       ▼
   ┌─────────────────────┐
   │  Remote Servers     │
   │  (mysqldump target) │
   └─────────────────────┘
```

## Alur Backup End-to-End

1. **Trigger** — User klik tombol "Run Backup" di `/admin/vault`, atau n8n memanggil `POST /api/v1/backups/run`.
2. **Dispatch** — Backend membuat record `backup_jobs` (status `pending`) dan dispatch `RunBackupJob` ke queue.
3. **Worker** — Container `envault-worker` mengambil job, memperbarui status menjadi `running`.
4. **SSH Connect** — Decrypt kredensial server, buka SSH/SFTP ke target via `phpseclib`.
5. **Dump** — Eksekusi `mysqldump --single-transaction --quick --skip-lock-tables` yang dipipa ke `gzip`. Untuk mode "all databases", bundle hasilnya ke `.tar.gz`.
6. **Download** — Tarik file `.sql.gz` / `.tar.gz` via SFTP ke `storage/app/backups/`.
7. **Validasi** — Pastikan ukuran > 100 byte (gzip kosong = 20 byte). Jika gagal, ambil error log dari remote.
8. **Upload** — Resumable upload ke Google Drive di subfolder `<YYYYMMDD>` di bawah folder root user.
9. **Update** — Update status `success` (atau `failed`), simpan `gdrive_file_url`, durasi.
10. **Webhook** — Dispatch `WebhookService` ke semua endpoint user yang berlangganan event tersebut.
11. **Cleanup** — Hapus file remote `/tmp/...` dan file lokal `storage/app/backups/...`.

## Versi Saat Ini

Berdasarkan halaman Settings dashboard:
- **Version:** v1.0.0-beta
- **Roadmap status:** Phase 1–5 sudah selesai sesuai `developer-guide.md`.
