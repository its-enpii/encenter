# 08 — Cloud Storage (Google Drive)

Halaman **Cloud Storage** adalah tempat Anda menghubungkan akun Google Drive sebagai tujuan upload backup. Tanpa koneksi ini, backup bisa dijalankan tapi akan gagal di tahap upload.

Akses lewat **Sidebar → Cloud Storage**.

## Status Koneksi

Halaman menampilkan kartu utama "Primary Storage Provider" dengan dua kemungkinan kondisi:

### Belum Terhubung
- Ikon X abu-abu.
- Label "NOT CONNECTED".
- Tombol **CONNECT NOW** di kanan.

### Sudah Terhubung
- Ikon check hijau.
- Label "CONNECTED" dengan email akun Google.
- Tombol **DISCONNECT** di kanan.

## Menghubungkan Google Drive

> **Prasyarat:** Administrator Anda harus sudah membuat **Google OAuth client** di Google Cloud Console dan mengisi `GOOGLE_DRIVE_CLIENT_ID` + `GOOGLE_DRIVE_CLIENT_SECRET` di backend `.env`. Kalau belum, tombol Connect akan gagal dengan error "Could not initialize Google OAuth flow".

Langkah penghubungan:

1. Klik **CONNECT NOW**.
2. Browser akan redirect ke halaman consent Google.
3. Pilih akun Google yang ingin Anda pakai sebagai tujuan backup.
4. Beri izin yang diminta:
   - **Lihat, edit, buat, dan hapus file Google Drive Anda** — diperlukan untuk upload dan cleanup.
5. Setelah Anda klik "Allow", Google akan redirect kembali ke EnCenter (`/admin/storage/callback?code=...`).
6. EnCenter menukar `code` dengan token akses.
7. Halaman menampilkan "Linked successfully" lalu redirect kembali ke `/admin/storage` dalam 2 detik.

> Pakai akun Google yang **dedicated untuk backup**, bukan akun personal Anda. Kalau bisa, akun Workspace dengan storage 100GB+. Akun gratis hanya 15GB.

## Konfigurasi Detail

Setelah terhubung, di bagian "Configuration Details" muncul dua kartu:

### Target Folder
Folder root di Google Drive tempat semua backup disimpan. Default: `EnCenter_Backups`.

Cara mengubah:
1. Klik kartu Target Folder. Tampilan berubah jadi input field.
2. Edit nama folder.
3. Tekan **Enter** atau klik di luar field untuk simpan.

> Folder akan dibuat otomatis kalau belum ada. Mengubah nama hanya berlaku untuk backup **berikutnya** — backup lama tetap di folder dengan nama lama.

Struktur folder yang akan dibuat:

```
EnCenter_Backups/
├── 20260524/
│   ├── prod-wordpress-20260524-030001.sql.gz
│   └── prod-shop-20260524-030045.sql.gz
├── 20260525/
│   └── ...
└── 20260526/
    └── ...
```

Subfolder per tanggal (`YYYYMMDD`) dibuat otomatis saat job backup berjalan.

### Retention Policy
Saat ini text-only display: "Keep last 30 backups". **Ini bukan setting aktif** — EnCenter tidak menjalankan cleanup otomatis di versi sekarang.

Untuk cleanup nyata, pakai endpoint `DELETE /storage/cleanup?older_than_days=N` lewat workflow n8n.

## Memutus Koneksi

Klik **DISCONNECT** di kartu utama. Dialog konfirmasi muncul: **"Disconnect Google Drive?"**.

> **Yang terjadi setelah disconnect:**
> - Token OAuth dihapus dari database EnCenter.
> - Backup yang sudah ada di Google Drive **tidak ikut terhapus** — tetap aman di akun Anda.
> - Backup berikutnya akan **gagal** di tahap upload sampai Anda connect ulang.

Klik **Disconnect** untuk konfirmasi.

## Mengganti Akun Google

Tidak ada tombol "Switch Account" terpisah. Caranya:

1. Klik **DISCONNECT** untuk akun lama.
2. Klik **CONNECT NOW** lagi.
3. Login dengan akun Google yang baru.
4. Konfirmasi consent.

> Backup di akun lama tidak ter-migrate. Mereka tetap di sana sampai Anda hapus manual.

## Memantau Quota

EnCenter **tidak menampilkan sisa storage Google Drive** di halaman ini. Untuk memantau:

- Buka [drive.google.com](https://drive.google.com) langsung dengan akun yang dipakai.
- Lihat di pojok kiri bawah ("X GB used of Y GB").

Kalau quota penuh, backup akan gagal dengan pesan `quotaExceeded`. Solusi:

- Hapus backup lama secara manual atau lewat cleanup endpoint.
- Upgrade plan Google ke Workspace dengan storage lebih besar.
- Ganti ke akun lain dengan storage cukup.

## Token Refresh

OAuth token Google ada dua macam:
- **Access token** — masa berlaku ~1 jam.
- **Refresh token** — masa berlaku panjang (sampai user revoke dari [myaccount.google.com](https://myaccount.google.com/permissions)).

EnCenter menyimpan refresh token dan otomatis mengambil access token baru kalau yang lama kedaluwarsa. Anda **tidak perlu** re-connect rutin.

Re-connect hanya diperlukan kalau:

- User Google revoke izin dari halaman permissions Google.
- Refresh token rusak (jarang).
- Anda ganti `GOOGLE_DRIVE_CLIENT_ID` di backend.

## Troubleshooting

### "Could not initialize Google OAuth flow"
Backend `.env` tidak punya `GOOGLE_DRIVE_CLIENT_ID` atau `GOOGLE_DRIVE_CLIENT_SECRET`. Hubungi administrator.

### Sudah klik CONNECT NOW tapi balik ke EnCenter dengan error
- Pastikan **Authorized redirect URI** di Google Cloud Console persis sama dengan yang di-set di EnCenter (`<frontend-url>/admin/storage/callback`).
- Pastikan akun yang Anda pilih punya akses Drive (bukan akun yang di-disable).

### Backup berhenti di status "running" tanpa pernah selesai
Biasanya bukan masalah Google Drive, tapi worker backend mati. Hubungi administrator untuk cek `docker logs envault-worker`.

### "Insufficient Permission" saat upload
Re-connect dan pastikan saat consent Anda meng-allow scope `drive.file` (Google biasanya minta sekali).

---

[← Sebelumnya: Backup](07-backup.md) · [Kembali ke Daftar Isi](README.md) · [Selanjutnya: Webhooks & Notifikasi →](09-webhooks-notifikasi.md)
