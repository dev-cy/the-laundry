-- Per-shift daily pay override (e.g. holiday rates).

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS daily_pay_override INT;

COMMENT ON COLUMN schedules.daily_pay_override IS 'Optional daily pay in PHP for this shift; overrides staff.salary when set';
