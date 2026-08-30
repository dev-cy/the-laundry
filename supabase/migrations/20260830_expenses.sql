-- Operating expenses (admin-only). Deducted from gross income on Finance page.
-- Run in Supabase SQL Editor after prior migrations.

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  amount INT NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_branch_date
  ON expenses (branch_id, expense_date DESC);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Select expenses" ON expenses;
DROP POLICY IF EXISTS "Insert expenses" ON expenses;
DROP POLICY IF EXISTS "Update expenses" ON expenses;
DROP POLICY IF EXISTS "Delete expenses" ON expenses;

CREATE POLICY "Select expenses" ON expenses
  FOR SELECT USING (public.is_admin_like());
CREATE POLICY "Insert expenses" ON expenses
  FOR INSERT WITH CHECK (public.is_admin_like());
CREATE POLICY "Update expenses" ON expenses
  FOR UPDATE USING (public.is_admin_like());
CREATE POLICY "Delete expenses" ON expenses
  FOR DELETE USING (public.is_super_admin());

DROP TRIGGER IF EXISTS expenses_updated_at ON expenses;
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- If expenses was created earlier with NOT NULL description:
ALTER TABLE expenses ALTER COLUMN description DROP NOT NULL;
