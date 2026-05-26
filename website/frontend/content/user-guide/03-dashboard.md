# 03 — Dashboard (Control Center)

Halaman pertama setelah login adalah **Control Center** — ringkasan singkat seluruh sistem Anda.

## Bagian-Bagian Dashboard

### Header Halaman
Judul "Control Center" dengan badge **SECURE-LIVE** di sebelahnya. Badge ini selalu muncul dan menandakan status koneksi ke API backend.

### Stats Grid (4 Kartu)
Empat kartu statistik di baris atas:

| Kartu | Arti |
| --- | --- |
| **Vault Security Score** | Skor enkripsi vault. Default `98.4%` dengan label `AES-256`. |
| **Active Servers** | Jumlah server yang terdaftar di Server Fleet. |
| **Database Connections** | Jumlah kredensial database yang tersimpan di vault. |
| **Total Backups** | Jumlah job backup yang pernah dijalankan (semua status). |

### Server Fleet
Tabel ringkas 5 server terbaru. Menampilkan:

- Nama (label) server
- Status (Active / Idle)
- IP address / host
- "Sync" — waktu test connection terakhir, atau "Never" jika belum pernah dites

Klik judul "Server Fleet" untuk masuk ke halaman lengkap.

### Audit Log (Sisi Kanan)
10 aktivitas terbaru di sistem. Setiap entri menampilkan:

- Tipe aksi (success / warning / error)
- Nama aksi (REGISTER, UPDATE, DELETE, dll.)
- Operator (nama user atau IP)
- Waktu

## Header Atas (Selalu Terlihat)

Header di atas dashboard ada di setiap halaman admin, bukan hanya di Control Center.

### Cmd+K — Global Search
Tekan **Cmd+K** (Mac) atau **Ctrl+K** (Windows/Linux) untuk membuka command palette. Bisa juga klik tombol search di header.

Di palette ini Anda bisa:
- Ketik nama server → langsung ke halaman edit server tersebut.
- Ketik nama database → langsung ke vault entry.
- Klik database **MySQL/MariaDB** → otomatis buka phpMyAdmin di tab baru, sudah login.

Hasil dikelompokkan per kategori (Servers, Databases). Pencarian server-side dan ada debounce 200ms.

### System Status Badge
Lingkaran hijau di header artinya backend dapat dijangkau. Jika merah, ada masalah:

- Backend mati
- Network putus
- Token Anda invalid

Polling dilakukan tiap 60 detik.

### Notification Bell
Ikon lonceng dengan angka kecil. Menunjukkan jumlah aktivitas terbaru (terutama error/warning). Klik untuk membuka panel daftar log singkat.

Polling tiap 30 detik. Highlight muncul kalau ada error atau warning.

### "New Entry" Dropdown
Tombol pintasan untuk membuat resource baru tanpa berpindah halaman dulu. Menu di dalamnya:

- New Server Group
- Register Server
- Add DB Credential
- Add Webhook

## Sidebar (Kiri)

Navigasi utama. Menu dikelompokkan dalam **Command Center**:

| Menu | Keterangan |
| --- | --- |
| Control Center | Dashboard ini |
| Server Fleet | Daftar server SSH |
| Server Groups | Pengelompokan server |
| Credential Vault | Daftar kredensial database |
| Backup History | Riwayat job backup |
| Cloud Storage | Konfigurasi Google Drive |
| Webhooks | Konfigurasi notifikasi |
| Audit Logs | Log aktivitas sistem |
| Settings | System info & sesi aktif |
| Profile | Pengaturan akun pribadi |

Sidebar bagian bawah menampilkan nama dan email Anda, plus tombol **Sign Out**.

## Membaca Status Cepat

Saat masuk dashboard, perhatikan tiga sinyal cepat:

1. **Stats card "Total Backups"** — kalau angka tidak bertambah selama beberapa hari, kemungkinan ada masalah dengan scheduler n8n atau Google Drive.
2. **Audit Log entry teratas** — kalau aksi terakhir berlabel error/warning, klik untuk lihat detail.
3. **System Status Badge di header** — pastikan hijau sebelum mulai bekerja.

Kalau ketiganya normal, sistem Anda kemungkinan besar sehat.

## Loading State

Saat dashboard pertama kali load, akan muncul indikator "Loading Telemetry..." dengan spinner. Ini tahap di mana frontend sedang fetch:

- `GET /servers`
- `GET /database-connections`
- `GET /backups`
- `GET /audit-logs?per_page=10`

Empat request paralel. Biasanya selesai di bawah 2 detik. Kalau lebih lama, periksa koneksi atau kontak administrator.

---

[← Sebelumnya: Login & Profil](02-login-dan-profil.md) · [Kembali ke Daftar Isi](README.md) · [Selanjutnya: Server Groups →](04-server-groups.md)
