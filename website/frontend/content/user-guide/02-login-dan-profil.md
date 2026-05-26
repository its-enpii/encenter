# 02 — Login & Profil

## Login Pertama Kali

1. Buka URL dashboard yang diberikan administrator. Untuk instalasi lokal default: `http://localhost:3000`.
2. Anda akan otomatis diarahkan ke halaman login.
3. Masukkan email dan password.
4. Klik tombol **Sign In**.

Jika ini instalasi baru dan administrator belum membuatkan akun khusus untuk Anda, kredensial default seeder adalah:

| Email | Password |
| --- | --- |
| `admin@encenter.com` | `password` |

> **Wajib ganti password setelah login pertama.** Akun default ini diketahui umum dan tidak aman untuk dipakai terus.

## Halaman Profile

Akses lewat **Sidebar → Profile** atau klik nama Anda di sidebar bawah.

Di halaman ini Anda bisa:

### Mengubah Nama
Field **Full Name**. Nama ini muncul di sidebar, audit log, dan sebagai pengirim notifikasi.

### Mengubah Nomor WhatsApp
Field **WhatsApp Number**. Format: kode negara tanpa tanda `+`, contoh `628123456789`.

Nomor ini dipakai sebagai **default tujuan notifikasi** untuk webhook yang tidak punya `target_whatsapp_id` sendiri. Jika di webhook tertentu Anda mengisi target khusus (misal grup), itu akan menggantikan nomor ini.

### Mengubah Password
Isi dua field sekaligus:

- **New Password** — minimal 8 karakter.
- **Confirm Password** — harus sama persis.

Biarkan kosong jika hanya ingin update nama atau nomor WhatsApp.

> **Email tidak bisa diubah** dari halaman ini. Jika perlu, minta administrator mengubahnya langsung di database.

### Menyimpan Perubahan
Tekan tombol **SAVE PROFILE CHANGES** di bawah kartu kanan. Pesan sukses muncul di bagian atas form.

## Logout

Sidebar bagian bawah punya tombol **Sign Out**. Klik untuk:

1. Token akses Anda dihapus dari browser.
2. Token di-revoke di backend (best-effort).
3. Anda diarahkan kembali ke halaman login.

Logout juga otomatis tersinkron antar tab. Jika Anda logout di tab A, tab B yang juga membuka EnCenter akan ikut diarahkan ke login.

## Sesi Otomatis Berakhir

Jika token Anda kedaluwarsa atau dicabut administrator, dashboard otomatis mendeteksinya:

- Request berikutnya akan mengembalikan status 401.
- Aplikasi membersihkan sesi dan mengarahkan Anda ke `/login`.
- Tidak ada peringatan dialog — pemutusan dilakukan diam-diam.

Login ulang dan lanjutkan pekerjaan Anda.

## Login dari Beberapa Tab / Browser

Aman dilakukan. EnCenter mendengarkan event `storage` browser:

- Login di Tab A → Tab B otomatis mengambil user state baru.
- Logout di Tab A → Tab B ikut logout dan ke halaman login.

Tidak ada batasan jumlah sesi aktif per user di versi saat ini.

## Keamanan Akun

- Pakai password panjang (minimal 12 karakter, kombinasi huruf besar, kecil, angka, simbol).
- Jangan share akun. Setiap operator sebaiknya punya akun terpisah supaya audit log bermakna.
- Jika perangkat hilang atau dicurigai disusupi, segera ganti password — token lama akan ikut tidak valid setelah login berikutnya.

---

[← Sebelumnya: Pengenalan](01-pengenalan.md) · [Kembali ke Daftar Isi](README.md) · [Selanjutnya: Dashboard →](03-dashboard.md)
