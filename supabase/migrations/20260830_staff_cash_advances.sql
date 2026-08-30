-- Staff cash advances deducted from semi-monthly payroll.
-- Run in Supabase SQL Editor after prior migrations.

CREATE TABLE IF NOT EXISTS staff_cash_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  amount INT NOT NULL CHECK (amount > 0),
  advance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_cash_advances_staff_date
  ON staff_cash_advances (staff_id, advance_date DESC);

ALTER TABLE staff_cash_advances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Select staff_cash_advances" ON staff_cash_advances;
DROP POLICY IF EXISTS "Insert staff_cash_advances" ON staff_cash_advances;
DROP POLICY IF EXISTS "Update staff_cash_advances" ON staff_cash_advances;
DROP POLICY IF EXISTS "Delete staff_cash_advances" ON staff_cash_advances;

CREATE POLICY "Select staff_cash_advances" ON staff_cash_advances
  FOR SELECT USING (public.is_admin_like());
CREATE POLICY "Insert staff_cash_advances" ON staff_cash_advances
  FOR INSERT WITH CHECK (public.is_admin_like());
CREATE POLICY "Update staff_cash_advances" ON staff_cash_advances
  FOR UPDATE USING (public.is_admin_like());
CREATE POLICY "Delete staff_cash_advances" ON staff_cash_advances
  FOR DELETE USING (public.is_super_admin());

DROP TRIGGER IF EXISTS staff_cash_advances_updated_at ON staff_cash_advances;
CREATE TRIGGER staff_cash_advances_updated_at
  BEFORE UPDATE ON staff_cash_advances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
