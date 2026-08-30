-- Run in Supabase SQL Editor (Dashboard indexes + get_dashboard_stats RPC)
-- Auth helpers (safe to re-run — skip if you already ran 20260830_auth_helpers.sql)

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

CREATE INDEX IF NOT EXISTS idx_transactions_branch_date
  ON transactions (branch_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_date
  ON transactions (transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_unpaid
  ON transactions (branch_id, payment_status)
  WHERE payment_status = 'unpaid';

CREATE INDEX IF NOT EXISTS idx_daily_reports_branch_date
  ON daily_reports (branch_id, report_date DESC);

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
  v_upcoming_schedules int;
  v_low_stock int;
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

  SELECT COUNT(*)::int INTO v_upcoming_schedules
  FROM schedules
  WHERE scheduled_date >= p_today
    AND (v_branch IS NULL OR branch_id = v_branch);

  SELECT COUNT(*)::int INTO v_low_stock
  FROM inventory i
  JOIN inventory_catalog c ON c.id = i.catalog_id
  WHERE i.quantity <= c.low_stock_threshold
    AND (v_branch IS NULL OR i.branch_id = v_branch);

  RETURN jsonb_build_object(
    'daily', public.tx_period_totals(v_branch, p_today, p_today),
    'monthly', public.tx_period_totals(v_branch, v_month_start, p_today),
    'annual', public.tx_period_totals(v_branch, v_year_start, p_today),
    'allTime', public.tx_period_totals(v_branch, NULL, NULL),
    'cashOnHand', v_cash_on_hand,
    'upcomingSchedules', v_upcoming_schedules,
    'lowStockCount', v_low_stock
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.tx_period_totals(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid, date) TO authenticated;
