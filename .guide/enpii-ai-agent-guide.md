# Panduan Sistem "Enpii AI" v4

### Full Docker — OpenClaw (HTTP API) + n8n + Evolution API (WhatsApp)

---

## Daftar Isi

1. [Gambaran Sistem](#1-gambaran-sistem)
2. [Persiapan](#2-persiapan)
3. [Struktur Project](#3-struktur-project)
4. [Dockerfile OpenClaw](#4-dockerfile-openclaw)
5. [docker-compose.yml](#5-docker-composeyml)
6. [File .env](#6-file-env)
7. [Build & Jalankan Container](#7-build--jalankan-container)
8. [Konfigurasi OpenClaw](#8-konfigurasi-openclaw)
9. [Konfigurasi Evolution API](#9-konfigurasi-evolution-api)
10. [Konfigurasi n8n](#10-konfigurasi-n8n)
11. [Workflow n8n](#11-workflow-n8n)
12. [Knowledge Base (Skills)](#12-knowledge-base-skills)
13. [Testing](#13-testing)
14. [Deploy ke Production](#14-deploy-ke-production)
15. [Perintah Sehari-hari](#15-perintah-sehari-hari)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Gambaran Sistem

### Alur kerja

```
[User kirim WhatsApp]
        │
        ▼
[Evolution API terima pesan]
        │
        ▼
[n8n terima via Webhook]
        │
        ├── Kamu reply manual dalam 2 menit? → Selesai
        │
        └── Tidak reply → kirim ke OpenClaw via HTTP API
                                │
                                ▼
                    [OpenClaw proses dengan Skills + LLM]
                                │
                                ▼
                    [n8n terima jawaban → kirim ke user WA]
                    [via Evolution API]
```

### Pembagian tugas

| Komponen      | Tugas                                                                         |
| ------------- | ----------------------------------------------------------------------------- |
| Evolution API | Gateway WhatsApp — terima dan kirim pesan                                     |
| n8n           | Orkestrasi — terima webhook, deteksi timeout, panggil OpenClaw, kirim jawaban |
| OpenClaw      | AI Agent — proses pesan dengan Skills + LLM, jawab via HTTP API               |

### Perubahan dari v3

| v3                                  | v4                                  |
| ----------------------------------- | ----------------------------------- |
| WhatsApp via Baileys (tidak stabil) | WhatsApp via Evolution API (stabil) |
| Relay via Telegram group            | Langsung HTTP ke OpenClaw           |
| SQLite terpisah                     | n8n Data table (built-in)           |
| Butuh 2 bot Telegram                | Tidak butuh Telegram sama sekali    |

### Kenapa Full Docker

- Tidak perlu install apapun di host selain Docker
- Konfigurasi yang sama jalan di local dan production
- Tidak perlu PM2 — Docker handle restart otomatis via `restart: unless-stopped`
- Pindah ke production cukup copy config dan jalankan `docker compose up -d`

---

## 2. Persiapan

### Install Docker di Ubuntu

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release

sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Agar tidak perlu sudo setiap pakai Docker
sudo usermod -aG docker $USER
newgrp docker

# Verifikasi
docker --version
docker compose version
```

### Yang harus disiapkan

| Kebutuhan            | Cara dapat                               |
| -------------------- | ---------------------------------------- |
| Anthropic API Key    | https://console.anthropic.com → API Keys |
| Nomor WhatsApp kedua | Kartu baru — jangan pakai nomor utama    |

> Tidak perlu bot Telegram sama sekali di v4.

---

## 3. Struktur Project

```bash
mkdir -p ~/encenter/{openclaw/{config,workspace/skills/{identity,projects,server,sop,faq,escalation}},n8n/data,evolution/{instances,postgres}}
cd ~/encenter
```

Struktur lengkap:

```
encenter/
├── docker-compose.yml
├── .env                        ← tidak di-commit
├── .env.example                ← di-commit (template kosong)
├── .gitignore
├── website/
│   ├── backend/
|   └── frontend/
├── openclaw/
│   ├── Dockerfile
│   ├── config/                 ← tidak di-commit (hasil konfigurasi)
│   └── workspace/
│       ├── system-prompt.md    ← di-commit
│       └── skills/             ← di-commit
│           ├── identity/SKILL.md
│           ├── projects/SKILL.md
│           ├── server/SKILL.md
│           ├── sop/SKILL.md
│           ├── faq/SKILL.md
│           └── escalation/SKILL.md
├── n8n/
│   └── data/                   ← tidak di-commit
└── evolution/
    ├── instances/              ← tidak di-commit (session WhatsApp)
    └── postgres/               ← tidak di-commit
```

### .gitignore

```
# Common
.env
.env.*
!.env.example
.DS_Store
Thumbs.db
*.log

# Infrastructure
openclaw/config/
n8n/data/
evolution/instances/
evolution/postgres/

# Backend (Laravel)
website/backend/.phpunit.result.cache
website/backend/.phpactor.json
website/backend/.phpunit.cache
website/backend/node_modules/
website/backend/vendor/
website/backend/public/build/
website/backend/public/hot/
website/backend/public/storage
website/backend/storage/*.key
website/backend/storage/pail/
website/backend/Homestead.json
website/backend/Homestead.yaml
website/backend/_ide_helper.php

# Frontend (Next.js)
website/frontend/node_modules/
website/frontend/.pnp
website/frontend/.pnp.*
website/frontend/.next/
website/frontend/out/
website/frontend/build/
website/frontend/.vercel
website/frontend/*.tsbuildinfo
website/frontend/next-env.d.ts

# IDEs
.idea/
.vscode/
.zed/
.nova/
.cursor/
.codex/
```

---

## 4. Dockerfile OpenClaw

```bash
nano ~/encenter/openclaw/Dockerfile
```

```dockerfile
FROM node:24-slim

RUN apt-get update && apt-get install -y \
    git \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g openclaw@2026.2.22-2

WORKDIR /root

COPY workspace/ /root/.openclaw/workspace/

CMD ["openclaw", "gateway"]
```

---

## 5. docker-compose.yml

```bash
nano ~/encenter/docker-compose.yml
```

```yaml
services:
  openclaw:
    build: ./openclaw
    container_name: enpii-openclaw
    restart: unless-stopped
    volumes:
      - ./openclaw/config:/root/.openclaw
      - ./openclaw/workspace:/root/.openclaw/workspace
    networks:
      - agent-network

  n8n:
    image: docker.n8n.io/n8nio/n8n
    container_name: enpii-n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=${N8N_HOST}
      - N8N_PORT=5678
      - N8N_PROTOCOL=${N8N_PROTOCOL}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - WEBHOOK_URL=${WEBHOOK_URL}
      - GENERIC_TIMEZONE=Asia/Jakarta
      - N8N_COMMUNITY_PACKAGES_ENABLED=true
    volumes:
      - ./n8n/data:/home/node/.n8n
    networks:
      - agent-network

  postgres:
    image: postgres:15
    container_name: evolution-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: evolution
      POSTGRES_PASSWORD: evolution
      POSTGRES_DB: evolution
    volumes:
      - ./evolution/postgres:/var/lib/postgresql/data
    networks:
      - agent-network

  redis:
    image: redis:7
    container_name: evolution-redis
    restart: unless-stopped
    networks:
      - agent-network

  evolution-api:
    image: evoapicloud/evolution-api:latest
    container_name: enpii-evolution
    restart: unless-stopped
    depends_on:
      - postgres
      - redis
    ports:
      - "8080:8080"
    environment:
      - AUTHENTICATION_TYPE=apikey
      - AUTHENTICATION_API_KEY=${EVOLUTION_API_KEY}
      - DATABASE_ENABLED=true
      - DATABASE_PROVIDER=postgresql
      - DATABASE_CONNECTION_URI=postgresql://evolution:evolution@postgres:5432/evolution
      - CACHE_REDIS_ENABLED=true
      - CACHE_REDIS_URI=redis://redis:6379
    volumes:
      - ./evolution/instances:/evolution/instances
    networks:
      - agent-network

networks:
  agent-network:
    driver: bridge
    name: agent-network
```

> `name: agent-network` penting agar Docker tidak prefix nama network dengan nama folder project.

---

## 6. File .env

Generate encryption key dulu:

```bash
openssl rand -hex 32
```

Buat file .env:

```bash
nano ~/encenter/.env
```

```env
# n8n
N8N_HOST=localhost
N8N_PROTOCOL=http
WEBHOOK_URL=http://localhost:5678/
N8N_ENCRYPTION_KEY=hasil_dari_openssl_rand_hex_32

# Evolution API
EVOLUTION_API_KEY=buat_sendiri_minimal_32_karakter
```

Template:

```bash
nano ~/encenter/.env.example
```

```env
N8N_HOST=
N8N_PROTOCOL=
WEBHOOK_URL=
N8N_ENCRYPTION_KEY=
EVOLUTION_API_KEY=
```

---

## 7. Build & Jalankan Container

```bash
cd ~/encenter

# Build openclaw image
docker compose build

# Jalankan semua container
docker compose up -d

# Verifikasi
docker compose ps
```

Output yang diharapkan:

```
NAME                STATUS
enpii-openclaw      Up X minutes
enpii-n8n           Up X minutes
enpii-evolution     Up X minutes
evolution-postgres  Up X minutes
evolution-redis     Up X minutes
```

---

## 8. Konfigurasi OpenClaw

OpenClaw perlu dikonfigurasi sekali. Konfigurasi tersimpan di `./openclaw/config/` di host.

### Langkah 1 — Jalankan configure

```bash
docker compose exec openclaw bash
openclaw configure
```

Ikuti wizard interaktif:

- Pilih LLM provider: **Anthropic**
- Masukkan Anthropic API Key
- Pilih model yang mengandung **sonnet**

### Langkah 2 — Enable HTTP API

Keluar dari container:

```bash
exit
```

Fix permission:

```bash
sudo chown -R $USER ~/encenter/openclaw/config/
```

Edit `openclaw.json`:

```bash
nano ~/encenter/openclaw/config/openclaw.json
```

Tambahkan/update bagian `gateway`:

```json
{
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "lan",
    "http": {
      "endpoints": {
        "chatCompletions": { "enabled": true }
      }
    },
    "auth": {
      "mode": "token",
      "token": "OPENCLAW_TOKEN_KAMU"
    }
  }
}
```

> `OPENCLAW_TOKEN_KAMU` adalah token yang di-generate otomatis saat `openclaw configure`. Lihat di `openclaw.json` bagian `gateway.auth.token`.

### Langkah 3 — Restart

```bash
docker compose restart openclaw
```

### Langkah 4 — Verifikasi

```bash
# Dari host
curl http://localhost:18789/healthz
# Harus return: {"status":"ok"} atau HTTP 200

# Test chat completions
curl -X POST http://localhost:18789/v1/chat/completions \
  -H "Authorization: Bearer OPENCLAW_TOKEN_KAMU" \
  -H "Content-Type: application/json" \
  -d '{"model":"openclaw/default","messages":[{"role":"user","content":"Halo"}]}'
```

---

## 9. Konfigurasi Evolution API

### Langkah 1 — Buat Instance WhatsApp

Buka browser: `http://localhost:8080`

Klik **Instance +** → isi:

- Instance Name: `EnpiiStudio`
- Token: buat sendiri (catat, dipakai di n8n)

### Langkah 2 — Scan QR WhatsApp

Klik card **EnpiiStudio** → QR code muncul → scan dari HP WhatsApp nomor kedua.

Tunggu status berubah jadi **Connected**.

### Langkah 3 — Setup Webhook ke n8n

Di Evolution API dashboard → **Events** → **Webhook**:

- Enabled: ON
- URL: `http://enpii-n8n:5678/webhook/whatsapp-incoming`
- Events yang di-enable: `MESSAGES_UPSERT`

Simpan.

> Gunakan nama service `enpii-n8n` bukan `localhost` karena Evolution API dan n8n ada di Docker network yang sama.

---

## 10. Konfigurasi n8n

### Langkah 1 — Setup akun admin

Buka browser: `http://localhost:5678`

Isi email dan password → klik **Get Started**.

### Langkah 2 — Install community node Evolution API

1. Klik profil kanan atas → **Settings**
2. **Community Nodes** → **Install a community node**
3. Ketik: `n8n-nodes-evolution-api`
4. Klik **Install**
5. Restart n8n:

```bash
docker compose restart n8n
```

### Langkah 3 — Tambah Credential Evolution API

Buka **Credentials** (sidebar kiri) → **Add Credential** → cari **Evolution API**:

- Server URL: `http://enpii-evolution:8080`
- API Key: isi sesuai `EVOLUTION_API_KEY` di `.env`

Klik **Save**.

### Langkah 4 — Tambah Credential OpenClaw (Bearer Auth)

**Add Credential** → cari **Bearer Auth**:

- Nama: `OpenClaw API`
- Token: `OPENCLAW_TOKEN_KAMU`

Klik **Save**.

---

## 11. Workflow n8n

Buka `http://localhost:5678` → **Workflows → New**

### Workflow 1 — WA Terima Pesan

**Node 1 — Webhook**

- HTTP Method: `POST`
- Path: `whatsapp-incoming`
- Respond: `Immediately`

**Node 2 — IF**

- Kondisi 1: `{{ $json.body.event }}` equals `messages.upsert`
- Kondisi 2: `{{ $json.body.data.key.fromMe }}` equals `false`

**Node 3 — Code**

```javascript
const data = $input.first().json.body.data;
const msg = data.message;
const cleanPhone = (jid) =>
  jid.replace("@s.whatsapp.net", "").replace("@g.us", "");

let content;
if (msg.conversation) content = msg.conversation;
else if (msg.extendedTextMessage?.text) content = msg.extendedTextMessage.text;
else if (msg.imageMessage?.caption) content = msg.imageMessage.caption;
else if (msg.imageMessage) content = "[Gambar]";
else if (msg.videoMessage?.caption) content = msg.videoMessage.caption;
else if (msg.videoMessage) content = "[Video]";
else if (msg.audioMessage) content = "[Audio]";
else if (msg.documentMessage?.caption) content = msg.documentMessage.caption;
else if (msg.documentMessage) content = "[Dokumen]";
else if (msg.stickerMessage) content = "[Sticker]";
else if (msg.locationMessage)
  content = `[Lokasi: ${msg.locationMessage.degreesLatitude}, ${msg.locationMessage.degreesLongitude}]`;
else content = "[Pesan tidak didukung]";

return [
  {
    message_id: Math.random().toString(36).substring(2, 10),
    sender: cleanPhone(data.key.remoteJid),
    sender_name: data.pushName || "Unknown",
    content,
    received_at: new Date().toISOString(),
    status: "pending",
  },
];
```

**Node 4 — Data table**

- Operation: `Insert`
- Table Name: `messages`

**Node 5 — Execute Workflow**

- Workflow: `WA Deteksi Timeout`
- Workflow Inputs: kirim `message_id`, `sender`, `sender_name`, `content`, `received_at`

---

### Workflow 2 — WA Deteksi Timeout

**Node 1 — Execute Workflow Trigger**

- Input data mode: `Define using fields below`
- Fields: `message_id`, `sender`, `sender_name`, `content`, `received_at`

**Node 2 — Wait**

- Duration: `2 minutes`

**Node 3 — Data table**

- Operation: `Get Many`
- Table Name: `messages`
- Filter: `message_id` equals `{{ $json.message_id }}`

**Node 4 — IF**

- Kondisi: `{{ $json.status }}` equals `pending`

**Node 5 — HTTP Request (OpenClaw)**

- Method: `POST`
- URL: `http://openclaw:18789/v1/chat/completions`
- Authentication: `Predefined Credential Type` → `Bearer Auth` → pilih `OpenClaw API`
- Body (JSON):

```json
{
  "model": "openclaw/default",
  "messages": [
    {
      "role": "user",
      "content": "Pesan dari {{ $('Node 1').item.json.sender_name }} ({{ $('Node 1').item.json.sender }}):\n{{ $('Node 1').item.json.content }}"
    }
  ],
  "user": "{{ $('Node 1').item.json.sender }}"
}
```

**Node 6 — Evolution API**

- Credential: Evolution account
- Recurso: `Mensagem`
- Operação: `Enviar texto`
- Nome Da Instância: `EnpiiStudio`
- Número: `{{ $('Node 1').item.json.sender }}`
- Texto: `{{ $json.choices[0].message.content }}`

**Node 7 — Data table**

- Operation: `Update`
- Table Name: `messages`
- Filter: `message_id` equals `{{ $('Node 1').item.json.message_id }}`
- Fields to update:
  - `status` = `answered_by_agent`
  - `replied_at` = `{{ new Date().toISOString() }}`

---

### Workflow 3 — Deteksi Reply Manual

**Node 1 — Webhook**

- HTTP Method: `POST`
- Path: `whatsapp-incoming`

> Webhook path sama dengan Workflow 1. n8n otomatis routing ke kedua workflow.

**Node 2 — IF**

- Kondisi 1: `{{ $json.body.event }}` equals `messages.upsert`
- Kondisi 2: `{{ $json.body.data.key.fromMe }}` equals `true`

**Node 3 — Code**

```javascript
const cleanPhone = (jid) =>
  jid.replace("@s.whatsapp.net", "").replace("@g.us", "");
return [
  {
    sender: cleanPhone($input.first().json.body.data.key.remoteJid),
  },
];
```

**Node 4 — Data table**

- Operation: `Update`
- Table Name: `messages`
- Filter: `sender` equals `{{ $json.sender }}` AND `status` equals `pending`
- Fields to update:
  - `status` = `answered_manually`
  - `replied_at` = `{{ new Date().toISOString() }}`

---

### Workflow 4 — Scan QR WhatsApp (Opsional)

Workflow ini hanya dipakai saat perlu scan QR ulang (sesi expired). Tidak perlu diaktifkan permanen.

**Node 1 — Webhook**

- HTTP Method: `GET`
- Path: `scan-qr`

**Node 2 — Evolution API**

- Operação: `Conectar Instancia`
- Nome Da Instância: `EnpiiStudio`

**Node 3 — Respond to Webhook**

- Response Format: `HTML`
- Response Body:

```html
<html>
  <body
    style="background:#000;display:flex;justify-content:center;align-items:center;height:100vh;margin:0"
  >
    <img src="{{ $json.base64 }}" style="width:300px;height:300px" />
  </body>
</html>
```

Untuk scan QR: buka `http://localhost:5678/webhook/scan-qr`

---

Aktifkan Workflow 1, 2, dan 3 dengan toggle **Active**.

---

## 12. Knowledge Base (Skills)

### System Prompt

```bash
nano ~/encenter/openclaw/workspace/system-prompt.md
```

```markdown
# System Prompt: Enpii AI

Kamu adalah Enpii AI, asisten otomatis yang mewakili Enpii saat tidak available.

## Aturan

1. Selalu Bahasa Indonesia kecuali user pakai bahasa lain
2. Singkat dan to the point
3. Jujur jika tidak tahu — jangan mengarang
4. Jika ditanya apakah AI — akui
5. Jangan bocorkan credential apapun

## Konteks

Kamu menerima pesan dari pengguna WhatsApp yang menghubungi Enpii.
Pesan dikirim dalam format:
"Pesan dari [Nama] ([nomor]):\n[isi pesan]"

Balas langsung dan natural, tidak perlu format khusus.

## Eskalasi

Jika pesan mengandung kata URGENT, DARURAT, atau PRODUCTION DOWN —
balas bahwa kamu sudah mencatat dan Enpii akan segera dihubungi.
```

### Skills

Isi masing-masing file SKILL.md sesuai konteks:

**identity/SKILL.md** — Persona, gaya komunikasi, nama tim

**projects/SKILL.md** — EnStore, sidbm, EnArisan, Tourism Platform

**server/SKILL.md** — Info server (tanpa credential)

**sop/SKILL.md** — Gitflow, cara deploy, konvensi commit

**faq/SKILL.md** — Pertanyaan teknis yang sering ditanya beserta jawabannya

**escalation/SKILL.md** — Kapan dan cara eskalasi ke Enpii

---

## 13. Testing

### Test per komponen

```bash
# Cek semua container jalan
docker compose ps

# Cek log
docker compose logs -f openclaw
docker compose logs -f n8n
docker compose logs -f enpii-evolution
```

**Test 1 — OpenClaw HTTP API:**

```bash
curl -X POST http://localhost:18789/v1/chat/completions \
  -H "Authorization: Bearer OPENCLAW_TOKEN_KAMU" \
  -H "Content-Type: application/json" \
  -d '{"model":"openclaw/default","messages":[{"role":"user","content":"Halo, siapa kamu?"}]}'
```

Harus return jawaban JSON dari OpenClaw.

**Test 2 — Evolution API:**

```bash
curl http://localhost:8080/instance/fetchInstances \
  -H "apikey: EVOLUTION_API_KEY_KAMU"
```

Harus return list instance termasuk `EnpiiStudio` dengan status `open`.

**Test 3 — Alur penuh:**

- Kirim pesan WA dari nomor lain ke nomor agent
- Tunggu 2 menit tanpa reply manual
- Jawaban otomatis dari OpenClaw harus masuk ke WA pengirim

**Test 4 — Reply manual:**

- Kirim pesan WA dari nomor lain
- Dalam 1 menit reply manual dari HP kamu
- Setelah 2 menit, agent TIDAK boleh ikut balas

**Test 5 — Cek Data table di n8n:**

- Buka n8n → **Variables** (sidebar kiri) → lihat tabel `messages`
- Status harus terupdate sesuai alur

---

## 14. Deploy ke Production

### Di local — backup config

```bash
cd ~/encenter

# Backup config openclaw
tar -czf enpii-openclaw-config.tar.gz openclaw/config/

# Export workflows n8n (via n8n UI: Settings → Export All Workflows)
# Simpan JSON ke folder n8n/workflows/
```

### Di VPS — setup

```bash
# Install Docker (sama seperti di local)

# Clone repo
git clone repo-kamu /home/encenter
cd /home/encenter

# Upload dan extract config openclaw
scp enpii-openclaw-config.tar.gz user@IP_VPS:/home/encenter/
tar -xzf enpii-openclaw-config.tar.gz

# Upload n8n data
scp -r n8n/data/ user@IP_VPS:/home/encenter/n8n/

# Buat .env production
cp .env.example .env
nano .env
```

Isi `.env` production:

```env
N8N_HOST=agent.enpiistudio.com
N8N_PROTOCOL=https
WEBHOOK_URL=https://agent.enpiistudio.com/
N8N_ENCRYPTION_KEY=SAMA_DENGAN_LOCAL
EVOLUTION_API_KEY=SAMA_DENGAN_LOCAL
```

> `N8N_ENCRYPTION_KEY` harus sama persis dengan local agar credentials n8n terbaca.

```bash
# Jalankan
docker compose up -d

# Verifikasi
docker compose ps
```

### Setup Nginx + SSL di VPS

```bash
sudo apt install nginx certbot python3-certbot-nginx -y

sudo nano /etc/nginx/sites-available/agent
```

```nginx
server {
    listen 80;
    server_name agent.enpiistudio.com;

    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/agent /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d agent.enpiistudio.com
```

> Di production, update webhook Evolution API dari `http://enpii-n8n:5678` ke `https://agent.enpiistudio.com`.

---

## 15. Perintah Sehari-hari

```bash
# Jalankan semua
docker compose up -d

# Hentikan semua
docker compose down

# Restart satu service
docker compose restart openclaw
docker compose restart n8n
docker compose restart enpii-evolution

# Lihat log real-time
docker compose logs -f
docker compose logs -f openclaw
docker compose logs -f n8n

# Masuk ke dalam container
docker compose exec openclaw bash
docker compose exec n8n sh

# Rebuild setelah ada perubahan Dockerfile
docker compose build --no-cache openclaw
docker compose up -d

# Scan QR WhatsApp (jika sesi expired)
# Buka: http://localhost:5678/webhook/scan-qr
# Atau lewat Evolution API dashboard: http://localhost:8080
```

---

## 16. Troubleshooting

### Container tidak mau start

```bash
docker compose logs openclaw
docker compose logs n8n
docker compose logs enpii-evolution
```

### OpenClaw tidak merespons

```bash
# Cek health
curl http://localhost:18789/healthz

# Cek log
docker compose logs -f openclaw

# Restart
docker compose restart openclaw
```

### HTTP API OpenClaw Method Not Allowed

Pastikan `gateway.http.endpoints.chatCompletions.enabled` sudah `true` di `openclaw.json`:

```json
"gateway": {
  "http": {
    "endpoints": {
      "chatCompletions": { "enabled": true }
    }
  }
}
```

Lalu restart openclaw.

### Pesan WA tidak masuk ke n8n

1. Cek status instance di Evolution API dashboard (`http://localhost:8080`) — harus **Connected**
2. Cek webhook URL di Evolution API → Events → Webhook — harus `http://enpii-n8n:5678/webhook/whatsapp-incoming`
3. Pastikan Workflow 1 di n8n status **Active**

### Sesi WhatsApp expired

Buka `http://localhost:5678/webhook/scan-qr` → scan QR ulang.

Atau lewat Evolution API dashboard → klik instance → scan QR.

### Tidak bisa edit file config OpenClaw (Permission denied)

```bash
sudo chown -R $USER ~/encenter/openclaw/config/
```

### n8n workflow tidak terpicu

1. Pastikan workflow status **Active**
2. Pastikan Production URL dipakai (bukan Test URL)
3. Cek log: `docker compose logs -f n8n`

### Container openclaw tidak bisa diakses dari n8n

Pastikan `name: agent-network` ada di bagian `networks:` di docker-compose.yml:

```yaml
networks:
  agent-network:
    driver: bridge
    name: agent-network
```

Lalu:

```bash
docker compose down
docker compose up -d
```

---

## Catatan Penting

|                       | Local                     | Production                        |
| --------------------- | ------------------------- | --------------------------------- |
| n8n URL               | http://localhost:5678     | https://agent.enpiistudio.com     |
| Evolution API URL     | http://localhost:8080     | http://localhost:8080 (internal)  |
| OpenClaw URL          | http://localhost:18789    | http://localhost:18789 (internal) |
| Nomor WA              | Nomor testing             | Nomor agent asli                  |
| N8N_ENCRYPTION_KEY    | Generate sekali           | Sama dengan local                 |
| Nginx + SSL           | Tidak perlu               | Perlu (untuk n8n saja)            |
| Webhook Evolution API | http://enpii-n8n:5678/... | https://agent.enpiistudio.com/... |

---

_Versi 4.0 — Full Docker, Evolution API + OpenClaw HTTP API, tanpa Telegram relay, tanpa Baileys_
_Mei 2026_
