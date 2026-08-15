"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DENOMINATIONS } from "@/lib/constants";
import { calcTotalCash, countCustomersFromTransactions, formatCurrency, todayISO } from "@/lib/utils";
import type { Branch, DailyReport, CashQuantities } from "@/lib/types";
import { canDeleteEntries, isAdminLike, type AppRole } from "@/lib/auth/roles";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Pencil, Plus, Trash2, X } from "lucide-react";

const emptyQty = (): CashQuantities => ({
  qty_1: 0,
  qty_5: 0,
  qty_10: 0,
  qty_20: 0,
  qty_50: 0,
  qty_100: 0,
  qty_200: 0,
  qty_500: 0,
  qty_1000: 0,
});

export function ReportForm({
  branches,
  existing,
  role,
  lockedBranchId,
  onSaved,
}: {
  branches: Branch[];
  existing?: DailyReport | null;
  role: AppRole;
  lockedBranchId?: string | null;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [branchId, setBranchId] = useState(
    lockedBranchId ?? existing?.branch_id ?? branches[0]?.id ?? ""
  );
  const [reportDate, setReportDate] = useState(existing?.report_date ?? todayISO());
  const [staffNames, setStaffNames] = useState(existing?.staff_names ?? "");
  const [quantities, setQuantities] = useState<CashQuantities>(
    existing
      ? {
          qty_1: existing.qty_1,
          qty_5: existing.qty_5,
          qty_10: existing.qty_10,
          qty_20: existing.qty_20,
          qty_50: existing.qty_50,
          qty_100: existing.qty_100,
          qty_200: existing.qty_200,
          qty_500: existing.qty_500,
          qty_1000: existing.qty_1000,
        }
      : emptyQty()
  );
  const [unpaidPrevious, setUnpaidPrevious] = useState(0);
  const [priorReportDate, setPriorReportDate] = useState<string | null>(null);
  const [unpaid, setUnpaid] = useState(existing?.unpaid ?? 0);
  const [totalSales, setTotalSales] = useState(existing?.total_sales ?? 0);
  const [cashReceived, setCashReceived] = useState((existing?.total_sales ?? 0) - (existing?.unpaid ?? 0));
  const [customerCount, setCustomerCount] = useState(0);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCash = calcTotalCash(quantities);

  useEffect(() => {
    if (!branchId || !reportDate) return;

    async function fetchDerivedTotals() {
      const [{ data: priorData }, { data: txData }] = await Promise.all([
        supabase
          .from("daily_reports")
          .select("unpaid, unpaid_previous, report_date")
          .eq("branch_id", branchId)
          .lt("report_date", reportDate)
          .order("report_date", { ascending: false })
          .limit(1),
        supabase
          .from("transactions")
          .select("amount, payment_status, customer_name")
          .eq("branch_id", branchId)
          .eq("transaction_date", reportDate),
      ]);

      const prior = priorData?.[0];
      if (prior) {
        setUnpaidPrevious(prior.unpaid_previous + prior.unpaid);
        setPriorReportDate(prior.report_date);
      } else {
        setUnpaidPrevious(0);
        setPriorReportDate(null);
      }

      const total = txData?.reduce((sum, tx) => sum + tx.amount, 0) ?? 0;
      const unpaidFromTx =
        txData
          ?.filter((tx) => tx.payment_status === "unpaid")
          .reduce((sum, tx) => sum + tx.amount, 0) ?? 0;
      setTotalSales(total);
      setUnpaid(unpaidFromTx);
      setCashReceived(total - unpaidFromTx);
      setCustomerCount(countCustomersFromTransactions(txData));
    }

    fetchDerivedTotals();
  }, [branchId, reportDate]);

  function setQty(denom: number, val: number) {
    const key = `qty_${denom}` as keyof CashQuantities;
    setQuantities((q) => ({ ...q, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      branch_id: lockedBranchId ?? branchId,
      report_date: reportDate,
      staff_names: staffNames,
      ...quantities,
      total_cash: totalCash,
      unpaid,
      unpaid_previous: unpaidPrevious,
      total_sales: totalSales,
      notes: notes || null,
    };

    if (existing) {
      const { error: updateError } = await supabase
        .from("daily_reports")
        .update(payload)
        .eq("id", existing.id);
      if (updateError) {
        setSaving(false);
        setError(updateError.message);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("daily_reports").insert(payload);
      if (insertError) {
        setSaving(false);
        setError(insertError.message);
        return;
      }
    }

    setSaving(false);
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 min-w-0">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select
          label="Branch"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          options={branches.map((b) => ({ value: b.id, label: b.name }))}
          disabled={Boolean(lockedBranchId)}
          required
        />
        <Input
          label="Date"
          type="date"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
          required
        />
        <Input
          label="Staff Name(s)"
          value={staffNames}
          onChange={(e) => setStaffNames(e.target.value)}
          placeholder="Mel and Jane"
          required
        />
      </div>

      {/* Cash on hand — physical count in the register */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-brand-text">Cash on Hand</h3>
          <p className="text-xs text-brand-text/50">
            Count all physical cash in the register by denomination.
          </p>
        </div>
        <div className="rounded-xl border border-brand-blue/10 overflow-hidden">
          <div className="w-full">
            <div className="bg-brand-light/40 px-4 py-2 grid grid-cols-3 gap-x-3 text-sm font-semibold text-brand-text">
              <span>Php</span>
              <span className="text-center">Qty.</span>
              <span className="text-right">Value</span>
            </div>
            {DENOMINATIONS.map((d) => {
              const key = `qty_${d}` as keyof CashQuantities;
              const qty = quantities[key];
              return (
                <div
                  key={d}
                  className="px-4 py-2 grid grid-cols-3 gap-x-3 items-center border-t border-brand-blue/5 text-sm"
                >
                  <span className="font-medium tabular-nums">{d}</span>
                  <input
                    type="number"
                    min={0}
                    value={qty || ""}
                    onChange={(e) => setQty(d, parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-brand-blue/20 px-2 sm:px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
                  />
                  <span className="text-brand-text/70 text-right whitespace-nowrap tabular-nums">
                    {formatCurrency(d * qty)}
                  </span>
                </div>
              );
            })}
            <div className="px-4 py-3 grid grid-cols-3 gap-x-3 items-center border-t-2 border-brand-blue/20 bg-brand-light/20 font-bold text-brand-text">
              <span className="col-span-2">Total Cash on Hand</span>
              <span className="text-right whitespace-nowrap tabular-nums">
                {formatCurrency(totalCash)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {isAdminLike(role) ? (
        <div className="rounded-xl bg-brand-light/10 border border-brand-blue/10 overflow-x-auto">
          <div className="min-w-[760px] grid grid-cols-5 gap-4 p-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-brand-text">Total Customers</span>
              <span className="text-lg font-semibold text-brand-text">{customerCount}</span>
              <span className="text-xs text-brand-text/50">From transactions that day</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-brand-text">Unpaid Previous</span>
              <span className="text-lg font-semibold text-brand-text">
                {formatCurrency(unpaidPrevious)}
              </span>
              <span className="text-xs text-brand-text/50">
                {priorReportDate ? `From report on ${priorReportDate}` : "No prior report"}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-brand-text">Unpaid</span>
              <span className="text-lg font-semibold text-amber-600">{formatCurrency(unpaid)}</span>
              <span className="text-xs text-brand-text/50">From unchecked payments</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-brand-text">Cash from Payments</span>
              <span className="text-lg font-semibold text-brand-blue">{formatCurrency(cashReceived)}</span>
              <span className="text-xs text-brand-text/50">
                {totalCash > 0 && cashReceived !== totalCash
                  ? `Cash on hand: ${formatCurrency(totalCash)}`
                  : "Checked as received"}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-brand-text">Total Billings</span>
              <span className="text-lg font-semibold text-emerald-600">
                {formatCurrency(totalSales)}
              </span>
              <span className="text-xs text-brand-text/50">Sum of all customer payments</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-brand-light/10 border border-brand-blue/10 px-4 py-3">
          <span className="text-sm font-medium text-brand-text">Total Customers</span>
          <p className="text-lg font-semibold text-brand-text">{customerCount}</p>
          <p className="text-xs text-brand-text/50">From transactions that day</p>
        </div>
      )}

      <Input
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional notes"
      />

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : existing ? "Update Report" : "Save Report"}
      </Button>
    </form>
  );
}

export function ReportsPageClient({
  branches,
  initialReports,
  role,
  lockedBranchId,
}: {
  branches: Branch[];
  initialReports: DailyReport[];
  role: AppRole;
  lockedBranchId?: string | null;
}) {
  const [reports, setReports] = useState(initialReports);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DailyReport | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [customerCounts, setCustomerCounts] = useState<Record<string, number>>({});
  const [branchFilter, setBranchFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const canDelete = canDeleteEntries(role);
  const canFilter = isAdminLike(role);

  async function loadCustomerCounts(reportRows: DailyReport[], branchScope?: string | null) {
    if (reportRows.length === 0) {
      setCustomerCounts({});
      return;
    }
    const supabase = createClient();
    const dates = Array.from(new Set(reportRows.map((r) => r.report_date)));
    let txQuery = supabase
      .from("transactions")
      .select("branch_id, transaction_date, customer_name")
      .in("transaction_date", dates);
    if (branchScope) txQuery = txQuery.eq("branch_id", branchScope);

    const { data: txs } = await txQuery;
    const grouped = new Map<string, { customer_name?: string | null }[]>();
    for (const tx of txs ?? []) {
      const key = `${tx.branch_id}|${tx.transaction_date}`;
      const list = grouped.get(key) ?? [];
      list.push(tx);
      grouped.set(key, list);
    }
    const next: Record<string, number> = {};
    for (const report of reportRows) {
      const key = `${report.branch_id}|${report.report_date}`;
      next[key] = countCustomersFromTransactions(grouped.get(key) ?? []);
    }
    setCustomerCounts(next);
  }

  async function loadReports(
    nextBranch = branchFilter,
    nextDate = dateFilter,
    closeFormView = true
  ) {
    setLoadingList(true);
    const supabase = createClient();
    let query = supabase
      .from("daily_reports")
      .select("*, branches(name)")
      .order("report_date", { ascending: false });

    const branchScope = lockedBranchId ?? (canFilter && nextBranch !== "all" ? nextBranch : null);
    if (branchScope) query = query.eq("branch_id", branchScope);
    if (canFilter && nextDate) query = query.eq("report_date", nextDate);
    else query = query.limit(50);

    const { data: reportsData } = await query;

    if (reportsData) {
      const rows = reportsData as DailyReport[];
      setReports(rows);
      await loadCustomerCounts(rows, branchScope);
    }
    if (closeFormView) {
      setShowForm(false);
      setEditing(null);
    }
    setLoadingList(false);
  }

  async function refresh() {
    await loadReports(branchFilter, dateFilter, true);
  }

  useEffect(() => {
    const branchScope = lockedBranchId ?? null;
    loadCustomerCounts(initialReports, branchScope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(report: DailyReport) {
    if (!canDelete) return;
    const label = `${report.report_date} — ${(report.branches as { name: string } | undefined)?.name ?? "branch"}`;
    if (!window.confirm(`Delete daily report for ${label}? This cannot be undone.`)) return;

    setDeletingId(report.id);
    const supabase = createClient();
    const { error } = await supabase.from("daily_reports").delete().eq("id", report.id);
    setDeletingId(null);
    if (error) {
      window.alert(error.message);
      return;
    }
    if (editing?.id === report.id) setEditing(null);
    await refresh();
  }

  const formOpen = showForm || Boolean(editing);

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Daily Reports</h1>
          <p className="text-brand-text/60">Cash reconciliation by branch</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
          {canFilter && !formOpen && (
            <>
              <div className="w-full sm:w-52">
                <Select
                  label="Branch"
                  value={branchFilter}
                  onChange={(e) => {
                    const value = e.target.value;
                    setBranchFilter(value);
                    void loadReports(value, dateFilter, false);
                  }}
                  options={[
                    { value: "all", label: "All Branches" },
                    ...branches.map((b) => ({ value: b.id, label: b.name })),
                  ]}
                />
              </div>
              <div className="w-full sm:w-44">
                <Input
                  label="Date"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDateFilter(value);
                    void loadReports(branchFilter, value, false);
                  }}
                />
              </div>
            </>
          )}
          {formOpen ? (
            <Button type="button" variant="secondary" onClick={closeForm}>
              <X className="w-4 h-4" />
              Close
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              <Plus className="w-4 h-4" />
              New Report
            </Button>
          )}
        </div>
      </div>

      {formOpen ? (
        <div className="rounded-xl border border-brand-blue/10 bg-white p-4 sm:p-6 shadow-sm min-w-0">
          <h2 className="text-lg font-semibold mb-4">
            {editing ? "Edit Report" : "New Daily Report"}
          </h2>
          <ReportForm
            branches={branches}
            existing={editing}
            role={role}
            lockedBranchId={lockedBranchId}
            onSaved={refresh}
          />
        </div>
      ) : (
      <div className="rounded-xl border border-brand-blue/10 bg-white overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-brand-light/30">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Date</th>
              <th className="text-left px-4 py-3 font-semibold">Branch</th>
              <th className="text-left px-4 py-3 font-semibold">Staff</th>
              <th className="text-right px-4 py-3 font-semibold">Customers</th>
              <th className="text-right px-4 py-3 font-semibold">Total Cash</th>
              <th className="text-right px-4 py-3 font-semibold">Unpaid</th>
              <th className="text-right px-4 py-3 font-semibold">Sales</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-brand-text/50">
                  {loadingList
                    ? "Loading reports…"
                    : dateFilter || branchFilter !== "all"
                      ? "No reports match these filters."
                      : "No reports yet. Create your first daily report."}
                </td>
              </tr>
            ) : (
              reports.map((r) => (
                <tr key={r.id} className="border-t border-brand-blue/5 hover:bg-gray-50">
                  <td className="px-4 py-3">{r.report_date}</td>
                  <td className="px-4 py-3">
                    {(r.branches as { name: string } | undefined)?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">{r.staff_names}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {customerCounts[`${r.branch_id}|${r.report_date}`] ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(r.total_cash)}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-600">
                    {formatCurrency(r.unpaid)}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-600">
                    {formatCurrency(r.total_sales)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditing(r);
                          setShowForm(false);
                        }}
                        className="text-brand-blue hover:text-brand-blue/70"
                        aria-label="Edit report"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(r)}
                          disabled={deletingId === r.id}
                          className="text-red-600 hover:text-red-500 disabled:opacity-50"
                          aria-label="Delete report"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
