-- Transaction service type + weight fields (required by Transactions form).
-- Run in Supabase SQL Editor if saves fail with "service_type" schema cache error.

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS weight_kg_whole INT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS weight_kg_frac INT;

UPDATE transactions SET service_type = 'regular' WHERE service_type IS NULL;
UPDATE transactions SET weight_kg_whole = 0 WHERE weight_kg_whole IS NULL;
UPDATE transactions SET weight_kg_frac = 0 WHERE weight_kg_frac IS NULL;

ALTER TABLE transactions ALTER COLUMN service_type SET DEFAULT 'regular';
ALTER TABLE transactions ALTER COLUMN service_type SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN weight_kg_whole SET DEFAULT 0;
ALTER TABLE transactions ALTER COLUMN weight_kg_whole SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN weight_kg_frac SET DEFAULT 0;
ALTER TABLE transactions ALTER COLUMN weight_kg_frac SET NOT NULL;

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_service_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_service_type_check
  CHECK (service_type IN ('regular', 'blankets', 'comforters'));

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_weight_kg_whole_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_weight_kg_whole_check
  CHECK (weight_kg_whole >= 0);

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_weight_kg_frac_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_weight_kg_frac_check
  CHECK (weight_kg_frac >= 0 AND weight_kg_frac <= 9);
