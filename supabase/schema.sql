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

-- Authenticated users can do everything on admin tables
DROP POLICY IF EXISTS "Auth users manage daily_reports" ON daily_reports;
DROP POLICY IF EXISTS "Auth users manage report_entries" ON report_entries;
DROP POLICY IF EXISTS "Auth users manage transactions" ON transactions;
DROP POLICY IF EXISTS "Auth users manage schedules" ON schedules;
DROP POLICY IF EXISTS "Auth users manage staff" ON staff;
DROP POLICY IF EXISTS "Auth users manage inventory" ON inventory;
CREATE POLICY "Auth users manage daily_reports" ON daily_reports FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users manage report_entries" ON report_entries FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users manage transactions" ON transactions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users manage schedules" ON schedules FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users manage staff" ON staff FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users manage cash_releases" ON cash_releases FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users manage inventory" ON inventory FOR ALL USING (auth.role() = 'authenticated');

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
