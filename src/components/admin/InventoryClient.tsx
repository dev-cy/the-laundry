"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/utils";
import type { Branch, InventoryItem } from "@/lib/types";
import { canDeleteEntries, type AppRole } from "@/lib/auth/roles";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Plus, Pencil, AlertTriangle, ArrowRightLeft, Trash2 } from "lucide-react";

export function InventoryClient({
  branches,
  initialItems,
  role,
}: {
  branches: Branch[];
  initialItems: InventoryItem[];
  role: AppRole;
}) {
  const supabase = createClient();
  const [items, setItems] = useState(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);
  const canDelete = canDeleteEntries(role);

  const [form, setForm] = useState({
    branch_id: branches[0]?.id ?? "",
    item_name: "",
    quantity: 0,
    unit: "pcs",
    low_stock_threshold: 10,
    last_restocked: "",
  });

  const [transferForm, setTransferForm] = useState({
    item_name: "",
    from_branch_id: branches[0]?.id ?? "",
    to_branch_id: branches[1]?.id ?? branches[0]?.id ?? "",
    quantity: 0,
  });

  const branchFilteredItems =
    selectedBranchFilter === "all"
      ? items
      : items.filter((item) => item.branch_id === selectedBranchFilter);
  const filteredItems = branchFilteredItems.filter((item) =>
    item.item_name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );
  const totalQuantity = filteredItems.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockCount = filteredItems.filter(
    (item) => item.quantity <= item.low_stock_threshold
  ).length;
  const uniqueItemNames = Array.from(new Set(items.map((item) => item.item_name))).sort();
  const fromBranchOptions = branches
    .filter((b) => b.id !== transferForm.to_branch_id)
    .map((b) => ({ value: b.id, label: b.name }));
  const toBranchOptions = branches
    .filter((b) => b.id !== transferForm.from_branch_id)
    .map((b) => ({ value: b.id, label: b.name }));

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

  async function handleDelete(item: InventoryItem) {
    if (!canDelete) return;
    if (
      !window.confirm(
        `Delete inventory item "${item.item_name}"? This cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingId(item.id);
    const { error: deleteError } = await supabase.from("inventory").delete().eq("id", item.id);
    setDeletingId(null);
    if (deleteError) {
      window.alert(deleteError.message);
      return;
    }
    if (editing?.id === item.id) setEditing(null);
    await refresh();
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

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    setTransferring(true);
    setTransferError(null);

    const { item_name, from_branch_id, to_branch_id, quantity } = transferForm;

    if (!item_name) {
      setTransferError("Select an item to transfer.");
      setTransferring(false);
      return;
    }
    if (from_branch_id === to_branch_id) {
      setTransferError("Source and destination branches must be different.");
      setTransferring(false);
      return;
    }
    if (quantity <= 0) {
      setTransferError("Transfer quantity must be greater than zero.");
      setTransferring(false);
      return;
    }

    const source = items.find(
      (item) => item.item_name === item_name && item.branch_id === from_branch_id
    );
    if (!source) {
      setTransferError("Selected item does not exist in source branch inventory.");
      setTransferring(false);
      return;
    }
    if (source.quantity < quantity) {
      setTransferError(`Not enough stock in source branch. Available: ${source.quantity}`);
      setTransferring(false);
      return;
    }

    const destination = items.find(
      (item) => item.item_name === item_name && item.branch_id === to_branch_id
    );

    const { error: sourceError } = await supabase
      .from("inventory")
      .update({
        quantity: source.quantity - quantity,
        last_restocked: todayISO(),
      })
      .eq("id", source.id);

    if (sourceError) {
      setTransferError(sourceError.message);
      setTransferring(false);
      return;
    }

    if (destination) {
      const { error: destinationError } = await supabase
        .from("inventory")
        .update({
          quantity: destination.quantity + quantity,
          last_restocked: todayISO(),
        })
        .eq("id", destination.id);
      if (destinationError) {
        setTransferError(destinationError.message);
        setTransferring(false);
        return;
      }
    } else {
      const { error: destinationInsertError } = await supabase.from("inventory").insert({
        branch_id: to_branch_id,
        item_name,
        quantity,
        unit: source.unit,
        low_stock_threshold: source.low_stock_threshold,
        last_restocked: todayISO(),
      });
      if (destinationInsertError) {
        setTransferError(destinationInsertError.message);
        setTransferring(false);
        return;
      }
    }

    setTransferForm({
      item_name: "",
      from_branch_id: branches[0]?.id ?? "",
      to_branch_id: branches[1]?.id ?? branches[0]?.id ?? "",
      quantity: 0,
    });
    setTransferring(false);
    await refresh();
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Inventory</h1>
          <p className="text-brand-text/60">Track supplies across branches</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
          <div className="w-full sm:w-52">
            <Select
              label="Filter"
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              options={[
                { value: "all", label: "All Branches" },
                ...branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowTransferForm((v) => !v)}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Transfer Stock
          </Button>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-brand-blue/10 bg-white p-5 shadow-sm">
          <p className="text-sm text-brand-text/60 mb-1">Total Quantity On Hand</p>
          <p className="text-2xl font-bold text-brand-text">{totalQuantity}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm text-brand-text/60 mb-1">Items Low In Stock</p>
          <p className="text-2xl font-bold text-amber-700">{lowStockCount}</p>
        </div>
        <div className="rounded-xl border border-brand-blue/10 bg-white p-5 shadow-sm">
          <p className="text-sm text-brand-text/60 mb-1">Tracked Inventory Records</p>
          <p className="text-2xl font-bold text-brand-text">{filteredItems.length}</p>
        </div>
      </div>

      <div className="mb-6">
        <Input
          label="Search Items"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by item name..."
        />
      </div>

      {showTransferForm && (
        <div className="mb-8 rounded-xl border border-brand-blue/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Transfer Stock Between Branches</h2>
          {transferError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {transferError}
            </div>
          )}
          <form onSubmit={handleTransfer} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Item"
              value={transferForm.item_name}
              onChange={(e) => setTransferForm({ ...transferForm, item_name: e.target.value })}
              options={[
                { value: "", label: "Select item" },
                ...uniqueItemNames.map((name) => ({ value: name, label: name })),
              ]}
              required
            />
            <Input
              label="Quantity to Transfer"
              type="number"
              min={1}
              value={transferForm.quantity || ""}
              onChange={(e) =>
                setTransferForm({ ...transferForm, quantity: parseInt(e.target.value) || 0 })
              }
              required
            />
            <Select
              label="From Branch"
              value={transferForm.from_branch_id}
              onChange={(e) =>
                setTransferForm({ ...transferForm, from_branch_id: e.target.value })
              }
              options={fromBranchOptions}
              required
            />
            <Select
              label="To Branch"
              value={transferForm.to_branch_id}
              onChange={(e) => setTransferForm({ ...transferForm, to_branch_id: e.target.value })}
              options={toBranchOptions}
              required
            />
            <div className="sm:col-span-2 flex gap-3">
              <Button type="submit" disabled={transferring}>
                {transferring ? "Transferring…" : "Transfer"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowTransferForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

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
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-brand-text/50">
                  No inventory items for this branch filter.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="text-brand-blue hover:text-brand-blue/70"
                          aria-label="Edit inventory item"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.id}
                            className="text-red-600 hover:text-red-500 disabled:opacity-50"
                            aria-label="Delete inventory item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
