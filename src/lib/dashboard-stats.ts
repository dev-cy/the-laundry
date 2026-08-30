import type { SupabaseClient } from "@supabase/supabase-js";

export type PeriodTotals = {
  cashReceived: number;
  unpaid: number;
  totalSales: number;
};

export type DashboardStats = {
  daily: PeriodTotals;
  monthly: PeriodTotals;
  annual: PeriodTotals;
  allTime: PeriodTotals;
  /** Physical cash on hand from today's daily reports (denomination count). */
  cashOnHand: number;
  /** Staff duty shifts scheduled for today (excludes cancelled/completed). */
  staffOnDutyToday: number;
  lowStockCount: number;
  inventoryTotalQuantity: number;
  inventoryRecordCount: number;
};

type TxRow = { amount: number; payment_status: string };
type ReportRow = { total_cash: number };
type InventoryRow = {
  quantity: number;
  inventory_catalog:
    | { low_stock_threshold: number }
    | { low_stock_threshold: number }[]
    | null;
};

function inventoryLowStockThreshold(row: InventoryRow): number {
  const catalog = row.inventory_catalog;
  if (!catalog) return 0;
  if (Array.isArray(catalog)) return catalog[0]?.low_stock_threshold ?? 0;
  return catalog.low_stock_threshold;
}

const emptyPeriod: PeriodTotals = { cashReceived: 0, unpaid: 0, totalSales: 0 };

export function computePeriodTotals(
  transactions: TxRow[] | null | undefined
): PeriodTotals {
  const txs = transactions ?? [];
  const totalSales = txs.reduce((sum, tx) => sum + tx.amount, 0);
  const unpaid = txs
    .filter((tx) => tx.payment_status === "unpaid")
    .reduce((sum, tx) => sum + tx.amount, 0);
  return { totalSales, unpaid, cashReceived: totalSales - unpaid };
}

export function computeDashboardStats({
  dailyTransactions,
  monthlyTransactions,
  annualTransactions,
  allTimeTransactions,
  reports,
  schedulesCount,
  inventory,
}: {
  dailyTransactions: TxRow[] | null | undefined;
  monthlyTransactions: TxRow[] | null | undefined;
  annualTransactions: TxRow[] | null | undefined;
  allTimeTransactions: TxRow[] | null | undefined;
  reports: ReportRow[] | null | undefined;
  schedulesCount: number;
  inventory: InventoryRow[] | null | undefined;
}): DashboardStats {
  const cashOnHand = (reports ?? []).reduce((sum, r) => sum + r.total_cash, 0);
  const lowStockCount =
    inventory?.filter((i) => i.quantity <= inventoryLowStockThreshold(i)).length ?? 0;

  return {
    daily: computePeriodTotals(dailyTransactions),
    monthly: computePeriodTotals(monthlyTransactions),
    annual: computePeriodTotals(annualTransactions),
    allTime: computePeriodTotals(allTimeTransactions),
    cashOnHand,
    staffOnDutyToday: schedulesCount,
    lowStockCount,
    inventoryTotalQuantity:
      inventory?.reduce((sum, row) => sum + row.quantity, 0) ?? 0,
    inventoryRecordCount: inventory?.length ?? 0,
  };
}

type RpcPeriodTotals = {
  cashReceived: number;
  unpaid: number;
  totalSales: number;
};

type RpcDashboardStats = {
  daily: RpcPeriodTotals;
  monthly: RpcPeriodTotals;
  annual: RpcPeriodTotals;
  allTime: RpcPeriodTotals;
  cashOnHand: number;
  staffOnDutyToday?: number;
  upcomingSchedules?: number;
  lowStockCount: number;
  inventoryTotalQuantity?: number;
  inventoryRecordCount?: number;
};

export async function fetchDashboardStats(
  supabase: SupabaseClient,
  today: string,
  branchId: string | null
): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc("get_dashboard_stats", {
    p_branch_id: branchId,
    p_today: today,
  });

  if (!error && data) {
    const stats = data as RpcDashboardStats;
    return {
      daily: stats.daily,
      monthly: stats.monthly,
      annual: stats.annual,
      allTime: stats.allTime,
      cashOnHand: stats.cashOnHand,
      staffOnDutyToday: stats.staffOnDutyToday ?? stats.upcomingSchedules ?? 0,
      lowStockCount: stats.lowStockCount,
      inventoryTotalQuantity: stats.inventoryTotalQuantity ?? 0,
      inventoryRecordCount: stats.inventoryRecordCount ?? 0,
    };
  }

  // RPC not deployed yet — fall back until SQL migration is applied in Supabase.
  const missingRpc =
    error?.code === "PGRST202" ||
    error?.message.includes("Could not find the function");
  if (missingRpc) {
    return fetchDashboardStatsLegacy(supabase, today, branchId);
  }

  throw new Error(error?.message ?? "Failed to load dashboard stats");
}

async function fetchDashboardStatsLegacy(
  supabase: SupabaseClient,
  today: string,
  branchId: string | null
): Promise<DashboardStats> {
  const monthStart = `${today.slice(0, 7)}-01`;
  const yearStart = `${today.slice(0, 4)}-01-01`;

  const dailyTxQuery = supabase
    .from("transactions")
    .select("amount, payment_status")
    .eq("transaction_date", today);
  const monthlyTxQuery = supabase
    .from("transactions")
    .select("amount, payment_status")
    .gte("transaction_date", monthStart)
    .lte("transaction_date", today);
  const annualTxQuery = supabase
    .from("transactions")
    .select("amount, payment_status")
    .gte("transaction_date", yearStart)
    .lte("transaction_date", today);
  const allTimeTxQuery = supabase.from("transactions").select("amount, payment_status");
  const reportsQuery = supabase
    .from("daily_reports")
    .select("total_cash")
    .eq("report_date", today);
  const schedulesQuery = supabase
    .from("schedules")
    .select("id")
    .eq("scheduled_date", today)
    .in("status", ["pending", "confirmed"]);
  const inventoryQuery = supabase
    .from("inventory")
    .select("id, quantity, inventory_catalog(low_stock_threshold)");

  if (branchId) {
    dailyTxQuery.eq("branch_id", branchId);
    monthlyTxQuery.eq("branch_id", branchId);
    annualTxQuery.eq("branch_id", branchId);
    allTimeTxQuery.eq("branch_id", branchId);
    reportsQuery.eq("branch_id", branchId);
    schedulesQuery.eq("branch_id", branchId);
    inventoryQuery.eq("branch_id", branchId);
  }

  const [
    { data: dailyTransactions },
    { data: monthlyTransactions },
    { data: annualTransactions },
    { data: allTimeTransactions },
    { data: reports },
    { data: schedules },
    { data: inventory },
  ] = await Promise.all([
    dailyTxQuery,
    monthlyTxQuery,
    annualTxQuery,
    allTimeTxQuery,
    reportsQuery,
    schedulesQuery,
    inventoryQuery,
  ]);

  return computeDashboardStats({
    dailyTransactions,
    monthlyTransactions,
    annualTransactions,
    allTimeTransactions,
    reports,
    schedulesCount: schedules?.length ?? 0,
    inventory,
  });
}

export { emptyPeriod };
