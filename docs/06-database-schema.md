# 06 — Database Schema

EnCenter memakai **PostgreSQL** sebagai database utama. Semua tabel pakai primary key UUID, dan field sensitif disimpan sebagai ciphertext (Eloquent cast `'encrypted'` → AES-256-CBC).

## Diagram Relasi

```
users
 ├── webhook_settings (user_id)
 ├── server_groups (user_id)
 │    └── servers (group_id)
 │         └── database_connections (server_id)
 │              └── backup_jobs (db_connection_id, triggered_by_user)
 ├── user_storages (user_id)
 ├── activity_logs (user_id)
 ├── personal_access_tokens (Sanctum)
 └── (legacy) gdrive_credentials (user_id)
```

## Tabel

### `users`

Migration: `0001_01_01_000000_create_users_table.php`.

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | UUID PK | |
| `name` | string | |
| `email` | string unique | |
| `email_verified_at` | timestamp nullable | |
| `password` | string | bcrypt |
| `phone_number` | string nullable | Default tujuan WhatsApp untuk webhook |
| `is_active` | boolean | default `true` |
| `last_login` | timestamp nullable | |
| `remember_token` | rememberToken | |
| `created_at`, `updated_at` | timestamps | |

Migration yang sama juga membuat `password_reset_tokens` (string PK email) dan `sessions` (string PK, `user_id` UUID).

### `personal_access_tokens` (Sanctum)

Migration: `2026_05_14_131029_create_personal_access_tokens_table.php` (default Sanctum).

Token API yang dibuat lewat `User::createToken('device_name')`.

### `cache` & `cache_locks`

Migration: `0001_01_01_000001_create_cache_table.php`. Menampung cache dan lock kalau `CACHE_STORE=database`.

### `jobs`, `failed_jobs`, `job_batches`

Migration: `0001_01_01_000002_create_jobs_table.php`. Menampung antrian queue kalau `QUEUE_CONNECTION=database`.

### `server_groups`

Migration: `2026_05_14_000001_create_server_groups_table.php`.

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | UUID PK | |
| `user_id` | UUID FK users | ON DELETE CASCADE |
| `name` | string(100) | |
| `description` | text nullable | |
| `color` | string(7) nullable | hex color (mis. `#10b981`) |
| `created_at`, `updated_at` | timestamps | |

### `servers`

Migration: `2026_05_14_000002_create_servers_table.php`.

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | UUID PK | |
| `user_id` | UUID FK users | ON DELETE CASCADE |
| `group_id` | UUID FK server_groups nullable | ON DELETE SET NULL |
| `label` | string(100) | |
| `host` | string(255) | |
| `port` | smallint | default `22` |
| `username` | text | **encrypted** |
| `auth_type` | string(20) | `password` atau `private_key` |
| `password` | text nullable | **encrypted** |
| `private_key` | text nullable | **encrypted** |
| `passphrase` | text nullable | **encrypted** |
| `notes` | text nullable | |
| `is_active` | boolean | default `true` |
| `last_connected` | timestamp nullable | |
| `created_at`, `updated_at` | timestamps | |

### `database_connections`

Migration: `2026_05_14_000003_create_database_connections_table.php` + alter `2026_05_16_005045_make_db_name_nullable...`.

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | UUID PK | |
| `server_id` | UUID FK servers | ON DELETE CASCADE |
| `label` | string(100) | |
| `db_type` | string(20) | default `mysql`. Allowed: `mysql`, `mariadb`, `postgresql` |
| `db_host` | string(255) | default `127.0.0.1` |
| `db_port` | smallint | default `3306` |
| `db_name` | text **nullable** | **encrypted**. Null = backup ALL databases (kecuali system DB) |
| `db_username` | text | **encrypted** |
| `db_password` | text | **encrypted** |
| `notes` | text nullable | |
| `is_active` | boolean | default `true` |
| `created_at`, `updated_at` | timestamps | |

### `backup_jobs`

Migration: `2026_05_14_000004_create_backup_jobs_table.php`.

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | UUID PK | |
| `db_connection_id` | UUID FK database_connections nullable | ON DELETE SET NULL |
| `triggered_by` | string(20) | `manual`, `api`, atau custom (`n8n_scheduler`, dst.) |
| `triggered_by_user` | UUID FK users nullable | ON DELETE SET NULL |
| `status` | string(20) | `pending`, `running`, `success`, `failed` |
| `started_at` | timestamp nullable | |
| `finished_at` | timestamp nullable | |
| `duration_seconds` | integer nullable | |
| `file_name` | string(255) nullable | |
| `file_size_bytes` | bigint nullable | |
| `gdrive_file_id` | string(255) nullable | |
| `gdrive_file_url` | text nullable | URL ke folder per-tanggal di Drive |
| `webhook_sent` | boolean | default `false` |
| `webhook_sent_at` | timestamp nullable | |
| `error_message` | text nullable | |
| `created_at`, `updated_at` | timestamps | |

### `gdrive_credentials` (deprecated, di-drop oleh migrasi)

Migration: `2026_05_14_000005_create_gdrive_credentials_table.php` membuat tabel ini di awal pengembangan, lalu `2026_05_23_000001_drop_gdrive_credentials_table.php` men-drop-nya. Perannya sudah digantikan oleh `user_storages` (lebih general, ada kolom `provider` + folder Drive). Untuk kompatibilitas migrasi historis, file `create` tetap ada — `drop` tinggal menyusul setelahnya.

### `user_storages`

Migration: `2026_05_16_010059_create_user_storages_table.php`.

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | UUID PK | |
| `user_id` | UUID FK users | ON DELETE CASCADE |
| `provider` | string | default `google_drive` |
| `email` | string nullable | |
| `access_token` | text nullable | **encrypted** |
| `refresh_token` | text nullable | **encrypted** |
| `expires_at` | timestamp nullable | |
| `folder_id` | string nullable | ID folder Drive root |
| `folder_name` | string nullable | nama folder root (default `EnCenter_Backups`) |
| `is_active` | boolean | default `true` |
| `created_at`, `updated_at` | timestamps | |

### `webhook_settings`

Migration: `2026_05_14_000006_create_webhook_settings_table.php` + alter `2026_05_17_014329_add_target_whatsapp_id...`.

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | UUID PK | |
| `user_id` | UUID FK users | ON DELETE CASCADE |
| `name` | string(100) | |
| `target_whatsapp_id` | string(100) nullable | Group JID atau nomor target. Null → fallback ke `users.phone_number` |
| `webhook_url` | text | **encrypted** |
| `secret_key` | text | **encrypted** (HMAC-SHA256 secret) |
| `is_active` | boolean | default `true` |
| `events` | json nullable | mis. `["backup.success","backup.failed"]` |
| `created_at`, `updated_at` | timestamps | |

### `activity_logs`

Migration: `2026_05_14_000007_create_activity_logs_table.php`.

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | UUID PK | |
| `user_id` | UUID FK users nullable | ON DELETE SET NULL |
| `action` | string(100) | mis. `auth.login`, `VAULT_ADD`, `TEST_CONNECTION`, `PURGE` |
| `resource` | string(100) nullable | mis. `SERVER`, `DB_CONN`, `DATABASE`, `ACTIVITY_LOG` |
| `resource_id` | UUID nullable | id object terkait |
| `meta` | json nullable | metadata bebas (mis. `label`, `status`, `error`) |
| `ip_address` | string(45) nullable | mendukung IPv6 |
| `created_at` | timestamp `useCurrent` | (tidak ada `updated_at`) |

## Konvensi Action `activity_logs`

Berdasarkan kode controller dan middleware, action yang dipakai:

| Action | Resource | Dipicu oleh |
| --- | --- | --- |
| `auth.login`, `auth.logout` | (path) | `ActivityLogger` middleware |
| `REGISTER` | `SERVER` | `ServerController@store` |
| `UPDATE` | `SERVER` | `ServerController@update` |
| `DELETE` | `SERVER` | `ServerController@destroy` |
| `VIEW_CREDENTIALS` | `SERVER` / `DB_CONN` | controller `credentials()` |
| `TEST_CONNECTION` | `SERVER` / `DATABASE` | endpoint test |
| `CREATE`/`UPDATE`/`DELETE` | `SERVER_GROUP` | `ServerGroupController` |
| `VAULT_ADD`/`VAULT_UPDATE`/`VAULT_DELETE` | `DB_CONN` | `DatabaseConnectionController` |
| `PURGE` | `ACTIVITY_LOG` | `ActivityLogController@purge` |

## Migrasi Order

Daftar migrasi (urut eksekusi):

1. `0001_01_01_000000_create_users_table.php`
2. `0001_01_01_000001_create_cache_table.php`
3. `0001_01_01_000002_create_jobs_table.php`
4. `2026_05_14_000001_create_server_groups_table.php`
5. `2026_05_14_000002_create_servers_table.php`
6. `2026_05_14_000003_create_database_connections_table.php`
7. `2026_05_14_000004_create_backup_jobs_table.php`
8. `2026_05_14_000005_create_gdrive_credentials_table.php`
9. `2026_05_14_000006_create_webhook_settings_table.php`
10. `2026_05_14_000007_create_activity_logs_table.php`
11. `2026_05_14_131029_create_personal_access_tokens_table.php`
12. `2026_05_16_005045_make_db_name_nullable_in_database_connections_table.php`
13. `2026_05_16_010059_create_user_storages_table.php`
14. `2026_05_17_014329_add_target_whatsapp_id_to_webhook_settings_table.php`
15. `2026_05_23_000001_drop_gdrive_credentials_table.php`

## Seeder

`DatabaseSeeder.php` membuat satu user admin:

```text
email:    admin@encenter.com
password: password
phone:    628123456789
is_active true
```

> Ganti password setelah login pertama.

## Database Lain di Stack

Stack juga menjalankan **Postgres terpisah** (`postgres:15`) untuk Evolution API dengan database `evolution`, user `evolution`. Anda bisa:

- Menjalankan database EnCenter di Postgres yang sama (buat database/user terpisah).
- Atau menambah service Postgres lain khusus EnCenter (preferensi production).

phpMyAdmin (`8081`) hanya untuk membantu administrasi MySQL/MariaDB di **server target Anda** — bukan untuk mengelola Postgres internal stack ini.

---

[← Sebelumnya: Frontend](05-frontend.md) · [Kembali ke Home](README.md) · [Selanjutnya: Services →](07-services.md)
