# EnCenter (EnVault)

EnCenter is a centralized Server Control Center and Credential Vault. It allows you to securely manage servers, database credentials, automated backups to Google Drive, and monitor activities through webhooks.

## Architecture

- **Backend:** Laravel 13 (API, Jobs, Storage Services)
- **Frontend:** Next.js 14 (React) with Tailwind CSS
- **Database:** PostgreSQL (Application Data)
- **Database Management:** phpMyAdmin (Docker Containerized)
- **Task Runner:** Laravel Queue Worker
- **Automation/Webhooks:** Integrated n8n instance (optional)

## Prerequisites

- Docker and Docker Compose
- Node.js (for local frontend development)
- PHP 8.2+ and Composer (for local backend development)

## Quick Start (Docker)

1. Clone the repository
2. Navigate to the project root:
   ```bash
   cd /path/to/envault
   ```
3. Copy environment files:
   ```bash
   cp website/backend/.env.example website/backend/.env
   cp website/frontend/.env.local.example website/frontend/.env.local
   ```
4. Start the Docker containers:
   ```bash
   docker compose up -d --build
   ```

## Port Mapping

- **3000**: Next.js Frontend
- **8000**: Laravel Backend API
- **8081**: phpMyAdmin (Auto-login enabled from Vault)
- **5432**: PostgreSQL Database
- **5678**: n8n Automation (if enabled)

## Security & Backup

> **CRITICAL:** The `APP_KEY` in `website/backend/.env` is used to encrypt all sensitive data (passwords, private keys, etc.).
> If you lose this key, you will permanently lose access to all encrypted credentials in the database.
> **Please back up your `APP_KEY` securely!**

## Development

To run the queue worker locally (if not using docker):
```bash
cd website/backend
php artisan queue:work
```
