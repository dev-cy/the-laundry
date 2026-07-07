"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, CreditCard, FileText, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StatCard } from "@/components/ui/StatCard";
import { Select } from "@/components/ui/Select";
import type { Branch } from "@/lib/types";

type DashboardStats = {
  totalCash: number;
  totalUnpaid: number;
  totalSales: number;
  pendingSchedules: number;
  lowStockCount: number;
};

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
}: {
  today: string;
  branches: Branch[];
  initialStats: DashboardStats;
}) {
  const supabase = createClient();
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(false);

  async function handleBranchChange(branchId: string) {
    setSelectedBranch(branchId);
    setLoading(true);

    const reportsQuery = supabase
      .from("daily_reports")
      .select("total_cash, unpaid, total_sales")
      .eq("report_date", today);
    const txQuery = supabase
      .from("transactions")
      .select("amount")
      .eq("payment_status", "unpaid");
    const schedulesQuery = supabase
      .from("schedules")
      .select("id")
      .eq("status", "pending")
      .gte("scheduled_date", today);
    const inventoryQuery = supabase.from("inventory").select("id, quantity, low_stock_threshold");

    const filteredBranchId = branchId === "all" ? null : branchId;
    if (filteredBranchId) {
      reportsQuery.eq("branch_id", filteredBranchId);
      txQuery.eq("branch_id", filteredBranchId);
      schedulesQuery.eq("branch_id", filteredBranchId);
      inventoryQuery.eq("branch_id", filteredBranchId);
    }

    const [{ data: reports }, { data: unpaidTx }, { data: pendingSchedules }, { data: lowStock }] =
      await Promise.all([reportsQuery, txQuery, schedulesQuery, inventoryQuery]);

    const totalCash = reports?.reduce((s, r) => s + r.total_cash, 0) ?? 0;
    const totalUnpaid =
      reports?.reduce((s, r) => s + r.unpaid, 0) ?? unpaidTx?.reduce((s, t) => s + t.amount, 0) ?? 0;
    const totalSales = reports?.reduce((s, r) => s + r.total_sales, 0) ?? 0;
    const lowStockCount = lowStock?.filter((i) => i.quantity <= i.low_stock_threshold).length ?? 0;

    setStats({
      totalCash,
      totalUnpaid,
      totalSales,
      pendingSchedules: pendingSchedules?.length ?? 0,
      lowStockCount,
    });
    setLoading(false);
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text mb-1">Dashboard</h1>
          <p className="text-brand-text/60">Overview for today - {today}</p>
        </div>
        <div className="w-full sm:w-64">
          <Select
            label="Branch Filter"
            value={selectedBranch}
            onChange={(e) => handleBranchChange(e.target.value)}
            options={[
              { value: "all", label: "All Branches" },
              ...branches.map((branch) => ({ value: branch.id, label: branch.name })),
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Cash Received" value={stats.totalCash} />
        <StatCard label="Unpaid" value={stats.totalUnpaid} variant="warning" />
        <StatCard label="Total Sales" value={stats.totalSales} variant="success" />
        <StatCard label="Pending Schedules" value={stats.pendingSchedules} isCurrency={false} />
      </div>

      {stats.lowStockCount > 0 && (
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
        {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
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
