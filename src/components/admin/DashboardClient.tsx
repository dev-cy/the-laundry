"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, CreditCard, FileText, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StatCard } from "@/components/ui/StatCard";
import { Select } from "@/components/ui/Select";
import type { Branch } from "@/lib/types";
import { isAdminLike, type AppRole } from "@/lib/auth/roles";
import { formatCurrency } from "@/lib/utils";
import {
  fetchDashboardStats,
  type DashboardStats,
} from "@/lib/dashboard-stats";

const QUICK_LINKS = [
  { href: "/admin/reports", label: "New Daily Report", icon: FileText },
  { href: "/admin/transactions", label: "Add Transaction", icon: CreditCard },
  { href: "/admin/schedules", label: "View Schedules", icon: Calendar },
  { href: "/admin/inventory", label: "Check Inventory", icon: Package },
];

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
          <p className="text-brand-text/60">Overview for today - {today}</p>
        </div>
        {isAdminLike(role) && (
          <div className="w-full sm:w-64">
            <Select
              label="Branch Filter"
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
          <StatCard label="Cash Received Today" value={stats.cashReceived} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Cash Received Today" value={stats.cashReceived} />
          <StatCard label="Unpaid Today" value={stats.unpaid} variant="warning" />
          <StatCard label="Total Sales Today" value={stats.totalSales} variant="success" />
          <StatCard
            label="Upcoming Schedules"
            value={stats.upcomingSchedules}
            isCurrency={false}
          />
        </div>
      )}

      {isAdminLike(role) && stats.cashOnHand > 0 && (
        <p className="mb-4 text-sm text-brand-text/60">
          Cash on hand from today&apos;s daily report(s):{" "}
          <span className="font-medium text-brand-text">
            {formatCurrency(stats.cashOnHand)}
          </span>
          {" "}(physical count — may differ from cash received)
        </p>
      )}

      {isAdminLike(role) && stats.lowStockCount > 0 && (
        <div className="mb-8 rounded-xl bg-amber-50 border border-amber-200 px-5 py-4">
          <p className="text-sm text-amber-800">
            <strong>{stats.lowStockCount}</strong> inventory item
            {stats.lowStockCount > 1 ? "s are" : " is"} running low.{" "}
            <Link href="/admin/inventory" className="underline font-medium">
              View inventory
            </Link>
          </p>
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
