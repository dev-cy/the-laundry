"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Branch, Expense } from "@/lib/types";
import { canDeleteEntries, type AppRole } from "@/lib/auth/roles";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useLoadMore } from "@/lib/use-load-more";
import { LoadMoreFooter } from "@/components/ui/LoadMoreFooter";
import { formatCurrency, todayISO } from "@/lib/utils";

export function ExpensesClient({
  branches,
  initialExpenses,
  role,
}: {
  branches: Branch[];
  initialExpenses: Expense[];
  role: AppRole;
}) {
  const supabase = createClient();
  const [expenses, setExpenses] = useState(initialExpenses);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canDelete = canDeleteEntries(role);
  const {
    visible: visibleExpenses,
    hasMore: hasMoreExpenses,
    loadMore: loadMoreExpenses,
    remaining: remainingExpenses,
  } = useLoadMore(expenses);

  const [form, setForm] = useState({
    branch_id: branches[0]?.id ?? "",
    amount: 0,
    expense_date: todayISO(),
    description: "",
    notes: "",
  });

  function openNew() {
    setEditing(null);
    setForm({
      branch_id: branches[0]?.id ?? "",
      amount: 0,
      expense_date: todayISO(),
      description: "",
      notes: "",
    });
    setShowForm(true);
  }

  function openEdit(expense: Expense) {
    setEditing(expense);
    setForm({
      branch_id: expense.branch_id,
      amount: expense.amount,
      expense_date: expense.expense_date,
      description: expense.description ?? "",
      notes: expense.notes ?? "",
    });
    setShowForm(true);
  }

  async function refresh() {
    const { data } = await supabase
      .from("expenses")
      .select("*, branches(name)")
      .order("expense_date", { ascending: false })
      .limit(100);
    if (data) setExpenses(data as Expense[]);
    setShowForm(false);
    setEditing(null);
  }

  async function handleDelete(expense: Expense) {
    if (!canDelete) return;
    if (
      !window.confirm(
        `Delete expense${expense.description ? ` "${expense.description}"` : ""} (${formatCurrency(expense.amount)}) on ${expense.expense_date}? This cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingId(expense.id);
    const { error: deleteError } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expense.id);
    setDeletingId(null);
    if (deleteError) {
      window.alert(deleteError.message);
      return;
    }
    if (editing?.id === expense.id) setEditing(null);
    await refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      description: form.description.trim() || null,
      notes: form.notes.trim() || null,
    };

    const { error: saveError } = editing
      ? await supabase.from("expenses").update(payload).eq("id", editing.id)
      : await supabase.from("expenses").insert(payload);

    setSaving(false);
    if (saveError) setError(saveError.message);
    else refresh();
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Expenses</h1>
          <p className="text-brand-text/60">
            Record operating expenses by branch — reflected on Finance
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4" />
          New Expense
        </Button>
      </div>

      <div className="mb-8 rounded-xl border border-brand-blue/10 bg-white p-5 shadow-sm">
        <p className="text-sm text-brand-text/60 mb-1">Total Recorded (recent list)</p>
        <p className="text-2xl font-bold text-brand-text">{formatCurrency(totalExpenses)}</p>
      </div>

      {showForm && (
        <div className="mb-8 rounded-xl border border-brand-blue/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            {editing ? "Edit Expense" : "New Expense"}
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
              options={branches.map((branch) => ({ value: branch.id, label: branch.name }))}
              required
            />
            <Input
              label="Amount"
              type="number"
              min={1}
              value={form.amount || ""}
              onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })}
              required
            />
            <Input
              label="Date"
              type="date"
              value={form.expense_date}
              onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
              required
            />
            <Input
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional — e.g. Detergent, utilities, repairs"
            />
            <Input
              label="Notes"
              className="sm:col-span-2"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional additional details"
            />
            <div className="sm:col-span-2 flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editing ? "Update" : "Save"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-brand-blue/10 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-light/30">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Date</th>
              <th className="text-left px-4 py-3 font-semibold">Branch</th>
              <th className="text-left px-4 py-3 font-semibold">Description</th>
              <th className="text-right px-4 py-3 font-semibold">Amount</th>
              <th className="text-left px-4 py-3 font-semibold">Notes</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-brand-text/50">
                  No expenses recorded yet.
                </td>
              </tr>
            ) : (
              visibleExpenses.map((expense) => (
                <tr key={expense.id} className="border-t border-brand-blue/5 hover:bg-gray-50">
                  <td className="px-4 py-3">{expense.expense_date}</td>
                  <td className="px-4 py-3">
                    {(expense.branches as { name: string } | undefined)?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3">{expense.description ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-4 py-3">{expense.notes ?? "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(expense)}
                        className="text-brand-blue hover:text-brand-blue/70"
                        aria-label="Edit expense"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(expense)}
                          disabled={deletingId === expense.id}
                          className="text-red-600 hover:text-red-500 disabled:opacity-50"
                          aria-label="Delete expense"
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
          hasMore={hasMoreExpenses}
          remaining={remainingExpenses}
          onLoadMore={loadMoreExpenses}
        />
      </div>
    </div>
  );
}
