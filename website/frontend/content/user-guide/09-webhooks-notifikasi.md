# 09 — Webhooks & Notifikasi

**Webhook** di EnCenter adalah cara mengirim notifikasi ke sistem eksternal (biasanya n8n) setiap kali event tertentu terjadi — backup sukses, backup gagal, atau test ping. n8n biasanya meneruskan ke WhatsApp lewat Evolution API.

Akses lewat **Sidebar → Webhooks**.

## Konsep Singkat

Alur notifikasi end-to-end:

```
EnCenter (event terjadi)
  → POST ke webhook URL Anda
  → n8n menerima
  → n8n memformat pesan & memanggil Evolution API
  → Evolution API mengirim WhatsApp
  → Anda atau grup tim menerima notifikasi
```

Bagian yang Anda atur di EnCenter hanyalah **dua langkah pertama**: ke mana POST dikirim, dan apa secret-nya.

## Tabel Webhook

| Kolom | Isi |
| --- | --- |
| **Name** | Label bebas. Contoh: "n8n Production", "Backup Alert Group" |
| **URL** | URL endpoint n8n |
| **Status** | Active / Inactive |
| **Events** | Tag-tag event yang mentrigger webhook ini |
| **Actions** | Test, Edit, Delete |

## Menambah Webhook Baru

1. Klik **Add Webhook** di kanan atas. Dialog muncul.
2. Isi field-fieldnya:

### Field-field

| Field | Wajib | Catatan |
| --- | --- | --- |
| **Name** | Ya | Label internal. Contoh: "n8n Production" |
| **Target WhatsApp ID** | Tidak | JID WhatsApp tujuan, atau kosongkan untuk pakai default dari profile Anda |
| **Webhook URL** | Ya | URL endpoint n8n. Contoh: `https://n8n.example.com/webhook/abc-123` |
| **Secret Key** | Ya saat create | Random string panjang. Dipakai untuk HMAC signature |
| **Trigger Events** | Ya | Toggle event yang ingin dilanggan |
| **Webhook Status** | — | On/Off |

### Target WhatsApp ID

Format yang diterima n8n / Evolution:

- **Nomor pribadi**: `628123456789` (kode negara tanpa `+`).
- **Group JID**: `1203631234567@g.us` (didapat dari Evolution API atau WhatsApp Web).

> Kalau dikosongkan, n8n akan pakai `phone_number` di profile Anda. Berguna kalau Anda hanya punya satu webhook untuk semua notifikasi pribadi.

### Secret Key

Adalah string rahasia yang **harus sama** antara EnCenter dan n8n. Cara kerjanya:

1. Setiap kali EnCenter POST ke webhook, body request di-hash dengan HMAC-SHA256 menggunakan Secret Key.
2. Hash dikirim di header `X-Webhook-Signature`.
3. n8n menghitung ulang hash dengan secret yang sama.
4. Kalau cocok → request valid (datang dari EnCenter). Kalau tidak → block.

Buat secret key yang **panjang dan random**. Contoh generator:

```bash
openssl rand -hex 32
# atau
pwgen -s 64 1
```

> Saat **edit** webhook, field Secret Key kosong default. Biarkan kosong jika tidak ingin mengubah. Isi hanya kalau Anda mau rotasi secret.

### Trigger Events

Dua event tersedia:

- **Backup Success** — terkirim setiap kali job backup selesai dengan status `success`.
- **Backup Failed** — terkirim setiap kali job backup gagal.

Toggle keduanya independen. Anda bisa hanya subscribe ke "failed" saja kalau cuma mau notifikasi error.

3. Klik **Create Webhook**.

## Test Webhook

Klik tombol **Play** (hijau) di kolom Actions. EnCenter akan:

1. POST request ke `Webhook URL` Anda.
2. Body berisi event `test` dengan payload dummy.
3. Tunggu response.

Hasil muncul di dialog:

- **Test Successful** — n8n menerima dan return status 2xx.
- **Test Failed** — return status non-2xx, atau timeout, atau koneksi gagal. Pesan error ditampilkan.

> Test ini **tidak men-trigger workflow n8n yang punya filter event "backup.success"** — karena event di payload adalah `test`. Tapi n8n masih harus return 200 untuk dianggap sukses oleh EnCenter.

## Mengedit Webhook

Klik tombol **Edit** di Actions. Dialog yang sama dengan Add muncul, terisi data sekarang. Field Secret Key kosong — isi hanya kalau ingin rotasi.

## Menghapus Webhook

Klik tombol **Delete**. Dialog: **"Delete Webhook?"** → **Confirm Delete**.

> Backup yang sedang berjalan tidak terpengaruh. Hanya event berikutnya yang tidak lagi mengirim ke webhook ini.

## Multiple Webhook

Anda bisa daftarkan **banyak webhook sekaligus**. Misalnya:

- Webhook 1 — n8n production, kirim ke grup WhatsApp tim DBA, subscribe ke `backup.failed`.
- Webhook 2 — n8n staging, kirim ke nomor pribadi, subscribe ke semua event.
- Webhook 3 — webhook test ke webhook.site untuk debugging.

Semua dispatched paralel saat event terjadi. Tidak ada urutan dijamin.

## Payload yang Dikirim EnCenter

Untuk informasi developer (atau kalau Anda yang mengatur n8n workflow), payload POST yang dikirim EnCenter kira-kira begini:

```json
{
  "event": "backup.success",
  "timestamp": "2026-05-26T03:00:42Z",
  "target_whatsapp_id": "628123456789",
  "data": {
    "job_id": "uuid-here",
    "database_label": "Production WordPress",
    "server_label": "PROD-WEB-01",
    "file_name": "prod-wordpress-20260526-030001.sql.gz",
    "file_size_bytes": 134217728,
    "duration_seconds": 42,
    "gdrive_file_url": "https://drive.google.com/...",
    "user_email": "you@company.com"
  }
}
```

Header penting:

- `Content-Type: application/json`
- `X-Webhook-Signature: <HMAC-SHA256 hex>`
- `X-Webhook-Event: backup.success`

## Tips Pemakaian

- **Pisahkan webhook untuk lingkungan berbeda.** Production ke grup tim, staging ke nomor pribadi developer. Lebih mudah filter notifikasi.
- **Subscribe hanya ke `backup.failed` untuk webhook utama.** Notifikasi sukses tiap hari bisa membosankan dan membuat tim mengabaikan notifikasi ketika gagal beneran.
- **Pakai n8n templates.** Banyak template Evolution + n8n yang bisa langsung dipakai untuk format pesan WhatsApp.
- **Rotasi Secret Key** setiap 6–12 bulan, terutama kalau ada perubahan personel di tim DevOps.
- **Test setelah membuat.** Jangan tunggu sampai backup gagal beneran untuk tahu webhook tidak konfigurasi.

## Troubleshooting

### Test Successful tapi WhatsApp tidak masuk
Berarti EnCenter sukses POST ke n8n, tapi workflow n8n-nya bermasalah. Cek:

- Workflow n8n aktif (toggle on)?
- Evolution API instance aktif dan terhubung WhatsApp Web?
- Nomor tujuan benar?
- Lihat execution log di n8n untuk error spesifik.

### Test Failed dengan "Connection refused"
URL webhook salah, atau n8n mati. Coba akses URL tersebut langsung di browser.

### Test Failed dengan "Status 401" atau "403"
Workflow n8n butuh auth header tambahan. Tambahkan di workflow n8n untuk menerima request tanpa auth khusus, atau hubungi yang setup n8n.

### Notifikasi sukses tapi terlalu lama (5+ menit setelah backup selesai)
Bukan masalah EnCenter (yang dispatch instant). Periksa:

- Antrian eksekusi n8n.
- Latency Evolution API.
- WhatsApp Web di server n8n masih connected.

---

[← Sebelumnya: Cloud Storage](08-cloud-storage.md) · [Kembali ke Daftar Isi](README.md) · [Selanjutnya: phpMyAdmin →](10-phpmyadmin.md)
