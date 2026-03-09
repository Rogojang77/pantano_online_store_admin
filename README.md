# Pantano Admin Dashboard

Production-ready Admin Dashboard for the Pantano construction materials store (Hornbach-style). Built with Next.js 16 (App Router), TypeScript, Tailwind CSS, ShadCN-style UI, and role-based access (STORE_MANAGER / ADMIN).

## Tech stack

- **Next.js** (App Router), **TypeScript**, **Tailwind CSS**
- **ShadCN-style** components (Button, Card, Input, Badge, Skeleton, Dialog, etc.)
- **React Hook Form** + **Zod** for forms and validation
- **TanStack Table** for data tables (e.g. Products)
- **Axios** with JWT injection and 401/403 handling
- **Zustand** (persisted) for auth state
- **Framer Motion** for layout and micro-interactions
- **Sonner** for toasts

## Roles

- **STORE_MANAGER**: Products, Categories, Brands, Attributes, Variants, Inventory (view sync), Orders, Reservations, Pricing, Media. Cannot access Odoo config or system settings.
- **ADMIN**: Everything above + Users, Roles, System Settings, **Odoo Integration**, Logs.

RBAC is enforced via:

- Route guard for `/admin/*` (redirects non-admin to `/dashboard`)
- Sidebar: Admin section only rendered for ADMIN
- Axios: 401 → redirect to login; 403 → redirect to dashboard

## Folder structure (domain-based)

```
app/
  (dashboard)/           # Layout with sidebar + auth guard
    dashboard/           # Dashboard page
    products/
    categories/
    orders/
    reservations/
    inventory/
    users/
    roles/
    admin/
      settings/
      integrations/
        odoo/            # Odoo Integration (ADMIN only)
      logs/
  login/
components/
  guards/                # AuthGuard, AdminRouteGuard
  layout/                # Sidebar, Header, DashboardLayoutClient
  ui/                    # Button, Card, Input, Badge, Skeleton, etc.
services/
  api.ts                 # Axios instance (token, 401/403)
  auth.service.ts
  admin.service.ts
  products.service.ts
  odoo.service.ts        # getConfig, updateConfig, testConnection, triggerSync, getSyncStatus, getLogs
lib/
  utils.ts               # cn()
  constants.ts           # API_BASE_URL, ROLES
hooks/
  use-role-guard.ts
  use-media-query.ts
store/
  auth-store.ts
types/
  auth.ts, api.ts, odoo.ts
```

## Setup

This app is **standalone** and lives at the repo root (sibling to `pantano_online_store_backend` and `storefront`). It runs independently and talks to the Pantano backend only via the API URL. Ensure the backend is running before using the dashboard.

1. **Environment**

   Create `.env.local`:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
   ```

   Point this to your Pantano backend (NestJS). If the admin runs on a custom host or port in **production**, add that origin to the backend’s `CORS_ORIGINS` (e.g. `https://admin.yourdomain.com`).

2. **Install and run**

   ```bash
   npm install
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Root redirects to `/dashboard` (or `/login` if not authenticated).

3. **Login**

   Use backend credentials (e.g. from seed: `admin@pantano.ro` / `Admin123!`). The backend returns JWT and user with `role.slug` (`admin` or `store_manager`).

## Odoo Integration (ADMIN only)

- **Route**: `/admin/integrations/odoo`
- **Features**: Configure connection (URL, DB, user, password masked, timeout, sync cron), Test connection (latency, Odoo version), Sync controls (product/stock/categories/full, cancel), Webhook URL (read-only + copy), Logs panel (expandable JSON).
- **Backend**: The dashboard expects these API endpoints (to be implemented or stubbed):
  - `GET/PATCH /integrations/odoo/config`
  - `POST /integrations/odoo/test-connection`
  - `POST /integrations/odoo/sync`, `POST /integrations/odoo/sync/cancel`
  - `GET /integrations/odoo/sync/status`
  - `GET /integrations/odoo/logs`
  - `GET /integrations/odoo/webhook`

  Until then, the page will 404 on those calls; UI and forms are ready.

## Design (2026 SaaS)

- Soft neutral palette (stone/slate), rounded-2xl, subtle shadows, smooth animations (Framer Motion), dark mode ready (CSS variables in `globals.css`).
- Sidebar: collapse on tablet (icon-only), drawer on mobile; role-based Admin section.
- Skeleton loaders, toasts, empty states, status badges, confirm dialogs where needed.

## Build

```bash
npm run build
npm run start
```

Enterprise-grade, minimal over-engineering; ready to plug into your backend.
