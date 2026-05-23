# 07 — Layanan Pendukung

Selain backend Laravel dan frontend Next.js, stack EnCenter membundel beberapa service pendukung yang dijalankan via `docker-compose.yml`.

## phpMyAdmin (`encenter-phpmyadmin`)

### Tujuan
Akses phpMyAdmin yang **auto-login** ke server database target ketika user mengklik tombol "Open in phpMyAdmin" di vault atau global search.

### Image
- Dibuild dari `phpmyadmin/Dockerfile`.
- Base: `php:8.3-apache` + ekstensi `mysqli`, `mbstring`, `zip`, `xml`.
- Apache `mod_rewrite` aktif, `AllowOverride All`.
- Opcache dimatikan untuk dev convenience.
- Custom entrypoint memastikan `/var/www/html/tmp` writable oleh `www-data`.

### Konfigurasi (`phpmyadmin/config.inc.php`)

```php
$blowfishSecret = (string) (getenv('PMA_BLOWFISH_SECRET') ?: '');
if (strlen($blowfishSecret) < 32) {
    $blowfishSecret = str_pad($blowfishSecret, 32, 'x');
}
$cfg['blowfish_secret'] = $blowfishSecret;
$cfg['AllowArbitraryServer'] = true;
$cfg['Servers'][1]['auth_type']       = 'cookie';
$cfg['Servers'][1]['host']            = 'localhost';
$cfg['Servers'][1]['compress']        = false;
$cfg['Servers'][1]['AllowNoPassword'] = false;
```

> `blowfish_secret` dibaca dari env `PMA_BLOWFISH_SECRET` (di-set di `docker-compose.yml`). Wajib **32 karakter**. Generate dengan `openssl rand -base64 24 | head -c 32` lalu masukkan ke root `.env`. Jika kosong saat boot, file ini hanya menyiapkan padding non-rahasia agar phpMyAdmin tidak crash — production wajib mengisi nilainya.

> `AllowArbitraryServer = true` memungkinkan parameter `pma_servername` mengarah ke host eksternal (server target Anda).

### Skrip Auto-login (`phpmyadmin/autologin.php`)

Endpoint custom yang dipanggil oleh frontend EnCenter via form POST. Alur:

1. Terima `pma_username`, `pma_password`, `pma_servername` (POST atau GET).
2. Deteksi HTTPS via header reverse proxy.
3. Hapus cookie phpMyAdmin lama (`pmaUser-1`, `pmaAuth-1`, dst.) — agar sesi sebelumnya tidak menempel.
4. Render halaman HTML transisi yang menyimpan kredensial ke `sessionStorage` dan redirect ke `index.php`.
5. phpMyAdmin akan auto-login dengan kredensial tersebut.

### Penggunaan dari Frontend

Lihat `app/admin/vault/page.tsx#handleOpenPma` dan `components/admin/GlobalSearch.tsx#handleOpenPma`. Singkatnya:

```ts
const form = document.createElement("form");
form.action = `${PMA_URL}/autologin.php`;
form.method = "POST";
form.target = "_blank";
// pma_username, pma_password, pma_servername sebagai hidden input
form.submit();
```

> **Catatan keamanan:** Kredensial database melewati browser user (sebagai bagian dari form POST). Untuk environment production yang strict, pertimbangkan untuk men-tunneling melalui backend (proxy) supaya plaintext password tidak terkirim dari client.

## n8n (`encenter-n8n`)

### Tujuan
Automation engine. Dipakai untuk:
- Scheduler harian / mingguan (panggil `POST /backups/run`).
- Receiver webhook backup → forward ke WhatsApp via Evolution API.
- Workflow lain yang Anda definisikan.

### Image & Volume
- Image: `docker.n8n.io/n8nio/n8n` (latest).
- Volume: `./n8n/data:/home/node/.n8n` — berisi SQLite database, workflow, credentials terenkripsi.

### Environment

```env
N8N_HOST=${N8N_HOST}              # default localhost
N8N_PORT=5678
N8N_PROTOCOL=${N8N_PROTOCOL}      # http/https
N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}  # WAJIB random 32+ char, kalau hilang credentials di n8n tak terbaca
WEBHOOK_URL=${WEBHOOK_URL}        # default http://localhost:5678/
GENERIC_TIMEZONE=Asia/Jakarta
N8N_COMMUNITY_PACKAGES_ENABLED=true
NODE_FUNCTION_ALLOW_BUILTIN=crypto # supaya bisa pakai crypto di Function node
```

### Pola Integrasi

**Pattern A — n8n trigger backup** (Schedule → HTTP Request)
```text
Cron Trigger
   │
   ▼
HTTP Request
   URL    : http://envault-nginx/api/v1/backups/run
   Headers: X-API-Key: <N8N_API_KEY>
   Body   : { "db_label": "MySQL Main DB", "triggered_by": "n8n_scheduler" }
```

**Pattern B — n8n receive webhook** (Webhook → Verify HMAC → Send WhatsApp)
```text
Webhook (POST /webhook/backup-notifier)
   │
   ▼
Function: Verify HMAC
   const hash = crypto.createHmac('sha256', SECRET).update(body).digest('hex');
   if (hash !== headerHash.replace('hmac-sha256=', '')) throw new Error('Invalid signature');
   │
   ▼
HTTP Request → Evolution API send-message
```

Detail payload + verifikasi di [api-documentation.md](api-documentation.md).

## Evolution API (`encenter-evolution`)

### Tujuan
Bridge ke WhatsApp Web. n8n meneruskan notifikasi backup ke endpoint Evolution untuk dikirim sebagai pesan WhatsApp.

### Image & Dependency
- Image: `evoapicloud/evolution-api:latest`.
- Depends on: `postgres` (`evolution` database), `redis`.
- Port host: `8080`.
- Volume: `./evolution/instances:/evolution/instances` — berisi metadata instance WA.

### Environment

```env
AUTHENTICATION_TYPE=apikey
AUTHENTICATION_API_KEY=${EVOLUTION_API_KEY}    # wajib di-set
N8N_ENABLED=true
DATABASE_ENABLED=true
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://evolution:evolution@postgres:5432/evolution
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://redis:6379
```

### Setup awal
1. Akses `http://localhost:8080`.
2. Buat instance baru dengan API key (`AUTHENTICATION_API_KEY`).
3. Scan QR code WhatsApp dari handphone admin.
4. Catat instance name + API key untuk dipakai di n8n.

> Evolution API menyimpan session WhatsApp di `evolution/instances`. Ini termasuk data sensitif (token + cookie WA Web). Backup terpisah dan **jangan** commit ke git (`.gitignore` sudah meng-exclude folder ini).

## OpenClaw (`encenter-openclaw`)

OpenClaw bukan layanan pendukung dalam arti tradisional. Dia adalah **persona AI Enpii** yang berperan sebagai operator stack — versi digital dari pemilik repo yang hadir 24/7 untuk memantau, merespons, dan mengeksekusi tugas-tugas yang biasanya butuh manusia. Detail konseptual dijelaskan di [01-overview.md](01-overview.md#operator-openclaw-enpii-ai); section ini hanya membahas sisi infrastrukturnya.

### Posisi di stack

OpenClaw **tidak** memanggil API EnCenter langsung. Akses ke API memang dibatasi pada dua klien resmi: frontend Next.js (Sanctum) dan workflow n8n (X-API-Key). OpenClaw tidak termasuk salah satunya.

Jalur komunikasi yang valid hanya satu: **lewat n8n**. Workflow n8n menerima trigger (mis. webhook backup dari Laravel, atau pesan WhatsApp via Evolution), lalu mengirim HTTP request ke OpenClaw di `:18789`. Jika OpenClaw perlu beraksi balik (membalas pesan, men-trigger backup, dll.), aksi tersebut disalurkan kembali lewat workflow n8n yang tepat.

Aplikasi tetap berfungsi penuh tanpa container ini. Dengan dia, alur otomasi (jawab WA, push notifikasi cerdas, intervensi backup gagal) jadi terasa hidup.

### Image
- Dibuild dari `openclaw/Dockerfile`.
- Base: `node:24-slim` + git, python3, build-essential, ca-certificates.
- `npm i -g openclaw@latest`.
- `CMD ["openclaw", "gateway"]` — meng-expose HTTP gateway di port 18789.

### Volume
- `./openclaw/config:/root/.openclaw` (gitignored — runtime state, log).
- `./openclaw/workspace:/root/.openclaw/workspace` — definisi persona dan skill set.

> Isi `openclaw/workspace/` bersifat pribadi (persona, kontak, skills) dan **tidak dijelaskan di dokumentasi ini**. Yang relevan untuk integrasi: gateway menerima HTTP request dan membalas dengan respon yang ditafsirkan persona.

### Environment
- `PI_AI_ANTIGRAVITY_VERSION` — pin versi runtime agen.
- `OPENCLAW_GATEWAY_BIND=lan` — bind ke LAN agar bisa dijangkau dari container lain di `agent-network` dan dari host LAN, tidak hanya loopback.

## PostgreSQL (`evolution-postgres`) & Redis (`evolution-redis`)

### Postgres
- Image `postgres:15`.
- Default user/password/database: `evolution / evolution / evolution`.
- Volume: `./evolution/postgres:/var/lib/postgresql/data` (gitignored).
- **Tip:** Untuk database EnCenter, buat database/user baru di instance ini, atau jalankan service Postgres terpisah.

### Redis
- Image `redis:7`.
- Tidak ada volume eksternal — cache reset saat container restart.

## Network

`docker-compose.yml` mendefinisikan dua network:

```yaml
networks:
  agent-network:
    driver: bridge
    name: agent-network
  web-network:
    external: true
```

`web-network` harus dibuat sekali sebelum `docker compose up`:

```bash
docker network create web-network
```

Service yang ada di kedua network bisa diakses dari container lain di stack lewat hostname (`postgres`, `redis`, `n8n`, `envault-nginx`, dst.) sekaligus diintegrasikan dengan reverse proxy eksternal yang juga terpasang di `web-network`.

## Ringkasan Port

| Service | Port host | Catatan |
| --- | --- | --- |
| Frontend | `3000` | Next.js dev / start |
| Backend (Nginx) | `8000` | API utama |
| phpMyAdmin | `8081` | Auto-login dari frontend |
| Evolution API | `8080` | WhatsApp bridge |
| n8n | `5678` | Automation UI |
| OpenClaw gateway | `18789` | Agent gateway |

## Health Checks

| Service | URL / Cara cek |
| --- | --- |
| Backend | `curl http://localhost:8000/up` (Laravel default) |
| Frontend | `curl -I http://localhost:3000` |
| phpMyAdmin | `curl -I http://localhost:8081` |
| n8n | `curl -I http://localhost:5678` |
| Evolution | `GET http://localhost:8080/instance/fetchInstances` (perlu API key) |

> Saat ini `docker-compose.yml` belum menambahkan `healthcheck` untuk masing-masing service. Anda bisa menambahkannya sesuai kebutuhan production.

---

[← Sebelumnya: Database Schema](06-database-schema.md) · [Kembali ke Home](README.md) · [Selanjutnya: Deployment →](08-deployment.md)
