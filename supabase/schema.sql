-- The Laundry — Supabase Schema
-- Run this in the Supabase SQL Editor

-- Branches
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO branches (id, name, location, slug) VALUES
  ('11111111-1111-4111-8111-111111111111', 'The Laundry Poblacion', 'Cauayan', 'poblacion'),
  ('22222222-2222-4222-8222-222222222222', 'The Laundry Dancalan', 'Ilog', 'dancalan'),
  ('33333333-3333-4333-8333-333333333333', 'The Laundry Tuyom', 'Cauayan', 'tuyom')
ON CONFLICT (slug) DO NOTHING;

-- Daily cash reports (matches paper receipt form)
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  staff_names TEXT NOT NULL,
  -- Cash denomination quantities
  qty_1 INT DEFAULT 0,
  qty_5 INT DEFAULT 0,
  qty_10 INT DEFAULT 0,
  qty_20 INT DEFAULT 0,
  qty_50 INT DEFAULT 0,
  qty_100 INT DEFAULT 0,
  qty_200 INT DEFAULT 0,
  qty_500 INT DEFAULT 0,
  qty_1000 INT DEFAULT 0,
  total_cash INT NOT NULL DEFAULT 0,
  unpaid INT NOT NULL DEFAULT 0,
  unpaid_previous INT DEFAULT 0,
  total_sales INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (branch_id, report_date)
);

-- Customer payment line items on a daily report
CREATE TABLE IF NOT EXISTS report_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  customer_name TEXT,
  total_payment INT NOT NULL DEFAULT 0,
  payment_received BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Transactions / payments
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  customer_name TEXT,
  description TEXT NOT NULL,
  amount INT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'unpaid', 'partial')),
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'gcash', 'bank')),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Pick-up & delivery schedules
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  service_type TEXT NOT NULL DEFAULT 'pickup' CHECK (service_type IN ('pickup', 'delivery', 'both')),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME DEFAULT '07:00',
  scheduled_time_out TIME DEFAULT '16:00',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS scheduled_time_out TIME DEFAULT '16:00';
ALTER TABLE schedules ALTER COLUMN scheduled_time SET DEFAULT '07:00';

-- Staff records
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birthday DATE,
  address TEXT,
  phone_number TEXT,
  emergency_contact_name TEXT,
  emergency_contact_relationship TEXT,
  emergency_contact_phone TEXT,
  date_hired DATE,
  salary INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cash releases (release cash on hand)
CREATE TABLE IF NOT EXISTS cash_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  amount INT NOT NULL CHECK (amount > 0),
  release_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inventory (detergent, softener, hangers, etc.)
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pcs',
  low_stock_threshold INT DEFAULT 10,
  last_restocked DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (branch_id, item_name)
);

-- Row Level Security
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Public read for branches (brochure site)
DROP POLICY IF EXISTS "Branches are viewable by everyone" ON branches;
CREATE POLICY "Branches are viewable by everyone" ON branches FOR SELECT USING (true);

-- Authenticated access is role- and branch-aware (app_metadata only).
-- Staff: daily_reports + transactions for their assigned branch only.
-- Admin / Super Admin: all branches. Delete: Super Admin only.
DROP POLICY IF EXISTS "Auth users manage daily_reports" ON daily_reports;
DROP POLICY IF EXISTS "Auth users manage report_entries" ON report_entries;
DROP POLICY IF EXISTS "Auth users manage transactions" ON transactions;
DROP POLICY IF EXISTS "Auth users manage schedules" ON schedules;
DROP POLICY IF EXISTS "Auth users manage staff" ON staff;
DROP POLICY IF EXISTS "Auth users manage cash_releases" ON cash_releases;
DROP POLICY IF EXISTS "Auth users manage inventory" ON inventory;

DROP POLICY IF EXISTS "Auth users select daily_reports" ON daily_reports;
DROP POLICY IF EXISTS "Auth users write daily_reports" ON daily_reports;
DROP POLICY IF EXISTS "Auth users update daily_reports" ON daily_reports;
DROP POLICY IF EXISTS "Super admin delete daily_reports" ON daily_reports;
DROP POLICY IF EXISTS "Select daily_reports" ON daily_reports;
DROP POLICY IF EXISTS "Insert daily_reports" ON daily_reports;
DROP POLICY IF EXISTS "Update daily_reports" ON daily_reports;
DROP POLICY IF EXISTS "Delete daily_reports" ON daily_reports;
DROP POLICY IF EXISTS "Auth users select report_entries" ON report_entries;
DROP POLICY IF EXISTS "Auth users write report_entries" ON report_entries;
DROP POLICY IF EXISTS "Auth users update report_entries" ON report_entries;
DROP POLICY IF EXISTS "Super admin delete report_entries" ON report_entries;
DROP POLICY IF EXISTS "Select report_entries" ON report_entries;
DROP POLICY IF EXISTS "Insert report_entries" ON report_entries;
DROP POLICY IF EXISTS "Update report_entries" ON report_entries;
DROP POLICY IF EXISTS "Delete report_entries" ON report_entries;
DROP POLICY IF EXISTS "Auth users select transactions" ON transactions;
DROP POLICY IF EXISTS "Auth users write transactions" ON transactions;
DROP POLICY IF EXISTS "Auth users update transactions" ON transactions;
DROP POLICY IF EXISTS "Super admin delete transactions" ON transactions;
DROP POLICY IF EXISTS "Select transactions" ON transactions;
DROP POLICY IF EXISTS "Insert transactions" ON transactions;
DROP POLICY IF EXISTS "Update transactions" ON transactions;
DROP POLICY IF EXISTS "Delete transactions" ON transactions;
DROP POLICY IF EXISTS "Auth users select schedules" ON schedules;
DROP POLICY IF EXISTS "Auth users write schedules" ON schedules;
DROP POLICY IF EXISTS "Auth users update schedules" ON schedules;
DROP POLICY IF EXISTS "Super admin delete schedules" ON schedules;
DROP POLICY IF EXISTS "Select schedules" ON schedules;
DROP POLICY IF EXISTS "Insert schedules" ON schedules;
DROP POLICY IF EXISTS "Update schedules" ON schedules;
DROP POLICY IF EXISTS "Delete schedules" ON schedules;
DROP POLICY IF EXISTS "Auth users select staff" ON staff;
DROP POLICY IF EXISTS "Auth users write staff" ON staff;
DROP POLICY IF EXISTS "Auth users update staff" ON staff;
DROP POLICY IF EXISTS "Super admin delete staff" ON staff;
DROP POLICY IF EXISTS "Select staff" ON staff;
DROP POLICY IF EXISTS "Insert staff" ON staff;
DROP POLICY IF EXISTS "Update staff" ON staff;
DROP POLICY IF EXISTS "Delete staff" ON staff;
DROP POLICY IF EXISTS "Auth users select cash_releases" ON cash_releases;
DROP POLICY IF EXISTS "Auth users write cash_releases" ON cash_releases;
DROP POLICY IF EXISTS "Auth users update cash_releases" ON cash_releases;
DROP POLICY IF EXISTS "Super admin delete cash_releases" ON cash_releases;
DROP POLICY IF EXISTS "Select cash_releases" ON cash_releases;
DROP POLICY IF EXISTS "Insert cash_releases" ON cash_releases;
DROP POLICY IF EXISTS "Update cash_releases" ON cash_releases;
DROP POLICY IF EXISTS "Delete cash_releases" ON cash_releases;
DROP POLICY IF EXISTS "Auth users select inventory" ON inventory;
DROP POLICY IF EXISTS "Auth users write inventory" ON inventory;
DROP POLICY IF EXISTS "Auth users update inventory" ON inventory;
DROP POLICY IF EXISTS "Super admin delete inventory" ON inventory;
DROP POLICY IF EXISTS "Select inventory" ON inventory;
DROP POLICY IF EXISTS "Insert inventory" ON inventory;
DROP POLICY IF EXISTS "Update inventory" ON inventory;
DROP POLICY IF EXISTS "Delete inventory" ON inventory;

CREATE OR REPLACE FUNCTION public.jwt_app_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

CREATE OR REPLACE FUNCTION public.jwt_branch_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(auth.jwt() -> 'app_metadata' ->> 'branch_id', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_like()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.jwt_app_role() IN ('admin', 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.jwt_app_role() = 'super_admin';
$$;

CREATE OR REPLACE FUNCTION public.can_access_branch(target_branch uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    public.is_admin_like()
    OR (
      public.jwt_app_role() = 'staff'
      AND public.jwt_branch_id() IS NOT NULL
      AND target_branch = public.jwt_branch_id()
    );
$$;

-- daily_reports
CREATE POLICY "Select daily_reports" ON daily_reports
  FOR SELECT USING (auth.role() = 'authenticated' AND public.can_access_branch(branch_id));
CREATE POLICY "Insert daily_reports" ON daily_reports
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND public.can_access_branch(branch_id));
CREATE POLICY "Update daily_reports" ON daily_reports
  FOR UPDATE USING (auth.role() = 'authenticated' AND public.can_access_branch(branch_id))
  WITH CHECK (auth.role() = 'authenticated' AND public.can_access_branch(branch_id));
CREATE POLICY "Delete daily_reports" ON daily_reports
  FOR DELETE USING (public.is_super_admin());

-- report_entries (scoped via parent report branch)
CREATE POLICY "Select report_entries" ON report_entries
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM daily_reports dr
      WHERE dr.id = report_id AND public.can_access_branch(dr.branch_id)
    )
  );
CREATE POLICY "Insert report_entries" ON report_entries
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM daily_reports dr
      WHERE dr.id = report_id AND public.can_access_branch(dr.branch_id)
    )
  );
CREATE POLICY "Update report_entries" ON report_entries
  FOR UPDATE USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM daily_reports dr
      WHERE dr.id = report_id AND public.can_access_branch(dr.branch_id)
    )
  );
CREATE POLICY "Delete report_entries" ON report_entries
  FOR DELETE USING (public.is_super_admin());

-- transactions
CREATE POLICY "Select transactions" ON transactions
  FOR SELECT USING (auth.role() = 'authenticated' AND public.can_access_branch(branch_id));
CREATE POLICY "Insert transactions" ON transactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND public.can_access_branch(branch_id));
CREATE POLICY "Update transactions" ON transactions
  FOR UPDATE USING (auth.role() = 'authenticated' AND public.can_access_branch(branch_id))
  WITH CHECK (auth.role() = 'authenticated' AND public.can_access_branch(branch_id));
CREATE POLICY "Delete transactions" ON transactions
  FOR DELETE USING (public.is_super_admin());

-- Admin-only tables (staff cannot read/write even via API)
CREATE POLICY "Select schedules" ON schedules
  FOR SELECT USING (public.is_admin_like());
CREATE POLICY "Insert schedules" ON schedules
  FOR INSERT WITH CHECK (public.is_admin_like());
CREATE POLICY "Update schedules" ON schedules
  FOR UPDATE USING (public.is_admin_like());
CREATE POLICY "Delete schedules" ON schedules
  FOR DELETE USING (public.is_super_admin());

CREATE POLICY "Select staff" ON staff
  FOR SELECT USING (public.is_admin_like());
CREATE POLICY "Insert staff" ON staff
  FOR INSERT WITH CHECK (public.is_admin_like());
CREATE POLICY "Update staff" ON staff
  FOR UPDATE USING (public.is_admin_like());
CREATE POLICY "Delete staff" ON staff
  FOR DELETE USING (public.is_super_admin());

CREATE POLICY "Select cash_releases" ON cash_releases
  FOR SELECT USING (public.is_admin_like());
CREATE POLICY "Insert cash_releases" ON cash_releases
  FOR INSERT WITH CHECK (public.is_admin_like());
CREATE POLICY "Update cash_releases" ON cash_releases
  FOR UPDATE USING (public.is_admin_like());
CREATE POLICY "Delete cash_releases" ON cash_releases
  FOR DELETE USING (public.is_super_admin());

CREATE POLICY "Select inventory" ON inventory
  FOR SELECT USING (public.is_admin_like());
CREATE POLICY "Insert inventory" ON inventory
  FOR INSERT WITH CHECK (public.is_admin_like());
CREATE POLICY "Update inventory" ON inventory
  FOR UPDATE USING (public.is_admin_like());
CREATE POLICY "Delete inventory" ON inventory
  FOR DELETE USING (public.is_super_admin());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS daily_reports_updated_at ON daily_reports;
DROP TRIGGER IF EXISTS transactions_updated_at ON transactions;
DROP TRIGGER IF EXISTS schedules_updated_at ON schedules;
DROP TRIGGER IF EXISTS staff_updated_at ON staff;
DROP TRIGGER IF EXISTS cash_releases_updated_at ON cash_releases;
DROP TRIGGER IF EXISTS inventory_updated_at ON inventory;
CREATE TRIGGER daily_reports_updated_at BEFORE UPDATE ON daily_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER schedules_updated_at BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER cash_releases_updated_at BEFORE UPDATE ON cash_releases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Migration (run if you already deployed an earlier schema):
-- CREATE TABLE IF NOT EXISTS report_entries (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
--   customer_name TEXT,
--   total_payment INT NOT NULL DEFAULT 0,
--   payment_received BOOLEAN NOT NULL DEFAULT false,
--   created_at TIMESTAMPTZ DEFAULT now()
-- );
-- ALTER TABLE report_entries ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Auth users manage report_entries" ON report_entries FOR ALL USING (auth.role() = 'authenticated');

-- Bootstrap / repair roles (app_metadata only — then sign out / sign in):
-- Super Admin:
-- UPDATE auth.users
-- SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
--   || jsonb_build_object('role', 'super_admin', 'branch_id', null),
--   raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) - 'role' - 'branch_id'
-- WHERE email = 'you@example.com';
--
-- Admin (no delete):
-- UPDATE auth.users
-- SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
--   || jsonb_build_object('role', 'admin', 'branch_id', null),
--   raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) - 'role' - 'branch_id'
-- WHERE email = 'admin@example.com';
--
-- Staff (replace branch UUID):
-- UPDATE auth.users
-- SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
--   || jsonb_build_object('role', 'staff', 'branch_id', '11111111-1111-4111-8111-111111111111'),
--   raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) - 'role' - 'branch_id'
-- WHERE email = 'staff@example.com';
