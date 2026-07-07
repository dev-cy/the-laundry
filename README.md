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

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase keys:

```
NEXT_PUBLIC_SUPABASE_URL=https://olhebajxmlrfjphkmikl.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SECRET_KEY=your_secret_key
```

### 3. Database schema

Run the SQL in `supabase/schema.sql` in your Supabase SQL Editor. This creates:

- `branches` — the 3 laundry locations
- `daily_reports` — cash reconciliation (matches paper receipt form)
- `transactions` — customer payments
- `schedules` — pick-up & delivery appointments
- `inventory` — supplies per branch

### 4. Authentication

In Supabase Dashboard → **Authentication** → **URL Configuration**:

1. Set **Site URL** to `http://localhost:3000` (for local development)
2. Add these **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/**`
3. Enable **Email** provider (for staff email/password login)
4. Enable **Google** provider with your OAuth credentials
5. Create staff users under Authentication → Users

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
| Schedules | `/admin/schedules` | Pick-up & delivery appointments |
| Inventory | `/admin/inventory` | Supplies tracking with low-stock alerts |
