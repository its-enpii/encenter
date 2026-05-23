# 03 — Architecture

## Topologi Service

EnCenter berjalan di dalam 2 Docker network:

- **`agent-network`** — internal bridge yang dibuat compose. Berisi seluruh container project.
- **`web-network`** — external network. Memungkinkan reverse proxy/ingress eksternal terhubung ke service tertentu.

```
┌───────────────────────────────  web-network  ──────────────────────────────┐
│                                                                            │
│  envault-nginx          encenter-frontend         encenter-phpmyadmin      │
│  (8000)                 (3000)                    (8081)                   │
│      │                       │                          │                  │
│      ▼                       │                          ▼                  │
│  ┌─────────────────────────  agent-network  ──────────────────────────┐    │
│  │                                                                    │    │
│  │  envault-backend ──► envault-worker ──► postgres                   │    │
│  │       │                                                            │    │
│  │       └──► n8n ◄── encenter-evolution ──► redis                    │    │
│  │                                                                    │    │
│  │  encenter-openclaw                                                 │    │
│  │                                                                    │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────────┘
```

## Komponen Utama

### envault-backend (Laravel API)
- Image dibuild dari `website/backend/Dockerfile` — `php:8.4-fpm`.
- Ekstensi PHP: `pdo_pgsql`, `pdo_mysql`, `pgsql`, `gd`, `zip`, `intl`.
- Dependency vendor di-install dengan `composer install --no-dev --optimize-autoloader` saat build.
- Listen di port `9000` (FastCGI), tidak di-expose ke host. Dilayani oleh `envault-nginx`.

### envault-worker
- Image yang sama dengan backend.
- Menjalankan `php artisan queue:work --verbose --tries=3 --timeout=600`.
- Wajib hidup terus karena `RunBackupJob` dieksekusi di sini.

### envault-nginx
- Image `nginx:alpine`.
- Konfigurasi di `website/backend/nginx.conf`:
  - Document root: `/var/www/html/public`.
  - Forward request `*.php` ke `envault-backend:9000` via FastCGI.
  - Mount volume backend untuk akses file statis di `public/`.

### encenter-frontend
- Image dibuild dari `website/frontend/Dockerfile` — `node:26-alpine`.
- Manager package: `pnpm` dengan `node-linker=hoisted`.
- Mode dev: `pnpm dev` (Next dev server dengan `--webpack`).
- Mode prod: `pnpm build` lalu `pnpm start`.

### postgres + redis
- Postgres image `postgres:15`. Dipakai bersama Evolution API (`evolution` database) — bisa juga jadi tempat database EnCenter sendiri.
- Redis image `redis:7`, dipakai Evolution untuk cache.

### encenter-evolution
- Bridge WhatsApp Web. Auth via API key (`AUTHENTICATION_API_KEY`).
- Backed by Postgres (`DATABASE_PROVIDER=postgresql`) dan Redis cache.

### encenter-n8n
- Image official `docker.n8n.io/n8nio/n8n`.
- Volume `./n8n/data` (gitignored) untuk database & workflows.
- Community packages enabled.

### encenter-phpmyadmin
- Custom build di `phpmyadmin/Dockerfile`.
- Berbasis `php:8.3-apache` + ekstensi `mysqli`, `mbstring`, `zip`, `xml`.
- Custom `autologin.php` untuk auto-login dari frontend (lihat [07-services.md](07-services.md)).

### encenter-openclaw
- Image custom dari `openclaw/Dockerfile` — `node:24-slim`, `npm i -g openclaw@latest`.
- Listen di port `18789`. Dipakai sebagai gateway untuk AI agent OpenClaw (terhubung ke workspace).

## Pola Autentikasi

Semua endpoint API V1 dilindungi middleware `auth.api` (`App\Http\Middleware\ApiKeyOrSanctum`). Middleware ini menerima dua mekanisme:

1. **Header `X-API-Key`** — cocok dengan `N8N_API_KEY` di backend `.env`. Cocok untuk integrasi n8n / cron eksternal. Ketika cocok, request akan dijalankan sebagai user admin pertama yang `is_active = true`.
2. **Bearer token Sanctum** — token yang dihasilkan endpoint `/api/v1/auth/login` atau `php artisan tinker` (`$user->createToken(...)`). Cocok untuk frontend Next.js dan integrasi eksternal yang lebih granular.

Kalau dua-duanya gagal, response 401 JSON.

## Rate Limiter

Didefinisikan di `App\Providers\AppServiceProvider`:

| Limiter | Kuota |
| --- | --- |
| `api` | 60 req/menit per user atau IP |
| `login` | 5 req/menit per IP |
| `backup` | 10 req/menit per user atau IP |

Diaplikasikan di route `auth/login` (`throttle:login`) dan `backups/run` (`throttle:backup`). Default `throttle:api` diaplikasikan ke semua route API via bootstrap.

## Encryption Layer

`App\Services\EncryptionService` adalah wrapper tipis di atas `Illuminate\Support\Facades\Crypt` (AES-256-CBC menggunakan `APP_KEY`). Tetapi mayoritas enkripsi terjadi otomatis lewat **Eloquent cast `'encrypted'`** pada model:

| Model | Field encrypted |
| --- | --- |
| `Server` | `username`, `password`, `private_key`, `passphrase` |
| `DatabaseConnection` | `db_name`, `db_username`, `db_password` |
| `WebhookSetting` | `webhook_url`, `secret_key` |
| `UserStorage` | `access_token`, `refresh_token` |

Saat read, Eloquent dekripsi otomatis. Saat write, otomatis dienkripsi lagi.

## Audit Log Middleware

`App\Http\Middleware\ActivityLogger` di-attach ke seluruh API stack. Untuk setiap request, ia mencatat:

- `user_id`, `action` (mis. `auth.login`), `resource` (segmen URL ke-2), `resource_id` (route param `{id}`).
- `meta`: HTTP method, user agent, status code.
- `ip_address`.

Tambahan, controller individual juga dapat memanggil `ActivityLog::log(...)` secara eksplisit untuk event semantik (mis. `VAULT_ADD`, `TEST_CONNECTION`, `VIEW_CREDENTIALS`).

## Alur Backup (Detail)

Direkam di `App\Jobs\RunBackupJob`. Ringkasan langkah:

1. Update record `backup_jobs` jadi `running` + `started_at`.
2. Susun nama file:
   - Single DB: `<Label>_<DBName>_<YYYYMMDD_HHmmss>.sql.gz`
   - Multi DB:  `<Label>_ALL_DATABASES_<YYYYMMDD_HHmmss>.tar.gz`
3. Bangun command remote:
   - **Single DB:** `MYSQL_PWD=... mysqldump --single-transaction --quick --skip-lock-tables -h <host> -P <port> -u <user> <db> 2> /tmp/dump_err_<rand>.log | gzip > /tmp/<file>`
   - **Multi DB:** Loop semua database (kecuali system DB) → dump masing-masing ke `/tmp/<rand>/<dbname>.sql.gz` → `tar -czf /tmp/<file> -C /tmp/<rand> .` → hapus folder sementara.
4. Jalankan via `SshService::execute`.
5. Tarik file via `SshService::sftp` ke `storage/app/backups/`.
6. Validasi ukuran > 100 byte. Kalau gagal, ambil `cat /tmp/dump_err_*.log` lalu lempar exception.
7. Update `file_name`, `file_size_bytes`.
8. Cari `UserStorage` (`provider=google_drive`, `is_active=true`).
9. `GoogleDriveService::setAccessToken` — refresh token kalau expired.
10. Pastikan folder root tersedia (`getOrCreateFolderByName`).
11. Pastikan subfolder `<YYYYMMDD>` ada (`getOrCreateSubfolder`).
12. Upload file:
    - File ≤ 5MB: multipart upload sekali jalan.
    - File > 5MB: resumable upload dengan chunk 20MB.
13. Update `status=success`, `gdrive_file_id`, `gdrive_file_url`, `duration_seconds`.
14. `WebhookService::send('backup.success', payload, user)`. Setiap webhook setting yang `is_active` dan event-nya cocok akan dikirim payload bertanda HMAC.
15. Hapus file remote (`/tmp/...`) dan file lokal.

Saat error di tengah jalan, status di-set `failed`, error_message disimpan, dan webhook `backup.failed` dipancarkan.

## Komunikasi Frontend ↔ Backend

- Frontend membaca `NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api/v1`).
- Helper `apiFetch` di `website/frontend/lib/api.ts` membungkus `fetch` dengan:
  - Bearer token dari `localStorage.auth_token`.
  - Header `Content-Type: application/json` + `Accept: application/json`.
  - Auto-redirect ke `/login` jika status 401.
- Token disimpan di `localStorage` setelah login berhasil. Logout meng-hit `/auth/logout` dan menghapus token.

## Komunikasi Frontend ↔ phpMyAdmin

Frontend punya tombol "Open in phpMyAdmin" di vault dan global search. Mekanismenya:

1. Frontend memanggil `GET /database-connections/{id}/reveal` untuk mendapat kredensial decrypt.
2. Frontend membangun `<form>` POST tersembunyi ke `${PMA_URL}/autologin.php` dengan field `pma_username`, `pma_password`, `pma_servername`.
3. `target="_blank"` membuka tab baru.
4. `autologin.php` menyimpan kredensial ke `sessionStorage` browser, lalu redirect ke `index.php` phpMyAdmin yang akan auto-login.

Detail: lihat [07-services.md](07-services.md).

## Komunikasi Backend ↔ n8n

Dua arah:

- **Backend → n8n** (outbound webhook). Diperinci di [api-documentation.md](api-documentation.md) bagian payload webhook.
- **n8n → Backend** (inbound API call). n8n memakai header `X-API-Key` untuk memanggil endpoint `/backups/run`, `/storage/google/cleanup`, dll.

## Persistensi & Volume

| Path host | Container | Tujuan |
| --- | --- | --- |
| `./website/backend` | `/var/www/html` (backend & worker) | Source code Laravel (live mount) |
| named volume `backend-vendor` | `/var/www/html/vendor` (backend & worker) | Mempertahankan vendor hasil `composer install` saat build |
| `./website/backend/nginx.conf` | `/etc/nginx/conf.d/default.conf` | Konfigurasi Nginx |
| `./website/frontend` | `/app` (frontend) | Source code Next.js (live mount) |
| named volume `frontend-node-modules` | `/app/node_modules` (frontend) | Dependency hasil `pnpm install` saat build |
| named volume `frontend-next-cache` | `/app/.next` (frontend) | Build cache supaya tidak konflik dengan host |
| `./n8n/data` | `/home/node/.n8n` | Database SQLite & workflow n8n |
| `./evolution/instances` | `/evolution/instances` | Instance WhatsApp Evolution |
| `./evolution/postgres` | `/var/lib/postgresql/data` | Data Postgres |
| `./postgres/init` | `/docker-entrypoint-initdb.d` (postgres) | Init script (auto-create DB `envault`) — read-only |
| `./openclaw/config` | `/root/.openclaw` | Config OpenClaw |
| `./openclaw/workspace` | `/root/.openclaw/workspace` | Workspace agent |
| `./phpmyadmin` | `/var/www/html` | Source phpMyAdmin (custom) |

`.gitignore` mengabaikan `n8n/data/`, `evolution/instances/`, `evolution/postgres/`, `openclaw/config/` — pastikan backup terpisah jika data ini penting.
