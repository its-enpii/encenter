# 02 — Getting Started

Panduan ini membahas instalasi development dan production dengan Docker Compose.

## Prasyarat

| Tool | Versi minimum | Catatan |
| --- | --- | --- |
| Docker Engine | 24+ | Diperlukan untuk semua service |
| Docker Compose | v2 | Plugin compose terbaru |
| Node.js | 20+ | Hanya jika ingin development frontend lokal |
| pnpm | 10+ | Package manager frontend |
| PHP | 8.3+ | Hanya jika ingin development backend lokal |
| Composer | 2+ | Untuk install dependency Laravel |

> Project ini bisa dijalankan **sepenuhnya via Docker** tanpa perlu PHP atau Node lokal. Versi lokal hanya dibutuhkan kalau Anda mau iterasi cepat di luar container.

## Struktur Folder Penting

```
envault/
├── .env                          # ENV root (n8n, evolution, frontend public vars)
├── .env.example
├── docker-compose.yml            # Definisi seluruh service
├── README.md
├── docs/                         # Dokumentasi project (file ini)
├── .guide/                       # Catatan agent / developer internal
├── website/
│   ├── backend/                  # Laravel 13 API
│   │   ├── .env                  # ENV backend (DB_*, APP_KEY, GOOGLE_DRIVE_*)
│   │   ├── .env.example
│   │   ├── nginx.conf
│   │   ├── Dockerfile
│   │   └── ...
│   └── frontend/                 # Next.js 16 dashboard
│       ├── .env.local.example
│       ├── Dockerfile
│       └── ...
├── phpmyadmin/                   # Custom phpMyAdmin (auto-login)
├── openclaw/                     # OpenClaw gateway
├── n8n/data/                     # Volume persistent n8n
└── evolution/                    # Volume Postgres & instance Evolution API
```

## Instalasi via Docker (Direkomendasikan)

### 1. Clone & masuk ke folder

```bash
git clone <repo-url> envault
cd envault
```

### 2. Setup file environment

Ada **dua** file `.env` yang harus disiapkan:

**Root `.env`** (dipakai docker-compose untuk n8n, Evolution, frontend public vars):

```bash
cp .env.example .env
```

Isinya kira-kira:

```env
# n8n
N8N_HOST=localhost
N8N_PROTOCOL=http
N8N_ENCRYPTION_KEY=<generate-random-32-char>
WEBHOOK_URL=http://localhost:5678/

# Evolution API
EVOLUTION_API_KEY=<generate-random-key>

# Next.js
NODE_ENV=development
WATCHPACK_POLLING=true
CHOKIDAR_USEPOLLING=true
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_PMA_URL=http://localhost:8081
```

**Backend `.env`** (`website/backend/.env`):

```bash
cp website/backend/.env.example website/backend/.env
```

Default di `.env.example` sudah cocok dengan stack Docker (lihat detail nilainya di file). Yang biasanya perlu Anda isi sendiri:

```env
APP_KEY=                            # akan di-generate di langkah 4
APP_DEBUG=true                      # set ke false untuk production

# Google Drive (kosongkan dulu jika belum siap)
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/admin/storage/callback

# Optional: API key untuk akses dari n8n / external
N8N_API_KEY=<random-long-string>
```

> Database `envault` (user `envault`, password `envault`) akan dibuat otomatis oleh `postgres/init/01-create-envault-db.sql` saat container Postgres pertama kali up. Jika Anda sudah pernah `docker compose up` sebelumnya, hapus folder `evolution/postgres/` agar init script dieksekusi ulang — atau buat database manual via `psql`.

### 3. Buat external network

`docker-compose.yml` mereferensikan network `web-network` sebagai `external: true` agar bisa berbagi dengan reverse proxy lain. Buat sekali:

```bash
docker network create web-network
```

### 4. Bangun & jalankan service

```bash
docker compose up -d --build
```

Container yang akan running:

| Container | Image / Build | Port host |
| --- | --- | --- |
| `envault-backend` | `./website/backend` (PHP-FPM) | — |
| `envault-worker` | `./website/backend` (php artisan queue:work) | — |
| `envault-nginx` | `nginx:alpine` | `8000` |
| `encenter-frontend` | `./website/frontend` (Node 26) | `3000` |
| `encenter-phpmyadmin` | `./phpmyadmin` (PHP 8.3 + Apache) | `8081` |
| `encenter-n8n` | `n8nio/n8n` | `5678` |
| `encenter-evolution` | `evoapicloud/evolution-api` | `8080` |
| `evolution-postgres` | `postgres:15` | — (internal) |
| `evolution-redis` | `redis:7` | — (internal) |
| `encenter-openclaw` | `./openclaw` | `18789` |

> Image backend menanam `vendor/` dan image frontend menanam `node_modules/` saat build. Kedua folder tersebut dipertahankan lewat named volume Docker (`backend-vendor`, `frontend-node-modules`, `frontend-next-cache`) supaya bind mount source code dari host tidak menutupi dependency. Akibatnya, kalau `composer.json` / `package.json` berubah, jalankan `docker compose build --no-cache <service>` agar dependency baru terbawa.

### 5. Generate APP_KEY & migrasi

```bash
docker exec -it envault-backend php artisan key:generate
docker exec -it envault-backend php artisan migrate --seed
```

Seeder default akan membuat user:

| Email | Password | Role |
| --- | --- | --- |
| `admin@encenter.com` | `password` | Administrator |

> **Ganti password ini segera** lewat halaman Profile setelah login pertama.

### 6. Akses aplikasi

| URL | Kegunaan |
| --- | --- |
| `http://localhost:3000` | Frontend (login, dashboard) |
| `http://localhost:8000/api/v1` | REST API |
| `http://localhost:8000/up` | Health check Laravel |
| `http://localhost:8081` | phpMyAdmin (auto-login dari vault) |
| `http://localhost:5678` | n8n |
| `http://localhost:8080` | Evolution API |

## Instalasi Lokal (Tanpa Docker)

### Backend

```bash
cd website/backend
composer install
cp .env.example .env
php artisan key:generate

# Sesuaikan DB_HOST di .env (mis. 127.0.0.1) dan database PostgreSQL Anda
php artisan migrate --seed

# Server pengembangan
php artisan serve            # http://127.0.0.1:8000

# Worker terpisah di terminal lain
php artisan queue:work --tries=3 --timeout=600
```

### Frontend

```bash
cd website/frontend
cp .env.local.example .env.local
pnpm install
pnpm dev                     # http://localhost:3000
```

> **PENTING (frontend):** File `website/frontend/AGENTS.md` mencatat bahwa proyek ini menggunakan Next.js versi terbaru dengan **breaking changes** di App Router. Sebelum mengubah konvensi routing/file, baca dulu `node_modules/next/dist/docs/`.

## Konfigurasi Google Drive (opsional tapi diperlukan untuk backup)

1. Buat project di [Google Cloud Console](https://console.cloud.google.com/).
2. Aktifkan **Google Drive API**.
3. Buat OAuth Client ID (type: Web application).
4. Tambahkan redirect URI: `http://localhost:3000/admin/storage/callback` (atau domain production Anda).
5. Salin Client ID & Secret ke `website/backend/.env`:
   ```env
   GOOGLE_DRIVE_CLIENT_ID=...
   GOOGLE_DRIVE_CLIENT_SECRET=...
   GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/admin/storage/callback
   ```
6. Restart backend: `docker compose restart envault-backend envault-worker`.
7. Login ke dashboard → menu **Cloud Storage** → klik **CONNECT NOW**.

## Verifikasi Cepat

Setelah semua running:

```bash
# Cek backend hidup
curl http://localhost:8000/up

# Cek frontend
curl -I http://localhost:3000

# Cek API login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@encenter.com","password":"password"}'
```

Kalau response login berisi `token` dan `user`, instalasi sukses.

## Git Hooks (Opsional tapi Direkomendasikan)

Repo ini sudah disiapkan dengan **Husky + lint-staged** untuk menjalankan ESLint (frontend) dan Laravel Pint (backend) di pre-commit. Aktifkan sekali:

```bash
# di root project
pnpm install                      # akan auto-jalankan `husky` lewat script `prepare`
```

Setelah ini, setiap `git commit` akan menjalankan linter pada file yang di-stage saja. Kalau Pint tidak tersedia (container backend mati dan tidak ada vendor lokal), hook akan skip dengan hint — bukan blok commit.

## Langkah Selanjutnya

- Konfigurasikan webhook ke n8n: lihat [03-architecture.md](03-architecture.md) dan [api-documentation.md](api-documentation.md).
- Pelajari struktur kode: [04-backend.md](04-backend.md) dan [05-frontend.md](05-frontend.md).
- Backup `APP_KEY` Anda ke tempat aman: lihat [09-security.md](09-security.md).

---

[← Sebelumnya: Overview](01-overview.md) · [Kembali ke Home](README.md) · [Selanjutnya: Architecture →](03-architecture.md)
