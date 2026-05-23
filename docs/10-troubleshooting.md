# 10 — Troubleshooting & FAQ

Kumpulan masalah umum, cara cek, dan solusinya.

## Setup & Docker

### Container `envault-backend` keluar dengan error `composer install`

Gejala: log build menampilkan `Your requirements could not be resolved to an installable set of packages`.

Penyebab: PHP minor version mismatch atau ekstensi PHP belum cukup.

Solusi:
- Pastikan tidak override base image. Project pakai `php:8.4-fpm`.
- Hapus `composer.lock` lokal (di `website/backend/`) hanya kalau Anda yakin ingin re-resolve dependency.

### Backend boot tapi langsung error `Class "..." not found`

Gejala: log Laravel mengeluh class autoload-nya hilang setelah `composer.json` diubah.

Penyebab: named volume `backend-vendor` masih berisi vendor lama dari image sebelumnya.

Solusi:
```bash
docker compose down
docker volume rm envault_backend-vendor   # nama bisa berbeda; cek `docker volume ls`
docker compose up -d --build envault-backend envault-worker
```

### Frontend mengeluh `Cannot find module 'next'`

Gejala: `encenter-frontend` log menampilkan module not found setelah update `package.json`.

Penyebab: named volume `frontend-node-modules` masih membawa dependency lama.

Solusi:
```bash
docker compose down
docker volume rm envault_frontend-node-modules
docker compose up -d --build encenter-frontend
```

### Error `network web-network not found`

```bash
docker network create web-network
docker compose up -d
```

### Database `envault` tidak ada saat `php artisan migrate`

Penyebab: volume Postgres (`./evolution/postgres`) sudah pernah di-init sebelum `postgres/init/01-create-envault-db.sql` ditambahkan, sehingga init script tidak dieksekusi ulang.

Solusi:
- Buat manual: `docker exec -it evolution-postgres psql -U evolution -c "CREATE DATABASE envault; CREATE USER envault WITH PASSWORD 'envault'; GRANT ALL ON DATABASE envault TO envault;"`
- Atau (kalau aman): `docker compose down`, hapus folder `evolution/postgres/`, lalu `docker compose up -d` agar init script jalan dari nol.

### Frontend tidak bisa konek ke backend (`http://localhost:8000` ECONNREFUSED dari container)

Penyebab: di dalam container Docker, `localhost` adalah container itu sendiri.

Solusi:
- Untuk komunikasi server-to-server di stack, pakai hostname service (`envault-nginx`, bukan `localhost`).
- Untuk frontend yang dijalankan di browser host, `localhost:8000` benar.
- Variabel `NEXT_PUBLIC_API_URL` dievaluasi saat build/dev — pastikan match dengan apa yang browser bisa jangkau.

### Frontend dev server tidak refresh saat file berubah

Project sudah mengaktifkan `WATCHPACK_POLLING=true` dan `CHOKIDAR_USEPOLLING=true` di `.env` root + `next.config.ts` polling. Bind mount `./website/frontend:/app` juga sudah ada di compose. Kalau masih tidak refresh:

```bash
docker compose restart encenter-frontend
```

Jika baru mengubah `package.json`, butuh rebuild image (lihat troubleshooting "Cannot find module 'next'" di atas).

### Port bentrok (3000, 8000, 5678, 8080, 8081)

Edit `docker-compose.yml` bagian `ports`, lalu `docker compose up -d`.

## Auth & Login

### Login mengembalikan "Unauthenticated."

- Cek apakah token Bearer dikirim. Helper `apiFetch` membaca `localStorage[AUTH_TOKEN_STORAGE_KEY]` (key default `auth_token`). Coba `console.log(localStorage.getItem('auth_token'))` di devtools, atau dari komponen pakai `useAuth()` lalu inspect `isAuthenticated` / `user`.
- Cek `SANCTUM_STATEFUL_DOMAINS` di backend `.env` jika pakai cookie session.
- Pastikan APP_KEY backend tidak berubah (token decryption bisa terganggu).

### Lupa password admin default

```bash
docker exec -it envault-backend php artisan tinker
>>> $u = App\Models\User::where('email', 'admin@encenter.com')->first();
>>> $u->password = Hash::make('PasswordBaru123');
>>> $u->save();
```

### Token Sanctum aktif tidak bisa logout

Token tidak otomatis expire. Untuk revoke manual:

```php
$user->tokens()->delete();           // semua token
$user->currentAccessToken()->delete(); // token aktif saat request
```

## Backup Engine

### Backup status `failed` — `Backup failed resulting in an empty file`

Penyebab: `mysqldump` di server target gagal (akses ditolak, db tidak ada, mysql client tidak terinstall).

Cek:
- SSH ke server target, jalankan command yang sama secara manual.
- Lihat `error_message` di tabel `backup_jobs` (Laravel sudah ambil log dari `/tmp/dump_err_*.log`).

### Backup status `failed` — `SSH Connection failed: ...`

Penyebab umum:
- Firewall menutup port 22 dari VPS EnCenter.
- Username/password berubah di server target.
- Private key Anda di-protect passphrase yang salah.

Cek dengan tombol "Test Connection" di halaman server. Update kredensial bila perlu.

### Backup `failed` — `No active Google Drive storage found`

Pergi ke `/admin/storage` dan klik **CONNECT NOW**. Pastikan field `is_active` true di `user_storages`.

### Backup `failed` — `Storage Quota Exceeded`

Drive user penuh. Bersihkan manual atau panggil `POST /storage/google/cleanup`.

### Backup butuh waktu sangat lama

- File besar (multi-GB) akan pakai chunked upload 20MB/chunk. Wajar bila durasi mencapai puluhan menit.
- `RunBackupJob::$timeout = 0` (tanpa batas), jadi worker tidak akan kill job.
- Pantau via halaman `/admin/backups` (auto-refresh tiap 10 detik).
- Untuk database raksasa, pertimbangkan VPS dengan koneksi keluar yang cepat dan disk lokal cukup.

### Multi-DB backup hanya menghasilkan beberapa file

Pola `mysqldump` versi multi-DB akan dump per database (kecuali `information_schema`, `performance_schema`, `mysql`, `sys`), lalu `tar -czf` ke satu file. Kalau ada DB yang gagal, log akan masuk ke `/tmp/dump_err_*.log`. Cek log itu via `cat /tmp/dump_err_<rand>.log` di server target.

### Worker tidak memproses job

```bash
docker compose ps              # cek envault-worker running?
docker logs -f envault-worker
```

Restart kalau stuck:

```bash
docker compose restart envault-worker
```

Pastikan `QUEUE_CONNECTION=database` di backend `.env`, dan tabel `jobs` ada (migrasi `0001_01_01_000002_create_jobs_table.php`).

## Webhook & Notifikasi

### n8n menerima webhook tapi signature tidak cocok

- Pastikan secret di n8n function node = `secret_key` setting webhook (bukan secret lain).
- Hash dihitung dari raw body JSON. Jangan ubah/sort key sebelum hash.
- Header signature memiliki prefix `hmac-sha256=` — strip dulu sebelum compare.

### Webhook tidak terkirim untuk event tertentu

- Cek `events` di setting webhook (`/admin/webhooks`). Harus mencakup event yang dipancarkan (`backup.success`, `backup.failed`).
- Cek `is_active = true`.
- Cek log Laravel:
  ```bash
  docker exec envault-worker php artisan pail
  ```

### "Test Webhook" status non-200

- Endpoint receiver harus return 2xx. n8n webhook node default sudah 200 ketika "Respond Immediately".
- Test mengirim `event=test` payload langsung — gagal di sini biasanya berarti endpoint tidak reachable dari container backend.
- Jika reachable: cek timeout (default 10s).

## Google Drive

### "Failed to refresh Google token"

- Refresh token mungkin di-revoke (user mencabut akses di Google Account).
- Reconnect: `/admin/storage` → Disconnect → Connect Now.
- Pastikan scope `drive.file` masih disetujui.

### File backup naik tapi tidak terlihat di Drive UI

- Cek folder yang benar: default `EnCenter_Backups/<YYYYMMDD>/`.
- Kalau nama folder di-customize lewat menu Cloud Storage, file masuk ke folder yang baru.
- Folder root ID tersimpan di `user_storages.folder_id`.

### Cleanup tidak menghapus folder

- Cleanup hanya menghapus folder yang **namanya sesuai pola `YYYYMMDD`** dan lebih lama dari `cutoffDate`. Folder dengan nama lain (mis. yang dibuat manual) diabaikan.

## phpMyAdmin

### Tombol "Open in phpMyAdmin" memunculkan halaman login phpMyAdmin (bukan auto-login)

- Cek `NEXT_PUBLIC_PMA_URL` di env frontend menunjuk ke URL yang benar.
- Pastikan container `encenter-phpmyadmin` running (`docker compose ps`).
- Custom file `phpmyadmin/autologin.php` harus ada di image. Build ulang phpmyadmin kalau hilang.
- Cek browser console untuk error mixed-content (HTTPS frontend mengirim ke HTTP phpMyAdmin akan diblokir).

### "Missing login parameters" di phpMyAdmin

- Frontend tidak mengirim `pma_username` / `pma_servername`. Cek struktur form POST di kode (`handleOpenPma`).

### phpMyAdmin tidak bisa connect ke server target

- `AllowArbitraryServer = true` aktif.
- Server target harus bisa diakses dari container phpMyAdmin (network publik, atau via VPN).
- Pastikan port MySQL terbuka untuk IP VPS Anda.

## Database

### Migrasi gagal: `relation "users" already exists`

Database sudah ada data. Pilihan:
- `php artisan migrate:status` untuk lihat state.
- Drop database lalu `php artisan migrate --seed` (kehilangan semua data).
- Atau pakai `php artisan migrate --force` jika tabel migration history sudah konsisten.

### Foreign key error saat delete server group

Pastikan tidak ada server yang masih `group_id = <id>`. UI default akan mengubah `group_id` jadi NULL via `ON DELETE SET NULL`, namun pesan error frontend memberi tahu user kalau gagal — biasanya karena migration belum dijalankan.

### Performa lambat di tabel `activity_logs`

Tabel bisa jadi sangat besar. Solusi:
- Purge berkala via `/admin/audit` (Purge Old Logs).
- Atau jadwalkan cron yang panggil `POST /audit-logs/purge` dengan `older_than_days=30`.

## Frontend

### `Module not found` setelah update Next.js

- Hapus `node_modules` dan `.next`, lalu `pnpm install` ulang.
- Cek `eslint-config-next` versi sama dengan `next`.

### Halaman `/admin/...` reload terus / kembali ke `/login`

- Token di `localStorage` tidak ada atau invalid → `AuthProvider` redirect ke `/login`.
- API balas 401 → `apiFetch` dispatch `AUTH_UNAUTHORIZED_EVENT` → context tangkap → redirect ke `/login`.
- Login ulang. Kalau masih berulang, cek tab lain juga: tab sync via event `storage` membuat logout di tab manapun langsung mengusir tab aktif.

### Cmd+K palette kosong

- Cek API `/servers` dan `/database-connections` mengembalikan 200.
- Buka devtools network tab.

## Performance & Scaling

### Worker tampak idle, tapi backup queued lama

- Default `QUEUE_CONNECTION=database` artinya worker polling table `jobs`. Kalau Postgres sibuk, ada delay 1–2 detik per polling. Tidak masalah untuk volume kecil.
- Untuk load tinggi: ganti ke Redis queue. Update `QUEUE_CONNECTION=redis` dan jalankan `php artisan queue:restart` di worker.

### Skala worker

Tambahkan service `envault-worker-2`, `envault-worker-3` di compose dengan command sama. Hati-hati: kalau dua worker memproses backup bersamaan untuk DB yang sama, file Drive bisa duplikat.

## OpenClaw / n8n / Evolution

### n8n webhook URL kena CORS

- n8n tidak butuh CORS untuk receive webhook. Kalau dari browser → tambahkan setting CORS di n8n env.

### Evolution API minta scan QR ulang

- Sesi WA expired. Buka panel Evolution di `:8080`, generate QR baru, scan dari handphone admin.
- Backup ulang folder `evolution/instances/` setelah berhasil pairing.

### OpenClaw gateway tidak respond

- Bind default `lan`. Pastikan client mengakses IP LAN VPS, bukan loopback.
- Cek log: `docker logs -f encenter-openclaw`.

## Cara Mendapatkan Bantuan

- Cek dokumentasi terkait di folder `docs/`.
- Lihat `/admin/audit` untuk jejak aksi terakhir.
- Reproduksi minimal di environment lokal sebelum debug di production.
- Cek isu di repo (issue tracker GitHub kalau project sudah dipublish).

## Logging Cheatsheet

```bash
# Backend Laravel
docker exec envault-backend php artisan pail        # streaming log via Pail
docker exec envault-backend tail -f storage/logs/laravel.log

# Worker
docker logs -f envault-worker

# Nginx
docker logs -f envault-nginx

# Frontend
docker logs -f encenter-frontend

# n8n
docker logs -f encenter-n8n

# Evolution
docker logs -f encenter-evolution
```

---

[← Sebelumnya: Security](09-security.md) · [Kembali ke Home](README.md) · [Selanjutnya: API Documentation →](api-documentation.md)
