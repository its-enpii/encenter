# 01 — Pengenalan

EnCenter adalah dashboard web untuk **mengelola server jarak jauh dan menjalankan backup database secara otomatis**. Bayangkan Anda punya beberapa VPS dengan database MySQL/MariaDB/PostgreSQL di dalamnya. Tanpa EnCenter, Anda akan:

- Menyimpan password SSH di password manager pribadi.
- Login manual ke server, jalankan `mysqldump`, copy file ke laptop, upload ke Google Drive.
- Mencatat sendiri kapan terakhir backup dijalankan.

Dengan EnCenter, semua itu jadi satu klik dari dashboard, dan setiap aksi tercatat otomatis.

## Apa yang Bisa Anda Lakukan

### Mengelola Server
Daftarkan server Anda satu kali (host, port, username, password atau private key). Setelah itu Anda bisa:

- Tes koneksi SSH untuk memastikan server masih hidup.
- Lihat kembali kredensialnya kapan saja (dengan tombol "View Credentials").
- Mengelompokkan server berdasarkan project, klien, atau lingkungan (production, staging).

### Menyimpan Kredensial Database
Setiap server biasanya punya satu atau lebih database. Daftarkan tiap database (host, port, nama DB, user, password) sekali, lalu:

- Tes koneksi langsung dari dashboard.
- Buka phpMyAdmin dengan **satu klik** tanpa perlu mengetik password lagi.
- Pakai sebagai sumber backup.

### Menjalankan Backup
Dari halaman vault, klik tombol cloud kecil di samping database → backup otomatis berjalan di latar belakang. Halaman **Backup History** akan menampilkan progres real-time. Hasilnya:

- File `.sql.gz` (single database) atau `.tar.gz` (semua database) tersimpan di Google Drive Anda.
- Dikelompokkan per tanggal: `EnCenter_Backups/20260526/nama-db.sql.gz`.

### Mendapat Notifikasi
Tambahkan webhook URL (biasanya milik n8n perusahaan), set nomor WhatsApp tujuan, dan setiap kali backup selesai (atau gagal), notifikasi langsung dikirim ke WhatsApp Anda atau ke grup tim.

### Audit Trail
Setiap aksi tercatat: siapa yang menambah server, siapa yang melihat kredensial database X, siapa yang menghapus webhook, dari IP mana, jam berapa. Tidak bisa diedit atau dihapus per-baris (hanya bisa di-purge berdasarkan rentang waktu).

## Apa yang TIDAK Dilakukan EnCenter

Supaya jelas batasannya:

- **Tidak menjalankan SSH terminal interaktif.** EnCenter hanya untuk operasi yang sudah didefinisikan (test connection, dump database). Untuk masuk shell, tetap pakai terminal SSH biasa.
- **Tidak otomatis menjadwalkan backup.** Aplikasi tidak punya scheduler internal. Backup harus dipicu manual dari dashboard, atau lewat n8n yang memanggil API EnCenter di jadwal tertentu.
- **Tidak membackup file/folder.** Saat ini hanya database (MySQL, MariaDB, PostgreSQL).
- **Tidak punya manajemen multi-user dengan role berbeda.** Semua user yang login punya akses penuh ke vault mereka sendiri.

## Alur Kerja Khas

Hari pertama Anda memakai EnCenter, urutannya kira-kira begini:

1. **Login** dengan akun yang dibuatkan administrator.
2. **Ganti password** di halaman Profile (langkah wajib).
3. **Hubungkan Google Drive** di halaman Cloud Storage agar ada tempat menyimpan backup.
4. **Buat Server Group** untuk mengelompokkan, misalnya "Production" dan "Staging".
5. **Daftarkan server** satu per satu (Server Fleet → Register New Node).
6. **Daftarkan database connection** untuk tiap database yang ingin di-backup (Credential Vault → Add DB Credential).
7. **Tes koneksi** baik server maupun database untuk memastikan semua sehat.
8. **Jalankan backup pertama** dari halaman Vault, pantau di Backup History.
9. **Pasang webhook n8n** di halaman Webhooks supaya notifikasi sampai ke WhatsApp.
10. **Selesai.** Hari berikutnya tinggal trigger backup atau biarkan n8n menjadwalkannya.

## Istilah yang Sering Muncul

| Istilah | Artinya |
| --- | --- |
| **Vault** | Penyimpanan terenkripsi untuk semua kredensial Anda. Database EnCenter sendiri. |
| **Node** | Sinonim dengan "server". Dashboard kadang menyebutnya "Node" untuk gaya. |
| **Reveal / View Credentials** | Membuka modal yang menampilkan password / private key dalam bentuk plaintext. |
| **Run Backup** | Memicu job backup database tertentu (atau semua database di server). |
| **Webhook** | URL eksternal yang menerima notifikasi setiap kali event tertentu terjadi. |
| **HMAC Signature** | Tanda tangan digital di header webhook supaya penerima yakin pesan datang dari EnCenter. |
| **Audit Log** | Catatan tidak-bisa-diubah dari semua aksi di sistem. |

## Tampilan Antarmuka

Setelah login, Anda akan melihat dashboard dengan:

- **Sidebar kiri** — navigasi utama (Control Center, Server Fleet, Vault, Backup, Cloud, Webhooks, Audit, Settings, Profile).
- **Header atas** — search box (Cmd+K), badge status sistem, lonceng notifikasi, tombol "New Entry".
- **Area utama** — isi halaman yang sedang Anda buka.

Tema dashboard memakai latar gelap (slate) dengan aksen hijau (emerald). Tidak ada toggle light mode.

---

[← Kembali ke Daftar Isi](README.md) · [Selanjutnya: Login & Profil →](02-login-dan-profil.md)
