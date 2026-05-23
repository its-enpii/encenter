# TOOLS.md - Local Notes

## Escalation Webhook URL

- **URL:** `https://agent.enpiistudio.com/webhook-test/62414674-7029-4bf9-a15d-540beb83431f`
- **Method:** POST
- **Content-Type:** application/json

## Escalation Webhook Secret

Secret diambil dari n8n Data table `configurations`, kolom `webhook_escalation_key`.

- **Nilai:** `envault.escalation`

## n8n

- **URL (internal Docker):** `http://n8n:5678`
- **URL (external):** `https://agent.enpiistudio.com`

## Owner Identity

Nomor dan passphrase yang diakui sebagai Enpii asli:
- `6281332046586` — passphrase: `its.enpii-118`
- `6285842712135` — passphrase: `its.enpii-118`