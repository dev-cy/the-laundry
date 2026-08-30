-- Run in Supabase SQL Editor: inventory catalog + branch sync + SKU generation
-- Requires auth helpers (run 20260830_auth_helpers.sql first if is_admin_like does not exist)

-- Auth helpers (safe to re-run)
CREATE OR REPLACE FUNCTION public.jwt_app_role()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT nullif(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

CREATE OR REPLACE FUNCTION public.jwt_branch_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(auth.jwt() -> 'app_metadata' ->> 'branch_id', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_like()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT public.jwt_app_role() IN ('admin', 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT public.jwt_app_role() = 'super_admin';
$$;

CREATE OR REPLACE FUNCTION public.can_access_branch(target_branch uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT public.is_admin_like()
    OR (public.jwt_app_role() = 'staff'
        AND public.jwt_branch_id() IS NOT NULL
        AND target_branch = public.jwt_branch_id());
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS catalog_id UUID REFERENCES inventory_catalog(id) ON DELETE CASCADE;

-- Migrate existing rows (skip if already migrated)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'item_name'
  ) THEN
    INSERT INTO inventory_catalog (sku, item_name, unit, low_stock_threshold)
    SELECT
      'TL-INV-' || lpad(row_number() OVER (ORDER BY item_name)::text, 6, '0'),
      item_name,
      max(unit),
      max(low_stock_threshold)
    FROM inventory
    GROUP BY item_name
    ON CONFLICT (item_name) DO NOTHING;

    UPDATE inventory i
    SET catalog_id = c.id
    FROM inventory_catalog c
    WHERE c.item_name = i.item_name AND i.catalog_id IS NULL;

    PERFORM setval(
      'inventory_sku_seq',
      GREATEST(
        (SELECT count(*) FROM inventory_catalog),
        1
      )
    );

    ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_branch_id_item_name_key;
    ALTER TABLE inventory DROP COLUMN IF EXISTS item_name;
    ALTER TABLE inventory DROP COLUMN IF EXISTS unit;
    ALTER TABLE inventory DROP COLUMN IF EXISTS low_stock_threshold;
  END IF;
END $$;

ALTER TABLE inventory ALTER COLUMN catalog_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_branch_catalog_unique
  ON inventory (branch_id, catalog_id);

CREATE INDEX IF NOT EXISTS idx_inventory_branch_catalog ON inventory (branch_id, catalog_id);
CREATE INDEX IF NOT EXISTS idx_inventory_catalog_id ON inventory (catalog_id);

ALTER TABLE inventory_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Select inventory_catalog" ON inventory_catalog;
DROP POLICY IF EXISTS "Insert inventory_catalog" ON inventory_catalog;
DROP POLICY IF EXISTS "Update inventory_catalog" ON inventory_catalog;
DROP POLICY IF EXISTS "Delete inventory_catalog" ON inventory_catalog;

CREATE POLICY "Select inventory_catalog" ON inventory_catalog
  FOR SELECT USING (public.is_admin_like());
CREATE POLICY "Insert inventory_catalog" ON inventory_catalog
  FOR INSERT WITH CHECK (public.is_admin_like());
CREATE POLICY "Update inventory_catalog" ON inventory_catalog
  FOR UPDATE USING (public.is_admin_like());
CREATE POLICY "Delete inventory_catalog" ON inventory_catalog
  FOR DELETE USING (public.is_super_admin());

-- Backfill missing branch rows for each catalog item
INSERT INTO inventory (branch_id, catalog_id, quantity)
SELECT b.id, c.id, 0
FROM branches b
CROSS JOIN inventory_catalog c
ON CONFLICT (branch_id, catalog_id) DO NOTHING;

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
  VALUES (
    public.generate_inventory_sku(),
    trim(p_item_name),
    coalesce(nullif(trim(p_unit), ''), 'pcs'),
    p_low_stock_threshold
  )
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

DROP TRIGGER IF EXISTS inventory_catalog_updated_at ON inventory_catalog;
DROP TRIGGER IF EXISTS sync_catalog_to_all_branches ON inventory_catalog;
DROP TRIGGER IF EXISTS sync_inventory_for_new_branch ON branches;

CREATE TRIGGER inventory_catalog_updated_at
  BEFORE UPDATE ON inventory_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sync_catalog_to_all_branches
  AFTER INSERT ON inventory_catalog
  FOR EACH ROW EXECUTE FUNCTION sync_catalog_to_all_branches();

CREATE TRIGGER sync_inventory_for_new_branch
  AFTER INSERT ON branches
  FOR EACH ROW EXECUTE FUNCTION sync_inventory_for_new_branch();
