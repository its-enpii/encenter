# EnCenter (EnVault) — Dokumentasi Project

EnCenter adalah aplikasi self-hosted yang berfungsi sebagai **Server Control Center** dan **Credential Vault** terenkripsi, lengkap dengan **Backup Engine** otomatis ke Google Drive dan **Notification Hub** via webhook (n8n / WhatsApp).

Dokumentasi ini dibagi menjadi beberapa bagian agar mudah dinavigasi sesuai kebutuhan Anda.

## Daftar Dokumen

| File | Deskripsi |
| --- | --- |
| [01-overview.md](01-overview.md) | Pengenalan project, fitur utama, dan diagram arsitektur tingkat tinggi |
| [02-getting-started.md](02-getting-started.md) | Cara instalasi, konfigurasi, dan menjalankan project |
| [03-architecture.md](03-architecture.md) | Arsitektur teknis, alur data, dan komunikasi antar service |
| [04-backend.md](04-backend.md) | Detail backend Laravel (controllers, services, jobs, middleware) |
| [05-frontend.md](05-frontend.md) | Detail frontend Next.js (pages, components, lib) |
| [06-database-schema.md](06-database-schema.md) | Schema database, relasi tabel, dan migrasi |
| [07-services.md](07-services.md) | Layanan pendukung (phpMyAdmin, n8n, Evolution API) plus operator AI OpenClaw |
| [08-deployment.md](08-deployment.md) | Panduan deployment ke production |
| [09-security.md](09-security.md) | Catatan keamanan dan praktik enkripsi |
| [10-troubleshooting.md](10-troubleshooting.md) | Troubleshooting umum dan FAQ |
| [api-documentation.md](api-documentation.md) | Spesifikasi REST API lengkap |
| [auto-download-startup.md](auto-download-startup.md) | Setup auto-download backup di Windows startup |

## Quick Links

- Sumber kode backend: [`website/backend/`](../website/backend)
- Sumber kode frontend: [`website/frontend/`](../website/frontend)
- Konfigurasi Docker Compose: [`docker-compose.yml`](../docker-compose.yml)
- File environment contoh: [`.env.example`](../.env.example)

## Stack Singkat

| Lapisan | Teknologi |
| --- | --- |
| Backend API | Laravel 13 + Sanctum + Queue Worker |
| Frontend | Next.js 16 (App Router) + React 19 + Tailwind v4 |
| Database App | PostgreSQL 15 (via Docker) |
| Storage Backup | Google Drive (OAuth2) |
| Reverse Proxy Backend | Nginx (Alpine) |
| Layanan Pendukung | n8n (automation) · Evolution API (WhatsApp) · phpMyAdmin (DB browser) |
| Operator AI | OpenClaw — persona Enpii AI yang menggerakkan stack |

> Catatan: `APP_KEY` Laravel dipakai untuk enkripsi semua kredensial sensitif. Hilang APP_KEY = hilang akses ke seluruh data terenkripsi. Backup APP_KEY adalah prioritas tertinggi.
