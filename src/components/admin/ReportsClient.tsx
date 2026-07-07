"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DENOMINATIONS } from "@/lib/constants";
import { calcReportTotals, calcTotalCash, formatCurrency, todayISO } from "@/lib/utils";
import type { Branch, DailyReport, CashQuantities, ReportEntry } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Pencil, Plus, Trash2 } from "lucide-react";

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

const emptyEntry = (): ReportEntry => ({
  customer_name: "",
  total_payment: 0,
  payment_received: false,
});

function isValidEntry(entry: ReportEntry) {
  return entry.customer_name.trim().length > 0 || entry.total_payment > 0;
}

export function ReportForm({
  branches,
  existing,
  initialEntries,
  onSaved,
}: {
  branches: Branch[];
  existing?: DailyReport | null;
  initialEntries?: ReportEntry[];
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [branchId, setBranchId] = useState(existing?.branch_id ?? branches[0]?.id ?? "");
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
  const [entries, setEntries] = useState<ReportEntry[]>(
    initialEntries && initialEntries.length > 0 ? initialEntries : [emptyEntry()]
  );
  const [unpaidPrevious, setUnpaidPrevious] = useState(0);
  const [priorReportDate, setPriorReportDate] = useState<string | null>(null);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCash = calcTotalCash(quantities);
  const validEntries = entries.filter(isValidEntry);
  const { totalSales, unpaid, cashReceived } = calcReportTotals(validEntries);

  useEffect(() => {
    if (!branchId || !reportDate) return;

    async function fetchUnpaidPrevious() {
      const { data } = await supabase
        .from("daily_reports")
        .select("unpaid, unpaid_previous, report_date")
        .eq("branch_id", branchId)
        .lt("report_date", reportDate)
        .order("report_date", { ascending: false })
        .limit(1);

      const prior = data?.[0];
      if (prior) {
        setUnpaidPrevious(prior.unpaid_previous + prior.unpaid);
        setPriorReportDate(prior.report_date);
      } else {
        setUnpaidPrevious(0);
        setPriorReportDate(null);
      }
    }

    fetchUnpaidPrevious();
  }, [branchId, reportDate]);

  function setQty(denom: number, val: number) {
    const key = `qty_${denom}` as keyof CashQuantities;
    setQuantities((q) => ({ ...q, [key]: val }));
  }

  function updateEntry(index: number, patch: Partial<ReportEntry>) {
    setEntries((prev) => prev.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }

  function addEntry() {
    setEntries((prev) => [...prev, emptyEntry()]);
  }

  function removeEntry(index: number) {
    setEntries((prev) => (prev.length === 1 ? [emptyEntry()] : prev.filter((_, i) => i !== index)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      branch_id: branchId,
      report_date: reportDate,
      staff_names: staffNames,
      ...quantities,
      total_cash: totalCash,
      unpaid,
      unpaid_previous: unpaidPrevious,
      total_sales: totalSales,
      notes: notes || null,
    };

    let reportId = existing?.id;

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
      const { error: deleteError } = await supabase
        .from("report_entries")
        .delete()
        .eq("report_id", existing.id);
      if (deleteError) {
        setSaving(false);
        setError(deleteError.message);
        return;
      }
    } else {
      const { data, error: insertError } = await supabase
        .from("daily_reports")
        .insert(payload)
        .select("id")
        .single();
      if (insertError) {
        setSaving(false);
        setError(insertError.message);
        return;
      }
      reportId = data.id;
    }

    if (validEntries.length > 0 && reportId) {
      const { error: entriesError } = await supabase.from("report_entries").insert(
        validEntries.map((entry) => ({
          report_id: reportId,
          customer_name: entry.customer_name.trim() || null,
          total_payment: entry.total_payment,
          payment_received: entry.payment_received,
        }))
      );
      if (entriesError) {
        setSaving(false);
        setError(entriesError.message);
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

      {/* Customer payments */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-brand-text">Customer Payments</h3>
            <p className="text-xs text-brand-text/50">
              Add each customer&apos;s bill. Uncheck &quot;Payment received&quot; for unpaid orders.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={addEntry}>
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        </div>

        <div className="rounded-xl border border-brand-blue/10 overflow-x-auto">
          <div className="min-w-[520px] w-full">
            <div className="grid grid-cols-[minmax(160px,1fr)_140px_180px_40px] gap-3 px-4 py-2 bg-brand-light/30 text-xs font-semibold text-brand-text/70">
              <span>Customer</span>
              <span>Total Payment</span>
              <span>Payment Received</span>
              <span />
            </div>
            {entries.map((entry, index) => (
              <div
                key={index}
                className="grid grid-cols-[minmax(160px,1fr)_140px_180px_40px] gap-3 items-center px-4 py-3 border-t border-brand-blue/5"
              >
                <input
                  type="text"
                  value={entry.customer_name}
                  onChange={(e) => updateEntry(index, { customer_name: e.target.value })}
                  placeholder="Customer name"
                  className="w-full rounded-lg border border-brand-blue/20 bg-white px-3 py-2 text-sm text-brand-text placeholder:text-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
                />
                <input
                  type="number"
                  min={0}
                  value={entry.total_payment || ""}
                  onChange={(e) =>
                    updateEntry(index, { total_payment: parseInt(e.target.value) || 0 })
                  }
                  placeholder="0"
                  className="w-full rounded-lg border border-brand-blue/20 bg-white px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
                />
                <label className="flex items-center gap-2 cursor-pointer select-none whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={entry.payment_received}
                    onChange={(e) => updateEntry(index, { payment_received: e.target.checked })}
                    className="h-4 w-4 shrink-0 rounded border-brand-blue/30 text-brand-blue focus:ring-brand-blue/40"
                  />
                  <span className="text-sm text-brand-text">Received</span>
                </label>
                <button
                  type="button"
                  onClick={() => removeEntry(index)}
                  className="flex items-center justify-center text-brand-text/30 hover:text-red-500 transition-colors"
                  aria-label="Remove customer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cash on hand — physical count in the register */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-brand-text">Cash on Hand</h3>
          <p className="text-xs text-brand-text/50">
            Count all physical cash in the register by denomination.
          </p>
        </div>
        <div className="rounded-xl border border-brand-blue/10 overflow-x-auto">
          <div className="min-w-[288px] w-full">
            <div className="bg-brand-light/40 px-4 py-2 grid grid-cols-[minmax(3.5rem,12%)_1fr_minmax(6rem,30%)] gap-x-3 text-sm font-semibold text-brand-text">
              <span>Php</span>
              <span>Qty.</span>
              <span className="text-right">Value</span>
            </div>
            {DENOMINATIONS.map((d) => {
              const key = `qty_${d}` as keyof CashQuantities;
              const qty = quantities[key];
              return (
                <div
                  key={d}
                  className="px-4 py-2 grid grid-cols-[minmax(3.5rem,12%)_1fr_minmax(6rem,30%)] gap-x-3 items-center border-t border-brand-blue/5 text-sm"
                >
                  <span className="font-medium tabular-nums">{d}</span>
                  <input
                    type="number"
                    min={0}
                    value={qty || ""}
                    onChange={(e) => setQty(d, parseInt(e.target.value) || 0)}
                    className="w-full min-w-[200px] rounded-lg border border-brand-blue/20 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
                  />
                  <span className="text-brand-text/70 text-right whitespace-nowrap tabular-nums">
                    {formatCurrency(d * qty)}
                  </span>
                </div>
              );
            })}
            <div className="px-4 py-3 grid grid-cols-[minmax(3.5rem,12%)_1fr_minmax(6rem,30%)] gap-x-3 items-center border-t-2 border-brand-blue/20 bg-brand-light/20 font-bold text-brand-text">
              <span className="col-span-2">Total Cash on Hand</span>
              <span className="text-right whitespace-nowrap tabular-nums">
                {formatCurrency(totalCash)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Computed summary */}
      <div className="rounded-xl bg-brand-light/10 border border-brand-blue/10 overflow-x-auto">
        <div className="min-w-[640px] grid grid-cols-4 gap-4 p-4">
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
  initialEntriesByReport,
}: {
  branches: Branch[];
  initialReports: DailyReport[];
  initialEntriesByReport: Record<string, ReportEntry[]>;
}) {
  const [reports, setReports] = useState(initialReports);
  const [entriesByReport, setEntriesByReport] = useState(initialEntriesByReport);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DailyReport | null>(null);

  async function refresh() {
    const supabase = createClient();
    const [{ data: reportsData }, { data: entriesData }] = await Promise.all([
      supabase
        .from("daily_reports")
        .select("*, branches(name)")
        .order("report_date", { ascending: false })
        .limit(50),
      supabase.from("report_entries").select("*").order("created_at"),
    ]);

    if (reportsData) setReports(reportsData as DailyReport[]);
    if (entriesData) {
      const grouped: Record<string, ReportEntry[]> = {};
      for (const entry of entriesData as ReportEntry[]) {
        if (!entry.report_id) continue;
        if (!grouped[entry.report_id]) grouped[entry.report_id] = [];
        grouped[entry.report_id].push(entry);
      }
      setEntriesByReport(grouped);
    }
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Daily Reports</h1>
          <p className="text-brand-text/60">Cash reconciliation by branch</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setShowForm(!showForm);
          }}
        >
          <Plus className="w-4 h-4" />
          New Report
        </Button>
      </div>

      {(showForm || editing) && (
        <div className="mb-8 rounded-xl border border-brand-blue/10 bg-white p-4 sm:p-6 shadow-sm min-w-0">
          <h2 className="text-lg font-semibold mb-4">
            {editing ? "Edit Report" : "New Daily Report"}
          </h2>
          <ReportForm
            branches={branches}
            existing={editing}
            initialEntries={editing ? entriesByReport[editing.id] : undefined}
            onSaved={refresh}
          />
        </div>
      )}

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
                  No reports yet. Create your first daily report.
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
                  <td className="px-4 py-3 text-right text-brand-text/60">
                    {entriesByReport[r.id]?.length ?? 0}
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
                    <button
                      onClick={() => {
                        setEditing(r);
                        setShowForm(false);
                      }}
                      className="text-brand-blue hover:text-brand-blue/70"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
