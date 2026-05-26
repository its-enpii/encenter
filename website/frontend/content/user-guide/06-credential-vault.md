# 06 — Credential Vault (Database Connections)

**Credential Vault** adalah tempat Anda menyimpan kredensial database — yang menjadi sumber backup dan target untuk phpMyAdmin auto-login.

Setiap database connection harus menempel pada satu **server** yang sudah terdaftar di Server Fleet. Jadi alurnya: Server dulu, baru database connection.

Akses lewat **Sidebar → Credential Vault**.

## Tabel Vault

Kolom-kolom:

| Kolom | Isi |
| --- | --- |
| **Database** | Label + tipe DB + nama database (atau "ALL DBS") |
| **Server / Endpoint** | Server tempat database berjalan + host:port internal |
| **Status** | "Linked" (hijau) atau "Disconnected" (abu-abu) |
| **Actions** | Lima tombol aksi (lihat di bawah) |

## Tombol Aksi (Per Baris)

| Ikon | Fungsi | Catatan |
| --- | --- | --- |
| **External Link** (kuning) | Buka phpMyAdmin auto-login | Hanya untuk MySQL/MariaDB |
| **Play** (hijau) | Test connection ke database |
| **Cloud** (biru) | Run Backup |
| **Eye** (ungu) | View Credentials |
| **Pencil** | Edit |
| **Trash** (merah) | Delete |

## Menambah Database Connection

1. Klik **Add DB Credential** di kanan atas.
2. Form muncul dengan dua kartu: **Connection Context** (kiri) dan **Vault Auth** (kanan).

### Kartu Connection Context

| Field | Wajib | Catatan |
| --- | --- | --- |
| **Host Server** | Ya | Pilih dari dropdown server yang sudah ada |
| **Credential Label** | Ya | Nama bebas. Contoh: "Production WordPress DB" |
| **Database Engine** | Ya | MySQL, MariaDB, atau PostgreSQL |
| **Database Host** | Ya | Biasanya `127.0.0.1` (kalau DB di server yang sama dengan SSH host). Bisa juga IP database server eksternal. |
| **Port** | Tidak | Default `3306` (MySQL/MariaDB) atau `5432` (PostgreSQL) |

### Kartu Vault Auth

| Field | Wajib | Catatan |
| --- | --- | --- |
| **Database Name** | Tidak | **Penting** — lihat penjelasan di bawah |
| **DB Username** | Ya | User database. Contoh: `root`, `wp_user` |
| **DB Password** | Ya | Password DB user |
| **Security Notes** | Tidak | Catatan tambahan untuk Anda |

### Single DB vs All Databases

Field **Database Name** menentukan mode backup:

- **Diisi** (mis. `wordpress_prod`) → backup hanya database itu. Output: `<label>-YYYYMMDD-HHMMSS.sql.gz`.
- **Dikosongkan** → backup **semua** database di server tersebut yang user-nya punya akses. Output: `<label>-YYYYMMDD-HHMMSS.tar.gz` berisi banyak `.sql.gz`.

Untuk mode "all databases", user database harus punya privilege tinggi (biasanya `root` atau user dengan `SHOW DATABASES` + `LOCK TABLES` global).

3. Klik **ENCRYPT & SAVE TO VAULT**.

## Test Koneksi Database

Klik tombol **Play** di kolom Actions. EnCenter akan:

1. Decrypt kredensial DB.
2. SSH ke server tujuan.
3. Coba ping database (`mysqladmin ping` untuk MySQL/MariaDB, `pg_isready` untuk PostgreSQL).
4. Tutup koneksi.

Hasil muncul di dialog dengan **latency**:

- **Handshake Successful** — DB merespon. Latency ditampilkan dalam ms.
- **Handshake Failed** — DB tidak merespon. Pesan biasa: "Access denied for user", "Unknown database".

## Run Backup dari Vault

Klik tombol **Cloud** (biru). Dispatcher backup akan:

1. Membuat record `backup_jobs` dengan status `pending`.
2. Mengirim job ke queue worker.
3. Menampilkan dialog "Backup Initiated".

Untuk memantau progress, buka halaman [Backup History](07-backup.md).

> Anda bisa memicu backup walaupun status koneksi belum di-test. Tapi praktik baiknya tes dulu — kalau kredensial salah, backup tetap akan dispatch dan baru gagal di tahap dump (lebih lama).

## View Credentials Database

Klik tombol **Eye** (ungu). Modal menampilkan:

- DB Type
- DB Host:Port
- DB Name
- DB Username
- DB Password (tersembunyi, toggle dengan tombol mata)

Setiap field punya tombol copy. Aksi ini tercatat di audit log sebagai `VIEW_CREDENTIALS` (resource: database connection).

## Open phpMyAdmin

Khusus MySQL/MariaDB. Klik tombol **External Link** (kuning). EnCenter akan:

1. Decrypt kredensial DB.
2. Submit form POST tersembunyi ke phpMyAdmin custom (`/autologin.php`) di tab baru.
3. phpMyAdmin menerima POST, menyimpan kredensial di session, redirect ke index.

Hasilnya: Anda **langsung masuk phpMyAdmin** tanpa input apa-apa, di tab baru.

> Kredensial **tidak pernah muncul di URL** — pakai POST form, bukan query string.

Detail lebih lanjut: [10-phpmyadmin.md](10-phpmyadmin.md).

## Mengedit Database Connection

Klik tombol **Pencil**. Form mirip dengan Add, terisi data sekarang.

- Field password kosong default. Biarkan kosong jika tidak ingin mengubah.
- Mengubah `db_name` antara nilai dan kosong akan mengubah perilaku backup (single → all atau sebaliknya).

## Menghapus Database Connection

Klik tombol **Trash**. Dialog: **"Purge Database Credentials?"** → klik **Confirm Purge**.

> Backup yang sudah ada di Google Drive **tidak ikut terhapus**. Tapi history backup di EnCenter akan kehilangan referensi (label akan jadi "Deleted DB").

## Tips

- **Buat user database khusus untuk backup.** Misalnya user `backup_user` dengan privilege `SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER` saja. Lebih aman daripada `root`.
- **Untuk PostgreSQL**, pastikan user-nya punya `pg_read_all_data` atau di-set sebagai owner database tujuan.
- **Label deskriptif.** Sertakan nama klien atau project, jangan hanya "Production". Contoh: "Acme - WordPress Prod".
- **Hindari menyimpan dua connection ke database yang sama** dengan user berbeda kecuali memang dibutuhkan. Semakin sedikit duplikat, semakin mudah audit.

---

[← Sebelumnya: Server](05-server.md) · [Kembali ke Daftar Isi](README.md) · [Selanjutnya: Backup →](07-backup.md)
