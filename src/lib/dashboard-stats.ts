import type { SupabaseClient } from "@supabase/supabase-js";

export type DashboardStats = {
  /** Paid + partial transaction amounts for today (excludes unpaid). */
  cashReceived: number;
  /** Unpaid transaction amounts for today. */
  unpaid: number;
  /** All transaction amounts for today. */
  totalSales: number;
  /** Physical cash on hand from today's daily reports (denomination count). */
  cashOnHand: number;
  /** Duty schedules on/after today. */
  upcomingSchedules: number;
  lowStockCount: number;
};

type TxRow = { amount: number; payment_status: string };
type ReportRow = { total_cash: number };
type InventoryRow = { quantity: number; low_stock_threshold: number };

export function computeDashboardStats({
  transactions,
  reports,
  schedulesCount,
  inventory,
}: {
  transactions: TxRow[] | null | undefined;
  reports: ReportRow[] | null | undefined;
  schedulesCount: number;
  inventory: InventoryRow[] | null | undefined;
}): DashboardStats {
  const txs = transactions ?? [];
  const totalSales = txs.reduce((sum, tx) => sum + tx.amount, 0);
  const unpaid = txs
    .filter((tx) => tx.payment_status === "unpaid")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const cashReceived = totalSales - unpaid;
  const cashOnHand = (reports ?? []).reduce((sum, r) => sum + r.total_cash, 0);
  const lowStockCount =
    inventory?.filter((i) => i.quantity <= i.low_stock_threshold).length ?? 0;

  return {
    cashReceived,
    unpaid,
    totalSales,
    cashOnHand,
    upcomingSchedules: schedulesCount,
    lowStockCount,
  };
}

export async function fetchDashboardStats(
  supabase: SupabaseClient,
  today: string,
  branchId: string | null
): Promise<DashboardStats> {
  const txQuery = supabase
    .from("transactions")
    .select("amount, payment_status")
    .eq("transaction_date", today);
  const reportsQuery = supabase
    .from("daily_reports")
    .select("total_cash")
    .eq("report_date", today);
  const schedulesQuery = supabase
    .from("schedules")
    .select("id")
    .gte("scheduled_date", today);
  const inventoryQuery = supabase.from("inventory").select("id, quantity, low_stock_threshold");

  if (branchId) {
    txQuery.eq("branch_id", branchId);
    reportsQuery.eq("branch_id", branchId);
    schedulesQuery.eq("branch_id", branchId);
    inventoryQuery.eq("branch_id", branchId);
  }

  const [
    { data: transactions },
    { data: reports },
    { data: schedules },
    { data: inventory },
  ] = await Promise.all([txQuery, reportsQuery, schedulesQuery, inventoryQuery]);

  return computeDashboardStats({
    transactions,
    reports,
    schedulesCount: schedules?.length ?? 0,
    inventory,
  });
}
