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