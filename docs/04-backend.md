# 04 — Backend (Laravel)

Backend EnCenter adalah aplikasi **Laravel 13** dengan PHP 8.3+ yang berperan sebagai REST API, queue worker, dan service layer enkripsi/SSH/Google Drive.

## Stack & Dependency

Diambil dari `website/backend/composer.json`:

**Production:**
- `laravel/framework: ^13.8`
- `laravel/sanctum: ^4.0` — token-based auth.
- `laravel/tinker: ^3.0`
- `phpseclib/phpseclib: ~3.0` — pure PHP SSH/SFTP/key handling.
- `google/apiclient: ^2.15` + `google/apiclient-services: 0.350` — Google Drive API.

**Development:**
- `pestphp/pest: ^4.7` + `pestphp/pest-plugin-laravel: ^4.1` — testing framework.
- `laravel/pint: ^1.27` — code style.
- `laravel/breeze: ^2.4` — scaffolded auth (web).
- `laravel/pail: ^1.2.5` — log streaming.
- `laravel/pao: ^1.0.6`.
- `mockery/mockery`, `nunomaduro/collision`, `fakerphp/faker`.

Composer scripts yang penting:
- `composer dev` — menjalankan `php artisan serve`, `queue:listen`, dan `npm run dev` paralel via `concurrently`.
- `composer test` — menjalankan `config:clear` lalu `php artisan test`.
- `composer setup` — boilerplate setup (install, key:generate, migrate, build).

## Bootstrap & Kernel

`bootstrap/app.php` adalah entry kernel modern Laravel 13:

- Routing diambil dari `routes/web.php`, `routes/api.php`, `routes/console.php`.
- Health endpoint: `/up`.
- Middleware API stack: `ActivityLogger` (custom) + `throttle:api`.
- Alias middleware:
  - `verified` → `EnsureEmailIsVerified`.
  - `auth.api` → `ApiKeyOrSanctum`.
- `AuthenticationException` di-render JSON 401 untuk request ke `api/*` atau yang `expectsJson()`.

## Konfigurasi Penting

| File config | Catatan |
| --- | --- |
| `config/sanctum.php` | Stateful domain default mencakup `localhost:3000`. Expiration null (token tidak expire). |
| `config/cors.php` | Allow origin `http://localhost:3000`, `127.0.0.1:3000`, dan `FRONTEND_URL`. `supports_credentials = true`. |
| `config/services.php` | `services.google.client_id/secret/redirect_uri` dipakai `GoogleDriveService`. |
| `config/database.php` | Default Laravel; backend pakai `pgsql` lewat `.env`. |

## Struktur Folder

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── Api/V1/                 # REST API V1
│   │   │   ├── ActivityLogController.php
│   │   │   ├── AuthController.php
│   │   │   ├── BackupController.php
│   │   │   ├── DatabaseConnectionController.php
│   │   │   ├── ServerController.php
│   │   │   ├── ServerGroupController.php
│   │   │   ├── StorageController.php
│   │   │   └── WebhookSettingController.php
│   │   ├── Auth/                   # Breeze scaffolding (web auth)
│   │   ├── Controller.php          # Base controller (kosong)
│   │   └── ...
│   ├── Middleware/
│   │   ├── ActivityLogger.php
│   │   ├── ApiKeyOrSanctum.php
│   │   └── EnsureEmailIsVerified.php
│   └── Requests/Auth/LoginRequest.php
├── Jobs/
│   └── RunBackupJob.php
├── Models/
│   ├── ActivityLog.php
│   ├── BackupJob.php
│   ├── DatabaseConnection.php
│   ├── Server.php
│   ├── ServerGroup.php
│   ├── User.php
│   ├── UserStorage.php
│   └── WebhookSetting.php
├── Providers/
│   └── AppServiceProvider.php      # Rate limiter & reset password URL
├── Services/
│   ├── EncryptionService.php
│   ├── GoogleDriveService.php
│   ├── SshService.php
│   └── WebhookService.php
```

## Routing API (`routes/api.php`)

Semua endpoint berada di prefix `/api/v1`. Tabel ringkasan:

| Method | Path | Controller@Method | Auth |
| --- | --- | --- | --- |
| POST | `/auth/login` | `AuthController@login` | Public, `throttle:login` |
| POST | `/auth/logout` | `AuthController@logout` | `auth.api` |
| GET | `/auth/me` | `AuthController@me` | `auth.api` |
| PUT | `/auth/profile` | `AuthController@updateProfile` | `auth.api` |
| `apiResource` | `/server-groups` | `ServerGroupController` | `auth.api` |
| `apiResource` | `/servers` | `ServerController` | `auth.api` |
| POST | `/servers/{id}/test` | `ServerController@testConnection` | `auth.api` |
| GET | `/servers/{id}/credentials` | `ServerController@credentials` | `auth.api` |
| GET | `/servers/{id}/reveal` | `ServerController@reveal` (alias) | `auth.api` |
| `apiResource` | `/database-connections` | `DatabaseConnectionController` | `auth.api` |
| POST | `/database-connections/{id}/test` | `DatabaseConnectionController@testConnection` | `auth.api` |
| GET | `/database-connections/{id}/credentials` | `DatabaseConnectionController@credentials` | `auth.api` |
| GET | `/database-connections/{id}/reveal` | `DatabaseConnectionController@reveal` (alias) | `auth.api` |
| GET | `/audit-logs` | `ActivityLogController@index` | `auth.api` |
| POST | `/audit-logs/purge` | `ActivityLogController@purge` | `auth.api` |
| GET | `/storage` | `StorageController@index` | `auth.api` |
| POST | `/storage/settings` | `StorageController@updateSettings` | `auth.api` |
| GET | `/storage/google/auth-url` | `StorageController@getGoogleAuthUrl` | `auth.api` |
| POST | `/storage/google/connect` | `StorageController@connectGoogle` | `auth.api` |
| DELETE | `/storage` | `StorageController@disconnect` | `auth.api` |
| POST | `/storage/google/cleanup` | `StorageController@cleanup` | `auth.api` |
| GET | `/backups` | `BackupController@index` | `auth.api` |
| POST | `/backups/run` | `BackupController@run` | `auth.api`, `throttle:backup` |
| GET | `/backups/{id}` | `BackupController@show` | `auth.api` |
| `apiResource` | `/webhooks` | `WebhookSettingController` | `auth.api` |
| POST | `/webhooks/{id}/test` | `WebhookSettingController@test` | `auth.api` |

Spesifikasi payload lengkap: lihat [api-documentation.md](api-documentation.md).

## Middleware

### `ApiKeyOrSanctum` (`auth.api`)

Logika otentikasi dual-mode:

1. Cek header `X-API-Key`.
   - Bandingkan dengan `env('N8N_API_KEY')` via `hash_equals` (timing-safe).
   - Jika cocok, pilih user pertama yang `is_active = true` dan set sebagai user request.
2. Jika gagal, fallback ke guard Sanctum (`Auth::guard('sanctum')`).
3. Jika dua-duanya tidak menghasilkan user, return JSON 401.

### `ActivityLogger`

Dipasang di stack API tapi **hanya mencatat event login & logout** (route bernama `auth.login` / `auth.logout`). Aksi lain dicatat eksplisit lewat `ActivityLog::log(...)` di controller agar setiap baris audit punya label semantik (mis. `VAULT_ADD`, `VIEW_CREDENTIALS`) dan tidak duplikat dengan baris generik.

- Cek tabel `activity_logs` ada (`Schema::hasTable`) — supaya tidak error sebelum migrasi.
- Resource `AUTH`. Meta: HTTP method, user agent, status code.
- Failure logging tidak crash request — fallback ke `logger()->error`.

### `EnsureEmailIsVerified`

Standar Breeze. Tidak aktif dipakai di route API.

## Controllers (Highlight)

### `AuthController`
- `login(Request)` — validasi `email`/`password`, cek `is_active`, update `last_login`, generate Sanctum token (`createToken($device_name)`).
- `logout(Request)` — `currentAccessToken()->delete()`.
- `me(Request)` — kembalikan `$request->user()`.
- `updateProfile(Request)` — update `name`, `phone_number`, optional `password` (`min:8|confirmed`).

### `ServerController`
- Scoping selalu `Server::where('user_id', Auth::id())` (multi-tenant).
- `index` mendukung query `group_id`, `search`, `paginate=false`.
- `store` validasi `auth_type` (`password|private_key`) dan field terkait.
- `show` eager-load relasi `group` dan `databaseConnections`.
- `credentials/reveal` mengembalikan plaintext password/private_key (didekripsi otomatis oleh Eloquent cast). Memicu `ActivityLog::log('VIEW_CREDENTIALS', ...)`.
- `testConnection` memanggil `SshService::connect`, update `last_connected`, log success/failed.

### `DatabaseConnectionController`
- Scoping memakai `whereHas('server', user_id=Auth::id())`.
- `testConnection` menjalankan command CLI di server target via SSH:
  - MySQL/MariaDB: `mysqladmin ping`.
  - PostgreSQL: `pg_isready`.
- `credentials/reveal` decrypt + return password DB.

### `BackupController`
- `index` paginate, optional filter `db_connection_id`.
- `run` menerima `db_connection_id` UUID atau `db_label` (string) — siapa pun yang dipakai akan dicari dalam scope user. Membuat record `BackupJob` lalu `RunBackupJob::dispatch($backupJob)`.

### `StorageController`
- `getGoogleAuthUrl` — bangun URL OAuth (scope `drive.file`, `access_type=offline`, `prompt=select_account consent`).
- `connectGoogle` — exchange code → access/refresh token. Jika sudah ada record, refresh_token lama dipertahankan. Lalu auto-create folder root.
- `updateSettings` — ubah `folder_name` Google Drive.
- `cleanup` — panggil `GoogleDriveService::deleteOldFolders` retensi 7 hari.

### `WebhookSettingController`
- CRUD basic untuk `webhook_settings` user.
- `test` membangun payload `event=test` lalu mengirim langsung dengan HMAC-SHA256 signature.

### `ActivityLogController`
- `index` paginate audit log user dengan optional `search`.
- `purge` menerima `older_than_days` (`0` artinya purge ALL).

## Services

### `EncryptionService`
- Wrapper sederhana di atas `Crypt::encrypt/decrypt`.
- Dekripsi gagal mengembalikan `[DECRYPTION_ERROR]` (tidak melempar exception).
- Sebagian besar pemakaian sudah otomatis lewat Eloquent cast `'encrypted'`, jadi service ini lebih sebagai utilitas.

### `SshService`
- `connect(Server $server, $timeout=30)` — otentikasi password atau private key (`PublicKeyLoader::load`).
- `sftp(Server $server, $timeout=10)` — sama tapi mengembalikan `SFTP`.
- `execute(Server $server, string $command)` — open SSH, run, throw kalau exit code ≠ 0.

### `GoogleDriveService`
- Konstruktor: build `Google\Client` dengan client_id/secret dari config, scope `Drive::DRIVE_FILE`.
- `getAuthUrl()` — URL OAuth.
- `authenticate(code)` — exchange code → token array.
- `setAccessToken(UserStorage $storage)` — set token aktif. Jika expired → fetch refresh → update record.
- `createFolder(name, parentId?)` — buat folder.
- `getOrCreateFolderByName(name)` — root-level lookup-or-create.
- `getOrCreateSubfolder(name, parentId)` — subfolder lookup-or-create.
- `uploadFile(filePath, fileName, folderId?)`:
  - ≤ 5MB → multipart.
  - > 5MB → resumable upload dengan chunk 20MB (kompatibel database multi-GB).
  - Error 403 (`storageQuotaExceeded`) dan 401 (`Unauthorized`) di-handle eksplisit.
- `deleteOldFolders(rootFolderId, days=7)` — list subfolder pola `YYYYMMDD`, hapus yang < `cutoffDate`.

### `WebhookService`
- `send(event, data, user)`:
  - Iterasi seluruh `webhookSettings` user dengan `is_active = true`.
  - Skip kalau event tidak ada di `events` setting.
  - Untuk setiap setting yang lolos filter, panggil internal `dispatch()`.
- `sendOne(setting, event, data, user)` — kirim ke satu setting tertentu tanpa cek event filter / `is_active`. Dipakai endpoint "Test webhook".
- `dispatch()` (protected) membangun payload dan POST:
  - `target_whatsapp_id` setting (atau fallback `user->phone_number`).
  - JSON payload `{ event, timestamp, phone_number, data }`.
  - HMAC-SHA256 dengan `secret_key`.
  - Header `X-Webhook-Signature: hmac-sha256=<hex>`, `X-Webhook-Event`, `Content-Type: application/json`.
  - Timeout 10s, retry 2x dengan delay 500ms (hanya untuk connection error / 5xx).
  - Kembalikan struktur `{ setting_id, url, success, status, body }` atau `{ ..., success: false, error }`.

## Jobs

### `RunBackupJob`
- `timeout = 0` (unlimited) untuk database besar.
- `tries = 3`, backoff `[30, 60]` detik.
- Dispatched dari `BackupController@run`.
- Detail langkah lihat [03-architecture.md](03-architecture.md).

## Models

Semua model menggunakan trait bawaan `HasUuids` (kecuali `User`) dan punya cast `encrypted` di field sensitif.

| Model | Keypoints |
| --- | --- |
| `User` | UUID, `HasApiTokens`, `HasUuids`. Atribut hidden `password`, `remember_token`. Relasi `webhookSettings`. |
| `ServerGroup` | Belongs to `User`, has many `Server`. |
| `Server` | Belongs to `User` & `ServerGroup`. Has many `DatabaseConnection`. Field encrypted: `username`, `password`, `private_key`, `passphrase`. |
| `DatabaseConnection` | Belongs to `Server`. Field encrypted: `db_name`, `db_username`, `db_password`. |
| `BackupJob` | Belongs to `DatabaseConnection`, `User` (`triggered_by_user`). Track `status`, `started_at`, `finished_at`, `gdrive_*`, `webhook_sent`. |
| `UserStorage` | OAuth token Google Drive. Field encrypted: `access_token`, `refresh_token`. |
| `WebhookSetting` | Belongs to `User`. Field encrypted: `webhook_url`, `secret_key`. Cast `events` jadi array, `is_active` bool. |
| `ActivityLog` | UUID. Tidak punya `updated_at` (hanya `created_at` dengan `useCurrent`). Helper static `log(action, resource, resourceId, meta)`. |

## Providers

`AppServiceProvider::boot()`:
- Override URL reset password agar memuat link ke `config('app.frontend_url') . '/password-reset/{token}?email=...'`.
- Mendaftarkan rate limiter `api`, `login`, `backup` (lihat [03-architecture.md](03-architecture.md)).

## Testing

PestPHP 4 + plugin Laravel. Folder `tests/` (Feature & Unit) tersedia tapi suite saat ini minim. Konfigurasi di `phpunit.xml`. Untuk menjalankan:

```bash
docker exec -it envault-backend php artisan test
# atau
docker exec -it envault-backend ./vendor/bin/pest
```

## Aset Penting Lain

- `routes/auth.php` — endpoint Breeze untuk login/register web (`/login`, `/register`, dst.) — tidak dipakai oleh frontend Next.js, tapi tetap aktif.
- `database/factories/UserFactory.php` — factory standar.
- `database/seeders/DatabaseSeeder.php` — bikin user `admin@encenter.com / password`.

## Folder yang Sudah Tidak Ada

- `app/Traits/` — folder dihapus. Trait kustom `HasUuid` dulu disediakan sebagai fallback, tapi semua model produksi memakai `HasUuids` bawaan Laravel.
