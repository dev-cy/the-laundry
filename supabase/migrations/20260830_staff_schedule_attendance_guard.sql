-- Staff RLS can UPDATE schedule rows for attendance. Restrict those writes
-- to time in / time out so payroll fields cannot be changed via the API.

CREATE OR REPLACE FUNCTION public.restrict_staff_schedule_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.is_admin_like() THEN
    RETURN NEW;
  END IF;

  IF NEW.branch_id IS DISTINCT FROM OLD.branch_id
     OR NEW.staff_id IS DISTINCT FROM OLD.staff_id
     OR NEW.customer_name IS DISTINCT FROM OLD.customer_name
     OR NEW.customer_phone IS DISTINCT FROM OLD.customer_phone
     OR NEW.service_type IS DISTINCT FROM OLD.service_type
     OR NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date
     OR NEW.scheduled_time IS DISTINCT FROM OLD.scheduled_time
     OR NEW.scheduled_time_out IS DISTINCT FROM OLD.scheduled_time_out
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.notes IS DISTINCT FROM OLD.notes
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.overtime_minutes IS DISTINCT FROM OLD.overtime_minutes
     OR NEW.undertime_minutes IS DISTINCT FROM OLD.undertime_minutes
     OR NEW.daily_pay_override IS DISTINCT FROM OLD.daily_pay_override
  THEN
    RAISE EXCEPTION 'Staff may only update time in and time out';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS schedules_staff_attendance_only ON schedules;
CREATE TRIGGER schedules_staff_attendance_only
  BEFORE UPDATE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_staff_schedule_updates();
