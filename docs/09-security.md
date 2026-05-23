# 09 — Security

Catatan keamanan dan praktik terbaik untuk EnCenter.

## Threat Model Singkat

| Aset | Bentuk | Risiko |
| --- | --- | --- |
| Kredensial SSH server | `servers.password`, `servers.private_key`, `servers.passphrase` | Akses root ke server target |
| Kredensial database | `database_connections.db_password`, `db_username`, `db_name` | Akses dump produksi |
| Token Google Drive | `user_storages.access_token`, `refresh_token` | Akses Drive user |
| Webhook secret | `webhook_settings.secret_key` | Spoof event ke n8n |
| Sanctum token | `personal_access_tokens.token` (hashed) | Pengambilalihan akun |
| `APP_KEY` | `.env` backend | Dekripsi seluruh data sensitif |
| `N8N_ENCRYPTION_KEY` | `.env` root | Dekripsi credentials di n8n |
| Session WhatsApp | `evolution/instances/` | Impersonate akun WA |

## Enkripsi di Layer Aplikasi

Laravel `APP_KEY` dipakai sebagai key untuk **AES-256-CBC** lewat `Illuminate\Support\Facades\Crypt`. Field yang dienkripsi otomatis melalui Eloquent cast:

| Model | Field |
| --- | --- |
| `Server` | `username`, `password`, `private_key`, `passphrase` |
| `DatabaseConnection` | `db_name`, `db_username`, `db_password` |
| `WebhookSetting` | `webhook_url`, `secret_key` |
| `UserStorage` | `access_token`, `refresh_token` |

Implikasinya:
- Tanpa `APP_KEY` yang benar, ciphertext di database tidak bisa dibaca.
- Rotasi `APP_KEY` harus diikuti re-encrypt semua data (lihat di bawah).
- Backup `APP_KEY` adalah prioritas tertinggi.

### Rotasi APP_KEY (jarang dilakukan)

Laravel menyediakan `php artisan key:generate --show` untuk generate kunci baru. Rotasi membutuhkan migrasi data:

1. Aktifkan maintenance mode: `php artisan down`.
2. Decrypt semua data sensitif dengan APP_KEY lama dan simpan plaintext sementara di memori.
3. Set APP_KEY baru.
4. Re-encrypt + simpan kembali.
5. `php artisan up`.

Tidak ada built-in command untuk ini di project. Jika butuh, tulis script artisan custom yang loop ke setiap model dan field encrypted.

## Otentikasi & Otorisasi

### Sanctum
- Token plaintext hanya muncul sekali saat `createToken`. Storage di DB dalam bentuk hashed.
- Default expiration `null` (tidak expire). Untuk produksi, set `SANCTUM_TOKEN_EXPIRATION=...` atau panggil `tokens()->where('last_used_at', '<', now()->subDays(30))->delete()`.
- Hentikan akses dengan `currentAccessToken()->delete()` saat logout.

### API Key (header `X-API-Key`)
- Dipakai oleh integrasi internal (n8n, cron host).
- Disimpan di `.env` backend (`N8N_API_KEY`).
- Saat valid, request diasumsikan dieksekusi sebagai user admin pertama yang `is_active`.
- Untuk skenario multi-tenant nyata, pertimbangkan untuk:
  - Mengikat API key ke user spesifik.
  - Memakai per-resource scope.

### Login & Session
- Endpoint `/auth/login` dilindungi `throttle:login` (5 req/menit per IP).
- Frontend menyimpan token di `localStorage`. Pertimbangan:
  - Rentan XSS — pastikan tidak ada input user yang di-render `dangerouslySetInnerHTML`.
  - Untuk hardening: pakai HttpOnly cookie + CSRF token, atau pindahkan auth ke Sanctum SPA mode.

### Verifikasi Email
- Migration default `users.email_verified_at` ada, dan middleware `EnsureEmailIsVerified` tersedia.
- Saat ini route API tidak menggunakan middleware tersebut. Aktifkan kalau Anda mengharuskan email verified untuk akses.

## Network & Transport

### TLS
- Stack base **HTTP polos**. Untuk production, pasang reverse proxy (Caddy/Traefik/Nginx) yang terminate TLS.
- Sanctum SPA cookie hanya akan jalan benar lewat HTTPS untuk domain yang berbeda.

### CORS
- `config/cors.php` membolehkan origin: `localhost:3000`, `127.0.0.1:3000`, dan `FRONTEND_URL` env.
- `supports_credentials = true`.
- Ketika domain frontend berubah, **wajib** update `FRONTEND_URL`.

### Rate Limiter
- `api`: 60/menit/user/ip.
- `login`: 5/menit/ip.
- `backup`: 10/menit/user/ip.
- Sesuaikan via `App\Providers\AppServiceProvider` jika perlu.

### Firewall
- Tutup port internal (3000, 8000, 5678, 8080, 8081, 18789) dari publik. Hanya 80/443 yang dibuka via reverse proxy (lihat [08-deployment.md](08-deployment.md)).

## Webhook Security

- Setiap event keluar membawa header:
  - `X-Webhook-Signature: hmac-sha256=<hex>`
  - `X-Webhook-Event: <event_name>`
- Receiver (mis. n8n) wajib hitung HMAC dari raw body dengan `secret_key` lalu bandingkan timing-safe.
- Contoh verifikasi di [api-documentation.md](api-documentation.md#4-keamanan-payload-webhook-ke-n8n).

> Pastikan `secret_key` cukup acak (≥ 32 char). Setiap webhook setting boleh punya secret berbeda.

## Audit Trail

- Semua request API logged otomatis di `activity_logs` lewat middleware `ActivityLogger`.
- Aksi sensitif spesifik (REGISTER, VAULT_ADD, VIEW_CREDENTIALS, TEST_CONNECTION, PURGE) logged eksplisit oleh controller.
- Field `meta` mendukung detail tambahan (label resource, status, error message).
- Tidak ada cara hard-delete via UI selain endpoint `/audit-logs/purge` (mengatur retention). Tetap bisa di-clear langsung di DB, jadi keamanan ini opsional, bukan immutable.

> Kalau butuh audit trail tamper-evident, pertimbangkan write-only sink eksternal (mis. CloudWatch / S3 dengan object lock).

## Privasi Kredensial di UI

- Halaman vault menampilkan password sebagai `••••` di table.
- Tombol "View credentials" (icon mata) memanggil `/reveal` endpoint, lalu `CredentialModal` menampilkan field sensitif dengan toggle visibility per field.
- Saat reveal, `ActivityLog` mencatat `VIEW_CREDENTIALS` agar bisa diaudit.

## SSH Keamanan

- Kredensial SSH disimpan terenkripsi.
- Saat backup berjalan, command `mysqldump` memakai `MYSQL_PWD=<password> mysqldump ...` (bukan flag `-p`) — password tidak muncul di proses listing. Tetap, password sempat hadir di environment proses → audiens dengan akses root server target bisa membacanya. Mitigasi: pakai user MySQL terbatas (read-only / lock).
- File hasil dump berada sementara di `/tmp/<file>` di server target. Cleanup dilakukan setelah upload sukses (tapi kalau gagal di tengah, tidak otomatis terhapus). Pertimbangkan cron pembersih `/tmp` di server target.

## Google Drive Scope

- `GoogleDriveService` request scope `Drive::DRIVE_FILE` (akses file yang dibuat/akses oleh app saja). Tidak `drive` penuh.
- Refresh token disimpan terenkripsi.
- Cleanup hanya menghapus folder dengan nama format `YYYYMMDD` lebih lama dari 7 hari (default). Endpoint `POST /storage/google/cleanup` perlu autentikasi.

## phpMyAdmin

- `AllowArbitraryServer = true` memberi user phpMyAdmin kebebasan login ke server eksternal apa pun. Combined dengan auto-login, ini memungkinkan akses cepat ke server target — tapi user yang akses URL `/autologin.php` langsung dengan parameter karang bisa coba server arbitrary. Mitigasi:
  - Tempatkan phpMyAdmin di network internal saja.
  - Tambahkan IP allowlist di reverse proxy.
- `blowfish_secret` di `config.inc.php` sekarang dibaca dari env `PMA_BLOWFISH_SECRET` (lihat `.env.example` root). Wajib di-generate unik per deployment dengan `openssl rand -base64 24 | head -c 32`. Tanpa env yang valid, phpMyAdmin akan boot dengan secret padded non-rahasia — cukup untuk smoke test, tidak untuk production.

## File Sensitif yang Wajib Diabaikan

`.gitignore` sudah mencakup:

```
.env
.env.*
!.env.example
n8n/data/
evolution/instances/
evolution/postgres/
openclaw/config/
website/backend/storage/*.key
```

Pastikan tidak pernah commit:
- `.env` apapun.
- File hasil backup (`storage/app/backups/*.sql.gz`).
- Workflow n8n yang berisi credentials tidak terenkripsi (export json).
- Session WhatsApp (folder `evolution/instances/`).

## Update Dependency

Stack ini punya banyak komponen. Cek update berkala:

```bash
# Backend
docker exec envault-backend composer outdated -D

# Frontend
docker exec encenter-frontend pnpm outdated

# Image
docker compose pull
```

Patch critical (Laravel security release, Next.js, phpMyAdmin) sebaiknya dipasang dalam ≤ 7 hari sejak rilis.

## Hardening Lanjutan (Opsional)

- **2FA** pada user admin (paket `pragmarx/google2fa-laravel` atau passkey).
- **IP whitelist** di reverse proxy untuk dashboard `/admin/*`.
- **Sentry / Rollbar** untuk monitoring exception backend & worker.
- **WAF** (Cloudflare / ModSecurity) untuk filter request anomali.
- **Read-only filesystem** untuk container backend di production (kecuali `storage/`).
- **Container scanning** (Trivy / Docker Scout) di pipeline CI.

## Daftar Cek Setelah Insiden

1. Rotasi semua API token (Sanctum) — `php artisan tinker` → loop user → revoke tokens.
2. Rotasi `N8N_API_KEY` di `.env` backend dan setting n8n.
3. Rotasi `EVOLUTION_API_KEY` + reconnect instance jika perlu.
4. Cek `activity_logs` untuk anomali (jam tidak biasa, IP asing, banyak `VIEW_CREDENTIALS`).
5. Generate ulang webhook `secret_key` dan update di n8n receiver.
6. Bila APP_KEY bocor, lakukan rotasi APP_KEY (lihat di atas) — semua kredensial harus di-input ulang.

---

[← Sebelumnya: Deployment](08-deployment.md) · [Kembali ke Home](README.md) · [Selanjutnya: Troubleshooting →](10-troubleshooting.md)
