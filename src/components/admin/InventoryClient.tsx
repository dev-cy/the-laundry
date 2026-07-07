"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Branch, InventoryItem } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Plus, Pencil, AlertTriangle } from "lucide-react";

export function InventoryClient({
  branches,
  initialItems,
}: {
  branches: Branch[];
  initialItems: InventoryItem[];
}) {
  const supabase = createClient();
  const [items, setItems] = useState(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    branch_id: branches[0]?.id ?? "",
    item_name: "",
    quantity: 0,
    unit: "pcs",
    low_stock_threshold: 10,
    last_restocked: "",
  });

  function openNew() {
    setEditing(null);
    setForm({
      branch_id: branches[0]?.id ?? "",
      item_name: "",
      quantity: 0,
      unit: "pcs",
      low_stock_threshold: 10,
      last_restocked: "",
    });
    setShowForm(true);
  }

  function openEdit(item: InventoryItem) {
    setEditing(item);
    setForm({
      branch_id: item.branch_id,
      item_name: item.item_name,
      quantity: item.quantity,
      unit: item.unit,
      low_stock_threshold: item.low_stock_threshold,
      last_restocked: item.last_restocked ?? "",
    });
    setShowForm(true);
  }

  async function refresh() {
    const { data } = await supabase
      .from("inventory")
      .select("*, branches(name)")
      .order("item_name");
    if (data) setItems(data as InventoryItem[]);
    setShowForm(false);
    setEditing(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      last_restocked: form.last_restocked || null,
    };

    const { error: saveError } = editing
      ? await supabase.from("inventory").update(payload).eq("id", editing.id)
      : await supabase.from("inventory").insert(payload);

    setSaving(false);
    if (saveError) {
      setError(saveError.message);
    } else {
      refresh();
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Inventory</h1>
          <p className="text-brand-text/60">Track supplies across branches</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </div>

      {showForm && (
        <div className="mb-8 rounded-xl border border-brand-blue/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            {editing ? "Edit Item" : "New Inventory Item"}
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
            />
            <Input
              label="Item Name"
              value={form.item_name}
              onChange={(e) => setForm({ ...form, item_name: e.target.value })}
              placeholder="Detergent, Softener, Hangers…"
              required
            />
            <Input
              label="Quantity"
              type="number"
              min={0}
              value={form.quantity || ""}
              onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
              required
            />
            <Input
              label="Unit"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="pcs, liters, boxes"
            />
            <Input
              label="Low Stock Threshold"
              type="number"
              min={0}
              value={form.low_stock_threshold || ""}
              onChange={(e) =>
                setForm({ ...form, low_stock_threshold: parseInt(e.target.value) || 0 })
              }
            />
            <Input
              label="Last Restocked"
              type="date"
              value={form.last_restocked}
              onChange={(e) => setForm({ ...form, last_restocked: e.target.value })}
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

      <div className="rounded-xl border border-brand-blue/10 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-light/30">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Item</th>
              <th className="text-left px-4 py-3 font-semibold">Branch</th>
              <th className="text-right px-4 py-3 font-semibold">Quantity</th>
              <th className="text-left px-4 py-3 font-semibold">Unit</th>
              <th className="text-right px-4 py-3 font-semibold">Low Stock At</th>
              <th className="text-left px-4 py-3 font-semibold">Last Restocked</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-brand-text/50">
                  No inventory items yet.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isLow = item.quantity <= item.low_stock_threshold;
                return (
                  <tr
                    key={item.id}
                    className={`border-t border-brand-blue/5 hover:bg-gray-50 ${isLow ? "bg-amber-50/50" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium">
                      <span className="flex items-center gap-2">
                        {isLow && (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        )}
                        {item.item_name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(item.branches as { name: string } | undefined)?.name ?? "—"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${isLow ? "text-amber-600" : ""}`}
                    >
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3">{item.unit}</td>
                    <td className="px-4 py-3 text-right text-brand-text/50">
                      {item.low_stock_threshold}
                    </td>
                    <td className="px-4 py-3">{item.last_restocked ?? "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(item)}
                        className="text-brand-blue hover:text-brand-blue/70"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
