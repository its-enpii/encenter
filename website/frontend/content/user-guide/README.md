# EnCenter — User Guide

Panduan penggunaan aplikasi EnCenter untuk operator harian: orang yang mengelola server, kredensial database, dan backup lewat dashboard web.

> Dokumen ini fokus pada **cara pakai** aplikasi yang sudah berjalan. Untuk instalasi, arsitektur, dan API spec, lihat [`../README.md`](../README.md) (dokumentasi developer).

## Daftar Isi

| File | Untuk Anda jika... |
| --- | --- |
| [01-pengenalan.md](01-pengenalan.md) | Baru pertama kali menggunakan EnCenter dan ingin tahu apa fungsinya |
| [02-login-dan-profil.md](02-login-dan-profil.md) | Ingin login pertama kali, ganti password, atau atur nomor WhatsApp |
| [03-dashboard.md](03-dashboard.md) | Ingin memahami isi halaman utama (Control Center) |
| [04-server-groups.md](04-server-groups.md) | Ingin mengelompokkan server berdasarkan project / lingkungan |
| [05-server.md](05-server.md) | Ingin menambah, mengedit, atau menguji koneksi server SSH |
| [06-credential-vault.md](06-credential-vault.md) | Ingin menyimpan kredensial database dan membukanya saat dibutuhkan |
| [07-backup.md](07-backup.md) | Ingin menjalankan backup database dan memantau hasilnya |
| [08-cloud-storage.md](08-cloud-storage.md) | Ingin menghubungkan Google Drive sebagai tujuan backup |
| [09-webhooks-notifikasi.md](09-webhooks-notifikasi.md) | Ingin mendapat notifikasi WhatsApp setiap backup selesai |
| [10-phpmyadmin.md](10-phpmyadmin.md) | Ingin browsing isi database lewat phpMyAdmin tanpa input password manual |
| [11-audit-log.md](11-audit-log.md) | Ingin memeriksa siapa melakukan apa, kapan, dan dari IP mana |
| [12-tips-dan-faq.md](12-tips-dan-faq.md) | Punya pertanyaan umum atau ingin pintasan keyboard |

## Apa yang Dibutuhkan untuk Memulai

Sebelum mulai, pastikan administrator Anda sudah:

1. Menjalankan EnCenter di server (lihat dokumentasi developer untuk instalasi).
2. Memberi tahu URL akses dashboard, biasanya `http://localhost:3000` untuk lokal atau alamat domain perusahaan.
3. Membuatkan akun untuk Anda (atau memberi kredensial default `admin@encenter.com` / `password` yang **harus segera Anda ganti**).

## Konsep Singkat

EnCenter berdiri di atas tiga konsep utama:

- **Server** — mesin remote yang ingin Anda kelola atau backup, diakses lewat SSH.
- **Database Connection** — kredensial database yang berjalan di salah satu server tersebut. Ini yang akan di-backup.
- **Backup** — eksekusi `mysqldump` (atau `pg_dump`) terhadap database, hasilnya di-upload ke Google Drive.

Tiga konsep ini saling terhubung: **Server → Database Connection → Backup**. Anda perlu mendaftarkan server dulu, baru bisa menambah database connection-nya, baru bisa memicu backup.

## Catatan Keamanan untuk Operator

- **Password vault EnCenter Anda adalah satu-satunya kunci akses.** Jika hilang, administrator harus mereset lewat backend — tidak ada self-service "lupa password" di versi saat ini.
- **Setiap aksi sensitif tercatat di Audit Log.** Termasuk siapa yang melihat kredensial, kapan, dan dari IP mana. Anggap ini sebagai pengingat bahwa semua aktivitas terdokumentasi.
- **Kredensial yang Anda lihat lewat tombol "View Credentials" hanya muncul di layar Anda.** Tutup tab atau modal setelah selesai. Jangan screenshot atau kirim ke chat.

---

[Mulai dari awal: Pengenalan →](01-pengenalan.md)
