# Auto Download Backup Saat Startup (Windows)

Panduan setup agar script `auto-connect-download.ps1` otomatis berjalan ketika komputer Windows dinyalakan, menggunakan **Windows Task Scheduler** dengan trigger **At startup**.

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
  -ExecutionPolicy Bypass -WindowStyle Normal -File "F:\Workspace\Enpii Studio\projects\encenter\auto-connect-download.ps1"
  ```
- Klik **Next** → **Finish**

### 5. Tambah Delay (penting)

Setelah task dibuat:

1. Klik kanan task yang baru dibuat → **Properties**
2. Buka tab **Triggers** → klik **Edit** pada trigger yang ada
3. Centang **Delay task for:** → set ke `30 seconds`

> Delay ini penting supaya Windows punya waktu konek ke WiFi sebelum script jalan.

## Verifikasi

Setelah restart komputer, script akan otomatis berjalan setelah delay 30 detik. Cek log atau output script untuk memastikan eksekusi berhasil.

Untuk menjalankan task secara manual tanpa restart, klik kanan task di Task Scheduler → **Run**.