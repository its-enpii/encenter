# EnCenter (EnVault)

EnCenter is a self-hosted **Server Control Center** and encrypted **Credential Vault** with an automated database backup pipeline to Google Drive and webhook-based notifications (n8n → WhatsApp).

> Full Indonesian documentation lives in [`docs/`](docs/README.md). This README is a quick orientation; for anything beyond the basics, follow the links below.

## Stack

| Layer | Tech |
| --- | --- |
| Backend API | Laravel 13 + Sanctum + Queue Worker |
| Frontend | Next.js 16 (App Router) + React 19 + Tailwind v4 |
| App database | PostgreSQL 15 (Docker) |
| Backup target | Google Drive (OAuth2) |
| Reverse proxy | Nginx (alpine) |
| DB browser | phpMyAdmin (custom build with auto-login) |
| Automation | n8n |
| WhatsApp bridge | Evolution API (Postgres + Redis) |
| Operator (AI) | OpenClaw — Enpii AI persona |

Detail per komponen: [`docs/03-architecture.md`](docs/03-architecture.md).

## Prerequisites

- Docker Engine 24+ and Docker Compose v2
- (Optional, for local development outside Docker) Node.js 20+, pnpm 10, PHP 8.3+, Composer

## Quick Start

```bash
# 1. Clone & masuk ke folder
git clone <repo-url> envault
cd envault

# 2. Setup environment
cp .env.example .env
cp website/backend/.env.example website/backend/.env

# 3. Buat external network sekali (dipakai web-network bersama service lain)
docker network create web-network

# 4. Bangun & jalankan
docker compose up -d --build

# 5. Generate APP_KEY & migrasi
docker exec -it envault-backend php artisan key:generate
docker exec -it envault-backend php artisan migrate --seed
```

Default seeder akan membuat user `admin@encenter.com` / `password`. **Ganti segera** lewat halaman Profile setelah login pertama.

Langkah lengkap (termasuk Google OAuth, debugging, named volume): [`docs/02-getting-started.md`](docs/02-getting-started.md).

## Port Mapping

| Port | Service |
| --- | --- |
| 3000 | Next.js Frontend |
| 8000 | Laravel Backend API (via Nginx) |
| 8080 | Evolution API (WhatsApp bridge) |
| 8081 | phpMyAdmin (auto-login dari Vault) |
| 5678 | n8n |
| 18789 | OpenClaw — Enpii AI operator |

PostgreSQL 15 berjalan internal di network `agent-network`, tidak diekspose ke host secara default.

## Security & Backup

> **KRITIS:** `APP_KEY` di `website/backend/.env` dipakai untuk meng-enkripsi seluruh kredensial sensitif (password SSH, private key, token Google, secret webhook). Kalau hilang, semua data di vault tidak bisa didekripsi lagi. **Backup APP_KEY ke password manager / storage offline.**

Praktik keamanan tambahan: [`docs/09-security.md`](docs/09-security.md).

## Development

Project menyediakan Husky + lint-staged di root. Aktifkan sekali setelah clone:

```bash
pnpm install
```

Setelah itu setiap `git commit` otomatis menjalankan ESLint (frontend) + Pint (backend) pada file yang di-stage.

Run queue worker secara manual (misal saat dev tanpa Docker):

```bash
cd website/backend
composer install
php artisan queue:work
```

## Documentation Map

Semua di [`docs/`](docs/README.md), berurutan:

1. [`01-overview.md`](docs/01-overview.md) — pengenalan, fitur, alur backup
2. [`02-getting-started.md`](docs/02-getting-started.md) — instalasi & first-run
3. [`03-architecture.md`](docs/03-architecture.md) — topologi service, network, encryption layer
4. [`04-backend.md`](docs/04-backend.md) — Laravel: routes, controllers, services, jobs
5. [`05-frontend.md`](docs/05-frontend.md) — Next.js: pages, components, helpers
6. [`06-database-schema.md`](docs/06-database-schema.md) — tabel & relasi
7. [`07-services.md`](docs/07-services.md) — phpMyAdmin, n8n, Evolution API, plus operator AI OpenClaw
8. [`08-deployment.md`](docs/08-deployment.md) — panduan deploy & operasional
9. [`09-security.md`](docs/09-security.md) — threat model, hardening
10. [`10-troubleshooting.md`](docs/10-troubleshooting.md) — masalah umum & FAQ
11. [`api-documentation.md`](docs/api-documentation.md) — spesifikasi REST API
12. [`auto-download-startup.md`](docs/auto-download-startup.md) — auto-download backup di Windows startup
