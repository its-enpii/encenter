# 05 — Frontend (Next.js)

Frontend EnCenter adalah aplikasi **Next.js 16** (App Router) dengan React 19, TypeScript, dan Tailwind CSS v4.

> **Catatan penting:** File `website/frontend/AGENTS.md` menyatakan bahwa versi Next.js ini sudah lebih dari training data umum dan punya breaking changes. Sebelum mengubah konvensi App Router, baca dulu `node_modules/next/dist/docs/`.

## Stack & Dependency

Diambil dari `website/frontend/package.json`:

**Production:**
- `next: 16.2.6`
- `react: 19.2.4`, `react-dom: 19.2.4`

**Development:**
- `tailwindcss: ^4` + `@tailwindcss/postcss: ^4`
- `typescript: ^5`
- `eslint: ^9` + `eslint-config-next: 16.2.6`

Package manager: **pnpm 10**, dengan `node-linker=hoisted` (lihat `.npmrc`).

Build / dev script:
- `pnpm dev` → `next dev --webpack` (Turbopack tersedia tapi dev pakai Webpack untuk file watching yang stabil di Docker).
- `pnpm build` → `next build`.
- `pnpm start` → `next start`.

`next.config.ts` memaksa polling watcher (`config.watchOptions.poll = 1000`) agar dev mode tetap reload di environment Docker (Linux container).

## Struktur Folder

```
website/frontend/
├── app/                            # App Router routes
│   ├── layout.tsx                  # Root layout (font Geist, metadata)
│   ├── page.tsx                    # Splash → redirect /admin atau /login
│   ├── globals.css                 # Tailwind base + custom utility
│   ├── login/
│   │   └── page.tsx                # Halaman login
│   └── admin/
│       ├── layout.tsx              # Admin layout (sidebar + header + auth gate)
│       ├── loading.tsx             # Loading state global admin
│       ├── page.tsx                # Dashboard
│       ├── components/page.tsx     # Showcase komponen UI
│       ├── groups/page.tsx
│       ├── servers/
│       │   ├── page.tsx
│       │   ├── new/page.tsx
│       │   └── [id]/edit/page.tsx
│       ├── vault/
│       │   ├── page.tsx
│       │   ├── new/page.tsx
│       │   └── [id]/page.tsx
│       ├── backups/page.tsx
│       ├── storage/
│       │   ├── page.tsx
│       │   └── callback/page.tsx
│       ├── webhooks/
│       │   ├── page.tsx
│       │   └── components/webhook-dialog.tsx
│       ├── audit/page.tsx
│       ├── settings/page.tsx
│       └── profile/page.tsx
├── components/admin/               # Komponen reusable
│   ├── AuditLog.tsx
│   ├── GlobalSearch.tsx            # Cmd+K palette
│   ├── Header.tsx
│   ├── Icons.tsx                   # Library icon SVG (kustom)
│   ├── NotificationBell.tsx
│   ├── ServerFleet.tsx
│   ├── Sidebar.tsx
│   ├── StatsCard.tsx
│   └── ui/
│       ├── Core.tsx                # Button, Badge
│       ├── CredentialModal.tsx     # Modal "Reveal credentials"
│       ├── Dialog.tsx              # Modal, ConfirmDialog, AlertDialog
│       ├── Form.tsx                # Input, Textarea, Switcher, Checkbox, Radio, FileInput, SmartSelect
│       └── SmartTable.tsx          # Tabel server-side dengan search & pagination
├── lib/
│   └── api.ts                      # apiFetch helper, API_URL, PMA_URL
├── types/
│   └── admin.ts                    # Typing ServerGroup, Server, DatabaseConnection, ActivityLog, WebhookSetting
├── public/                         # static assets (logo, favicon, dll)
├── .env.local.example
├── eslint.config.mjs
├── next.config.ts
├── postcss.config.mjs
├── pnpm-workspace.yaml
└── tsconfig.json
```

## Routing & Halaman

Struktur App Router mengikuti pola folder = path. Berikut peta halaman utama:

| Path | File | Deskripsi |
| --- | --- | --- |
| `/` | `app/page.tsx` | Splash. Cek `localStorage.auth_token` lalu redirect ke `/admin` atau `/login`. |
| `/login` | `app/login/page.tsx` | Form login dengan styling custom (carbon-fibre background, neon accents). |
| `/admin` | `app/admin/page.tsx` | Dashboard utama (StatsCard, ServerFleet, AuditLog). |
| `/admin/groups` | `app/admin/groups/page.tsx` | CRUD Server Groups. |
| `/admin/servers` | `app/admin/servers/page.tsx` | List server dengan SmartTable. |
| `/admin/servers/new` | `app/admin/servers/new/page.tsx` | Form tambah server. |
| `/admin/servers/[id]/edit` | `app/admin/servers/[id]/edit/page.tsx` | Form edit server + tampilan database connections terkait. |
| `/admin/vault` | `app/admin/vault/page.tsx` | List database connection (kredensial). |
| `/admin/vault/new` | `app/admin/vault/new/page.tsx` | Form tambah database connection. |
| `/admin/vault/[id]` | `app/admin/vault/[id]/page.tsx` | Form edit database connection. |
| `/admin/backups` | `app/admin/backups/page.tsx` | History backup, auto-refresh tiap 10 detik. |
| `/admin/storage` | `app/admin/storage/page.tsx` | Connect/disconnect Google Drive, atur folder name. |
| `/admin/storage/callback` | `app/admin/storage/callback/page.tsx` | OAuth callback handler. |
| `/admin/webhooks` | `app/admin/webhooks/page.tsx` | List webhook + dialog tambah/edit/test. |
| `/admin/audit` | `app/admin/audit/page.tsx` | Audit log dengan tombol purge retention. |
| `/admin/settings` | `app/admin/settings/page.tsx` | Placeholder system info. |
| `/admin/profile` | `app/admin/profile/page.tsx` | Update nama, phone, password. |
| `/admin/components` | `app/admin/components/page.tsx` | Showcase internal komponen UI. |

## Auth Gate

`app/admin/layout.tsx` melakukan client-side guard:

1. Cek `localStorage.auth_token`.
2. Jika tidak ada → `router.replace('/login')`.
3. Jika ada → render layout (Sidebar + Header + main).

`apiFetch` di `lib/api.ts` juga otomatis redirect ke `/login` ketika menerima status 401 dari API, sambil menghapus token dari `localStorage`.

> Pendekatan ini mengandalkan `localStorage` (bukan HttpOnly cookie). Untuk hardening production lihat [09-security.md](09-security.md).

## Library API Helper

`lib/api.ts`:

```ts
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
export const PMA_URL = process.env.NEXT_PUBLIC_PMA_URL || 'http://localhost:8081';

export async function apiFetch(endpoint: string, options: any = {}) {
  // Inject Bearer token dari localStorage.auth_token
  // Set Content-Type & Accept JSON
  // Auto-redirect ke /login pada status 401
}
```

Setiap halaman memanggil `apiFetch('/some-endpoint', { method, body })` untuk berinteraksi dengan backend. Tidak ada SDK terpusat untuk tiap resource — pemanggilan langsung dengan endpoint string.

## Komponen UI

### Core (`components/admin/ui/Core.tsx`)
- `Button` — varian: `primary`, `secondary`, `outline`, `danger`, `ghost`. Ukuran: `sm`, `md`, `lg`. `isLoading` toggle spinner.
- `Badge` — varian: `success`, `warning`, `error`, `info`, `neutral`. Ukuran `xs`, `sm`.

### Form (`components/admin/ui/Form.tsx`)
- `Input` — label, hint, error message. Auto-toggle visibility untuk type `password` (tombol mata).
- `Textarea`.
- `Switcher` — toggle on/off dengan transisi.
- `Checkbox` & `Radio` — styled tailwind.
- `FileInput`.
- `SmartSelect` — dropdown dengan input search internal, click-outside to close.

### Dialog (`components/admin/ui/Dialog.tsx`)
- `Modal` — generic, render via `createPortal` ke body. Mengunci scroll body saat terbuka.
- `ConfirmDialog` — Modal dengan tombol "Cancel" + tombol confirm (default varian `danger`).
- `AlertDialog` — Modal dengan satu tombol close (default "Understood").

### `CredentialModal` (`components/admin/ui/CredentialModal.tsx`)
- Modal khusus untuk menampilkan kredensial decrypted (server atau database).
- Setiap field punya tombol toggle visibility (untuk yang sensitive) dan tombol copy ke clipboard.

### `SmartTable` (`components/admin/ui/SmartTable.tsx`)
- Tabel data-driven dengan:
  - Server-side fetching ke `fetchUrl` (mendukung respons Laravel pagination atau flat array).
  - Search debounced 500ms.
  - Per-page selector (5/10/20/50/100).
  - Pagination dengan rentang page number.
  - Loading state initial vs background refresh terpisah (overlay penuh hanya saat first load).
  - `refreshKey` external — naikkan angka untuk memaksa refetch.

### Layout
- `Sidebar` — navigasi vertikal, branding "EnVault", grouping menu "Command Center".
- `Header` — search trigger (`Cmd+K`), system status badge (poll `/servers` setiap 60 detik), notification bell, "New Entry" dropdown.
- `GlobalSearch` — Cmd+K palette. Debounced fetch ke `/servers` dan `/database-connections`, hasil dikelompokkan. Klik database MySQL/MariaDB akan auto-open phpMyAdmin via form POST ke `${PMA_URL}/autologin.php`.
- `NotificationBell` — fetch audit logs setiap 30 detik, highlight ikon kalau ada error/warning.

### Komponen Dashboard
- `StatsCard`, `ServerFleet`, `AuditLog` — komponen presentasional yang menerima props dari halaman dashboard utama.

### `Icons.tsx`
Library icon SVG kustom (lebih dari 25 icon). Menghindari ketergantungan ke library icon eksternal, sehingga bundle frontend tetap kecil.

## Pattern Halaman CRUD

Setiap halaman list (servers, vault, webhooks, dll.) mengikuti pola yang konsisten:

1. State `refreshKey` untuk memaksa refresh tabel.
2. State dialog (`deleteDialog`, `testResult`, dst.) menggunakan `Modal` / `Confirm` / `Alert`.
3. `SmartTable<Type>` dengan kolom yang menerima accessor function (lebih fleksibel daripada string keypath).
4. Aksi tombol-tombol kecil di kolom paling kanan: test, run backup, view credentials, edit, delete.
5. Setelah aksi sukses → `setRefreshKey(prev => prev + 1)`.

## Halaman Backup History

`/admin/backups` punya **auto-refresh 10 detik** sehingga status job pending/running akan ter-update otomatis. Tabel menampilkan nama file, ukuran, durasi, dan link langsung ke folder Drive untuk job sukses, atau tombol error untuk job gagal (membuka AlertDialog dengan pesan).

## Halaman Storage (Google Drive)

`/admin/storage` punya alur:
1. Pemanggilan `GET /storage` di `useEffect` untuk mengambil status koneksi.
2. Tombol "CONNECT NOW" → `GET /storage/google/auth-url` → redirect window ke URL OAuth.
3. Setelah callback Google, redirect ke `/admin/storage/callback?code=...`.
4. `/admin/storage/callback` mengirim `POST /storage/google/connect { code }`.
5. Sukses → redirect kembali ke `/admin/storage` setelah 2 detik.

Halaman juga menyediakan inline editor untuk `folder_name` (klik untuk edit, blur/Enter untuk simpan).

## Konfigurasi Environment Frontend

File `.env.local.example`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
# NEXT_PUBLIC_API_URL=http://103.xx.xx.xx:8000/api/v1   # production
```

Variabel `NEXT_PUBLIC_PMA_URL` dipakai untuk integrasi phpMyAdmin (default `http://localhost:8081`).

> Frontend di-bundle dengan environment ini saat build. Untuk dev di Docker, env diteruskan dari root `.env` lewat `docker-compose.yml`.

## Styling

- Tailwind CSS v4 dengan `@tailwindcss/postcss`.
- Tema dominan: `slate-950` background dengan accent `emerald-500` (primary) dan `rose-500` (danger).
- Animasi memakai utility Tailwind (`animate-in`, `fade-in`, `slide-in-from-top-2`, dsb.).
- Font: Geist Sans + Geist Mono (via `next/font/google`).

## Pattern yang Tidak Standar (Heads-up)

- Fetch API langsung lewat `apiFetch` (tanpa React Query / SWR). Refresh manual via `refreshKey`.
- State auth disimpan di `localStorage` (tidak ada Context/Provider). Kalau menambahkan SSR auth, perlu refactor.
- Error handling sebagian lewat `alert()` browser bawaan (lihat halaman delete server group). Ke depannya bisa diseragamkan ke `AlertDialog`.

---

[← Sebelumnya: Backend](04-backend.md) · [Kembali ke Home](README.md) · [Selanjutnya: Database Schema →](06-database-schema.md)
