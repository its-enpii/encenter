# Workflow n8n — Enpii AI Agent v6

Dokumen ini menggantikan v5.

**Perubahan utama dari v5:**
- Format messages array ke OpenClaw menggunakan standard OpenAI — `role: user` dan `role: assistant`
- Tidak ada lagi prefix nama di content (`[Nama]: pesan`)
- System prompt ditambahkan sebagai elemen pertama di messages array
- Node 2b dan 2c disederhanakan

---

## Arsitektur Alur

```
Pesan masuk dari user atau Enpii
        │
        ▼
Cek event: dari user atau dari Enpii?
        │
        ├── Dari user (fromMe: false, event: messages.upsert)
        │       │
        │       ▼
        │   Simpan ke tabel messages (role: user)
        │       │
        │       ▼
        │   Cek status nomor di agent_status
        │       │
        │       ├── ON → tunggu 2 menit
        │       │           │
        │       │           ├── Enpii balas? → status tetap 'on'
        │       │           └── Tidak balas? → AI jawab (dengan history) → hapus history → set 'off'
        │       │
        │       └── OFF → AI langsung jawab (OpenClaw pakai MEMORY.md, tidak butuh history)
        │
        ├── Dari Enpii manual (fromMe: true, event: messages.upsert)
        │       │
        │       ▼
        │   Simpan ke tabel messages (role: assistant)
        │   Update status pesan pending → answered_manually
        │   Restore status nomor ke 'on'
        │
        └── Dari OpenClaw (event: send.message) → abaikan, tidak ada action
```

---

## Data Table yang Dibutuhkan

### Tabel: `agent_status`

| Field | Type | Keterangan |
|---|---|---|
| phone | string | Nomor WA |
| status | string | `on` atau `off` |

### Tabel: `messages`

Hanya menyimpan pesan dari user dan balasan manual Enpii. Balasan OpenClaw tidak disimpan.

| Field | Type | Keterangan |
|---|---|---|
| message_id | string | ID unik pesan |
| phone | string | Nomor kontak (bukan nomor Enpii) |
| role | string | `user` atau `assistant` |
| sender_name | string | Nama pengirim |
| content | string | Isi pesan |
| received_at | datetime | Waktu pesan |
| status | string | `pending`, `answered_by_agent`, `answered_manually` |

> Field `role` sekarang menggunakan nilai OpenAI standard: `user` untuk pesan dari kontak, `assistant` untuk balasan manual Enpii.

---

## Workflow 0 — Simpan Pesan (Sub-workflow)

Dipanggil dari Workflow 1 dan Workflow 4.

**Node 1 — Execute Workflow Trigger**
- Fields: `message_id`, `phone`, `role`, `sender_name`, `content`, `received_at`, `status`

**Node 2 — Data table (insert pesan)**
- Operation: `Insert`
- Table Name: `messages`
- Fields: semua dari input

---

## Workflow 1 — Terima Pesan Masuk (dari User)

**Node 1 — Webhook**
- HTTP Method: `POST`
- Path: `whatsapp-incoming`
- Respond: `Immediately`

**Node 2 — IF (filter hanya dari user)**
- Kondisi 1: `{{ $json.body.event }}` equals `messages.upsert`
- Kondisi 2: `{{ $json.body.data.key.fromMe }}` equals `false`

**Node 3 — Code (parse pesan)**
```javascript
const data = $input.first().json.body.data;
const msg = data.message;
const cleanPhone = (jid) => jid.replace('@s.whatsapp.net', '').replace('@g.us', '');

let content;
if (msg.conversation) content = msg.conversation;
else if (msg.extendedTextMessage?.text) content = msg.extendedTextMessage.text;
else if (msg.imageMessage?.caption) content = msg.imageMessage.caption;
else if (msg.imageMessage) content = '[Gambar]';
else if (msg.videoMessage?.caption) content = msg.videoMessage.caption;
else if (msg.videoMessage) content = '[Video]';
else if (msg.audioMessage) content = '[Audio]';
else if (msg.documentMessage?.caption) content = msg.documentMessage.caption;
else if (msg.documentMessage) content = '[Dokumen]';
else if (msg.stickerMessage) content = '[Sticker]';
else if (msg.locationMessage) content = `[Lokasi: ${msg.locationMessage.degreesLatitude}, ${msg.locationMessage.degreesLongitude}]`;
else content = '[Pesan tidak didukung]';

return [{
  message_id: Math.random().toString(36).substring(2, 10),
  phone: cleanPhone(data.key.remoteJid),
  role: 'user',
  sender_name: data.pushName || 'Unknown',
  content,
  received_at: new Date().toISOString(),
  status: 'pending'
}];
```

**Node 4 — Execute Workflow (simpan pesan user)**
- Workflow: `Simpan Pesan`
- Inputs: semua field dari Node 3

**Node 5 — Data table (cek status nomor)**
- Operation: `Get Many`
- Table Name: `agent_status`
- Filter: `phone` equals `{{ $json.phone }}`

**Node 6 — Code (tentukan status)**
```javascript
const rows = $input.all();
const parsed = $('Node 3').item.json;
const status = rows.length > 0 ? rows[0].json.status : 'on';

return [{
  ...parsed,
  agent_status: status,
  is_new_contact: rows.length === 0
}];
```

**Node 7 — IF (nomor baru?)**
- Kondisi: `{{ $json.is_new_contact }}` equals `true`

**Jika baru (true branch) — Node 7a — Data table (insert status 'on')**
- Operation: `Insert`
- Table Name: `agent_status`
- Fields:
  - `phone` = `{{ $json.phone }}`
  - `status` = `on`

**Node 8 — IF (cek on/off)**
- Kondisi: `{{ $json.agent_status }}` equals `off`

**Jika OFF → Node 9a — Execute Workflow**
- Workflow: `AI Jawab`
- Inputs: `message_id`, `phone`, `sender_name`, `content`, `agent_status: 'off'`

**Jika ON → Node 9b — Execute Workflow**
- Workflow: `Deteksi Timeout`
- Inputs: `message_id`, `phone`, `sender_name`, `content`

---

## Workflow 2 — AI Jawab

Dipanggil dari Workflow 1 (OFF) atau Workflow 3 (timeout).

**Node 1 — Execute Workflow Trigger**
- Fields: `message_id`, `phone`, `sender_name`, `content`, `agent_status`

**Node 2 — IF (agent status on atau off?)**
- Kondisi: `{{ $json.agent_status }}` equals `on`

---

**Jika ON (first time timeout) — ambil history dulu:**

**Node 2a — Data table (ambil history percakapan)**
- Operation: `Get Many`
- Table Name: `messages`
- Filter: `phone` equals `{{ $json.phone }}`
- Sort: `received_at` ASC

**Node 2b — Code (build messages array dengan history)**
```javascript
const history = $input.all();
const sender = $('Node 1').item.json.phone;
const senderName = $('Node 1').item.json.sender_name;

// System prompt sebagai elemen pertama
const systemPrompt = {
  role: 'system',
  content: 'Kamu adalah Enpii AI, asisten otomatis yang mewakili Enpii saat tidak available. Jawab singkat, pakai Bahasa Indonesia, jujur jika tidak tahu.'
};

// Build history dengan role standard OpenAI
const historyMessages = history.map(row => ({
  role: row.json.role, // 'user' atau 'assistant'
  content: row.json.content
}));

return [{
  phone: sender,
  sender_name: senderName,
  messages: [systemPrompt, ...historyMessages]
}];
```

Contoh hasil messages array:
```json
[
  { "role": "system", "content": "Kamu adalah Enpii AI..." },
  { "role": "user", "content": "Halo, ada yang bisa dibantu?" },
  { "role": "assistant", "content": "Halo! Ada yang bisa saya bantu?" },
  { "role": "user", "content": "Cara backup database gimana?" }
]
```

---

**Jika OFF (sudah pernah dijawab AI) — langsung kirim pesan terakhir:**

**Node 2c — Code (build messages array tanpa history)**
```javascript
const sender = $('Node 1').item.json.phone;
const senderName = $('Node 1').item.json.sender_name;
const content = $('Node 1').item.json.content;

return [{
  phone: sender,
  sender_name: senderName,
  messages: [
    {
      role: 'system',
      content: 'Kamu adalah Enpii AI, asisten otomatis yang mewakili Enpii saat tidak available. Jawab singkat, pakai Bahasa Indonesia, jujur jika tidak tahu.'
    },
    {
      role: 'user',
      content: content
    }
  ]
}];
```

---

**Node 3 — HTTP Request (OpenClaw)**
- Method: `POST`
- URL: `http://openclaw:18789/v1/chat/completions`
- Authentication: Bearer → OpenClaw API
- Body (JSON):

```json
{
  "model": "openclaw/default",
  "messages": {{ $json.messages }},
  "user": "{{ $json.phone }}"
}
```

**Node 4 — Evolution API (kirim jawaban ke user)**
- Operação: `Enviar texto`
- Nome Da Instância: `{{ $env.WA_INSTANCE_NAME }}`
- Número: `{{ $('Node 1').item.json.phone }}`
- Texto: `{{ $json.choices[0].message.content }}`

**Node 5 — IF (agent_status on? berarti first time timeout)**
- Kondisi: `{{ $('Node 1').item.json.agent_status }}` equals `on`

**Jika ON (true branch):**

**Node 5a — Data table (hapus semua history percakapan)**
- Operation: `Delete`
- Table Name: `messages`
- Filter: `phone` equals `{{ $('Node 1').item.json.phone }}`

**Node 5b — Data table (set status jadi 'off')**
- Operation: `Update`
- Table Name: `agent_status`
- Filter: `phone` equals `{{ $('Node 1').item.json.phone }}`
- Fields:
  - `status` = `off`

**Jika OFF (false branch) — tidak ada action tambahan.**

---

## Workflow 3 — Deteksi Timeout

**Node 1 — Execute Workflow Trigger**
- Fields: `message_id`, `phone`, `sender_name`, `content`

**Node 2 — Wait**
- Duration: `2 minutes`

**Node 3 — Data table (cek status pesan)**
- Operation: `Get Many`
- Table Name: `messages`
- Filter: `message_id` equals `{{ $json.message_id }}`

**Node 4 — IF (masih pending?)**
- Kondisi: `{{ $json.status }}` equals `pending`

**Jika masih pending:**

**Node 5 — Execute Workflow**
- Workflow: `AI Jawab`
- Inputs: `message_id`, `phone`, `sender_name`, `content`, `agent_status: 'on'`

**Jika sudah dibalas → selesai.**

---

## Workflow 4 — Deteksi Balasan Manual Enpii

**Node 1 — Webhook**
- HTTP Method: `POST`
- Path: `whatsapp-incoming`

**Node 2 — IF (filter balasan manual Enpii)**
- Kondisi 1: `{{ $json.body.event }}` equals `messages.upsert`
- Kondisi 2: `{{ $json.body.data.key.fromMe }}` equals `true`

> `messages.upsert` + `fromMe: true` = balasan manual Enpii dari HP/desktop.
> `send.message` = pesan dari OpenClaw via Evolution API — diabaikan di sini.

**Node 3 — Code (parse pesan Enpii)**
```javascript
const data = $input.first().json.body.data;
const msg = data.message;
const cleanPhone = (jid) => jid.replace('@s.whatsapp.net', '').replace('@g.us', '');

let content;
if (msg.conversation) content = msg.conversation;
else if (msg.extendedTextMessage?.text) content = msg.extendedTextMessage.text;
else content = '[Pesan tidak didukung]';

return [{
  message_id: Math.random().toString(36).substring(2, 10),
  phone: cleanPhone(data.key.remoteJid),
  role: 'assistant',  // role standard OpenAI untuk balasan Enpii
  sender_name: 'Enpii',
  content,
  received_at: new Date().toISOString(),
  status: 'answered_manually'
}];
```

**Node 4 — Execute Workflow (simpan pesan Enpii)**
- Workflow: `Simpan Pesan`
- Inputs: semua field dari Node 3

**Node 5 — Data table (update pesan pending jadi answered_manually)**
- Operation: `Update`
- Table Name: `messages`
- Filter: `phone` equals `{{ $json.phone }}` AND `status` equals `pending`
- Fields:
  - `status` = `answered_manually`

**Node 6 — Data table (restore status nomor ke 'on')**
- Operation: `Update`
- Table Name: `agent_status`
- Filter: `phone` equals `{{ $json.phone }}`
- Fields:
  - `status` = `on`

---

## Workflow 5 — Scan QR WhatsApp (Opsional)

**Node 1 — Webhook**
- HTTP Method: `GET`
- Path: `scan-qr`

**Node 2 — Evolution API**
- Operação: `Conectar Instancia`
- Nome Da Instância: `{{ $env.WA_INSTANCE_NAME }}`

**Node 3 — Respond to Webhook**
- Response Format: `HTML`
- Response Body:
```html
<html>
<body style="background:#000;display:flex;justify-content:center;align-items:center;height:100vh;margin:0">
  <img src="{{ $json.base64 }}" style="width:300px;height:300px" />
</body>
</html>
```

Buka `http://localhost:5678/webhook/scan-qr` untuk scan QR.

---

## Ringkasan Workflow

| Workflow | Trigger | Fungsi |
|---|---|---|
| Workflow 0 | Dipanggil workflow lain | Simpan pesan (user/assistant) ke tabel |
| Workflow 1 | Webhook — pesan dari user | Parse, simpan, cek status, routing |
| Workflow 2 | Dipanggil workflow lain | Build messages array → kirim ke OpenClaw → kirim jawaban → hapus history + set off (jika ON) |
| Workflow 3 | Dipanggil Workflow 1 | Tunggu 2 menit, trigger AI jika belum dibalas |
| Workflow 4 | Webhook — balasan manual Enpii | Simpan pesan Enpii (role: assistant), update status, restore ke 'on' |
| Workflow 5 | Manual via browser | Scan QR WhatsApp |

---

## Format Messages Array ke OpenClaw

### Status ON (first time timeout) — dengan history:
```json
{
  "model": "openclaw/default",
  "messages": [
    { "role": "system", "content": "Kamu adalah Enpii AI..." },
    { "role": "user", "content": "Halo kak" },
    { "role": "assistant", "content": "Halo! Ada yang bisa dibantu?" },
    { "role": "user", "content": "Cara backup database gimana?" }
  ],
  "user": "6281234567890"
}
```

### Status OFF (sudah pernah dijawab AI) — tanpa history:
```json
{
  "model": "openclaw/default",
  "messages": [
    { "role": "system", "content": "Kamu adalah Enpii AI..." },
    { "role": "user", "content": "Cara clear cache Laravel?" }
  ],
  "user": "6281234567890"
}
```

---

## Siklus Lengkap

```
User kirim pesan
        │
        ▼
Simpan ke messages (role: user)
        │
        ▼
Status ON → tunggu 2 menit
        │
        ├── Enpii balas manual
        │       │
        │       ▼
        │   Simpan ke messages (role: assistant)
        │   Restore status ke 'on'
        │   → Pesan berikutnya tetap tunggu 2 menit
        │
        └── Tidak ada balasan
                │
                ▼
            Ambil history (user + assistant) dari tabel
            Build messages array dengan system prompt
            Kirim ke OpenClaw
                │
                ▼
            OpenClaw jawab → update MEMORY.md sendiri
                │
                ▼
            Hapus history dari tabel
            Set status 'off'
                │
                ▼
            Pesan berikutnya → AI langsung jawab
            (tanpa history, hanya pesan terakhir + system prompt)
                │
                ▼
            Enpii balas manual kapanpun
                │
                ▼
            Status balik 'on'
            → Pesan berikutnya tunggu 2 menit lagi
```
