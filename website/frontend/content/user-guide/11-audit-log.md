# 11 — Audit Log

Halaman **Audit Logs** menampilkan catatan tidak-bisa-diubah dari setiap aksi sensitif yang terjadi di sistem. Berguna untuk forensik, kepatuhan, dan sekadar mencari tahu "siapa yang menghapus database connection X kemarin?".

Akses lewat **Sidebar → Audit Logs**.

## Aksi Apa Saja yang Tercatat

Kategori (`action`) yang muncul di audit log:

| Action | Kapan Tercatat |
| --- | --- |
| **REGISTER** | User baru registrasi (jarang, biasanya admin lewat seeder) |
| **UPDATE** | Server / database / webhook / profile diedit |
| **DELETE** | Resource dihapus |
| **VAULT_ADD** | Server atau database connection baru dibuat |
| **VAULT_UPDATE** | Server atau database connection di-edit |
| **VAULT_DELETE** | Server atau database connection dihapus |
| **VIEW_CREDENTIALS** | Kredensial decrypted dilihat (tombol Eye atau auto-open phpMyAdmin) |
| **TEST_CONNECTION** | Test SSH atau test database |
| **PURGE** | Audit log lama di-purge |

Setiap baris audit log juga menyimpan:

- **Operator** — user yang melakukan aksi (atau "System" untuk job background).
- **IP Address** — IP request datang.
- **User Agent** — browser/tool yang dipakai.
- **Status Code** — HTTP status response.
- **Resource** — tipe resource yang dipengaruhi (Server, DatabaseConnection, dll).
- **Resource ID** — UUID resource.
- **Meta** — JSON tambahan (misal label resource saat dihapus).

## Tabel Audit

Kolom-kolom:

| Kolom | Isi |
| --- | --- |
| **Timestamp** | Waktu kejadian (font monospace) |
| **Action** | Badge berwarna sesuai tipe aksi |
| **Resource** | Tipe resource + 8 char pertama UUID + label target |
| **Operator** | Email user yang melakukan |
| **IP Address** | IP request |

Per-page selector dan pagination tersedia di footer tabel.

## Search & Filter

Kotak search di atas mendukung pencarian by **action** atau **resource**. Debounced 500ms.

Contoh pencarian berguna:

- `VAULT_DELETE` → semua aksi penghapusan vault.
- `PURGE` → semua aksi pembersihan audit log itu sendiri.
- `VIEW_CREDENTIALS` → semua aksi reveal kredensial (audit security paling penting).
- Nama server / label database → log yang menyebut resource itu.

## Membaca Entry

Contoh satu baris:

```
2026-05-26 10:42:13 | VIEW CREDENTIALS | DatabaseConnection (a1b2c3d4) Target: Acme Production DB | jane@company.com | 203.0.113.42
```

Artinya: **Jane**, dari IP `203.0.113.42`, melihat kredensial database "Acme Production DB" pada tanggal 26 Mei 2026, jam 10:42 lokal.

## Purge (Membersihkan Log Lama)

Audit log bisa membesar dengan cepat — setiap test connection, setiap reveal, setiap login mencatat satu baris. Untuk menghapus log lama:

1. Klik tombol **Purge Old Logs** (merah, kanan atas).
2. Modal "Purge Audit Logs" muncul.
3. Pilih **Retention Window** dari dropdown:
   - Older than 7 days
   - Older than 30 days (default)
   - Older than 90 days
   - Older than 180 days
   - Older than 365 days
   - **ALL logs** (purge everything)
4. Baca peringatan di kotak merah: jumlah/cakupan yang akan dihapus.
5. Klik **Confirm Purge**.

> Aksi PURGE itu **sendiri tercatat di audit log** (tidak ikut terhapus). Jadi jejak "siapa yang membersihkan log X tanggal kapan" selalu ada.

> **PURGE tidak bisa di-undo.** Pastikan Anda yakin sebelum konfirmasi.

## Praktik Audit yang Baik

### Review Mingguan
Setiap hari Senin (atau jadwal apapun yang nyaman), buka audit log dan filter:

- `VIEW_CREDENTIALS` — pastikan tidak ada akses kredensial di luar jam kerja atau dari IP asing.
- `DELETE` / `VAULT_DELETE` — pastikan setiap penghapusan punya alasan jelas.
- IP yang asing — bisa jadi ada operator yang login dari WiFi publik atau VPN tidak biasa.

### Korelasi dengan Insiden
Kalau ada anomali (backup gagal, server tidak bisa connect, dll.), buka audit log dan filter berdasarkan resource ID. Sering ketahuan: "Oh, kemarin sore ada UPDATE di server ini, mungkin SSH password ikut diubah".

### Retention Policy
Diskusikan dengan tim:

- **Compliance ringan**: 90 hari cukup.
- **SOC2 / ISO 27001 / regulasi finansial**: minimal 1 tahun (365 hari) atau lebih.
- **Forensik internal**: paling lama yang storage Anda mampu.

Backend Postgres bisa menyimpan jutaan baris tanpa masalah performa. Faktor pembatas biasanya disk, bukan kecepatan.

### Otomatisasi Purge
Karena tidak ada scheduler internal, purge otomatis bisa diatur lewat n8n yang memanggil endpoint `POST /audit-logs/purge` di jadwal misalnya tiap hari. Hubungi administrator untuk setup workflow ini.

## Yang TIDAK Tercatat di Audit Log

Untuk transparansi, beberapa hal **tidak** masuk audit log:

- Login berhasil (hanya percobaan login gagal di Laravel default — itu pun di log Laravel, bukan audit log EnCenter).
- Logout.
- Browsing biasa (buka halaman list).
- Aksi internal phpMyAdmin (query SQL Anda di sana tidak ke-trace EnCenter).
- Backup yang dispatch lewat n8n via API key — di log sebagai operator "System" atau IP n8n.

## Export

Versi saat ini **belum** menyediakan tombol export ke CSV/Excel. Untuk audit eksternal, administrator bisa export langsung dari Postgres dengan query SQL ke tabel `activity_logs`.

---

[← Sebelumnya: phpMyAdmin](10-phpmyadmin.md) · [Kembali ke Daftar Isi](README.md) · [Selanjutnya: Tips & FAQ →](12-tips-dan-faq.md)
