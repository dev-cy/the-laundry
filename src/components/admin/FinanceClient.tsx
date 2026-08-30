"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { StatCard } from "@/components/ui/StatCard";
import { Select } from "@/components/ui/Select";
import { SalesTrendChart } from "@/components/admin/SalesTrendChart";
import type { Branch } from "@/lib/types";
import { isAdminLike, type AppRole } from "@/lib/auth/roles";
import { formatCurrency } from "@/lib/utils";
import {
  fetchFinanceStats,
  type FinanceStats,
  type PeriodIncome,
} from "@/lib/finance-stats";

function periodValues(
  stats: FinanceStats,
  pick: (period: PeriodIncome) => number
) {
  return [
    { label: "Daily", value: pick(stats.income.daily) },
    { label: "Monthly", value: pick(stats.income.monthly) },
    { label: "Annually", value: pick(stats.income.annual) },
    { label: "All Time", value: pick(stats.income.allTime) },
  ];
}

function salesPeriodValues(
  stats: FinanceStats,
  pick: (period: FinanceStats["daily"]) => number
) {
  return [
    { label: "Daily", value: pick(stats.daily) },
    { label: "Monthly", value: pick(stats.monthly) },
    { label: "Annually", value: pick(stats.annual) },
    { label: "All Time", value: pick(stats.allTime) },
  ];
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-text/45">
      {children}
    </h2>
  );
}

type ChartRange = "month" | "year";
type ChartSeries = "totalSales" | "cashReceived" | "unpaid" | "expenses" | "netIncome";

export function FinanceClient({
  today,
  branches,
  initialStats,
  role,
  assignedBranchId,
}: {
  today: string;
  branches: Branch[];
  initialStats: FinanceStats;
  role: AppRole;
  assignedBranchId: string | null;
}) {
  const supabase = createClient();
  const [selectedBranch, setSelectedBranch] = useState(
    role === "staff" && assignedBranchId ? assignedBranchId : "all"
  );
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(false);
  const [chartRange, setChartRange] = useState<ChartRange>("month");
  const [chartSeries, setChartSeries] = useState<ChartSeries>("totalSales");

  const scopedBranches =
    role === "staff" && assignedBranchId
      ? branches.filter((branch) => branch.id === assignedBranchId)
      : branches;

  const branchLabel =
    selectedBranch === "all"
      ? "All branches"
      : (scopedBranches.find((b) => b.id === selectedBranch)?.name ?? "Branch");

  const chartData =
    chartRange === "month" ? stats.dailyChart : stats.monthlyChart;

  const monthIncome = stats.income.monthly.grossIncome;
  const allTimeIncome = stats.income.allTime.grossIncome;
  const showNoSalesThisMonth =
    monthIncome === 0 && allTimeIncome > 0;
  const showCashOnHandNote =
    stats.cashOnHand > 0 && stats.income.daily.grossIncome === 0;

  async function handleBranchChange(branchId: string) {
    setSelectedBranch(branchId);
    setLoading(true);
    const filteredBranchId = branchId === "all" ? null : branchId;
    const next = await fetchFinanceStats(supabase, today, filteredBranchId);
    setStats(next);
    setLoading(false);
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text mb-1">Finance</h1>
          <p className="text-brand-text/60">
            Sales, expenses, and income overview — {today}
          </p>
        </div>
        {isAdminLike(role) && (
          <div className="w-full sm:w-64">
            <Select
              label=""
              value={selectedBranch}
              onChange={(e) => handleBranchChange(e.target.value)}
              options={[
                { value: "all", label: "All Branches" },
                ...scopedBranches.map((branch) => ({
                  value: branch.id,
                  label: branch.name,
                })),
              ]}
            />
          </div>
        )}
      </div>

      {!stats.expensesAvailable && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Expenses are not set up yet. Run{" "}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">
            supabase/migrations/20260830_expenses.sql
          </code>{" "}
          in the Supabase SQL Editor, then refresh this page.
        </div>
      )}

      {showNoSalesThisMonth && (
        <div className="mb-6 rounded-xl border border-brand-blue/15 bg-brand-light/10 px-4 py-3 text-sm text-brand-text/80">
          No paid sales are recorded for{" "}
          <span className="font-medium">{today.slice(0, 7)}</span> yet. Daily and
          monthly totals use transaction dates — your all-time total is{" "}
          {formatCurrency(allTimeIncome)} from earlier entries. Add transactions or
          complete daily report sales for this month to update these figures.
        </div>
      )}

      {showCashOnHandNote && (
        <div className="mb-6 rounded-xl border border-brand-blue/15 bg-white px-4 py-3 text-sm text-brand-text/80">
          Today&apos;s daily report shows{" "}
          {formatCurrency(stats.cashOnHand)} cash on hand, but finance income
          comes from <strong>transactions</strong> (paid sales). Enter today&apos;s
          sales under{" "}
          <Link href="/admin/transactions" className="text-brand-blue hover:underline">
            Transactions
          </Link>{" "}
          or line items in{" "}
          <Link href="/admin/reports" className="text-brand-blue hover:underline">
            Daily Reports
          </Link>{" "}
          to reflect them here.
        </div>
      )}

      <section className="mb-8 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeading>Sales trend</SectionHeading>
          <div className="flex flex-wrap gap-2">
            <Select
              label=""
              value={chartRange}
              onChange={(e) => setChartRange(e.target.value as ChartRange)}
              options={[
                { value: "month", label: "This month (daily)" },
                { value: "year", label: "Last 12 months" },
              ]}
            />
            <Select
              label=""
              value={chartSeries}
              onChange={(e) => setChartSeries(e.target.value as ChartSeries)}
              options={[
                { value: "totalSales", label: "Total sales" },
                { value: "cashReceived", label: "Cash received" },
                { value: "unpaid", label: "Unpaid" },
                { value: "expenses", label: "Expenses" },
                { value: "netIncome", label: "Net income" },
              ]}
            />
          </div>
        </div>
        <SalesTrendChart
          title={chartRange === "month" ? "Daily sales this month" : "Monthly sales (12 months)"}
          subtitle={branchLabel}
          data={chartData}
          series={chartSeries}
        />
      </section>

      <section className="mb-8">
        <SectionHeading>Income summary</SectionHeading>
        <p className="mb-4 text-sm text-brand-text/60">
          Gross income is cash received from paid sales. Net income subtracts recorded
          expenses. The large figure on each card is <strong>today</strong>; monthly,
          annual, and all-time totals are listed below it.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Gross Income"
            variant="success"
            periods={periodValues(stats, (p) => p.grossIncome)}
          />
          <StatCard
            label="Expenses"
            variant="warning"
            periods={periodValues(stats, (p) => p.totalExpenses)}
          />
          <StatCard
            label="Net Income"
            periods={periodValues(stats, (p) => p.netIncome)}
          />
        </div>
      </section>

      <section className="mb-8">
        <SectionHeading>Sales summary</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Cash Received"
            periods={salesPeriodValues(stats, (p) => p.cashReceived)}
          />
          <StatCard
            label="Unpaid"
            variant="warning"
            periods={salesPeriodValues(stats, (p) => p.unpaid)}
          />
          <StatCard
            label="Total Sales"
            variant="success"
            periods={salesPeriodValues(stats, (p) => p.totalSales)}
          />
        </div>
        {stats.cashOnHand > 0 && (
          <p className="mt-4 text-sm text-brand-text/60">
            Cash on hand from today&apos;s daily report(s):{" "}
            <span className="font-medium text-brand-text">
              {formatCurrency(stats.cashOnHand)}
            </span>
            {" "}(physical count — may differ from cash received)
          </p>
        )}
      </section>

      <section className="mb-8">
        <SectionHeading>This month</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Transactions"
            subtitle={branchLabel}
            value={stats.monthlyTransactionCount}
            isCurrency={false}
          />
          <StatCard
            label="Unpaid Transactions"
            subtitle={branchLabel}
            value={stats.unpaidTransactionCount}
            isCurrency={false}
            variant={stats.unpaidTransactionCount > 0 ? "warning" : "default"}
          />
          <StatCard
            label="Average Sale"
            subtitle={branchLabel}
            value={Math.round(stats.averageSaleAmount)}
          />
          <StatCard
            label="Cash on Hand Today"
            subtitle="From daily reports"
            value={stats.cashOnHand}
          />
        </div>
      </section>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/admin/expenses"
          className="rounded-lg border border-brand-blue/15 bg-white px-4 py-2 text-brand-text hover:shadow-sm transition-shadow"
        >
          Manage expenses
        </Link>
        <Link
          href="/admin/transactions"
          className="rounded-lg border border-brand-blue/15 bg-white px-4 py-2 text-brand-text hover:shadow-sm transition-shadow"
        >
          View transactions
        </Link>
        <Link
          href="/admin/reports"
          className="rounded-lg border border-brand-blue/15 bg-white px-4 py-2 text-brand-text hover:shadow-sm transition-shadow"
        >
          Daily reports
        </Link>
      </div>

      {loading && (
        <p className="mt-3 text-xs text-brand-text/50">Updating finance metrics...</p>
      )}
    </div>
  );
}
