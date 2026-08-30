import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computePeriodTotals,
  fetchDashboardStats,
  type DashboardStats,
  type PeriodTotals,
} from "@/lib/dashboard-stats";

export type ChartPoint = {
  label: string;
  date: string;
  totalSales: number;
  cashReceived: number;
  unpaid: number;
};

export type FinanceStats = DashboardStats & {
  monthlyTransactionCount: number;
  unpaidTransactionCount: number;
  averageSaleAmount: number;
  dailyChart: ChartPoint[];
  monthlyChart: ChartPoint[];
};

type TxRow = { amount: number; payment_status: string; transaction_date: string };

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-PH", {
    month: "short",
    year: "2-digit",
  });
}

function dayLabel(date: string): string {
  const day = new Date(`${date}T00:00:00`).getDate();
  return String(day);
}

function aggregateByDate(rows: TxRow[]): Map<string, PeriodTotals> {
  const map = new Map<string, PeriodTotals>();
  for (const row of rows) {
    const current = map.get(row.transaction_date) ?? {
      totalSales: 0,
      unpaid: 0,
      cashReceived: 0,
    };
    current.totalSales += row.amount;
    if (row.payment_status === "unpaid") current.unpaid += row.amount;
    map.set(row.transaction_date, current);
  }
  for (const [date, totals] of map) {
    map.set(date, {
      ...totals,
      cashReceived: totals.totalSales - totals.unpaid,
    });
  }
  return map;
}

function buildDailyChart(rows: TxRow[], monthStart: string, today: string): ChartPoint[] {
  const byDate = aggregateByDate(rows);
  const points: ChartPoint[] = [];
  const start = new Date(`${monthStart}T00:00:00`);
  const end = new Date(`${today}T00:00:00`);

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const iso = cursor.toISOString().slice(0, 10);
    const totals = byDate.get(iso) ?? { totalSales: 0, unpaid: 0, cashReceived: 0 };
    points.push({
      date: iso,
      label: dayLabel(iso),
      ...totals,
    });
  }
  return points;
}

function buildMonthlyChart(rows: TxRow[], today: string): ChartPoint[] {
  const byMonth = new Map<string, PeriodTotals>();
  for (const row of rows) {
    const key = row.transaction_date.slice(0, 7);
    const current = byMonth.get(key) ?? { totalSales: 0, unpaid: 0, cashReceived: 0 };
    current.totalSales += row.amount;
    if (row.payment_status === "unpaid") current.unpaid += row.amount;
    byMonth.set(key, current);
  }

  const [year, month] = today.split("-").map(Number);
  const points: ChartPoint[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const totals = byMonth.get(key) ?? { totalSales: 0, unpaid: 0, cashReceived: 0 };
    points.push({
      date: `${key}-01`,
      label: monthLabel(d.getFullYear(), d.getMonth() + 1),
      totalSales: totals.totalSales,
      unpaid: totals.unpaid,
      cashReceived: totals.totalSales - totals.unpaid,
    });
  }
  return points;
}

export async function fetchFinanceStats(
  supabase: SupabaseClient,
  today: string,
  branchId: string | null
): Promise<FinanceStats> {
  const monthStart = `${today.slice(0, 7)}-01`;
  const chartStart = (() => {
    const [year, month] = today.split("-").map(Number);
    const d = new Date(year, month - 13, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  })();

  const monthTxQuery = supabase
    .from("transactions")
    .select("amount, payment_status, transaction_date")
    .gte("transaction_date", monthStart)
    .lte("transaction_date", today);
  const chartTxQuery = supabase
    .from("transactions")
    .select("amount, payment_status, transaction_date")
    .gte("transaction_date", chartStart)
    .lte("transaction_date", today);

  if (branchId) {
    monthTxQuery.eq("branch_id", branchId);
    chartTxQuery.eq("branch_id", branchId);
  }

  const [dashboard, { data: monthTransactions }, { data: chartTransactions }] =
    await Promise.all([
      fetchDashboardStats(supabase, today, branchId),
      monthTxQuery,
      chartTxQuery,
    ]);

  const monthRows = monthTransactions ?? [];
  const chartRows = chartTransactions ?? [];
  const monthTotals = computePeriodTotals(monthRows);
  const monthlyTransactionCount = monthRows.length;
  const unpaidTransactionCount = monthRows.filter(
    (row) => row.payment_status === "unpaid"
  ).length;
  const averageSaleAmount =
    monthlyTransactionCount > 0 ? monthTotals.totalSales / monthlyTransactionCount : 0;

  const dailyChart = buildDailyChart(
    chartRows.filter((row) => row.transaction_date >= monthStart),
    monthStart,
    today
  );
  const monthlyChart = buildMonthlyChart(chartRows, today);

  return {
    ...dashboard,
    monthlyTransactionCount,
    unpaidTransactionCount,
    averageSaleAmount,
    dailyChart,
    monthlyChart,
  };
}
