# Auto Download Backup Saat Startup (Windows)

Panduan setup agar script `auto-connect-download.ps1` otomatis berjalan ketika komputer Windows dinyalakan, menggunakan **Windows Task Scheduler** dengan trigger **At startup**.

Script ini sekarang telah disesuaikan dengan arsitektur penyimpanan baru menggunakan **EnStorage API**.

## Cara Kerja Script

1. **Internet & WiFi Check**: Mengecek koneksi internet. Jika offline, script otomatis mencoba menyambungkan ke profil WiFi tersimpan (`SIDABIMA5GHz`, `Basement_5G`, dll).
2. **EnStorage Authentication**: Menghubungkan ke EnStorage menggunakan Base URL dan API Key (token disimpan di `%APPDATA%\enstorage_backup_config.json`).
3. **Folder Resolution**: Mencari root backup folder (default `EnCenter_Backups`) dan mencari subfolder tanggal kemarin `YYYYMMDD` (fallback otomatis ke tanggal hari ini jika folder kemarin tidak ada).
4. **Streaming Download**: Mendownload seluruh file `.sql.gz` dengan progress bar real-time dan validasi integritas file.

## Langkah Setup

### 1. Buka Task Scheduler

Tekan `Win + R` → ketik `taskschd.msc` → Enter.

### 2. Create Basic Task

Klik **Create Basic Task...** di panel kanan.

- **Name**: `EnVault Auto Download`
- Klik **Next**

### 3. Trigger

- Pilih **When the computer starts**
- Klik **Next**

### 4. Action

- Pilih **Start a program**
- Klik **Next**
- **Program/script**:
  ```
  powershell.exe
  ```
- **Add arguments**:
  ```
  -ExecutionPolicy Bypass -WindowStyle Normal -File "F:\workspace\Enpii Studio\projects\encenter\auto-connect-download.ps1"
  ```
- Klik **Next** → **Finish**

### 5. Tambah Delay (Penting)

Setelah task dibuat:

1. Klik kanan task yang baru dibuat → **Properties**
2. Buka tab **Triggers** → klik **Edit** pada trigger yang ada
3. Centang **Delay task for:** → set ke `30 seconds`

> Delay ini penting supaya Windows punya waktu konek ke jaringan WiFi sebelum script jalan.

## Konfigurasi EnStorage Pertama Kali

Saat pertama kali script dijalankan, jika variabel `$EnStorageUrl` atau `$EnStorageApiKey` belum diisi di dalam script, script akan meminta input:

- **EnStorage Base URL** (contoh: `https://storage.enpii.com`)
- **EnStorage API Key** (dibuat dari dashboard EnStorage)

Konfigurasi akan otomatis disimpan di `%APPDATA%\enstorage_backup_config.json` sehingga eksekusi startup berikutnya berjalan otomatis tanpa prompt.

## Verifikasi

Setelah restart komputer, script akan otomatis berjalan setelah delay 30 detik. Cek log atau output script untuk memastikan eksekusi berhasil.

Untuk menjalankan task secara manual tanpa restart, klik kanan task di Task Scheduler → **Run**.

---

[← Sebelumnya: API Documentation](api-documentation.md) · [Kembali ke Home](README.md)
