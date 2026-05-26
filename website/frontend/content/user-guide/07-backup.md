# 07 — Backup

Halaman **Backup History** menampilkan semua job backup yang pernah berjalan, dengan status real-time. Halaman ini auto-refresh tiap 10 detik supaya Anda bisa memantau backup yang sedang jalan tanpa F5 manual.

Akses lewat **Sidebar → Backup History**.

## Cara Memicu Backup

Backup tidak dipicu dari halaman ini, melainkan dari **Credential Vault**. Buka [06-credential-vault.md](06-credential-vault.md) → klik tombol **Cloud** (biru) di samping database yang ingin di-backup.

Atau, kalau perusahaan Anda pakai n8n untuk scheduler, backup akan dipicu otomatis lewat HTTP request ke API EnCenter di waktu tertentu (setiap pagi, misalnya). Anda hanya perlu memantau di halaman ini.

## Status Job

Setiap job backup melewati alur status:

```
pending → running → success
                  → failed
```

| Status | Arti | Badge |
| --- | --- | --- |
| **PENDING** | Job baru dispatch, antri di queue | Abu-abu |
| **RUNNING** | Worker sedang memproses (dump → download → upload) | Abu-abu |
| **SUCCESS** | Selesai, file ada di Google Drive | Hijau |
| **FAILED** | Gagal di salah satu tahap | Merah |

## Kolom Tabel

| Kolom | Isi |
| --- | --- |
| **Database / Server** | Label database + nama server-nya |
| **Status** | Badge warna sesuai status |
| **File Details** | Nama file output + ukuran (B/KB/MB/GB) |
| **Timing** | Waktu mulai + durasi total dalam detik |
| **Actions** | Tombol cloud (jika sukses) atau tombol error (jika gagal) |

## Tombol Aksi

### Open in Drive (hanya untuk SUCCESS)
Tombol **Cloud** (hijau) di kolom Actions. Klik untuk **buka file langsung di Google Drive** di tab baru. URL ini sudah di-set permission view oleh user OAuth Anda saat upload.

### View Error Logs (hanya untuk FAILED)
Tombol **Alert Circle** (merah). Klik untuk membuka modal **"Backup Failure Logs"** yang menampilkan pesan error mentah dari worker.

Pesan error tipikal:
- `mysqldump: Got error: 1045: Access denied for user 'X'@'Y'` — kredensial DB salah.
- `Connection refused` — DB tidak hidup atau port salah.
- `gzip: stdin: not in gzip format` — output dump kosong.
- `Google Drive API error: invalidGrant` — token Google kedaluwarsa.
- `Backup file too small (< 100 bytes)` — dump menghasilkan file kosong, biasanya karena DB name salah atau user tidak punya akses.

Salin pesan ini dan kirim ke administrator kalau Anda tidak yakin penyebabnya.

## Cara Membaca Durasi

`Duration` dihitung dari `started_at` sampai `finished_at`. Untuk backup 100MB di server biasa, ekspektasinya:

| Ukuran DB (uncompressed) | Durasi tipikal |
| --- | --- |
| < 100 MB | < 30 detik |
| 100 MB – 1 GB | 1–5 menit |
| 1 GB – 10 GB | 5–30 menit |
| > 10 GB | 30+ menit |

Faktor yang memperlambat:

- Bandwidth SSH antara EnCenter ↔ server target.
- Bandwidth EnCenter ↔ Google Drive.
- CPU server saat menjalankan `mysqldump` + `gzip`.
- Banyak tabel dengan locking (sebagian besar engine ditangani `--single-transaction`).

## Refresh Manual

Walaupun ada auto-refresh tiap 10 detik, Anda bisa paksa refresh dengan tombol **REFRESH** di kanan atas.

## Search & Filter

Kotak search mendukung pencarian by **file name** atau **label**. Tidak ada filter status — semua status muncul bercampur, paling baru di atas.

## Praktik Baik

### Verifikasi Backup
Sukses ≠ data benar. Sebulan sekali sebaiknya:

1. Download satu file backup random dari Google Drive.
2. `gunzip` dan inspect isinya (`head -100`).
3. Coba restore ke database lokal/staging.

### Retensi
EnCenter **tidak menghapus backup lama otomatis**. Anda harus:

- Pakai endpoint cleanup API (`DELETE /storage/cleanup?older_than_days=30`) lewat n8n scheduler, atau
- Hapus manual dari Google Drive web UI.

Tanyakan administrator apakah cleanup workflow sudah terpasang di n8n perusahaan.

### Memantau Backup Gagal Berturut-turut
Jika tiga backup berturut-turut gagal untuk database yang sama:

1. Buka [Audit Logs](11-audit-log.md), filter berdasarkan resource ID database tersebut.
2. Lihat apakah ada UPDATE recent yang mungkin merusak kredensial.
3. Jalankan **Test Connection** dari halaman Vault.
4. Lihat juga error message di tombol "View Error Logs".

### Backup Manual untuk Database Besar (10GB+)
- Pastikan disk server target punya `/tmp` minimal 2x ukuran DB (untuk file dump sementara).
- Pastikan disk EnCenter sendiri punya space cukup di `storage/app/backups/` (file di-cleanup setelah upload sukses).
- Lakukan di luar jam sibuk supaya tidak membebani DB production.

## Auto-Refresh Detail

- Halaman ini polling backend tiap 10 detik via interval JavaScript.
- Hanya halaman aktif yang polling. Tab background tetap polling, tapi browser bisa throttle.
- Status badge berubah otomatis dari `RUNNING` → `SUCCESS`/`FAILED` tanpa F5.

---

[← Sebelumnya: Credential Vault](06-credential-vault.md) · [Kembali ke Daftar Isi](README.md) · [Selanjutnya: Cloud Storage →](08-cloud-storage.md)
