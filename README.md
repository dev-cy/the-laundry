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
NEXT_PUBLIC_FACEBOOK_URL=https://www.facebook.com/your-page
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

**Production (`https://the-laundry.cyregjr.com`)**

1. Set **Site URL** to `https://the-laundry.cyregjr.com`
2. Add these **Redirect URLs**:
   - `https://the-laundry.cyregjr.com/auth/callback`
   - `https://the-laundry.cyregjr.com/**`
3. Keep local URLs for development:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/**`

Set `NEXT_PUBLIC_SITE_URL` to match where the app runs:

- Local: `http://localhost:3000`
- Production: `https://the-laundry.cyregjr.com`

Invite and magic-link emails use `NEXT_PUBLIC_SITE_URL` to build the verification link (`/auth/callback?type=invite`). After clicking the link, invited users land on **Create Password**, then the admin dashboard.

If an invite still opens the homepage with `#access_token=` in the address bar, refresh after this handler is deployed (or click **Accept invitation** again). The Facebook icon in the header is the public page, not login.

**Inviting users**

1. Enable **Email** provider under Authentication → Providers
2. Use **Admin → Users** in the app → **Send invite** (recommended), or invite from Supabase Dashboard
3. Assign roles in-app after invite, or set role/branch when sending the invite from the Users page

> If invite links still point to localhost, check Supabase **Site URL**, hosting env `NEXT_PUBLIC_SITE_URL`, and redeploy after changing env vars.

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
