# 12 — Tips & FAQ

Kumpulan pintasan, pola pemakaian, dan jawaban pertanyaan umum.

## Pintasan Keyboard

| Pintasan | Fungsi |
| --- | --- |
| **Cmd+K** / **Ctrl+K** | Buka Global Search (cari server / database) |
| **Esc** | Tutup modal aktif |
| **Enter** (di input edit folder) | Simpan perubahan inline |
| **Tab** | Pindah antar field di form |

## Tips Pemakaian Sehari-hari

### Cari Cepat dengan Cmd+K
Daripada klik sidebar lalu scroll tabel, tekan Cmd+K. Ketik dua-tiga huruf nama server, langsung pilih dari hasil. Jauh lebih cepat di setup yang punya 20+ server.

### Pakai Konvensi Penamaan yang Konsisten
Contoh skema:

- Server: `<env>-<role>-<no>` → `prod-web-01`, `staging-db-02`.
- Database: `<klien>-<app>-<env>` → `acme-wordpress-prod`.
- Webhook: `<channel>-<env>` → `wa-grup-tim-prod`.

Konsistensi membuat Cmd+K dan filter audit log lebih powerful.

### Disable, Jangan Hapus
Server atau database connection yang sudah tidak dipakai tapi mungkin di-revive nanti, set field "Status" ke OFF (Inactive) saja. Lebih aman daripada hapus dan buat ulang. History dan audit log tetap utuh.

### Backup Terjadwal Lewat n8n
EnCenter tidak menjadwalkan backup sendiri. Setup workflow n8n yang trigger di jam tertentu (misal 03:00 setiap hari) lalu memanggil endpoint `POST /api/v1/backups/run` dengan API key. Hubungi administrator untuk template workflow ini.

### Multi-Account, Multi-Webhook
Kalau Anda mengelola beberapa klien, buat **webhook terpisah** per klien dengan target WhatsApp masing-masing. Lebih mudah memisahkan notifikasi dan audit.

## FAQ

### Saya lupa password. Bagaimana reset?
Versi saat ini **belum punya self-service reset password**. Hubungi administrator yang punya akses ke backend untuk:

```bash
docker exec -it envault-backend php artisan tinker
> $user = User::where('email', 'you@company.com')->first();
> $user->password = Hash::make('NewPasswordHere');
> $user->save();
```

Setelah itu Anda bisa login dan ganti password sendiri di Profile.

### Bisa daftarin user baru?
Tidak ada UI untuk "Add User" di versi saat ini. Administrator harus buat user via tinker atau seeder backend.

### Apa beda Server Group dengan tag?
Server Group adalah relasi 1-banyak: satu server hanya bisa di satu group. Kalau Anda butuh tagging multi-dimensi (misal sebuah server tagged "production" + "klien-acme" + "indonesia"), versi sekarang belum mendukung. Workaround: pakai naming convention di label.

### Bisa share kredensial antar user?
Tidak langsung. Setiap user punya vault masing-masing. Kalau dua operator mau pegang kredensial server yang sama, salah satu harus duplicate entry di vault-nya sendiri.

### Bagaimana cara restore backup?
Restore dilakukan **manual**, bukan lewat EnCenter. Langkah umumnya:

1. Buka Backup History → klik tombol cloud untuk buka file di Google Drive.
2. Download file `.sql.gz` atau `.tar.gz`.
3. `gunzip` (untuk single DB) atau `tar -xzf` (untuk all DB).
4. Import ke server target dengan `mysql < dump.sql` atau `psql -f dump.sql`.

EnCenter belum punya tombol "Restore" otomatis di versi sekarang.

### Backup mendadak gagal padahal kemarin sukses
Cek urutan ini:

1. **Test Connection di Server Fleet** — apakah SSH masih bisa?
2. **Test Connection di Vault** — apakah DB masih bisa diakses?
3. **Cloud Storage** — apakah Google Drive masih connected?
4. **Audit Log** — apakah ada UPDATE recent yang mungkin merusak setting?
5. **View Error Logs** di Backup History — pesan error spesifik?

Sembilan dari sepuluh kasus jawabannya: password DB diubah di server, atau token Google expired karena diretvoke manual.

### Berapa banyak backup yang bisa disimpan?
Tergantung quota Google Drive Anda. EnCenter sendiri tidak ada batas jumlah job. Kalau quota Drive penuh, backup berikutnya akan gagal di tahap upload dengan error `quotaExceeded`.

### Backup berukuran sangat besar (puluhan GB) — apakah aman?
Aman secara teknis. Beberapa hal yang perlu diperhatikan:

- Pastikan disk `/tmp` di server target cukup untuk file dump sementara.
- Pastikan disk `storage/app/backups/` di EnCenter cukup.
- Backup besar dieksekusi resumable upload chunk 20MB, tahan terhadap hiccup network.
- Set timeout queue cukup besar (default sudah 600 detik, tapi DB 50GB+ mungkin perlu naik).

### Bisa pakai protokol selain SSH password / private key?
Versi sekarang hanya itu dua opsi. SSH agent forwarding, kerberos, atau certificate-based auth belum didukung.

### Apakah aman password di vault saya?
Semua field sensitif dienkripsi `AES-256-CBC` lewat Laravel Crypt sebelum masuk database. Kunci enkripsi adalah `APP_KEY` di backend `.env`. Yang harus dijaga administrator:

- `APP_KEY` jangan bocor.
- Backup `APP_KEY` ke password manager offline. Kalau hilang, semua kredensial di vault tidak bisa di-decrypt lagi.

Anda sebagai user tidak bisa melakukan apa-apa kalau APP_KEY administrator hilang. Karena itu pertanyaan terpenting buat administrator: "APP_KEY sudah di-backup belum?".

### Bisa export semua kredensial sekaligus?
**Tidak**, dan ini sengaja. Export massal kredensial decrypted akan jadi vektor kebocoran besar. Kalau Anda perlu migrasi ke tool lain, lakukan satu per satu via View Credentials.

### Bagaimana cara matikan EnCenter sementara?
Bukan urusan operator — minta administrator stop container Docker:

```bash
docker compose stop
```

Untuk hidupkan lagi:

```bash
docker compose start
```

Data tetap aman selama volume Postgres tidak dihapus.

### Saya lihat ada container `openclaw` / `n8n` / `evolution-api`. Apa itu?
Itu komponen pendukung yang dipakai administrator/AI operator:

- **n8n** — automation engine yang biasanya menjadwalkan backup dan memformat notifikasi.
- **Evolution API** — bridge ke WhatsApp Web yang dipakai n8n untuk kirim pesan.
- **OpenClaw** — persona AI internal yang menerima pesan WhatsApp dan men-trigger aksi.

Anda sebagai operator dashboard tidak perlu interaksi langsung dengan ketiganya.

## Pertanyaan Tidak Tertangani?

Hubungi administrator atau tim DevOps perusahaan Anda. Kalau Anda menemukan bug atau punya saran fitur, sampaikan lewat channel internal — repository ini self-hosted di tim Anda dan punya alur feedback sendiri.

## Bacaan Lanjutan

Kalau Anda ingin paham lebih dalam:

- [Dokumentasi Developer](../README.md) — arsitektur, security model, deployment.
- [API Documentation](../api-documentation.md) — buat yang mau integrasi atau scripting.
- [Security Notes](../09-security.md) — threat model dan praktik hardening.

---

[← Sebelumnya: Audit Log](11-audit-log.md) · [Kembali ke Daftar Isi](README.md)
