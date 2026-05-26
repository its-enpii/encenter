# 05 — Server (Server Fleet)

Halaman **Server Fleet** adalah tempat Anda mendaftarkan dan mengelola server-server jarak jauh yang akan diakses lewat SSH. Ini fondasi dari semua fitur lain — tanpa server terdaftar, Anda tidak bisa menambah database connection atau menjalankan backup.

Akses lewat **Sidebar → Server Fleet**.

## Tabel Server

Kolom-kolom di tabel utama:

| Kolom | Isi |
| --- | --- |
| **Node Label** | Nama yang Anda berikan, dengan ikon server |
| **Host / IP** | Host atau IP server (font monospace) |
| **Status** | Badge "Online" (hijau) atau "Offline" (abu-abu) |
| **Group** | Group yang ditempati server (atau "None") |
| **Last Sync** | Waktu test connection terakhir berhasil |
| **Actions** | Tombol-tombol aksi (lihat di bawah) |

Status "Online" tidak berarti server sedang hidup saat ini, melainkan flag `is_active` yang Anda set. Untuk cek koneksi nyata, pakai tombol Test.

## Tombol Aksi (Per Baris)

Di kolom paling kanan ada empat tombol kecil:

| Ikon | Fungsi |
| --- | --- |
| **Play** (hijau) | Test connection SSH |
| **Eye** (ungu) | View Credentials — buka modal kredensial decrypted |
| **Pencil** | Edit server |
| **Trash** (merah) | Delete server |

## Mendaftarkan Server Baru

1. Klik **Register New Node** di kanan atas.
2. Halaman form muncul dengan dua kartu: **Basic Configuration** (kiri) dan **Vault Credentials** (kanan).

### Kartu Basic Configuration

| Field | Wajib | Catatan |
| --- | --- | --- |
| **Node Label** | Ya | Nama bebas. Contoh: "PROD-WEB-01", "Klien Acme DB" |
| **Host / IP Address** | Ya | Hostname atau IP. Contoh: `192.168.1.10`, `vps.example.com` |
| **SSH Port** | Tidak | Default `22` |
| **Server Group** | Tidak | Pilih dari dropdown group yang sudah ada |
| **Internal Notes** | Tidak | Catatan untuk Anda sendiri |

### Kartu Vault Credentials

| Field | Wajib | Catatan |
| --- | --- | --- |
| **SSH Username** | Ya | User Linux di server. Contoh: `root`, `ubuntu`, `deploy` |
| **Authentication Method** | Ya | Pilih **PASSWORD** atau **PRIVATE KEY** |
| **SSH Password** | Ya jika password | Password user SSH |
| **Private Key Content** | Ya jika key | Paste isi file `.pem` atau `id_rsa` lengkap, termasuk header `-----BEGIN ... PRIVATE KEY-----` dan footer |
| **Key Passphrase** | Tidak | Password key (kalau key Anda diproteksi) |
| **Node Status** | — | Switch on/off. Off berarti server di-disable sementara |

3. Setelah semua terisi, klik **COMMIT TO VAULT**.
4. Berhasil → otomatis kembali ke daftar server.

> Semua field sensitif (password, private key, passphrase) dienkripsi sebelum masuk database. Tidak akan pernah terlihat kembali kecuali lewat tombol **View Credentials** yang juga tercatat di audit log.

## Tes Koneksi

Klik tombol **Play** (hijau) di kolom Actions. EnCenter akan:

1. Decrypt kredensial server.
2. Buka koneksi SSH ke `host:port` dengan user dan auth yang Anda set.
3. Lakukan handshake.
4. Tutup koneksi.

Hasil muncul di dialog:

- **Connection Successful** — handshake berhasil. Field "Last Sync" di tabel ikut ter-update.
- **Connection Failed** — gagal, dengan pesan error dari `phpseclib`. Pesan biasa: "Authentication failed", "Connection timed out", "Permission denied".

## View Credentials (Reveal)

Klik tombol **Eye** (ungu) untuk melihat kredensial dalam bentuk plaintext.

Modal yang muncul menampilkan:

- Host
- Port
- Username
- Password atau Private Key (tertutup, bisa di-toggle visibility)
- Passphrase (jika ada)

Setiap field punya:

- **Tombol mata** — toggle visibility (terutama untuk yang sensitive).
- **Tombol copy** — copy ke clipboard.

> Aksi ini **selalu tercatat di audit log** dengan kategori `VIEW_CREDENTIALS`. Pastikan Anda benar-benar perlu membukanya.

## Mengedit Server

Klik tombol **Pencil**. Form yang sama dengan halaman Register muncul, terisi dengan data sekarang.

Beberapa hal yang perlu diketahui:

- Field password / private key **kosong** secara default — kosongkan saja jika tidak ingin mengubahnya.
- Mengubah host/port memutus history koneksi sebelumnya tetapi tidak menghapus database connection yang sudah terkait.
- Halaman edit juga menampilkan daftar **Database Connections** yang terkait dengan server ini di bagian bawah.

## Menghapus Server

Klik tombol **Trash** (merah). Dialog konfirmasi muncul: **"Decommission Server Node?"**.

> **Hati-hati:** menghapus server akan menghapus juga **semua database connection** yang terkait dengannya (cascade). Backup yang sudah dijalankan tetap aman di Google Drive, tapi history backup di EnCenter akan kehilangan referensi server (label akan jadi "Deleted DB").

Klik **Confirm Purge** untuk lanjut.

## Search & Filter

Kotak search di atas tabel mendukung pencarian by **label** dan **host/IP**. Debounced 500ms.

Per-page selector mendukung 5 / 10 / 20 / 50 / 100 baris. Pagination otomatis.

## Tips Pemakaian

- **Pakai label yang konsisten.** Misal `PROD-WEB-01`, `STAGING-DB-01`, dst. Memudahkan pencarian Cmd+K.
- **Tes setelah mendaftar.** Begitu server tersimpan, langsung tekan tombol Test untuk memastikan kredensial benar.
- **Private key lebih aman daripada password.** Kalau bisa, pakai key. Tapi pastikan key tersebut **dedicated untuk EnCenter** — jangan pakai key personal Anda yang punya akses ke banyak hal.
- **Server yang sudah dimatikan** sebaiknya di-set Node Status ke OFF (bukan dihapus), supaya history backup tetap utuh dan mudah di-reaktivasi.

---

[← Sebelumnya: Server Groups](04-server-groups.md) · [Kembali ke Daftar Isi](README.md) · [Selanjutnya: Credential Vault →](06-credential-vault.md)
