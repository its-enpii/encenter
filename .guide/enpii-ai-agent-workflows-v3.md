# Workflow n8n — Enpii AI Agent v3

Dokumen ini menggantikan versi sebelumnya.

---

## Arsitektur Alur

```
Pesan masuk dari nomor X
        │
        ▼
Cek status nomor X di agent_status
(belum ada → insert default 'on')
        │
        ├── ON → tunggu 2 menit
        │           │
        │           ├── Kamu balas? → status tetap 'on'
        │           │
        │           └── Tidak balas? → AI jawab → set status 'off'
        │
        └── OFF → AI langsung jawab
```

**Restore otomatis:** Kapanpun kamu balas manual ke nomor yang statusnya `off` → status otomatis balik ke `on`.

---

## Data table yang dibutuhkan

### Tabel: `agent_status`

Status per nomor HP — bukan global.

| Field | Type | Keterangan |
|---|---|---|
| phone | string | Nomor WA pengirim |
| status | string | `on` atau `off` |

> Tidak perlu insert manual. Dibuat otomatis saat nomor pertama kali chat — default `on`.

### Tabel: `messages`

| Field | Keterangan |
|---|---|
| message_id | ID unik pesan |
| sender | Nomor pengirim (tanpa @s.whatsapp.net) |
| sender_name | Nama pengirim |
| content | Isi pesan |
| received_at | Waktu diterima |
| status | `pending`, `answered_by_agent`, `answered_manually` |

---

## Workflow 1 — Terima Pesan Masuk

**Node 1 — Webhook**
- HTTP Method: `POST`
- Path: `whatsapp-incoming`
- Respond: `Immediately`

**Node 2 — IF (filter pesan dari user lain)**
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
  sender: cleanPhone(data.key.remoteJid),
  sender_name: data.pushName || 'Unknown',
  content,
  received_at: new Date().toISOString(),
  status: 'pending'
}];
```

**Node 4 — Data table (simpan pesan)**
- Operation: `Insert`
- Table Name: `messages`

**Node 5 — Data table (cek status nomor pengirim)**
- Operation: `Get Many`
- Table Name: `agent_status`
- Filter: `phone` equals `{{ $json.sender }}`

**Node 6 — Code (tentukan status)**
```javascript
const rows = $input.all();
const sender = $('Node 3').item.json.sender;
const senderName = $('Node 3').item.json.sender_name;
const messageId = $('Node 3').item.json.message_id;
const content = $('Node 3').item.json.content;

// Kalau belum ada di tabel → default 'on'
const status = rows.length > 0 ? rows[0].json.status : 'on';

return [{
  sender,
  sender_name: senderName,
  message_id: messageId,
  content,
  agent_status: status,
  is_new_contact: rows.length === 0
}];
```

**Node 7 — IF (nomor baru? insert dulu)**
- Kondisi: `{{ $json.is_new_contact }}` equals `true`

**Jika nomor baru (true branch):**

**Node 7a — Data table (insert status default 'on')**
- Operation: `Insert`
- Table Name: `agent_status`
- Fields:
  - `phone` = `{{ $json.sender }}`
  - `status` = `on`

**Node 8 — IF (cek on/off)**
- Kondisi: `{{ $json.agent_status }}` equals `off`

**Jika OFF → Node 9a — Execute Workflow**
- Workflow: `AI Jawab`
- Workflow Inputs: `message_id`, `sender`, `sender_name`, `content`

**Jika ON → Node 9b — Execute Workflow**
- Workflow: `Deteksi Timeout`
- Workflow Inputs: `message_id`, `sender`, `sender_name`, `content`

---

## Workflow 2 — AI Jawab

Sub-workflow yang dipanggil ketika AI harus menjawab.

**Node 1 — Execute Workflow Trigger**
- Input data mode: `Define using fields below`
- Fields: `message_id`, `sender`, `sender_name`, `content`

**Node 2 — HTTP Request (OpenClaw)**
- Method: `POST`
- URL: `http://openclaw:18789/v1/chat/completions`
- Authentication: `Bearer Auth` → `OpenClaw API`
- Body (JSON):

```json
{
  "model": "openclaw/default",
  "messages": [
    {
      "role": "user",
      "content": "Sebelum menjawab, lakukan ini:\n1. Cek apakah file `contacts/{{ $json.sender }}/PROFILE.md` dan `contacts/{{ $json.sender }}/MEMORY.md` ada di workspace.\n2. Jika ada, baca keduanya untuk memahami siapa orang ini dan konteks terakhir percakapan.\n3. Jika tidak ada, buat kedua file tersebut dari template di `contacts/_template/` setelah selesai menjawab — isi berdasarkan apa yang bisa kamu pelajari dari percakapan ini.\n4. Setelah menjawab, update `contacts/{{ $json.sender }}/MEMORY.md` dengan konteks percakapan baru ini.\n\nPesan dari {{ $json.sender_name }} ({{ $json.sender }}):\n{{ $json.content }}"
    }
  ],
  "user": "{{ $json.sender }}"
}
```

**Node 3 — Evolution API (kirim jawaban)**
- Operação: `Enviar texto`
- Nome Da Instância: `{{ $env.WA_INSTANCE_NAME }}`
- Número: `{{ $('Node 1').item.json.sender }}`
- Texto: `{{ $json.choices[0].message.content }}`

**Node 4 — Data table (update status pesan)**
- Operation: `Update`
- Table Name: `messages`
- Filter: `message_id` equals `{{ $('Node 1').item.json.message_id }}`
- Fields to update:
  - `status` = `answered_by_agent`

---

## Workflow 3 — Deteksi Timeout

**Node 1 — Execute Workflow Trigger**
- Input data mode: `Define using fields below`
- Fields: `message_id`, `sender`, `sender_name`, `content`

**Node 2 — Wait**
- Duration: `2 minutes`

**Node 3 — Data table (cek apakah sudah dibalas manual)**
- Operation: `Get Many`
- Table Name: `messages`
- Filter: `message_id` equals `{{ $json.message_id }}`

**Node 4 — IF (masih pending?)**
- Kondisi: `{{ $json.status }}` equals `pending`

**Jika masih pending:**

**Node 5a — Execute Workflow**
- Workflow: `AI Jawab`
- Workflow Inputs: `message_id`, `sender`, `sender_name`, `content`

**Node 5b — Data table (set status nomor jadi 'off')**
- Operation: `Update`
- Table Name: `agent_status`
- Filter: `phone` equals `{{ $('Node 1').item.json.sender }}`
- Fields to update:
  - `status` = `off`

> Setelah AI menjawab karena timeout, status nomor itu jadi `off`. Pesan berikutnya dari nomor yang sama langsung dijawab AI — sampai kamu balas manual lagi.

**Jika sudah dibalas → tidak ada action. Selesai.**

---

## Workflow 4 — Deteksi Balasan Manual

Mendeteksi kalau kamu membalas pesan dari HP — update status pesan dan restore status nomor ke `on`.

**Node 1 — Webhook**
- HTTP Method: `POST`
- Path: `whatsapp-incoming`

**Node 2 — IF (filter pesan dari kamu)**
- Kondisi 1: `{{ $json.body.event }}` equals `messages.upsert`
- Kondisi 2: `{{ $json.body.data.key.fromMe }}` equals `true`

**Node 3 — Code (ambil nomor tujuan)**
```javascript
const cleanPhone = (jid) => jid.replace('@s.whatsapp.net', '').replace('@g.us', '');
return [{
  sender: cleanPhone($input.first().json.body.data.key.remoteJid)
}];
```

**Node 4 — Data table (update status pesan jadi answered_manually)**
- Operation: `Update`
- Table Name: `messages`
- Filter: `sender` equals `{{ $json.sender }}` AND `status` equals `pending`
- Fields to update:
  - `status` = `answered_manually`

**Node 5 — Data table (restore status nomor ke 'on')**
- Operation: `Update`
- Table Name: `agent_status`
- Filter: `phone` equals `{{ $json.sender }}`
- Fields to update:
  - `status` = `on`

---

## Workflow 5 — Scan QR WhatsApp (Opsional)

Hanya dipakai saat sesi WhatsApp expired.

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

Untuk scan QR: buka `http://localhost:5678/webhook/scan-qr`

---

## Ringkasan Workflow

| Workflow | Trigger | Fungsi |
|---|---|---|
| Workflow 1 | Pesan masuk dari user | Cek status per nomor, routing ke AI atau timeout |
| Workflow 2 | Dipanggil workflow lain | AI baca memory kontak → jawab → update memory |
| Workflow 3 | Dipanggil workflow lain | Tunggu 2 menit, AI jawab jika tidak ada balasan manual |
| Workflow 4 | Pesan dari kamu ke user | Deteksi balasan manual → restore status nomor ke `on` |
| Workflow 5 | Manual via browser | Scan QR WhatsApp |

---

## Siklus Status Per Nomor

```
Nomor baru chat pertama kali
        │
        ▼
Insert status 'on' (default)
        │
        ▼
Tunggu 2 menit
        │
        ├── Kamu balas → status tetap 'on'
        │
        └── Tidak balas → AI jawab → status jadi 'off'
                                            │
                                            ▼
                              Pesan berikutnya → AI langsung jawab
                                            │
                                            ▼
                              Kamu balas manual kapanpun
                                            │
                                            ▼
                                    Status balik 'on'
```

---

## Cara Kerja Contact Memory

Setiap kali AI menjawab (Workflow 2), OpenClaw akan:

1. **Cek** apakah folder `contacts/[nomor]/` sudah ada di workspace
2. **Jika ada** — baca `PROFILE.md` dan `MEMORY.md`, gunakan sebagai konteks sebelum menjawab
3. **Jika belum ada** — jawab sebagai stranger, buat kedua file dari template setelah selesai
4. **Setelah menjawab** — update `MEMORY.md` dengan konteks percakapan baru

```
workspace/contacts/
├── _template/
│   ├── PROFILE.md
│   └── MEMORY.md
└── 6281234567890/
    ├── PROFILE.md
    └── MEMORY.md
```
