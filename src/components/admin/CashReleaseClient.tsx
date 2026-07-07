"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Branch, CashRelease } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Plus, Pencil } from "lucide-react";
import { formatCurrency, todayISO } from "@/lib/utils";

export function CashReleaseClient({
  branches,
  initialReleases,
}: {
  branches: Branch[];
  initialReleases: CashRelease[];
}) {
  const supabase = createClient();
  const [releases, setReleases] = useState(initialReleases);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CashRelease | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    branch_id: branches[0]?.id ?? "",
    amount: 0,
    release_date: todayISO(),
    notes: "",
  });

  function openNew() {
    setEditing(null);
    setForm({
      branch_id: branches[0]?.id ?? "",
      amount: 0,
      release_date: todayISO(),
      notes: "",
    });
    setShowForm(true);
  }

  function openEdit(release: CashRelease) {
    setEditing(release);
    setForm({
      branch_id: release.branch_id,
      amount: release.amount,
      release_date: release.release_date,
      notes: release.notes ?? "",
    });
    setShowForm(true);
  }

  async function refresh() {
    const { data } = await supabase
      .from("cash_releases")
      .select("*, branches(name)")
      .order("release_date", { ascending: false })
      .limit(100);
    if (data) setReleases(data as CashRelease[]);
    setShowForm(false);
    setEditing(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      notes: form.notes || null,
    };

    const { error: saveError } = editing
      ? await supabase.from("cash_releases").update(payload).eq("id", editing.id)
      : await supabase.from("cash_releases").insert(payload);

    setSaving(false);
    if (saveError) setError(saveError.message);
    else refresh();
  }

  const totalReleased = releases.reduce((sum, release) => sum + release.amount, 0);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Release Cash</h1>
          <p className="text-brand-text/60">Record released cash on hand by branch</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4" />
          New Release
        </Button>
      </div>

      <div className="mb-8 rounded-xl border border-brand-blue/10 bg-white p-5 shadow-sm">
        <p className="text-sm text-brand-text/60 mb-1">Total Released</p>
        <p className="text-2xl font-bold text-brand-text">{formatCurrency(totalReleased)}</p>
      </div>

      {showForm && (
        <div className="mb-8 rounded-xl border border-brand-blue/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            {editing ? "Edit Cash Release" : "New Cash Release"}
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
              value={form.release_date}
              onChange={(e) => setForm({ ...form, release_date: e.target.value })}
              required
            />
            <Input
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional note for the release"
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
              <th className="text-right px-4 py-3 font-semibold">Amount</th>
              <th className="text-left px-4 py-3 font-semibold">Notes</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {releases.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-brand-text/50">
                  No cash releases recorded yet.
                </td>
              </tr>
            ) : (
              releases.map((release) => (
                <tr key={release.id} className="border-t border-brand-blue/5 hover:bg-gray-50">
                  <td className="px-4 py-3">{release.release_date}</td>
                  <td className="px-4 py-3">
                    {(release.branches as { name: string } | undefined)?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(release.amount)}
                  </td>
                  <td className="px-4 py-3">{release.notes ?? "-"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEdit(release)}
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
