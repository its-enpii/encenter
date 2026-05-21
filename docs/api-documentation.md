# Panduan Lengkap & Dokumentasi API EnCenter

Dokumen ini menyediakan spesifikasi lengkap untuk seluruh API endpoints aplikasi **EnCenter**, format payload JSON, parameter request/response, serta petunjuk integrasi yang aman dan praktis menggunakan **n8n**.

---

## 1. Hubungan Jaringan & Konfigurasi URL

Karena EnCenter berjalan dalam satu jaringan internal Docker Compose (`agent-network`), Anda memiliki pilihan Base URL:

*   **Akses Internal Docker (Direkomendasikan untuk n8n):**
    `http://envault-nginx/api/v1`
*   **Akses Eksternal Host (Untuk Postman, cURL, atau Aplikasi Luar):**
    `http://localhost:8000/api/v1`

---

## 2. Pilihan Autentikasi Praktis untuk n8n

Semua endpoint API EnCenter dilindungi oleh middleware keamanan terpadu. Untuk integrasi n8n, Anda dapat memilih salah satu dari dua metode autentikasi berikut:

### Metode A: Menggunakan API Key (Sangat Direkomendasikan & Praktis)

Anda dapat menggunakan header API Key statis tanpa perlu meng-generate token database. 

1.  **Konfigurasi di Server (EnCenter):**
    Tambahkan variabel environment `N8N_API_KEY` di dalam file `.env` pada folder `website/backend/.env`:
    ```env
    N8N_API_KEY=kunci_rahasia_n8n_anda_yang_sangat_panjang_dan_aman
    ```
2.  **Konfigurasi di Node HTTP Request n8n:**
    Pada panel konfigurasi node **HTTP Request** n8n:
    *   **Authentication:** Pilih `None` (karena kita akan memasukkan custom header secara manual)
    *   **Headers (Tambahkan Baru):**
        *   **Name:** `X-API-Key`
        *   **Value:** `kunci_rahasia_n8n_anda_yang_sangat_panjang_dan_aman` (sesuai `.env`)

---

### Metode B: Menggunakan Sanctum Personal Access Token (Alternatif)

Jika Anda lebih memilih menggunakan sistem token bawaan Laravel Sanctum, Anda dapat membuat token sekali saja yang bersifat permanen.

1.  **Generate Token via Laravel Tinker:**
    Jalankan perintah ini di terminal server EnCenter Anda:
    ```bash
    docker exec -it envault-backend php artisan tinker
    ```
    Lalu eksekusi perintah PHP berikut:
    ```php
    $user = \App\Models\User::where('email', 'admin@encenter.com')->first();
    echo $user->createToken('n8n_integration')->plainTextToken;
    ```
    Salin token yang dikembalikan (misalnya: `3|abc123xyz...`).
2.  **Konfigurasi di Node HTTP Request n8n:**
    Pada panel konfigurasi node **HTTP Request** n8n:
    *   **Authentication:** Pilih `Header Auth`
    *   **Name:** `Authorization`
    *   **Value:** `Bearer <TOKEN_PERMANEN_ANDA>` (Contoh: `Bearer 3|abc123xyz...`)

---

---

## 3. Spesifikasi Lengkap API Endpoints

### 3.1. Kelompok Autentikasi & Profil (`/auth`)

#### A. Login User (Mendapatkan Token)
*   **Method / Route:** `POST /auth/login`
*   **Headers:** `Content-Type: application/json`
*   **Request Parameters:**
    *   `email` (string, required, email valid)
    *   `password` (string, required)
    *   `device_name` (string, optional, default: 'dashboard')
*   **Contoh Request Body:**
    ```json
    {
      "email": "admin@encenter.com",
      "password": "password",
      "device_name": "n8n_integration"
    }
    ```
*   **Contoh Response Sukses (200 OK):**
    ```json
    {
      "token": "3|abc123xyz...",
      "user": {
        "id": 1,
        "name": "Admin EnCenter",
        "email": "admin@encenter.com",
        "phone_number": "628123456789",
        "is_active": true,
        "last_login": "2026-05-19T03:43:00.000000Z",
        "created_at": "2026-05-19T03:40:00.000000Z",
        "updated_at": "2026-05-19T03:43:00.000000Z"
      }
    }
    ```
*   **Contoh Response Gagal (422 Unprocessable Content):**
    ```json
    {
      "message": "Kredensial yang diberikan salah.",
      "errors": {
        "email": [
          "Kredensial yang diberikan salah."
        ]
      }
    }
    ```

#### B. Logout User
*   **Method / Route:** `POST /auth/logout`
*   **Response Sukses (200 OK):**
    ```json
    {
      "message": "Berhasil keluar."
    }
    ```

#### C. Informasi Profil Saat Ini
*   **Method / Route:** `GET /auth/me`
*   **Response Sukses (200 OK):**
    ```json
    {
      "id": 1,
      "name": "Admin EnCenter",
      "email": "admin@encenter.com",
      "phone_number": "628123456789",
      "is_active": true,
      "last_login": "2026-05-19T03:43:00.000000Z"
    }
    ```

#### D. Memperbarui Profil & Password
*   **Method / Route:** `PUT /auth/profile`
*   **Request Parameters:**
    *   `name` (string, required, max: 100)
    *   `phone_number` (string, optional, max: 20)
    *   `password` (string, optional, min: 8, confirmed)
    *   `password_confirmation` (string, required jika `password` diisi)
*   **Contoh Request Body:**
    ```json
    {
      "name": "Administrator Baru",
      "phone_number": "628999999999"
    }
    ```
*   **Response Sukses (200 OK):**
    ```json
    {
      "message": "Profil berhasil diperbarui.",
      "user": {
        "id": 1,
        "name": "Administrator Baru",
        "email": "admin@encenter.com",
        "phone_number": "628999999999",
        "is_active": true
      }
    }
    ```

---

### 3.2. Grup Server (`/server-groups`)

#### A. List Grup Server
*   **Method / Route:** `GET /server-groups`
*   **Response Sukses (200 OK):**
    ```json
    {
      "status": "success",
      "data": [
        {
          "id": 1,
          "user_id": 1,
          "name": "Production Servers",
          "description": "Semua server live produksi",
          "color": "#10b981",
          "created_at": "2026-05-19T03:40:00.000000Z",
          "updated_at": "2026-05-19T03:40:00.000000Z",
          "servers_count": 3
        }
      ]
    }
    ```

#### B. Membuat Grup Server Baru
*   **Method / Route:** `POST /server-groups`
*   **Request Parameters:**
    *   `name` (string, required, max: 100)
    *   `description` (string, optional)
    *   `color` (string, optional, max: 20, default: '#10b981')
*   **Contoh Request Body:**
    ```json
    {
      "name": "Staging Node",
      "description": "Server untuk testing",
      "color": "#3b82f6"
    }
    ```
*   **Response Sukses (201 Created):**
    ```json
    {
      "status": "success",
      "message": "Server group created successfully",
      "data": {
        "id": 2,
        "user_id": 1,
        "name": "Staging Node",
        "description": "Server untuk testing",
        "color": "#3b82f6",
        "created_at": "2026-05-19T03:54:00.000000Z",
        "updated_at": "2026-05-19T03:54:00.000000Z"
      }
    }
    ```

#### C. Memperbarui Grup Server
*   **Method / Route:** `PUT /server-groups/{id}`
*   **Response Sukses (200 OK):**
    ```json
    {
      "status": "success",
      "message": "Server group updated successfully",
      "data": {
        "id": 2,
        "name": "Staging Node Updated",
        "description": "Server untuk testing dan sandbox",
        "color": "#ef4444"
      }
    }
    ```

#### D. Menghapus Grup Server
*   **Method / Route:** `DELETE /server-groups/{id}`
*   **Response Sukses (200 OK):**
    ```json
    {
      "status": "success",
      "message": "Server group deleted successfully"
    }
    ```

---

### 3.3. Server Nodes / Koneksi SSH (`/servers`)

#### A. List Server Nodes
*   **Method / Route:** `GET /servers`
*   **Query Parameters:**
    *   `group_id` (integer, optional) - filter berdasarkan grup
    *   `search` (string, optional) - filter berdasarkan label server
    *   `limit` (integer, optional, default: 10) - jumlah per halaman
    *   `paginate` (string, optional) - Jika diisi `"false"`, API akan langsung mengembalikan **flat array (non-paginated)**.
*   **Response Sukses (200 OK - default paginated):**
    ```json
    {
      "current_page": 1,
      "data": [
        {
          "id": 1,
          "user_id": 1,
          "group_id": 1,
          "label": "App Server 01",
          "host": "192.168.1.50",
          "port": 22,
          "username": "ubuntu",
          "auth_type": "private_key",
          "notes": "Server utama web app",
          "is_active": true,
          "last_connected": "2026-05-19T03:45:00.000000Z",
          "created_at": "2026-05-19T03:40:00.000000Z",
          "group": {
            "id": 1,
            "name": "Production Servers"
          }
        }
      ],
      "total": 1
    }
    ```

#### B. Menambahkan Server Node Baru
*   **Method / Route:** `POST /servers`
*   **Request Parameters:**
    *   `group_id` (integer, optional, exists:server_groups,id)
    *   `label` (string, required, max: 100)
    *   `host` (string, required, max: 255)
    *   `port` (integer, optional, default: 22)
    *   `username` (string, required)
    *   `auth_type` (string, required, in: `password`, `private_key`)
    *   `password` (string, required jika auth_type = password)
    *   `private_key` (string, required jika auth_type = private_key)
    *   `passphrase` (string, optional, untuk private key)
    *   `notes` (string, optional)
*   **Contoh Request Body:**
    ```json
    {
      "group_id": 1,
      "label": "Backup Server Node",
      "host": "198.51.100.10",
      "port": 22,
      "username": "root",
      "auth_type": "password",
      "password": "SuperSecurePassword123"
    }
    ```
*   **Response Sukses (201 Created):**
    ```json
    {
      "status": "success",
      "message": "Server node registered successfully",
      "data": {
        "id": 3,
        "label": "Backup Server Node",
        "host": "198.51.100.10",
        "port": 22,
        "username": "root",
        "auth_type": "password"
      }
    }
    ```

#### C. Mengetes Koneksi SSH Server
*   **Method / Route:** `POST /servers/{id}/test`
*   **Fungsi:** Menguji koneksi secure handshake SSH langsung ke server target.
*   **Response Sukses (200 OK):**
    ```json
    {
      "status": "success",
      "message": "Secure handshake established successfully.",
      "banner": "SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.1"
    }
    ```
*   **Response Gagal (400 Bad Request):**
    ```json
    {
      "status": "error",
      "message": "Handshake failed: Connection timed out"
    }
    ```

---

### 3.4. Koneksi Database (`/database-connections`)

#### A. List Koneksi Database
*   **Method / Route:** `GET /database-connections`
*   **Query Parameters:**
    *   `server_id` (integer, optional) - filter berdasarkan server node
    *   `limit` (integer, optional, default: 10)
    *   `paginate` (string, optional) - Jika diisi `"false"`, API akan langsung mengembalikan **flat array (non-paginated)**. Sangat direkomendasikan untuk n8n agar n8n dapat melakukan iterasi otomatis tanpa perlu melingkar atau memparsing struktur pagination!
*   **Response Sukses (200 OK - default paginated):**
    ```json
    {
      "current_page": 1,
      "data": [
        {
          "id": "e0e84dbf-ea7a-43a3-9310-88350259828e",
          "server_id": 1,
          "label": "MySQL Main DB",
          "db_type": "mysql",
          "db_host": "127.0.0.1",
          "db_port": 3306,
          "db_name": "app_production",
          "db_username": "db_user",
          "is_active": true,
          "server": {
            "id": 1,
            "label": "App Server 01"
          }
        }
      ]
    }
    ```

#### B. Menambahkan Koneksi Database Baru
*   **Method / Route:** `POST /database-connections`
*   **Request Parameters:**
    *   `server_id` (integer, required, belongs to authorized user)
    *   `label` (string, required, max: 100)
    *   `db_type` (string, required, in: `mysql`, `mariadb`, `postgresql`)
    *   `db_host` (string, required, max: 255)
    *   `db_port` (integer, required)
    *   `db_name` (string, optional - jika kosong, backup akan mencakup seluruh database)
    *   `db_username` (string, required)
    *   `db_password` (string, required)
    *   `notes` (string, optional)
*   **Contoh Request Body:**
    ```json
    {
      "server_id": 1,
      "label": "Postgres Analytics",
      "db_type": "postgresql",
      "db_host": "127.0.0.1",
      "db_port": 5432,
      "db_name": "analytics_prod",
      "db_username": "postgres_user",
      "db_password": "DatabasePassword999"
    }
    ```
*   **Response Sukses (201 Created):**
    ```json
    {
      "status": "success",
      "message": "Database connection credentials stored",
      "data": {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "label": "Postgres Analytics",
        "db_type": "postgresql"
      }
    }
    ```

#### C. Mengetes Koneksi Database via SSH
*   **Method / Route:** `POST /database-connections/{id}/test`
*   **Fungsi:** Menguji konektivitas port dan kredensial database target secara tidak langsung dengan mengeksekusi CLI test utility (`mysqladmin ping` atau `pg_isready`) melalui koneksi SSH server induk.
*   **Response Sukses (200 OK):**
    ```json
    {
      "status": "success",
      "message": "Remote database handshake successful.",
      "latency": "120ms",
      "details": "mysqld is alive"
    }
    ```

---

### 3.5. Mesin Pencadangan / Backup Engine (`/backups`)
Ini adalah sekumpulan endpoint vital yang biasanya diakses n8n untuk otomasi scheduler.

#### A. Trigger Backup secara Instan (Programmatic Trigger)
*   **Method / Route:** `POST /backups/run`
*   **Request Parameters:**
    *   `db_connection_id` (UUID, required_without:db_label, exists:database_connections,id) - ID koneksi database.
    *   `db_label` (string, required_without:db_connection_id, max: 100) - Nama label koneksi database (misal: `"MySQL Main DB"`). Sangat praktis untuk integrasi n8n sehingga tidak perlu menghafal UUID.
    *   `triggered_by` (string, optional, max: 50, default: 'manual') - Ubah parameter ini menjadi `'n8n_scheduler'` atau `'workflow_automator'` untuk memudahkan pelacakan di audit logs.
*   **Contoh Request Body (Menggunakan Label - Direkomendasikan untuk n8n):**
    ```json
    {
      "db_label": "MySQL Main DB",
      "triggered_by": "n8n_scheduler"
    }
    ```
*   **Contoh Request Body (Menggunakan UUID):**
    ```json
    {
      "db_connection_id": "e0e84dbf-ea7a-43a3-9310-88350259828e",
      "triggered_by": "n8n_scheduler"
    }
    ```
*   **Response Sukses (200 OK):**
    ```json
    {
      "status": "success",
      "message": "Backup job dispatched successfully.",
      "data": {
        "id": 99,
        "db_connection_id": "e0e84dbf-ea7a-43a3-9310-88350259828e",
        "triggered_by": "n8n_scheduler",
        "triggered_by_user": 1,
        "status": "pending",
        "created_at": "2026-05-19T03:55:00.000000Z"
      }
    }
    ```
    > [!NOTE]
    > Request ini bersifat asinkronus. Segera setelah request dipanggil, backup job akan dimasukkan ke antrean worker Laravel (`envault-worker`) untuk dieksekusi di latar belakang agar n8n tidak mengalami *timeout* saat mencadangkan database yang berukuran sangat besar.

#### B. Mendapatkan Riwayat Pencadangan (Backup History)
*   **Method / Route:** `GET /backups`
*   **Query Parameters:**
    *   `db_connection_id` (UUID, optional) - filter berdasarkan koneksi database tertentu
    *   `per_page` (integer, optional, default: 10) - jumlah per halaman
    *   `paginate` (string, optional) - Jika diisi `"false"`, API akan langsung mengembalikan **flat array (non-paginated)** di dalam properti `"data"`. Sangat praktis untuk n8n!
*   **Response Sukses (200 OK):**
    ```json
    {
      "status": "success",
      "data": [
        {
          "id": 99,
          "db_connection_id": "e0e84dbf-ea7a-43a3-9310-88350259828e",
          "status": "success",
          "file_name": "MySQL_Main_DB_app_production_20260519_035500.sql.gz",
          "file_size_bytes": 1420551,
          "duration_seconds": 8,
          "gdrive_file_url": "https://drive.google.com/open?id=1EC3Vh8rBJk2...",
          "started_at": "2026-05-19T03:55:01.000000Z",
          "finished_at": "2026-05-19T03:55:09.000000Z",
          "database_connection": {
            "id": "e0e84dbf-ea7a-43a3-9310-88350259828e",
            "label": "MySQL Main DB",
            "server": {
              "id": 1,
              "label": "App Server 01"
            }
          }
        }
      ]
    }
    ```

#### C. Cek Status Backup Job Tertentu
*   **Method / Route:** `GET /backups/{id}`
*   **Response Sukses (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "id": 99,
        "db_connection_id": "e0e84dbf-ea7a-43a3-9310-88350259828e",
        "status": "success",
        "file_name": "MySQL_Main_DB_app_production_20260519_035500.sql.gz",
        "file_size_bytes": 1420551,
        "duration_seconds": 8,
        "gdrive_file_id": "1A2B3C4D5E...",
        "gdrive_file_url": "https://drive.google.com/open?id=1A2B3C4D5E...",
        "error_message": null,
        "started_at": "2026-05-19T03:55:01.000000Z",
        "finished_at": "2026-05-19T03:55:09.000000Z",
        "database_connection": {
          "id": "e0e84dbf-ea7a-43a3-9310-88350259828e",
          "label": "MySQL Main DB",
          "server": {
            "id": 1,
            "label": "App Server 01"
          }
        }
      }
    }
    ```

---

### 3.6. Integrasi Webhooks (`/webhooks`)
Digunakan untuk mendaftarkan URL n8n yang akan menerima notifikasi otomatis ketika backup selesai dikerjakan oleh worker.

#### A. Membuat Webhook Pendaftaran
*   **Method / Route:** `POST /webhooks`
*   **Request Parameters:**
    *   `name` (string, required, max: 100)
    *   `webhook_url` (string, required, format url valid)
    *   `secret_key` (string, required) - Key yang dipakai untuk enkripsi HMAC-SHA256 signature
    *   `target_whatsapp_id` (string, optional, nomor penerima WA di n8n)
    *   `is_active` (boolean, optional, default: true)
    *   `events` (array, optional) - Contoh: `["backup.success", "backup.failed"]`
*   **Contoh Request Body:**
    ```json
    {
      "name": "n8n Webhook Notifikasi",
      "webhook_url": "http://n8n:5678/webhook/backup-notifier",
      "secret_key": "RahasiaNegaraEnCenter99",
      "is_active": true,
      "events": [
        "backup.success",
        "backup.failed"
      ]
    }
    ```
*   **Response Sukses (201 Created):**
    ```json
    {
      "id": 5,
      "name": "n8n Webhook Notifikasi",
      "webhook_url": "http://n8n:5678/webhook/backup-notifier",
      "is_active": true,
      "events": [
        "backup.success",
        "backup.failed"
      ]
    }
    ```

### 3.7. Penyimpanan Cloud & Pemeliharaan (`/storage`)

#### A. Bersihkan Backup Drive yang Berumur Lebih dari 7 Hari (Cleanup)

Endpoint ini digunakan untuk membersihkan subfolder lama di Google Drive secara otomatis (dapat dipanggil via Cron/n8n daily). Script akan melacak folder berformat nama `YYYYMMDD` di dalam folder root backup, membandingkan dengan tanggal cutoff (7 hari lalu), dan menghapus yang sudah kedaluwarsa beserta seluruh isinya.

- **Endpoint:** `POST /storage/google/cleanup`
- **Autentikasi:** Diperlukan (API Key / Sanctum Token)
- **Headers:**
  ```http
  Content-Type: application/json
  X-API-Key: <your_api_key> (atau Authorization: Bearer <your_token>)
  ```
- **Response Sukses (HTTP 200):**
  ```json
  {
    "status": "success",
    "message": "Storage cleanup completed.",
    "deleted_folders": [
      {
        "id": "1EC3Vh8rBJk2...",
        "name": "20260514",
        "status": "deleted"
      }
    ]
  }
  ```
- **Response Gagal (HTTP 404 - Belum Konek Google Drive):**
  ```json
  {
    "status": "error",
    "message": "Active Google Drive storage not configured."
  }
  ```

### 3.8. Log Aktivitas / Audit Logs (`/audit-logs`)
Digunakan untuk merekam seluruh jejak aktivitas pengguna di dalam Vault Credential dan jalannya pencadangan sistem.

#### A. List Audit Logs
*   **Method / Route:** `GET /audit-logs`
*   **Query Parameters:**
    *   `search` (string, optional) - pencarian berdasarkan aksi atau tipe resource
    *   `limit` (integer, optional, default: 20) - jumlah per halaman
    *   `paginate` (string, optional) - Jika diisi `"false"`, API akan langsung mengembalikan **flat array (non-paginated)**. Sangat direkomendasikan untuk n8n!
*   **Response Sukses (200 OK - default paginated):**
    ```json
    {
      "current_page": 1,
      "data": [
        {
          "id": 1,
          "user_id": 1,
          "action": "VAULT_ADD",
          "resource": "DB_CONN",
          "target_id": "e0e84dbf-ea7a-43a3-9310-88350259828e",
          "details": {
            "label": "MySQL Main DB"
          },
          "created_at": "2026-05-19T03:55:00.000000Z",
          "user": {
            "id": 1,
            "name": "Admin EnCenter",
            "email": "admin@encenter.com"
          }
        }
      ]
    }
    ```

---

## 4. Keamanan Payload Webhook ke n8n

Ketika sebuah job backup selesai dikerjakan, EnCenter akan memancarkan payload JSON menggunakan metode `POST` ke URL webhook yang Anda daftarkan.

### Header HTTP yang Dikirimkan EnCenter:
```http
X-Webhook-Event: backup.success
X-Webhook-Signature: hmac-sha256=a8f4c2e64627d3b...
Content-Type: application/json
```

### Format Payload JSON (`backup.success`):
```json
{
  "event": "backup.success",
  "timestamp": "2026-05-19T03:55:09.000Z",
  "phone_number": "628123456789",
  "data": {
    "backup_job_id": 99,
    "server_label": "App Server 01",
    "database_label": "MySQL Main DB",
    "status": "success",
    "file_name": "MySQL_Main_DB_app_production_20260519_035500.sql.gz",
    "file_size_bytes": 1420551,
    "gdrive_file_url": "https://drive.google.com/open?id=1A2B3C4D5E...", // Link langsung menuju FOLDER Google Drive tempat backup hari ini disimpan
    "duration_seconds": 8,
    "triggered_by": "n8n_scheduler"
  }
}
```

### Format Payload JSON (`backup.failed`):
```json
{
  "event": "backup.failed",
  "timestamp": "2026-05-19T03:56:00.000Z",
  "phone_number": "628123456789",
  "data": {
    "backup_job_id": 100,
    "server_label": "App Server 01",
    "database_label": "MySQL Main DB",
    "status": "failed",
    "error_message": "Backup failed: MySQL Server has gone away",
    "duration_seconds": 4,
    "triggered_by": "manual"
  }
}
```

### Algoritma Verifikasi Keamanan HMAC-SHA256 pada n8n:
Untuk memvalidasi integritas data, buat node **Function/Code** pada n8n segera setelah node Webhook untuk melakukan kalkulasi hash:

```javascript
const crypto = require('crypto');

// 1. Ambil raw body JSON dari input webhook
const rawBody = $input.first().json.body; 
// 2. Ambil signature dari header (buang awalan 'hmac-sha256=')
const receivedSignature = $headers['x-webhook-signature'].replace('hmac-sha256=', '');

// 3. Masukkan Secret Key yang Anda daftarkan di dashboard EnCenter
const secret = 'RahasiaNegaraEnCenter99'; 

// 4. Kalkulasikan signature lokal
const calculatedSignature = crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(rawBody))
  .digest('hex');

if (receivedSignature !== calculatedSignature) {
  throw new Error("Peringatan: Request tidak sah! Tanda tangan HMAC tidak cocok.");
}

// Request valid, teruskan alur
return [{ json: rawBody }];
```