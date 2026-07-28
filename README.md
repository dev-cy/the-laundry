# The Laundry

A Next.js application for **The Laundry** laundromat — brochure website + admin dashboard backed by Supabase.

## Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Light Blue | `#7EC8E3` | Accents, backgrounds, highlights |
| Blue | `#3A8CC9` | Primary buttons, logo, links |
| White | `#FFFFFF` | Backgrounds, cards |
| Text (dark blue) | `#0B1D2E` | Body text, headings |

## Branches

- The Laundry Poblacion — Cauayan
- The Laundry Dancalan — Ilog
- The Laundry Tuyom — Cauayan

## Roles

Roles are stored in Supabase Auth **`app_metadata` only** (not `user_metadata`).

| Role | Access | Can delete entries? |
|------|--------|---------------------|
| `super_admin` | Full admin | Yes |
| `admin` | Full admin | No |
| `staff` | Dashboard, Reports, Transactions (assigned branch only) | No |

Unset role defaults to **staff**. Bootstrap your first Super Admin with the SQL at the bottom of `supabase/schema.sql`, then sign out and back in.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase keys:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Database schema

Run the SQL in `supabase/schema.sql` in your Supabase SQL Editor. This creates:

- `branches` — the 3 laundry locations
- `daily_reports` — cash reconciliation (matches paper receipt form)
- `transactions` — customer payments
- `schedules` — staff duty schedules
- `staff` — employee records
- `cash_releases` — cash release logs
- `inventory` — supplies per branch

Re-run the policy section whenever you update RLS (roles / branch scoping / delete rules).

### 4. Authentication

In Supabase Dashboard → **Authentication** → **URL Configuration**:

1. Set **Site URL** to `http://localhost:3000` (for local development)
2. Add these **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/**`
3. Enable **Email** provider (for staff email/password login)
4. Create users under Authentication → Users, then assign roles via SQL or the in-app **Users** page

> When you deploy to production, update Site URL and Redirect URLs to your live domain.

### 5. Run locally

```bash
npm run dev
```

- Brochure site: [http://localhost:3000](http://localhost:3000)
- Staff login: [http://localhost:3000/login](http://localhost:3000/login)
- Admin dashboard: [http://localhost:3000/admin](http://localhost:3000/admin)

## Admin Features

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/admin` | Today's totals — cash received, unpaid, sales |
| Reports | `/admin/reports` | Daily cash reconciliation by denomination |
| Transactions | `/admin/transactions` | Payment records (paid/unpaid/partial) |
| Schedules | `/admin/schedules` | Staff duty schedules |
| Release Cash | `/admin/cash-release` | Cash release records |
| Users | `/admin/users` | Assign roles and staff branches |
| Staff | `/admin/staff` | Employee records and salary |
| Inventory | `/admin/inventory` | Supplies tracking with low-stock alerts |
