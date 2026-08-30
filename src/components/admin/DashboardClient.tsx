"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, CreditCard, FileText, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StatCard } from "@/components/ui/StatCard";
import { Select } from "@/components/ui/Select";
import type { Branch } from "@/lib/types";
import { isAdminLike, type AppRole } from "@/lib/auth/roles";
import {
  fetchDashboardStats,
  type DashboardStats,
  type PeriodTotals,
} from "@/lib/dashboard-stats";

function periodValues(
  stats: DashboardStats,
  pick: (period: PeriodTotals) => number
) {
  return [
    { label: "Daily", value: pick(stats.daily) },
    { label: "Monthly", value: pick(stats.monthly) },
  ];
}

const QUICK_LINKS = [
  { href: "/admin/reports", label: "New Daily Report", icon: FileText },
  { href: "/admin/transactions", label: "Add Transaction", icon: CreditCard },
  { href: "/admin/schedules", label: "View Schedules", icon: Calendar },
  { href: "/admin/inventory", label: "Check Inventory", icon: Package },
];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-text/45">
      {children}
    </h2>
  );
}

export function DashboardClient({
  today,
  branches,
  initialStats,
  role,
  assignedBranchId,
}: {
  today: string;
  branches: Branch[];
  initialStats: DashboardStats;
  role: AppRole;
  assignedBranchId: string | null;
}) {
  const supabase = createClient();
  const [selectedBranch, setSelectedBranch] = useState(
    role === "staff" && assignedBranchId ? assignedBranchId : "all"
  );
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(false);

  const scopedBranches =
    role === "staff" && assignedBranchId
      ? branches.filter((branch) => branch.id === assignedBranchId)
      : branches;

  const quickLinks =
    role === "staff"
      ? QUICK_LINKS.filter((link) =>
          ["/admin/reports", "/admin/transactions"].includes(link.href)
        )
      : QUICK_LINKS;

  const branchLabel =
    selectedBranch === "all"
      ? "All branches"
      : (scopedBranches.find((b) => b.id === selectedBranch)?.name ?? "Branch");

  async function handleBranchChange(branchId: string) {
    setSelectedBranch(branchId);
    setLoading(true);
    const filteredBranchId = branchId === "all" ? null : branchId;
    const next = await fetchDashboardStats(supabase, today, filteredBranchId);
    setStats(next);
    setLoading(false);
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text mb-1">Dashboard</h1>
          <p className="text-brand-text/60">Overview for today — {today}</p>
        </div>
        {isAdminLike(role) && (
          <div className="w-full sm:w-64">
            <Select
              label=""
              value={selectedBranch}
              onChange={(e) => handleBranchChange(e.target.value)}
              options={[
                { value: "all", label: "All Branches" },
                ...scopedBranches.map((branch) => ({ value: branch.id, label: branch.name })),
              ]}
            />
          </div>
        )}
      </div>

      {role === "staff" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard label="Cash Received Today" value={stats.daily.cashReceived} />
        </div>
      ) : (
        <div className="space-y-8 mb-8">
          <section>
            <SectionHeading>Sales</SectionHeading>
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
            <p className="mt-4 text-sm text-brand-text/60">
              <Link href="/admin/finance" className="font-medium text-brand-blue hover:underline">
                View full finance overview
              </Link>
              {" "}— annual, all-time totals, and sales charts.
            </p>
          </section>

          <section>
            <SectionHeading>Inventory &amp; operations</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Link href="/admin/inventory" className="block h-full">
                <StatCard
                  label="Total Quantity On Hand"
                  subtitle={branchLabel}
                  value={stats.inventoryTotalQuantity}
                  isCurrency={false}
                />
              </Link>
              <Link href="/admin/inventory" className="block h-full">
                <StatCard
                  label="Items Low In Stock"
                  subtitle={branchLabel}
                  value={stats.lowStockCount}
                  isCurrency={false}
                  variant={stats.lowStockCount > 0 ? "warning" : "default"}
                />
              </Link>
              <Link href="/admin/inventory" className="block h-full">
                <StatCard
                  label="Tracked Inventory Records"
                  subtitle={branchLabel}
                  value={stats.inventoryRecordCount}
                  isCurrency={false}
                />
              </Link>
              <Link href="/admin/schedules" className="block h-full">
                <StatCard
                  label="Staff on Duty Today"
                  subtitle="Pending & confirmed shifts"
                  value={stats.staffOnDutyToday}
                  isCurrency={false}
                />
              </Link>
            </div>
          </section>
        </div>
      )}

      <h2 className="text-lg font-semibold text-brand-text mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <div className="rounded-xl border border-brand-blue/10 bg-white p-5 hover:shadow-md transition-shadow flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-light/30 flex items-center justify-center">
                <Icon className="w-5 h-5 text-brand-blue" />
              </div>
              <span className="text-sm font-medium text-brand-text">{label}</span>
            </div>
          </Link>
        ))}
      </div>

      {loading && <p className="mt-3 text-xs text-brand-text/50">Updating branch metrics...</p>}
    </div>
  );
}
