"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Branch, InventoryCatalog, InventoryItem } from "@/lib/types";
import { canDeleteEntries, type AppRole } from "@/lib/auth/roles";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Plus, Pencil, AlertTriangle, ArrowRightLeft, Trash2 } from "lucide-react";

function catalogOf(item: InventoryItem): InventoryCatalog {
  return item.inventory_catalog!;
}

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
    item_name: "",
    unit: "pcs",
    low_stock_threshold: 10,
    initial_branch_id: branches[0]?.id ?? "",
    initial_quantity: 0,
    quantity: 0,
    last_restocked: "",
  });

  const [transferForm, setTransferForm] = useState({
    catalog_id: "",
    from_branch_id: branches[0]?.id ?? "",
    to_branch_id: branches[1]?.id ?? branches[0]?.id ?? "",
    quantity: 0,
  });

  const branchFilteredItems =
    selectedBranchFilter === "all"
      ? items
      : items.filter((item) => item.branch_id === selectedBranchFilter);

  const query = searchQuery.toLowerCase().trim();
  const filteredItems = branchFilteredItems.filter((item) => {
    const catalog = item.inventory_catalog;
    if (!catalog) return false;
    return (
      catalog.item_name.toLowerCase().includes(query) ||
      catalog.sku.toLowerCase().includes(query)
    );
  });

  const totalQuantity = filteredItems.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockCount = filteredItems.filter(
    (item) => item.quantity <= (item.inventory_catalog?.low_stock_threshold ?? 0)
  ).length;

  const catalogOptions = useMemo(() => {
    const seen = new Map<string, InventoryCatalog>();
    for (const item of items) {
      const catalog = item.inventory_catalog;
      if (catalog && !seen.has(catalog.id)) seen.set(catalog.id, catalog);
    }
    return Array.from(seen.values()).sort((a, b) => a.item_name.localeCompare(b.item_name));
  }, [items]);

  const fromBranchOptions = branches
    .filter((b) => b.id !== transferForm.to_branch_id)
    .map((b) => ({ value: b.id, label: b.name }));
  const toBranchOptions = branches
    .filter((b) => b.id !== transferForm.from_branch_id)
    .map((b) => ({ value: b.id, label: b.name }));

  function openNew() {
    setEditing(null);
    setForm({
      item_name: "",
      unit: "pcs",
      low_stock_threshold: 10,
      initial_branch_id: branches[0]?.id ?? "",
      initial_quantity: 0,
      quantity: 0,
      last_restocked: "",
    });
    setShowForm(true);
  }

  function openEdit(item: InventoryItem) {
    const catalog = catalogOf(item);
    setEditing(item);
    setForm({
      item_name: catalog.item_name,
      unit: catalog.unit,
      low_stock_threshold: catalog.low_stock_threshold,
      initial_branch_id: item.branch_id,
      initial_quantity: 0,
      quantity: item.quantity,
      last_restocked: item.last_restocked ?? "",
    });
    setShowForm(true);
  }

  async function refresh() {
    const { data } = await supabase
      .from("inventory")
      .select("*, branches(name), inventory_catalog(*)")
      .order("item_name", { foreignTable: "inventory_catalog" });
    if (data) setItems(data as InventoryItem[]);
    setShowForm(false);
    setEditing(null);
  }

  async function handleDelete(item: InventoryItem) {
    if (!canDelete || !item.inventory_catalog) return;
    const catalog = catalogOf(item);
    if (
      !window.confirm(
        `Delete "${catalog.item_name}" (${catalog.sku}) from all branches? This cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingId(catalog.id);
    const { error: deleteError } = await supabase
      .from("inventory_catalog")
      .delete()
      .eq("id", catalog.id);
    setDeletingId(null);
    if (deleteError) {
      window.alert(deleteError.message);
      return;
    }
    if (editing?.catalog_id === catalog.id) setEditing(null);
    await refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (editing) {
      const catalog = catalogOf(editing);
      const { error: catalogError } = await supabase
        .from("inventory_catalog")
        .update({
          item_name: form.item_name.trim(),
          unit: form.unit.trim() || "pcs",
          low_stock_threshold: form.low_stock_threshold,
        })
        .eq("id", catalog.id);

      if (catalogError) {
        setSaving(false);
        setError(catalogError.message);
        return;
      }

      const { error: stockError } = await supabase
        .from("inventory")
        .update({
          quantity: form.quantity,
          last_restocked: form.last_restocked || null,
        })
        .eq("id", editing.id);

      setSaving(false);
      if (stockError) {
        setError(stockError.message);
      } else {
        await refresh();
      }
      return;
    }

    const { error: createError } = await supabase.rpc("create_inventory_item", {
      p_item_name: form.item_name.trim(),
      p_unit: form.unit.trim() || "pcs",
      p_low_stock_threshold: form.low_stock_threshold,
      p_initial_branch_id: form.initial_branch_id || null,
      p_initial_quantity: form.initial_quantity,
    });

    setSaving(false);
    if (createError) {
      setError(createError.message);
    } else {
      await refresh();
    }
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    setTransferring(true);
    setTransferError(null);

    const { catalog_id, from_branch_id, to_branch_id, quantity } = transferForm;

    if (!catalog_id) {
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

    const { error: transferErr } = await supabase.rpc("transfer_inventory_stock", {
      p_catalog_id: catalog_id,
      p_from_branch_id: from_branch_id,
      p_to_branch_id: to_branch_id,
      p_quantity: quantity,
    });

    if (transferErr) {
      setTransferError(transferErr.message);
      setTransferring(false);
      return;
    }

    setTransferForm({
      catalog_id: "",
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
          <p className="text-brand-text/60">
            Shared catalog synced across all branches — quantity varies per branch
          </p>
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
            className="h-10 shrink-0"
            onClick={() => setShowTransferForm((v) => !v)}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Transfer Stock
          </Button>
          <Button className="h-10 shrink-0" onClick={openNew}>
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="flex h-full flex-col rounded-xl border border-brand-blue/10 bg-white p-5 shadow-sm">
          <p className="text-sm text-brand-text/60">Total Quantity On Hand</p>
          <p className="mt-auto pt-3 text-2xl font-bold text-brand-text">{totalQuantity}</p>
        </div>
        <div className="flex h-full flex-col rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm text-brand-text/60">Items Low In Stock</p>
          <p className="mt-auto pt-3 text-2xl font-bold text-amber-700">{lowStockCount}</p>
        </div>
        <div className="flex h-full flex-col rounded-xl border border-brand-blue/10 bg-white p-5 shadow-sm">
          <p className="text-sm text-brand-text/60">Tracked Inventory Records</p>
          <p className="mt-auto pt-3 text-2xl font-bold text-brand-text">{filteredItems.length}</p>
        </div>
      </div>

      <div className="mb-6">
        <Input
          label="Search Items"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by SKU or item name..."
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
              value={transferForm.catalog_id}
              onChange={(e) => setTransferForm({ ...transferForm, catalog_id: e.target.value })}
              options={[
                { value: "", label: "Select item" },
                ...catalogOptions.map((c) => ({
                  value: c.id,
                  label: `${c.sku} — ${c.item_name}`,
                })),
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
          {!editing && (
            <p className="mb-4 text-sm text-brand-text/60">
              A SKU is generated automatically. The item is added to every branch; other branches
              start at 0 unless you set initial stock below.
            </p>
          )}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {editing && (
              <Input
                label="SKU"
                value={catalogOf(editing).sku}
                readOnly
                disabled
              />
            )}
            <Input
              label="Item Name"
              value={form.item_name}
              onChange={(e) => setForm({ ...form, item_name: e.target.value })}
              placeholder="Detergent, Softener, Hangers…"
              required
            />
            {editing ? (
              <>
                <Input
                  label="Branch"
                  value={
                    (editing.branches as { name: string } | undefined)?.name ?? "—"
                  }
                  readOnly
                  disabled
                />
                <Input
                  label="Quantity"
                  type="number"
                  min={0}
                  value={form.quantity || ""}
                  onChange={(e) =>
                    setForm({ ...form, quantity: parseInt(e.target.value) || 0 })
                  }
                  required
                />
              </>
            ) : (
              <>
                <Select
                  label="Initial Stock Branch"
                  value={form.initial_branch_id}
                  onChange={(e) =>
                    setForm({ ...form, initial_branch_id: e.target.value })
                  }
                  options={branches.map((b) => ({ value: b.id, label: b.name }))}
                />
                <Input
                  label="Initial Quantity"
                  type="number"
                  min={0}
                  value={form.initial_quantity || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      initial_quantity: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </>
            )}
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
            {editing && (
              <Input
                label="Last Restocked"
                type="date"
                value={form.last_restocked}
                onChange={(e) => setForm({ ...form, last_restocked: e.target.value })}
              />
            )}
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

      <div className="rounded-xl border border-brand-blue/10 bg-white overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-brand-light/30">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">SKU</th>
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
                <td colSpan={8} className="px-4 py-8 text-center text-brand-text/50">
                  No inventory items for this branch filter.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const catalog = item.inventory_catalog;
                if (!catalog) return null;
                const isLow = item.quantity <= catalog.low_stock_threshold;
                return (
                  <tr
                    key={item.id}
                    className={`border-t border-brand-blue/5 hover:bg-gray-50 ${isLow ? "bg-amber-50/50" : ""}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-brand-text/70">
                      {catalog.sku}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <span className="flex items-center gap-2">
                        {isLow && (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        )}
                        {catalog.item_name}
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
                    <td className="px-4 py-3">{catalog.unit}</td>
                    <td className="px-4 py-3 text-right text-brand-text/50">
                      {catalog.low_stock_threshold}
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
                            disabled={deletingId === catalog.id}
                            className="text-red-600 hover:text-red-500 disabled:opacity-50"
                            aria-label="Delete inventory item from all branches"
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
