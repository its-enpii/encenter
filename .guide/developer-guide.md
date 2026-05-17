# Server Control Center — Project Plan (Standalone App)

> Aplikasi pusat kontrol server & credential vault dengan backup otomatis ke Google Drive,
> database di Supabase, web dashboard Next.js, dan notifikasi via webhook ke n8n → WhatsApp.

---

## Daftar Isi

1. [Overview & Arsitektur](#1-overview--arsitektur)
2. [Tech Stack](#2-tech-stack)
3. [Fitur Utama](#3-fitur-utama)
4. [Struktur Database](#4-struktur-database)
5. [Struktur API Endpoint](#5-struktur-api-endpoint)
6. [Roadmap Pengerjaan](#6-roadmap-pengerjaan)
7. [Catatan Keamanan](#7-catatan-keamanan)

---

## 1. Overview & Arsitektur

**Server Control Center** adalah aplikasi internal self-hosted yang berfungsi sebagai:

- **Credential Vault** — menyimpan kredensial SSH dan database seluruh server secara terenkripsi
- **Backup Engine** — menjalankan backup database MySQL/MariaDB via SSH tunnel ke server target
- **Cloud Storage Bridge** — menyimpan file backup ke Google Drive secara otomatis
- **Web Dashboard** — antarmuka visual untuk manage server, trigger backup, dan pantau status
- **Notification Hub** — mengirim notifikasi hasil backup via webhook ke n8n → WhatsApp

### Arsitektur Sistem

```
┌─────────────────────────────────────────────┐
│          Next.js Web Dashboard              │
│   (Credential Manager, Backup Monitor)      │
└──────────────────┬──────────────────────────┘
                   │ REST API / HTTPS
       ┌───────────┼───────────────────┐
       │           │                   │
  (browser)   (manual trigger)   (n8n cron trigger)
       │           │                   │
┌──────▼───────────▼───────────────────▼──────┐
│              Laravel API                    │
│           (VPS — Execution Engine)          │
│                                             │
│  ┌─────────────┐   ┌─────────────────────┐  │
│  │ Credential  │   │    Backup Engine    │  │
│  │   Vault     │   │  SSH + mysqldump    │  │
│  │ (encrypted) │   │  + Laravel Queue    │  │
│  └─────────────┘   └──────────┬──────────┘  │
│                               │ job selesai │
│                    ┌──────────▼──────────┐  │
│                    │  Webhook Service    │  │
│                    │  POST → n8n URL     │  │
│                    └─────────────────────┘  │
└──────────┬──────────────────────────────────┘
           │                        │
┌──────────▼──────────┐  ┌──────────▼──────────┐
│     Supabase        │  │    Google Drive      │
│   (PostgreSQL)      │  │   (File .sql.gz)     │
└─────────────────────┘  └─────────────────────┘
                                    │
                         ┌──────────▼──────────┐
                         │    n8n Workflow     │
                         │  (terima webhook)   │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │  WhatsApp (notif)   │
                         │  ke nomor tujuan    │
                         └─────────────────────┘
```

### Alur Backup via n8n

```
n8n (cron / trigger manual dari WA)
        │
        │ POST /api/v1/databases/{id}/backup
        ▼
Laravel terima request → dispatch BackupJob ke queue
        │
        │ (async, background)
        ▼
BackupJob:
  1. Decrypt kredensial server & DB
  2. SSH ke server target via phpseclib
  3. Eksekusi mysqldump
  4. Compress → .sql.gz
  5. Upload ke Google Drive
  6. Update status backup_jobs
  7. POST webhook ke n8n URL
        │
        ▼
n8n terima webhook → kirim WhatsApp ke phone_number
```

### Prinsip Desain

- **VPS hanya execution engine** — kalau VPS mati, data tetap aman di Supabase & Google Drive
- **Tidak ada scheduler di Laravel** — semua trigger backup datang dari luar (n8n atau manual via dashboard)
- **API-first** — semua fitur diekspos via REST API
- **Encrypt everything** — semua kredensial dienkripsi sebelum disimpan ke Supabase

---

## 2. Tech Stack

| Layer          | Teknologi                        | Keterangan                      |
| -------------- | -------------------------------- | ------------------------------- |
| Frontend       | Next.js 14 (App Router)          | Web dashboard, SSR              |
| UI Components  | Shadcn/ui + Tailwind CSS         | Komponen siap pakai             |
| Backend API    | Laravel 11                       | Framework utama, queue, webhook |
| Database       | Supabase (PostgreSQL)            | Managed DB, auto-backup, RLS    |
| Auth           | Laravel Sanctum                  | Session & API token             |
| SSH Connection | phpseclib/phpseclib              | Pure PHP SSH2, tanpa ekstensi C |
| Backup Storage | Google Drive API v3              | OAuth2, upload file .sql.gz     |
| Queue          | Laravel Queue + Redis            | Async backup job                |
| Enkripsi       | Laravel Encryption (AES-256-CBC) | Enkripsi kredensial di DB       |
| Deployment     | Docker / native VPS              | Self-hosted di VPS pribadi      |

---

## 3. Fitur Utama

### 3.1 Dashboard Overview

- Ringkasan jumlah server, database, dan total backup
- Status backup terakhir per server (sukses / gagal / running)
- Recent activity log

### 3.2 Credential Vault

- Simpan data server (SSH): host, port, username, password / private key
- Simpan data koneksi database: host, port, db name, username, password
- Semua field sensitif dienkripsi AES-256-CBC sebelum masuk Supabase
- Grouping server berdasarkan project / label
- Test koneksi SSH dan DB langsung dari dashboard
- Copy credential ke clipboard (dengan audit log)

### 3.3 Backup Engine

- Trigger backup manual via tombol di dashboard
- Trigger backup via API (dari n8n)
- Alur backup:
  1. Ambil & decrypt kredensial dari vault
  2. Buka SSH tunnel ke server target via phpseclib
  3. Eksekusi `mysqldump` di server target
  4. Compress output menjadi `.sql.gz`
  5. Upload ke Google Drive folder yang ditentukan
  6. Catat log hasil ke Supabase
  7. Kirim webhook notifikasi ke n8n
- Support multi-database per server

### 3.4 Webhook Notification

- Setelah backup selesai (sukses maupun gagal), Laravel POST ke URL webhook n8n
- Payload berisi: status, nama server, nama DB, ukuran file, link GDrive, waktu eksekusi, nomor HP tujuan
- n8n meneruskan notifikasi ke WhatsApp berdasarkan `phone_number` di payload
- Webhook dilindungi dengan HMAC-SHA256 signature

### 3.5 Backup Management

- History backup per server dengan filter status dan tanggal
- Lihat ukuran file, durasi eksekusi, dan link langsung ke Google Drive
- Re-trigger backup yang gagal
- Retention policy — hapus otomatis backup lebih dari N hari

### 3.6 Activity Log

- Audit log semua aksi: login, lihat kredensial, trigger backup, update server
- Filter berdasarkan aksi dan resource
- Append-only — tidak bisa dihapus manual

---

## 4. Struktur Database

> Database menggunakan **Supabase (PostgreSQL)**.
> Field bertanda `[encrypted]` disimpan sebagai ciphertext AES-256-CBC.

---

### 4.1 Tabel `users`

```sql
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(150) UNIQUE NOT NULL,
  password     VARCHAR(255) NOT NULL,           -- bcrypt
  phone_number VARCHAR(20),                     -- nomor WA tujuan notifikasi, e.g. "628123456789"
  is_active    BOOLEAN DEFAULT true,
  last_login   TIMESTAMP,
  created_at   TIMESTAMP DEFAULT now(),
  updated_at   TIMESTAMP DEFAULT now()
);
```

---

### 4.2 Tabel `api_tokens`

Token Sanctum untuk akses API eksternal (n8n, dll).

```sql
CREATE TABLE api_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,            -- e.g. "n8n-token"
  token       VARCHAR(255) UNIQUE NOT NULL,     -- hashed
  last_used   TIMESTAMP,
  expires_at  TIMESTAMP,
  created_at  TIMESTAMP DEFAULT now()
);
```

---

### 4.3 Tabel `webhook_settings`

Konfigurasi webhook untuk notifikasi ke n8n.

```sql
CREATE TABLE webhook_settings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,           -- e.g. "n8n - backup notification"
  webhook_url  TEXT NOT NULL,                   -- URL webhook n8n
  secret_key   TEXT NOT NULL,                   -- [encrypted] untuk HMAC signature
  is_active    BOOLEAN DEFAULT true,
  events       TEXT[] DEFAULT '{"backup.success","backup.failed"}',
  created_at   TIMESTAMP DEFAULT now(),
  updated_at   TIMESTAMP DEFAULT now()
);
```

---

### 4.4 Tabel `server_groups`

Pengelompokan server berdasarkan project atau kategori.

```sql
CREATE TABLE server_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,            -- e.g. "sidbm", "sim-sppg", "personal"
  description TEXT,
  color       VARCHAR(7),                       -- hex color, e.g. "#2E86C1"
  created_at  TIMESTAMP DEFAULT now(),
  updated_at  TIMESTAMP DEFAULT now()
);
```

---

### 4.5 Tabel `servers`

Data server / VPS. Kredensial SSH dienkripsi.

```sql
CREATE TABLE servers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id        UUID REFERENCES server_groups(id) ON DELETE SET NULL,
  label           VARCHAR(100) NOT NULL,        -- e.g. "VPS Biznet - sidbm"
  host            VARCHAR(255) NOT NULL,        -- IP atau domain
  port            SMALLINT DEFAULT 22,
  username        TEXT NOT NULL,                -- [encrypted]
  auth_type       VARCHAR(20) DEFAULT 'password', -- 'password' | 'private_key'
  password        TEXT,                         -- [encrypted]
  private_key     TEXT,                         -- [encrypted]
  passphrase      TEXT,                         -- [encrypted]
  notes           TEXT,
  is_active       BOOLEAN DEFAULT true,
  last_connected  TIMESTAMP,
  created_at      TIMESTAMP DEFAULT now(),
  updated_at      TIMESTAMP DEFAULT now()
);
```

---

### 4.6 Tabel `database_connections`

Koneksi database di setiap server. Bisa lebih dari satu per server.

```sql
CREATE TABLE database_connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id     UUID REFERENCES servers(id) ON DELETE CASCADE,
  label         VARCHAR(100) NOT NULL,          -- e.g. "sidbm_production"
  db_type       VARCHAR(20) DEFAULT 'mysql',    -- 'mysql' | 'mariadb'
  db_host       VARCHAR(255) DEFAULT '127.0.0.1',
  db_port       SMALLINT DEFAULT 3306,
  db_name       TEXT NOT NULL,                  -- [encrypted]
  db_username   TEXT NOT NULL,                  -- [encrypted]
  db_password   TEXT NOT NULL,                  -- [encrypted]
  notes         TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT now(),
  updated_at    TIMESTAMP DEFAULT now()
);
```

---

### 4.7 Tabel `backup_jobs`

Log setiap eksekusi backup — manual maupun via API.

```sql
CREATE TABLE backup_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  db_connection_id  UUID REFERENCES database_connections(id) ON DELETE SET NULL,
  triggered_by      VARCHAR(20) NOT NULL,       -- 'manual' | 'api'
  triggered_by_user UUID REFERENCES users(id) ON DELETE SET NULL,
  status            VARCHAR(20) DEFAULT 'pending', -- 'pending'|'running'|'success'|'failed'
  started_at        TIMESTAMP,
  finished_at       TIMESTAMP,
  duration_seconds  SMALLINT,
  file_name         VARCHAR(255),
  file_size_bytes   BIGINT,
  gdrive_file_id    VARCHAR(255),
  gdrive_file_url   TEXT,
  webhook_sent      BOOLEAN DEFAULT false,
  webhook_sent_at   TIMESTAMP,
  error_message     TEXT,
  created_at        TIMESTAMP DEFAULT now()
);
```

---

### 4.8 Tabel `gdrive_credentials`

OAuth token Google Drive.

```sql
CREATE TABLE gdrive_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  access_token    TEXT NOT NULL,                -- [encrypted]
  refresh_token   TEXT NOT NULL,                -- [encrypted]
  token_type      VARCHAR(50) DEFAULT 'Bearer',
  expires_at      TIMESTAMP,
  scope           TEXT,
  created_at      TIMESTAMP DEFAULT now(),
  updated_at      TIMESTAMP DEFAULT now()
);
```

---

### 4.9 Tabel `activity_logs`

Audit log semua aksi penting. Append-only.

```sql
CREATE TABLE activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,            -- e.g. "credential.view", "backup.trigger"
  resource    VARCHAR(100),                     -- e.g. "server", "database_connection"
  resource_id UUID,
  meta        JSONB,                            -- IP, browser, token name, dll
  ip_address  VARCHAR(45),
  created_at  TIMESTAMP DEFAULT now()
);
```

---

### Relasi Antar Tabel

```
users
  ├── api_tokens
  ├── webhook_settings
  ├── server_groups
  │     └── servers
  │           └── database_connections
  │                 └── backup_jobs
  ├── gdrive_credentials
  └── activity_logs
```

---

## 5. Struktur API Endpoint

Base URL: `https://your-vps/api/v1`
Auth: Bearer Token (Laravel Sanctum)

### 5.1 Auth

| Method | Endpoint        | Deskripsi                    |
| ------ | --------------- | ---------------------------- |
| POST   | `/auth/login`   | Login, dapat token           |
| POST   | `/auth/logout`  | Revoke token aktif           |
| GET    | `/auth/me`      | Info user aktif              |
| PUT    | `/auth/profile` | Update profil & phone_number |

### 5.2 Server Groups

| Method | Endpoint       | Deskripsi        |
| ------ | -------------- | ---------------- |
| GET    | `/groups`      | List semua group |
| POST   | `/groups`      | Buat group baru  |
| PUT    | `/groups/{id}` | Update group     |
| DELETE | `/groups/{id}` | Hapus group      |

### 5.3 Servers

| Method | Endpoint                 | Deskripsi                      |
| ------ | ------------------------ | ------------------------------ |
| GET    | `/servers`               | List semua server              |
| POST   | `/servers`               | Tambah server baru             |
| GET    | `/servers/{id}`          | Detail server (tanpa password) |
| PUT    | `/servers/{id}`          | Update server                  |
| DELETE | `/servers/{id}`          | Hapus server                   |
| POST   | `/servers/{id}/test-ssh` | Test koneksi SSH               |

### 5.4 Database Connections

| Method | Endpoint                  | Deskripsi               |
| ------ | ------------------------- | ----------------------- |
| GET    | `/servers/{id}/databases` | List DB di server       |
| POST   | `/servers/{id}/databases` | Tambah koneksi DB       |
| GET    | `/databases/{id}`         | Detail koneksi DB       |
| PUT    | `/databases/{id}`         | Update koneksi DB       |
| DELETE | `/databases/{id}`         | Hapus koneksi DB        |
| POST   | `/databases/{id}/test`    | Test koneksi DB via SSH |

### 5.5 Backup

| Method | Endpoint                  | Deskripsi                          |
| ------ | ------------------------- | ---------------------------------- |
| GET    | `/backups`                | History semua backup               |
| GET    | `/databases/{id}/backups` | History backup per DB              |
| POST   | `/databases/{id}/backup`  | Trigger backup (manual / dari n8n) |
| GET    | `/backups/{id}`           | Detail & status job backup         |
| DELETE | `/backups/{id}`           | Hapus record backup                |

> **Catatan untuk n8n:** Gunakan `POST /databases/{id}/backup` dengan Bearer Token khusus n8n.
> Response langsung mengembalikan `backup_job_id`. Tunggu webhook dari Laravel untuk hasil akhirnya.

### 5.6 Webhook Settings

| Method | Endpoint              | Deskripsi                         |
| ------ | --------------------- | --------------------------------- |
| GET    | `/webhooks`           | List webhook aktif                |
| POST   | `/webhooks`           | Tambah webhook baru               |
| PUT    | `/webhooks/{id}`      | Update webhook                    |
| DELETE | `/webhooks/{id}`      | Hapus webhook                     |
| POST   | `/webhooks/{id}/test` | Kirim test payload ke webhook URL |

### 5.7 Google Drive

| Method | Endpoint             | Deskripsi                 |
| ------ | -------------------- | ------------------------- |
| GET    | `/gdrive/auth`       | Redirect ke Google OAuth  |
| GET    | `/gdrive/callback`   | OAuth callback handler    |
| GET    | `/gdrive/status`     | Cek status koneksi GDrive |
| DELETE | `/gdrive/disconnect` | Cabut akses GDrive        |

### 5.8 Activity Logs

| Method | Endpoint                                 | Deskripsi                     |
| ------ | ---------------------------------------- | ----------------------------- |
| GET    | `/logs`                                  | List activity log (paginated) |
| GET    | `/logs?resource={type}&resource_id={id}` | Filter per resource           |

---

### Webhook Payload (Laravel → n8n)

Payload yang dikirim Laravel ke n8n setelah backup selesai:

```json
{
  "event": "backup.success",
  "timestamp": "2025-05-14T02:15:43Z",
  "phone_number": "628123456789",
  "data": {
    "backup_job_id": "uuid",
    "server_label": "VPS Biznet - sidbm",
    "database_label": "sidbm_production",
    "status": "success",
    "file_name": "sidbm_production_20250514_021543.sql.gz",
    "file_size_bytes": 2048576,
    "gdrive_file_url": "https://drive.google.com/file/d/...",
    "duration_seconds": 45,
    "triggered_by": "api"
  }
}
```

Header untuk verifikasi di n8n:

```
X-Webhook-Signature: hmac-sha256=<signature>
X-Webhook-Event: backup.success
```

---

## 6. Roadmap Pengerjaan

Total estimasi: **6–8 minggu** (part-time, dikerjakan di sela project lain)

---

### Phase 1 — Foundation (Minggu 1–2)

**Goal: Laravel API + Next.js terhubung ke Supabase, autentikasi berfungsi**

- [x] Setup project Laravel 11
- [x] Konfigurasi koneksi Supabase (PostgreSQL via `pgsql` driver)
- [x] Buat semua migrasi tabel
- [x] Install & konfigurasi Laravel Sanctum
- [x] Buat endpoint Auth (login, logout, me, update profile)
- [x] Buat `EncryptionService` — wrapper enkripsi/dekripsi field sensitif
- [x] Setup middleware: auth check, activity logger
- [x] Setup Redis untuk queue
- [x] Setup project Next.js 14 (App Router)
- [x] Halaman login + session management di Next.js
- [x] Deploy keduanya ke VPS

**Deliverable:** Bisa login via web dan dapat token ✓

---

### Phase 2 — Credential Vault (Minggu 2–4)

**Goal: CRUD server & DB connection berfungsi dengan enkripsi, tampil di dashboard**

- [x] CRUD API `server_groups`, `servers`, `database_connections`
- [x] `EncryptionService` aktif di semua field sensitif
- [x] Endpoint test SSH dan test DB connection
- [x] Activity log otomatis setiap akses credential
- [x] Next.js: halaman daftar server + form tambah/edit
- [x] Next.js: halaman daftar database connection per server
- [x] Next.js: tombol "Test Connection" dengan feedback realtime
- [x] Next.js: halaman activity log

**Deliverable:** Bisa simpan, lihat, dan test kredensial server via web ✓

---

### Phase 3 — Backup Engine (Minggu 4–6)

**Goal: Backup MySQL via SSH berjalan, file masuk Google Drive, tampil di dashboard**

- [x] Google Drive OAuth flow (auth + callback)
- [x] `GoogleDriveService` — upload, buat folder, hapus file
- [x] `RunBackupJob` (Laravel Queue):
  - Decrypt kredensial
  - SSH ke server target via phpseclib
  - Eksekusi `mysqldump`
  - Compress ke `.sql.gz`
  - Upload ke Google Drive
  - Update status `backup_jobs`
- [x] Endpoint trigger backup (manual & dari n8n)
- [x] Endpoint history & detail backup
- [x] Next.js: tombol backup manual dengan status polling
- [x] Next.js: halaman history backup per database
- [x] Next.js: halaman setup Google Drive (connect / disconnect)
- [x] Test end-to-end: trigger via API → file muncul di Google Drive ✓

**Deliverable:** Backup berjalan via dashboard maupun API ✓

---

### Phase 4 — Webhook & Notification (Minggu 6–7)

**Goal: Notifikasi hasil backup terkirim ke n8n → WhatsApp**

- [x] CRUD API `webhook_settings`
- [x] `WebhookService` — kirim POST ke webhook URL dengan HMAC-SHA256 signature
- [x] Integrasi `WebhookService` di akhir `RunBackupJob` (sukses & gagal)
- [x] Endpoint `POST /webhooks/{id}/test` — kirim test payload
- [x] Next.js: halaman konfigurasi webhook (tambah URL, secret, events)
- [x] Next.js: tombol "Send Test" untuk verifikasi webhook
- [x] Next.js: form update profil (termasuk phone_number)
- [x] Test end-to-end: backup selesai → webhook dikirim → WA terima notifikasi ✓

**Deliverable:** Notifikasi WhatsApp terkirim otomatis setelah backup ✓

---

### Phase 5 — Hardening & Polish (Minggu 7–8)

**Goal: Aplikasi aman, stabil, dan siap pakai jangka panjang**

- [ ] Rate limiting semua endpoint
- [ ] Review enkripsi — pastikan tidak ada field sensitif yang lolos
- [ ] Handle edge case: SSH timeout, DB unreachable, GDrive quota penuh, token expired, webhook gagal
- [ ] Loading state, error handling, dan empty state yang proper di Next.js
- [ ] Responsive UI — bisa diakses dari HP browser
- [ ] README lengkap untuk setup & deployment
- [ ] Backup APP_KEY dan semua credential aplikasi ke tempat aman

**Deliverable:** Aplikasi production-ready ✓

---

## 7. Catatan Keamanan

### Enkripsi Kredensial

- Semua field sensitif dienkripsi menggunakan `APP_KEY` Laravel (AES-256-CBC)
- `APP_KEY` **wajib** disimpan di luar VPS — password manager atau vault terpisah
- Jika `APP_KEY` hilang, semua kredensial tidak bisa didekripsi — **backup APP_KEY adalah prioritas utama**

### Akses Web Dashboard

- Pasang IP whitelist di level Nginx — hanya IP kamu yang bisa buka dashboard
- Gunakan HTTPS — tidak boleh diakses via HTTP
- Session timeout otomatis setelah idle

### Webhook Security

- Setiap request webhook dari Laravel disertai HMAC-SHA256 signature di header
- n8n wajib verifikasi signature sebelum memproses payload
- Secret key webhook disimpan terenkripsi di Supabase

### Google Drive

- Refresh token disimpan terenkripsi di Supabase
- Gunakan folder Google Drive dedicated untuk backup
- Scope API seminimal mungkin (`drive.file`, bukan `drive` penuh)

### Supabase

- Aktifkan Row Level Security (RLS) di semua tabel
- Jangan expose Supabase connection string ke publik — hanya akses dari VPS
- Gunakan Supabase project dedicated untuk aplikasi ini

---

_Dokumen ini adalah living document — update sesuai perkembangan pengerjaan._
