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
  service_type TEXT NOT NULL DEFAULT 'regular' CHECK (service_type IN ('regular', 'blankets', 'comforters')),
  weight_kg_whole INT NOT NULL DEFAULT 0 CHECK (weight_kg_whole >= 0),
  weight_kg_frac INT NOT NULL DEFAULT 0 CHECK (weight_kg_frac >= 0 AND weight_kg_frac <= 9),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS service_type TEXT NOT NULL DEFAULT 'regular';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS weight_kg_whole INT NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS weight_kg_frac INT NOT NULL DEFAULT 0;

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

-- Inventory catalog (shared item definitions with system-generated SKU)
CREATE SEQUENCE IF NOT EXISTS inventory_sku_seq START 1;

CREATE TABLE IF NOT EXISTS inventory_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  item_name TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL DEFAULT 'pcs',
  low_stock_threshold INT NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Per-branch stock levels (one row per catalog item per branch)
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  catalog_id UUID NOT NULL REFERENCES inventory_catalog(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 0,
  last_restocked DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (branch_id, catalog_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_branch_catalog ON inventory (branch_id, catalog_id);
CREATE INDEX IF NOT EXISTS idx_inventory_catalog_id ON inventory (catalog_id);

-- Query performance (speed up date/branch filters and dashboard aggregates)
CREATE INDEX IF NOT EXISTS idx_transactions_branch_date
  ON transactions (branch_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_date
  ON transactions (transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_unpaid
  ON transactions (branch_id, payment_status)
  WHERE payment_status = 'unpaid';

CREATE INDEX IF NOT EXISTS idx_daily_reports_branch_date
  ON daily_reports (branch_id, report_date DESC);

-- Row Level Security
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_catalog ENABLE ROW LEVEL SECURITY;

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
DROP POLICY IF EXISTS "Select inventory_catalog" ON inventory_catalog;
DROP POLICY IF EXISTS "Insert inventory_catalog" ON inventory_catalog;
DROP POLICY IF EXISTS "Update inventory_catalog" ON inventory_catalog;
DROP POLICY IF EXISTS "Delete inventory_catalog" ON inventory_catalog;

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

-- Dashboard aggregates: SUM in Postgres (no monthly summary table required).
CREATE OR REPLACE FUNCTION public.tx_period_totals(
  p_branch_id uuid,
  p_from date,
  p_to date
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'totalSales', COALESCE(SUM(amount), 0),
    'unpaid', COALESCE(SUM(amount) FILTER (WHERE payment_status = 'unpaid'), 0),
    'cashReceived', COALESCE(SUM(amount), 0)
      - COALESCE(SUM(amount) FILTER (WHERE payment_status = 'unpaid'), 0)
  )
  FROM transactions
  WHERE (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_from IS NULL OR transaction_date >= p_from)
    AND (p_to IS NULL OR transaction_date <= p_to);
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
  p_branch_id uuid DEFAULT NULL,
  p_today date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_branch uuid;
  v_month_start date;
  v_year_start date;
  v_cash_on_hand bigint;
  v_staff_on_duty int;
  v_low_stock int;
  v_inventory_qty bigint;
  v_inventory_records int;
BEGIN
  v_month_start := date_trunc('month', p_today)::date;
  v_year_start := date_trunc('year', p_today)::date;

  IF p_branch_id IS NOT NULL THEN
    IF NOT public.can_access_branch(p_branch_id) THEN
      RAISE EXCEPTION 'Access denied for branch';
    END IF;
    v_branch := p_branch_id;
  ELSIF public.jwt_app_role() = 'staff' THEN
    v_branch := public.jwt_branch_id();
    IF v_branch IS NULL THEN
      RAISE EXCEPTION 'Staff account has no assigned branch';
    END IF;
  ELSE
    v_branch := NULL;
  END IF;

  SELECT COALESCE(SUM(total_cash), 0) INTO v_cash_on_hand
  FROM daily_reports
  WHERE report_date = p_today
    AND (v_branch IS NULL OR branch_id = v_branch);

  SELECT COUNT(*)::int INTO v_staff_on_duty
  FROM schedules
  WHERE scheduled_date = p_today
    AND status NOT IN ('cancelled', 'completed')
    AND (v_branch IS NULL OR branch_id = v_branch);

  SELECT COUNT(*)::int INTO v_low_stock
  FROM inventory i
  JOIN inventory_catalog c ON c.id = i.catalog_id
  WHERE i.quantity <= c.low_stock_threshold
    AND (v_branch IS NULL OR i.branch_id = v_branch);

  SELECT COALESCE(SUM(i.quantity), 0), COUNT(*)::int
  INTO v_inventory_qty, v_inventory_records
  FROM inventory i
  WHERE v_branch IS NULL OR i.branch_id = v_branch;

  RETURN jsonb_build_object(
    'daily', public.tx_period_totals(v_branch, p_today, p_today),
    'monthly', public.tx_period_totals(v_branch, v_month_start, p_today),
    'annual', public.tx_period_totals(v_branch, v_year_start, p_today),
    'allTime', public.tx_period_totals(v_branch, NULL, NULL),
    'cashOnHand', v_cash_on_hand,
    'staffOnDutyToday', v_staff_on_duty,
    'lowStockCount', v_low_stock,
    'inventoryTotalQuantity', v_inventory_qty,
    'inventoryRecordCount', v_inventory_records
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.tx_period_totals(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid, date) TO authenticated;

-- Inventory: auto SKU, sync catalog items to all branches, atomic transfers
CREATE OR REPLACE FUNCTION public.generate_inventory_sku()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT 'TL-INV-' || lpad(nextval('inventory_sku_seq')::text, 6, '0');
$$;

CREATE OR REPLACE FUNCTION public.sync_catalog_to_all_branches()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO inventory (branch_id, catalog_id, quantity)
  SELECT b.id, NEW.id, 0
  FROM branches b
  ON CONFLICT (branch_id, catalog_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_inventory_for_new_branch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO inventory (branch_id, catalog_id, quantity)
  SELECT NEW.id, c.id, 0
  FROM inventory_catalog c
  ON CONFLICT (branch_id, catalog_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_inventory_item(
  p_item_name text,
  p_unit text DEFAULT 'pcs',
  p_low_stock_threshold int DEFAULT 10,
  p_initial_branch_id uuid DEFAULT NULL,
  p_initial_quantity int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_catalog inventory_catalog%ROWTYPE;
BEGIN
  IF NOT public.is_admin_like() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO inventory_catalog (sku, item_name, unit, low_stock_threshold)
  VALUES (public.generate_inventory_sku(), trim(p_item_name), coalesce(nullif(trim(p_unit), ''), 'pcs'), p_low_stock_threshold)
  RETURNING * INTO v_catalog;

  IF p_initial_branch_id IS NOT NULL AND p_initial_quantity > 0 THEN
    UPDATE inventory
    SET quantity = p_initial_quantity,
        last_restocked = CURRENT_DATE
    WHERE branch_id = p_initial_branch_id
      AND catalog_id = v_catalog.id;
  END IF;

  RETURN to_jsonb(v_catalog);
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_inventory_stock(
  p_catalog_id uuid,
  p_from_branch_id uuid,
  p_to_branch_id uuid,
  p_quantity int
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_source inventory%ROWTYPE;
BEGIN
  IF NOT public.is_admin_like() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_from_branch_id = p_to_branch_id THEN
    RAISE EXCEPTION 'Source and destination branches must be different';
  END IF;
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Transfer quantity must be greater than zero';
  END IF;

  SELECT * INTO v_source
  FROM inventory
  WHERE catalog_id = p_catalog_id AND branch_id = p_from_branch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found in source branch';
  END IF;
  IF v_source.quantity < p_quantity THEN
    RAISE EXCEPTION 'Not enough stock in source branch. Available: %', v_source.quantity;
  END IF;

  UPDATE inventory
  SET quantity = quantity - p_quantity,
      last_restocked = CURRENT_DATE
  WHERE id = v_source.id;

  UPDATE inventory
  SET quantity = quantity + p_quantity,
      last_restocked = CURRENT_DATE
  WHERE catalog_id = p_catalog_id AND branch_id = p_to_branch_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found in destination branch';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_inventory_item(text, text, int, uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_inventory_stock(uuid, uuid, uuid, int) TO authenticated;

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

CREATE POLICY "Select inventory_catalog" ON inventory_catalog
  FOR SELECT USING (public.is_admin_like());
CREATE POLICY "Insert inventory_catalog" ON inventory_catalog
  FOR INSERT WITH CHECK (public.is_admin_like());
CREATE POLICY "Update inventory_catalog" ON inventory_catalog
  FOR UPDATE USING (public.is_admin_like());
CREATE POLICY "Delete inventory_catalog" ON inventory_catalog
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
DROP TRIGGER IF EXISTS inventory_catalog_updated_at ON inventory_catalog;
DROP TRIGGER IF EXISTS sync_catalog_to_all_branches ON inventory_catalog;
DROP TRIGGER IF EXISTS sync_inventory_for_new_branch ON branches;
CREATE TRIGGER daily_reports_updated_at BEFORE UPDATE ON daily_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER schedules_updated_at BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER cash_releases_updated_at BEFORE UPDATE ON cash_releases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER inventory_catalog_updated_at BEFORE UPDATE ON inventory_catalog FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER sync_catalog_to_all_branches
  AFTER INSERT ON inventory_catalog
  FOR EACH ROW EXECUTE FUNCTION sync_catalog_to_all_branches();
CREATE TRIGGER sync_inventory_for_new_branch
  AFTER INSERT ON branches
  FOR EACH ROW EXECUTE FUNCTION sync_inventory_for_new_branch();

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

-- Migration: transaction service type and weight (run if already deployed):
-- ALTER TABLE transactions ADD COLUMN IF NOT EXISTS service_type TEXT NOT NULL DEFAULT 'regular';
-- ALTER TABLE transactions ADD COLUMN IF NOT EXISTS weight_kg_whole INT NOT NULL DEFAULT 0;
-- ALTER TABLE transactions ADD COLUMN IF NOT EXISTS weight_kg_frac INT NOT NULL DEFAULT 0;

-- Migration: indexes + dashboard RPC (run if already deployed):
-- CREATE INDEX IF NOT EXISTS idx_transactions_branch_date ON transactions (branch_id, transaction_date DESC);
-- CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (transaction_date DESC);
-- CREATE INDEX IF NOT EXISTS idx_transactions_unpaid ON transactions (branch_id, payment_status) WHERE payment_status = 'unpaid';
-- CREATE INDEX IF NOT EXISTS idx_daily_reports_branch_date ON daily_reports (branch_id, report_date DESC);
-- Then run the tx_period_totals and get_dashboard_stats function blocks above.
