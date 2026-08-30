"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatWeightKg, serviceTypeLabel, todayISO } from "@/lib/utils";
import { useLoadMore } from "@/lib/use-load-more";
import type { Branch, Transaction } from "@/lib/types";
import { SERVICE_TYPES } from "@/lib/constants";
import { canDeleteEntries, isAdminLike, type AppRole } from "@/lib/auth/roles";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadMoreFooter } from "@/components/ui/LoadMoreFooter";
import { Plus, Pencil, Trash2 } from "lucide-react";

function emptyForm(branchId: string) {
  return {
    branch_id: branchId,
    customer_name: "",
    description: "",
    amount: 0,
    payment_status: "paid" as Transaction["payment_status"],
    payment_method: "cash" as Transaction["payment_method"],
    service_type: "regular" as Transaction["service_type"],
    weight_kg_whole: 5,
    weight_kg_frac: 0,
    transaction_date: todayISO(),
  };
}

export function TransactionsClient({
  branches,
  initialTransactions,
  lockedBranchId,
  role,
}: {
  branches: Branch[];
  initialTransactions: Transaction[];
  lockedBranchId?: string | null;
  role: AppRole;
}) {
  const supabase = createClient();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState("all");
  const [loadingList, setLoadingList] = useState(false);
  const canDelete = canDeleteEntries(role);
  const canFilter = isAdminLike(role);

  const [form, setForm] = useState(emptyForm(lockedBranchId ?? branches[0]?.id ?? ""));

  async function loadTransactions(nextBranch = branchFilter, closeFormView = true) {
    setLoadingList(true);
    let query = supabase
      .from("transactions")
      .select("*, branches(name)")
      .order("transaction_date", { ascending: false })
      .limit(100);

    const branchScope = lockedBranchId ?? (canFilter && nextBranch !== "all" ? nextBranch : null);
    if (branchScope) query = query.eq("branch_id", branchScope);

    const { data } = await query;
    if (data) setTransactions(data as Transaction[]);
    if (closeFormView) {
      setShowForm(false);
      setEditing(null);
    }
    setLoadingList(false);
  }

  function openNew() {
    setEditing(null);
    setForm(emptyForm(lockedBranchId ?? branches[0]?.id ?? ""));
    setShowForm(true);
  }

  function openEdit(t: Transaction) {
    setEditing(t);
    setForm({
      branch_id: t.branch_id,
      customer_name: t.customer_name ?? "",
      description: t.description,
      amount: t.amount,
      payment_status: t.payment_status,
      payment_method: t.payment_method,
      service_type: t.service_type ?? "regular",
      weight_kg_whole: t.weight_kg_whole ?? 0,
      weight_kg_frac: t.weight_kg_frac ?? 0,
      transaction_date: t.transaction_date,
    });
    setShowForm(true);
  }

  async function refresh() {
    await loadTransactions(branchFilter, true);
  }

  async function handleDelete(t: Transaction) {
    if (!canDelete) return;
    if (
      !window.confirm(
        `Delete transaction for ${t.customer_name || "customer"} on ${t.transaction_date}? This cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingId(t.id);
    const { error: deleteError } = await supabase.from("transactions").delete().eq("id", t.id);
    setDeletingId(null);
    if (deleteError) {
      window.alert(deleteError.message);
      return;
    }
    if (editing?.id === t.id) setEditing(null);
    await refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      branch_id: lockedBranchId ?? form.branch_id,
      customer_name: form.customer_name || null,
      weight_kg_whole: Math.max(0, form.weight_kg_whole),
      weight_kg_frac: Math.min(9, Math.max(0, form.weight_kg_frac)),
    };

    const { error: saveError } = editing
      ? await supabase.from("transactions").update(payload).eq("id", editing.id)
      : await supabase.from("transactions").insert(payload);

    setSaving(false);
    if (saveError) {
      setError(saveError.message);
    } else {
      refresh();
    }
  }

  const statusColors = {
    paid: "text-emerald-600 bg-emerald-50",
    unpaid: "text-amber-600 bg-amber-50",
    partial: "text-blue-600 bg-blue-50",
  };

  const dailySummary = useMemo(
    () =>
      Object.values(
        transactions.reduce<
          Record<
            string,
            { date: string; total: number; unpaid: number; count: number; branchNames: Set<string> }
          >
        >((acc, tx) => {
          const key = tx.transaction_date;
          if (!acc[key]) {
            acc[key] = {
              date: key,
              total: 0,
              unpaid: 0,
              count: 0,
              branchNames: new Set<string>(),
            };
          }
          acc[key].total += tx.amount;
          if (tx.payment_status === "unpaid") acc[key].unpaid += tx.amount;
          acc[key].count += 1;
          const branchName = (tx.branches as { name: string } | undefined)?.name;
          if (branchName) acc[key].branchNames.add(branchName);
          return acc;
        }, {})
      ).sort((a, b) => b.date.localeCompare(a.date)),
    [transactions]
  );

  const {
    visible: visibleDailySummary,
    hasMore: hasMoreDailySummary,
    loadMore: loadMoreDailySummary,
    remaining: remainingDailySummary,
  } = useLoadMore(dailySummary);
  const {
    visible: visibleTransactions,
    hasMore: hasMoreTransactions,
    loadMore: loadMoreTransactions,
    remaining: remainingTransactions,
  } = useLoadMore(transactions);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Transactions</h1>
          <p className="text-brand-text/60">Manage payments and orders</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          {canFilter && !showForm && (
            <div className="w-full sm:w-52">
              <Select
                label=""
                value={branchFilter}
                onChange={(e) => {
                  const value = e.target.value;
                  setBranchFilter(value);
                  void loadTransactions(value, false);
                }}
                options={[
                  { value: "all", label: "All Branches" },
                  ...branches.map((b) => ({ value: b.id, label: b.name })),
                ]}
              />
            </div>
          )}
          {!showForm && (
            <Button onClick={openNew} className="h-10 shrink-0">
              <Plus className="w-4 h-4" />
              Add Transaction
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="mb-8 rounded-xl border border-brand-blue/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            {editing ? "Edit Transaction" : "New Transaction"}
          </h2>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Branch"
              value={form.branch_id}
              onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
              disabled={Boolean(lockedBranchId)}
            />
            <Input
              label="Date"
              type="date"
              value={form.transaction_date}
              onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
            />
            <Input
              label="Customer Name"
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
            />
            <Input
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
            <Input
              label="Amount (₱)"
              type="number"
              min={0}
              value={form.amount || ""}
              onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })}
              required
            />
            <Select
              label="Payment Status"
              value={form.payment_status}
              onChange={(e) =>
                setForm({
                  ...form,
                  payment_status: e.target.value as Transaction["payment_status"],
                })
              }
              options={[
                { value: "paid", label: "Paid" },
                { value: "unpaid", label: "Unpaid" },
                { value: "partial", label: "Partial" },
              ]}
            />
            <Select
              label="Type of Service"
              value={form.service_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  service_type: e.target.value as Transaction["service_type"],
                })
              }
              options={SERVICE_TYPES.map((s) => ({ value: s.value, label: s.label }))}
            />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-brand-text">Weight (kg)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.weight_kg_whole || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      weight_kg_whole: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  className="h-10 flex-1 min-w-0 rounded-lg border border-brand-blue/20 bg-white px-4 text-sm text-center text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
                  aria-label="Kilograms whole"
                />
                <span className="text-brand-text/60 font-medium shrink-0">.</span>
                <input
                  type="number"
                  min={0}
                  max={9}
                  placeholder="0"
                  value={form.weight_kg_frac || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      weight_kg_frac: Math.min(9, Math.max(0, parseInt(e.target.value, 10) || 0)),
                    })
                  }
                  className="h-10 flex-1 min-w-0 rounded-lg border border-brand-blue/20 bg-white px-4 text-sm text-center text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
                  aria-label="Kilograms decimal"
                />
              </div>
            </div>
            <Select
              label="Payment Method"
              value={form.payment_method}
              onChange={(e) =>
                setForm({
                  ...form,
                  payment_method: e.target.value as Transaction["payment_method"],
                })
              }
              options={[
                { value: "cash", label: "Cash" },
                { value: "gcash", label: "GCash" },
                { value: "bank", label: "Bank Transfer" },
              ]}
            />
            <div className="sm:col-span-2 flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Update" : "Save"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-8 rounded-xl border border-brand-blue/10 bg-white overflow-x-auto">
        <div className="px-4 py-3 bg-brand-light/30 border-b border-brand-blue/10 min-w-[640px]">
          <h2 className="text-sm font-semibold text-brand-text">Daily Summary</h2>
        </div>
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-brand-light/10">
            <tr>
              <th className="text-left px-4 py-2 font-semibold">Date</th>
              <th className="text-left px-4 py-2 font-semibold">Branches</th>
              <th className="text-right px-4 py-2 font-semibold">Transactions</th>
              <th className="text-right px-4 py-2 font-semibold">Total</th>
              <th className="text-right px-4 py-2 font-semibold">Unpaid</th>
            </tr>
          </thead>
          <tbody>
            {dailySummary.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-brand-text/50">
                  {loadingList
                    ? "Loading…"
                    : branchFilter !== "all"
                      ? "No transactions for this branch."
                      : "No daily summary yet."}
                </td>
              </tr>
            ) : (
              visibleDailySummary.map((d) => (
                <tr key={d.date} className="border-t border-brand-blue/5">
                  <td className="px-4 py-2">{d.date}</td>
                  <td className="px-4 py-2 text-brand-text/70">
                    {Array.from(d.branchNames).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-2 text-right">{d.count}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurrency(d.total)}</td>
                  <td className="px-4 py-2 text-right text-amber-600">{formatCurrency(d.unpaid)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <LoadMoreFooter
          hasMore={hasMoreDailySummary}
          remaining={remainingDailySummary}
          onLoadMore={loadMoreDailySummary}
        />
      </div>

      <div className="rounded-xl border border-brand-blue/10 bg-white overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-brand-light/30">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Date</th>
              <th className="text-left px-4 py-3 font-semibold">Branch</th>
              <th className="text-left px-4 py-3 font-semibold">Customer</th>
              <th className="text-left px-4 py-3 font-semibold">Service</th>
              <th className="text-right px-4 py-3 font-semibold">Weight</th>
              <th className="text-left px-4 py-3 font-semibold">Description</th>
              <th className="text-right px-4 py-3 font-semibold">Amount</th>
              <th className="text-center px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-brand-text/50">
                  {loadingList
                    ? "Loading transactions…"
                    : branchFilter !== "all"
                      ? "No transactions for this branch."
                      : "No transactions yet."}
                </td>
              </tr>
            ) : (
              visibleTransactions.map((t) => (
                <tr key={t.id} className="border-t border-brand-blue/5 hover:bg-gray-50">
                  <td className="px-4 py-3">{t.transaction_date}</td>
                  <td className="px-4 py-3">
                    {(t.branches as { name: string } | undefined)?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">{t.customer_name ?? "—"}</td>
                  <td className="px-4 py-3">{serviceTypeLabel(t.service_type ?? "regular")}</td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                    {formatWeightKg(t.weight_kg_whole ?? 0, t.weight_kg_frac ?? 0)}
                  </td>
                  <td className="px-4 py-3">{t.description}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(t.amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[t.payment_status]}`}
                    >
                      {t.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(t)}
                        className="text-brand-blue hover:text-brand-blue/70"
                        aria-label="Edit transaction"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(t)}
                          disabled={deletingId === t.id}
                          className="text-red-600 hover:text-red-500 disabled:opacity-50"
                          aria-label="Delete transaction"
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
        <LoadMoreFooter
          hasMore={hasMoreTransactions}
          remaining={remainingTransactions}
          onLoadMore={loadMoreTransactions}
        />
      </div>
    </div>
  );
}
