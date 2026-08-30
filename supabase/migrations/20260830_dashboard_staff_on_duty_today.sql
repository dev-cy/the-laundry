-- Run in Supabase SQL Editor: staff on duty today (replaces upcoming schedules count)

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
