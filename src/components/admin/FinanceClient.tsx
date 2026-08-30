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
} from "@/lib/finance-stats";
import type { PeriodTotals } from "@/lib/dashboard-stats";

function periodValues(
  stats: FinanceStats,
  pick: (period: PeriodTotals) => number
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
type ChartSeries = "totalSales" | "cashReceived" | "unpaid";

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
            Sales overview and trends — {today}
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
        <SectionHeading>Sales summary</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Cash Received"
            periods={periodValues(stats, (p) => p.cashReceived)}
          />
          <StatCard
            label="Unpaid"
            variant="warning"
            periods={periodValues(stats, (p) => p.unpaid)}
          />
          <StatCard
            label="Total Sales"
            variant="success"
            periods={periodValues(stats, (p) => p.totalSales)}
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
