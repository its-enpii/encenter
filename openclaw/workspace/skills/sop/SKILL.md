---
name: sop
description: Prosedur standar tim Enpii — git workflow, deploy, konvensi commit, dan stack default project baru
---

# Skill: SOP & Workflow Tim

## Git Workflow

- Branch utama: `main` (production) dan `develop` (staging)
- Feature branch: `feature/nama-fitur`
- Hotfix: `hotfix/nama-fix`
- Commit convention: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`

## Deploy

- Deploy ke staging: push ke branch `develop` → GitHub Actions otomatis deploy
- Deploy ke production: merge `develop` ke `main` → GitHub Actions otomatis deploy
- Tidak boleh push langsung ke `main`

## Stack Default Tim

Untuk project baru, stack standar yang dipakai:

- Backend: Laravel (versi terbaru)
- Frontend: Next.js atau Vue.js
- Database: MySQL + Redis
- UI: Tailwind CSS + shadcn/ui
- Containerization: Docker
- CI/CD: GitHub Actions

## Kalau Ada Pertanyaan Soal SOP

Kalau ada anggota tim yang tanya soal prosedur spesifik yang tidak ada di sini:

> "Untuk SOP yang lebih spesifik, sebaiknya konfirmasi langsung ke Enpii ya. Saya bisa sampaikan pertanyaannya."
