-- Payroll: schedule attendance, OT/UT adjustments, staff link on schedules.
-- Run in Supabase SQL Editor after prior migrations.

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS actual_time_in TIME;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS actual_time_out TIME;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS overtime_minutes INT NOT NULL DEFAULT 0;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS undertime_minutes INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN staff.salary IS 'Daily salary in PHP (per scheduled shift day)';

CREATE INDEX IF NOT EXISTS idx_schedules_staff_date
  ON schedules (staff_id, scheduled_date DESC)
  WHERE staff_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_schedules_payroll_month
  ON schedules (branch_id, scheduled_date DESC)
  WHERE status NOT IN ('cancelled');

-- Backfill staff_id from name + branch where possible
UPDATE schedules s
SET staff_id = st.id
FROM staff st
WHERE s.staff_id IS NULL
  AND s.branch_id = st.branch_id
  AND lower(trim(s.customer_name)) = lower(trim(st.name));
