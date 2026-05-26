# 10 — phpMyAdmin (Auto-Login)

EnCenter dilengkapi instance **phpMyAdmin** yang sudah terintegrasi dengan vault. Anda tidak perlu mengetik host/user/password lagi — satu klik dari halaman vault, langsung masuk dan siap query.

Akses tidak lewat menu sidebar, tapi lewat tombol di Vault.

## Cara Memakai

### Dari Halaman Vault

1. Buka **Sidebar → Credential Vault**.
2. Pada baris database **MySQL** atau **MariaDB** yang Anda inginkan, klik tombol **External Link** (kuning, ikon panah keluar).
3. Tab baru terbuka dengan phpMyAdmin yang sudah login otomatis.

> Tombol ini **tidak muncul** untuk database PostgreSQL — phpMyAdmin tidak mendukung Postgres.

### Dari Cmd+K (Global Search)

1. Tekan **Cmd+K** (atau Ctrl+K di Windows).
2. Ketik nama database yang ingin dibuka.
3. Hasil dikelompokkan; pilih dari kategori "Databases".
4. Kalau database itu MySQL/MariaDB, klik akan memicu auto-open phpMyAdmin di tab baru.

## Bagaimana Auto-Login Bekerja

Penjelasan singkat untuk Anda yang penasaran:

1. Klik tombol di vault → frontend memanggil API `GET /database-connections/<id>/reveal` untuk mendapatkan kredensial decrypted.
2. Frontend membuat HTML form tersembunyi dengan field: `pma_username`, `pma_password`, `pma_servername`.
3. Form dikirim via **POST** ke `/autologin.php` di phpMyAdmin (target `_blank` = tab baru).
4. `autologin.php` (script kustom EnCenter) menerima POST, menyimpan kredensial di session phpMyAdmin, lalu redirect ke index.
5. Anda melihat phpMyAdmin sudah login.

> Kredensial **tidak pernah muncul di URL** — pakai POST, bukan GET. Tetap ada di body request HTTPS, jadi tidak ke-cache di history browser.

## Yang Bisa Anda Lakukan di phpMyAdmin

phpMyAdmin yang dipakai EnCenter adalah versi standar. Anda bisa:

- Browse tabel dan data
- Run query SQL ad-hoc
- Edit data row-by-row
- Export tabel atau database (alternatif backup manual)
- Import file SQL
- Manage user dan privilege (kalau user DB Anda admin)

## Catatan Keamanan

- Aksi `VIEW_CREDENTIALS` di-log saat tombol diklik, karena memang fetch kredensial dulu sebelum POST ke phpMyAdmin.
- Sesi phpMyAdmin punya timeout sendiri (default 24 menit no activity di phpMyAdmin upstream).
- Kalau Anda close tab phpMyAdmin, sesi tetap ada di server sampai timeout — bukan masalah, hanya konsumsi memory kecil.
- **Jangan share URL phpMyAdmin** dari tab Anda. URL `http://localhost:8081` tidak akan langsung kasih akses ke orang lain karena session-based, tapi kalau diakses dari mesin yang sama dan session masih hidup, bisa dipakai.

## Limitasi

- **Hanya untuk MySQL/MariaDB.** PostgreSQL belum didukung lewat tombol ini. Untuk Postgres, pakai pgAdmin atau DBeaver dengan kredensial dari **View Credentials**.
- **Server harus reachable dari container phpMyAdmin EnCenter.** Kalau database ada di network tertutup yang hanya bisa diakses lewat SSH tunnel, fitur ini tidak akan jalan langsung. Solusi: bikin SSH tunnel di laptop Anda, atau pakai DBeaver yang mendukung SSH tunnel.
- **phpMyAdmin tidak punya integrasi audit dengan EnCenter** — query yang Anda jalankan di phpMyAdmin **tidak** masuk ke audit log EnCenter. Audit log hanya merekam aksi "membuka" phpMyAdmin (lewat VIEW_CREDENTIALS).

## URL phpMyAdmin

Default deployment lokal: `http://localhost:8081`. Kalau perusahaan Anda deploy di domain lain, biasanya seperti `https://pma.encenter.example.com`.

## Troubleshooting

### Klik tombol → tab baru terbuka tapi minta login manual
Kemungkinan:
- API `GET /database-connections/<id>/reveal` gagal (cek konsol browser).
- `autologin.php` di phpMyAdmin tidak ter-konfigurasi atau crash.
- Container `encenter-phpmyadmin` mati. Hubungi administrator.

### "Cannot connect: invalid settings"
phpMyAdmin tidak bisa konek ke database. Cek:
- Database host yang tersimpan di vault benar (biasanya `127.0.0.1` kalau DB di server SSH; untuk akses dari container phpMyAdmin yang berbeda mesin, host `127.0.0.1` ini **tidak akan jalan** — phpMyAdmin tidak SSH ke server, dia connect langsung ke DB host).

### "Access denied for user"
Kredensial di vault salah, atau user DB tidak punya akses dari IP container phpMyAdmin.

> phpMyAdmin connect **langsung** ke database host yang Anda set di vault, tanpa SSH tunnel. Pastikan database server menerima koneksi dari IP/network EnCenter.

### Tab baru blank putih
Browser memblok pop-up. Izinkan pop-up untuk domain EnCenter di pengaturan browser.

---

[← Sebelumnya: Webhooks & Notifikasi](09-webhooks-notifikasi.md) · [Kembali ke Daftar Isi](README.md) · [Selanjutnya: Audit Log →](11-audit-log.md)
