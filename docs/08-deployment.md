# 08 — Deployment

Panduan deploy EnCenter ke environment production. Stack ini dirancang self-hosted, biasanya di VPS dengan Docker.

## Prasyarat Server

| Resource | Rekomendasi minimum |
| --- | --- |
| CPU | 2 vCPU |
| RAM | 4 GB (8 GB ideal kalau database backup besar) |
| Storage | 40 GB SSD (file backup sementara, log) |
| OS | Ubuntu 22.04 LTS / Debian 12 |
| Software | Docker Engine 24+, Docker Compose v2, Git |
| Network | Public IP, firewall yang bisa diatur (UFW) |

Domain & TLS direkomendasikan kalau aplikasi diakses dari luar VPS.

## Langkah Deploy

### 1. Provision Server

```bash
# di VPS
sudo apt update && sudo apt -y upgrade
sudo apt -y install docker.io docker-compose-plugin git
sudo systemctl enable --now docker
sudo usermod -aG docker $USER   # logout/login ulang
```

### 2. Clone repository

```bash
git clone <repo-url> /opt/envault
cd /opt/envault
```

### 3. Network external

```bash
docker network create web-network
```

### 4. Setup environment

```bash
cp .env.example .env
cp website/backend/.env.example website/backend/.env
```

Edit dua file `.env` tersebut. Untuk production minimal:

**Root `.env`:**
```env
N8N_HOST=n8n.domain.tld           # kalau punya subdomain
N8N_PROTOCOL=https
N8N_ENCRYPTION_KEY=<32+ random char>
WEBHOOK_URL=https://n8n.domain.tld/

EVOLUTION_API_KEY=<long random>

NODE_ENV=production
WATCHPACK_POLLING=false
CHOKIDAR_USEPOLLING=false
NEXT_PUBLIC_API_URL=https://api.domain.tld/api/v1
NEXT_PUBLIC_PMA_URL=https://pma.domain.tld
```

**`website/backend/.env`:**
```env
APP_NAME=EnVault
APP_ENV=production
APP_KEY=                          # akan di-generate di langkah 6
APP_DEBUG=false
APP_URL=https://api.domain.tld
FRONTEND_URL=https://app.domain.tld

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=envault
DB_USERNAME=envault
DB_PASSWORD=<strong>

QUEUE_CONNECTION=database
SESSION_DRIVER=database
CACHE_STORE=database

GOOGLE_DRIVE_CLIENT_ID=...
GOOGLE_DRIVE_CLIENT_SECRET=...
GOOGLE_DRIVE_REDIRECT_URI=https://app.domain.tld/admin/storage/callback

N8N_API_KEY=<long random>

SANCTUM_STATEFUL_DOMAINS=app.domain.tld
```

> **Buat database dan user `envault` di Postgres** dengan dua opsi:
>
> - **Otomatis (clean install):** biarkan `postgres/init/01-create-envault-db.sql` berjalan saat first up — script mendukung skenario fresh deployment. Folder `evolution/postgres/` tidak boleh sudah berisi data dari run sebelumnya.
> - **Manual (existing volume):** kalau Anda sudah punya data Postgres lama yang tidak ingin di-reset, jalankan SQL secara manual:
>
> ```bash
> docker compose up -d postgres
> docker exec -i evolution-postgres psql -U evolution <<'SQL'
> CREATE USER envault WITH PASSWORD 'envault';
> CREATE DATABASE envault OWNER envault;
> GRANT ALL PRIVILEGES ON DATABASE envault TO envault;
> SQL
> ```

### 5. Build & start service

```bash
docker compose pull
docker compose up -d --build
```

> Database `envault` (user `envault`, password `envault`) dibuat otomatis oleh `postgres/init/01-create-envault-db.sql` saat container Postgres pertama kali up. **Untuk production, ganti password default** lewat `psql` setelah init:
> ```bash
> docker exec -it evolution-postgres psql -U evolution \
>   -c "ALTER USER envault WITH PASSWORD 'strong';"
> ```
> Pastikan `DB_PASSWORD` di `website/backend/.env` mengikuti.

### 6. Generate APP_KEY & migrasi

```bash
docker exec -it envault-backend php artisan key:generate
docker exec -it envault-backend php artisan migrate --force
docker exec -it envault-backend php artisan db:seed --force   # opsional, bikin user admin default
```

> Setelah seed, **wajib ganti password** user `admin@encenter.com` lewat halaman Profile.

### 7. Optimisasi Laravel

```bash
docker exec -it envault-backend php artisan config:cache
docker exec -it envault-backend php artisan route:cache
docker exec -it envault-backend php artisan view:cache
```

### 8. Build frontend (kalau pakai mode production)

`Dockerfile` frontend sudah otomatis build kalau `NODE_ENV=production`. Jika perlu manual rebuild setelah update kode:

```bash
docker compose build encenter-frontend
docker compose up -d encenter-frontend
```

## Reverse Proxy (Disarankan)

Stack ini meng-expose port langsung ke host (3000, 8000, 5678, 8080, 8081, 18789). Untuk production lebih aman menempatkan reverse proxy (Caddy, Traefik, Nginx) di depan dan terminate TLS di sana.

### Contoh Caddy

```caddy
app.domain.tld {
    reverse_proxy encenter-frontend:3000
}

api.domain.tld {
    reverse_proxy envault-nginx:80
}

n8n.domain.tld {
    reverse_proxy encenter-n8n:5678
}

pma.domain.tld {
    reverse_proxy encenter-phpmyadmin:80
}
```

Pastikan reverse proxy juga terpasang di `web-network` (sudah otomatis kalau pakai Caddy/Traefik dengan label compose).

### Firewall (UFW)

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Tutup port lain (3000, 8000, 5678, 8080, 8081, 18789) supaya tidak bisa diakses langsung dari publik.

## Backup APP_KEY (Wajib)

`APP_KEY` di `website/backend/.env` adalah kunci dekripsi untuk seluruh data sensitif. Jika hilang, **kredensial tidak bisa dibaca lagi**.

Strategi minimum:
1. Simpan APP_KEY di password manager (1Password, Bitwarden, Vaultwarden).
2. Salin ke storage offline (USB drive terenkripsi).
3. Dokumentasikan tanggal rotasi APP_KEY (kalau ada).

> Lihat [09-security.md](09-security.md) untuk detail.

## Backup Database & Volume

Selain APP_KEY, beberapa data lain wajib di-backup:

| Sumber | Cara | Catatan |
| --- | --- | --- |
| Postgres EnCenter | `pg_dump -h ... -U envault envault > envault.sql.gz` | Atau gunakan EnVault sendiri untuk back up dirinya 😎 |
| Workflow n8n | tar-gz folder `n8n/data/` | Workflow + credentials terenkripsi `N8N_ENCRYPTION_KEY` |
| Evolution sessions | tar-gz `evolution/instances/` | Session WhatsApp Web |
| `.env` files | Salin secara aman | Termasuk APP_KEY |

Buat skedul backup external (mis. lewat cron host atau workflow n8n itu sendiri).

## Update / Deploy Ulang

```bash
cd /opt/envault
git pull
docker compose pull
docker compose up -d --build

# kalau ada migrasi baru
docker exec -it envault-backend php artisan migrate --force

# kalau ada perubahan config
docker exec -it envault-backend php artisan config:cache

# kalau ada perubahan route
docker exec -it envault-backend php artisan route:cache
```

## Monitoring Sederhana

- **Backend log:** `docker logs -f envault-backend`
- **Worker log:** `docker logs -f envault-worker`
- **Nginx access:** `docker logs -f envault-nginx`
- **Backup activity:** halaman `/admin/backups` + `/admin/audit`
- **Health endpoint:** `GET /up` (status 200 dengan body kosong = sehat)

Untuk production yang lebih serius:
- Aktifkan log driver Docker (json-file dengan rotasi atau Loki/Vector).
- Tambahkan healthcheck di `docker-compose.yml`.
- Kirim error Laravel ke Sentry (paket `sentry/sentry-laravel`) jika perlu.

## Skenario Disaster Recovery

1. **VPS hilang total.**
   - Provision server baru.
   - Clone repo, setup `.env` (terutama `APP_KEY` dari backup), buat network, restore `n8n/data/` dan `evolution/instances/` dari backup, restore Postgres `envault` dari `pg_dump`.
   - `docker compose up -d --build`.
2. **Database corrupt.**
   - Restore dari `pg_dump` terbaru. Backup file di Google Drive tetap aman.
3. **Google Drive token revoked.**
   - User connect ulang lewat menu Cloud Storage. Folder existing tetap dipakai (folder ID disimpan di `user_storages`).
4. **APP_KEY hilang.**
   - Tidak ada cara recovery. Semua kredensial di vault harus di-input ulang.

## Production Checklist

- [ ] `APP_DEBUG=false`
- [ ] `APP_KEY` di-backup off-VPS
- [ ] HTTPS via reverse proxy
- [ ] Firewall membatasi port internal
- [ ] User admin default sudah ganti password
- [ ] Sanctum stateful domain dibatasi
- [ ] Rate limiter aktif (sudah default)
- [ ] Backup terjadwal untuk Postgres + n8n + Evolution
- [ ] Monitoring log (minimal cron `docker logs` ke storage)
- [ ] Schedule rotasi APP_KEY (opsional, butuh re-encrypt seluruh data)
