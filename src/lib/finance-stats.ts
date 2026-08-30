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
  expenses: number;
  netIncome: number;
};

export type PeriodIncome = {
  grossIncome: number;
  totalExpenses: number;
  netIncome: number;
};

export type IncomeByPeriod = {
  daily: PeriodIncome;
  monthly: PeriodIncome;
  annual: PeriodIncome;
  allTime: PeriodIncome;
};

export type FinanceStats = DashboardStats & {
  income: IncomeByPeriod;
  /** False when the expenses table migration has not been applied in Supabase. */
  expensesAvailable: boolean;
  monthlyTransactionCount: number;
  unpaidTransactionCount: number;
  averageSaleAmount: number;
  dailyChart: ChartPoint[];
  monthlyChart: ChartPoint[];
};

type TxRow = { amount: number; payment_status: string; transaction_date: string };
type ExpenseRow = { amount: number; expense_date: string };

function parseIsoDate(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDaysIso(iso: string, days: number): string {
  const { year, month, day } = parseIsoDate(iso);
  const next = new Date(year, month - 1, day + days);
  return formatIsoDate(next.getFullYear(), next.getMonth() + 1, next.getDate());
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-PH", {
    month: "short",
    year: "2-digit",
  });
}

function dayLabel(date: string): string {
  return String(parseIsoDate(date).day);
}

function sumExpenses(rows: ExpenseRow[], from?: string, to?: string): number {
  return rows
    .filter(
      (row) =>
        (!from || row.expense_date >= from) && (!to || row.expense_date <= to)
    )
    .reduce((sum, row) => sum + row.amount, 0);
}

export function buildPeriodIncome(
  sales: PeriodTotals,
  expenseTotal: number
): PeriodIncome {
  const grossIncome = sales.cashReceived;
  return {
    grossIncome,
    totalExpenses: expenseTotal,
    netIncome: grossIncome - expenseTotal,
  };
}

function aggregateExpensesByDate(rows: ExpenseRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.expense_date, (map.get(row.expense_date) ?? 0) + row.amount);
  }
  return map;
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

function buildDailyChart(
  rows: TxRow[],
  expenseRows: ExpenseRow[],
  monthStart: string,
  today: string
): ChartPoint[] {
  const byDate = aggregateByDate(rows);
  const expensesByDate = aggregateExpensesByDate(expenseRows);
  const points: ChartPoint[] = [];
  let cursor = monthStart;

  while (cursor <= today) {
    const totals = byDate.get(cursor) ?? { totalSales: 0, unpaid: 0, cashReceived: 0 };
    const expenses = expensesByDate.get(cursor) ?? 0;
    points.push({
      date: cursor,
      label: dayLabel(cursor),
      ...totals,
      expenses,
      netIncome: totals.cashReceived - expenses,
    });
    if (cursor === today) break;
    cursor = addDaysIso(cursor, 1);
  }
  return points;
}

function buildMonthlyChart(
  rows: TxRow[],
  expenseRows: ExpenseRow[],
  today: string
): ChartPoint[] {
  const byMonth = new Map<string, PeriodTotals>();
  for (const row of rows) {
    const key = row.transaction_date.slice(0, 7);
    const current = byMonth.get(key) ?? { totalSales: 0, unpaid: 0, cashReceived: 0 };
    current.totalSales += row.amount;
    if (row.payment_status === "unpaid") current.unpaid += row.amount;
    byMonth.set(key, current);
  }

  const expensesByMonth = new Map<string, number>();
  for (const row of expenseRows) {
    const key = row.expense_date.slice(0, 7);
    expensesByMonth.set(key, (expensesByMonth.get(key) ?? 0) + row.amount);
  }

  const [year, month] = today.split("-").map(Number);
  const points: ChartPoint[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const totals = byMonth.get(key) ?? { totalSales: 0, unpaid: 0, cashReceived: 0 };
    const expenses = expensesByMonth.get(key) ?? 0;
    const cashReceived = totals.totalSales - totals.unpaid;
    points.push({
      date: `${key}-01`,
      label: monthLabel(d.getFullYear(), d.getMonth() + 1),
      totalSales: totals.totalSales,
      unpaid: totals.unpaid,
      cashReceived,
      expenses,
      netIncome: cashReceived - expenses,
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
  const yearStart = `${today.slice(0, 4)}-01-01`;
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
  const expenseQuery = supabase
    .from("expenses")
    .select("amount, expense_date");

  if (branchId) {
    monthTxQuery.eq("branch_id", branchId);
    chartTxQuery.eq("branch_id", branchId);
    expenseQuery.eq("branch_id", branchId);
  }

  const [dashboard, { data: monthTransactions }, { data: chartTransactions }, expenseResult] =
    await Promise.all([
      fetchDashboardStats(supabase, today, branchId),
      monthTxQuery,
      chartTxQuery,
      expenseQuery,
    ]);

  const expenseRows = (expenseResult.data as ExpenseRow[] | null) ?? [];
  const expensesAvailable = !expenseResult.error;
  const monthRows = monthTransactions ?? [];
  const chartRows = chartTransactions ?? [];
  const monthTotals = computePeriodTotals(monthRows);
  const monthlyTransactionCount = monthRows.length;
  const unpaidTransactionCount = monthRows.filter(
    (row) => row.payment_status === "unpaid"
  ).length;
  const averageSaleAmount =
    monthlyTransactionCount > 0 ? monthTotals.totalSales / monthlyTransactionCount : 0;

  const income: IncomeByPeriod = {
    daily: buildPeriodIncome(
      dashboard.daily,
      sumExpenses(expenseRows, today, today)
    ),
    monthly: buildPeriodIncome(
      dashboard.monthly,
      sumExpenses(expenseRows, monthStart, today)
    ),
    annual: buildPeriodIncome(
      dashboard.annual,
      sumExpenses(expenseRows, yearStart, today)
    ),
    allTime: buildPeriodIncome(
      dashboard.allTime,
      sumExpenses(expenseRows)
    ),
  };

  const dailyChart = buildDailyChart(
    chartRows.filter((row) => row.transaction_date >= monthStart),
    expenseRows.filter((row) => row.expense_date >= monthStart && row.expense_date <= today),
    monthStart,
    today
  );
  const monthlyChart = buildMonthlyChart(chartRows, expenseRows, today);

  return {
    ...dashboard,
    income,
    expensesAvailable,
    monthlyTransactionCount,
    unpaidTransactionCount,
    averageSaleAmount,
    dailyChart,
    monthlyChart,
  };
}
