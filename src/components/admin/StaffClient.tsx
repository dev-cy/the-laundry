"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Branch, Staff } from "@/lib/types";
import { canDeleteEntries, type AppRole } from "@/lib/auth/roles";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { formatCurrency, todayISO } from "@/lib/utils";

export function StaffClient({
  branches,
  initialStaff,
  role,
}: {
  branches: Branch[];
  initialStaff: Staff[];
  role: AppRole;
}) {
  const supabase = createClient();
  const [staff, setStaff] = useState(initialStaff);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canDelete = canDeleteEntries(role);

  const [form, setForm] = useState({
    branch_id: branches[0]?.id ?? "",
    name: "",
    birthday: "",
    address: "",
    phone_number: "",
    emergency_contact_name: "",
    emergency_contact_relationship: "",
    emergency_contact_phone: "",
    date_hired: todayISO(),
    salary: 0,
  });

  function openNew() {
    setEditing(null);
    setForm({
      branch_id: branches[0]?.id ?? "",
      name: "",
      birthday: "",
      address: "",
      phone_number: "",
      emergency_contact_name: "",
      emergency_contact_relationship: "",
      emergency_contact_phone: "",
      date_hired: todayISO(),
      salary: 0,
    });
    setShowForm(true);
  }

  function openEdit(member: Staff) {
    setEditing(member);
    setForm({
      branch_id: member.branch_id,
      name: member.name,
      birthday: member.birthday ?? "",
      address: member.address ?? "",
      phone_number: member.phone_number ?? "",
      emergency_contact_name: member.emergency_contact_name ?? "",
      emergency_contact_relationship: member.emergency_contact_relationship ?? "",
      emergency_contact_phone: member.emergency_contact_phone ?? "",
      date_hired: member.date_hired ?? "",
      salary: member.salary,
    });
    setShowForm(true);
  }

  async function refresh() {
    const { data } = await supabase
      .from("staff")
      .select("*, branches(name)")
      .order("name", { ascending: true })
      .limit(200);
    if (data) setStaff(data as Staff[]);
    setShowForm(false);
    setEditing(null);
  }

  async function handleDelete(member: Staff) {
    if (!canDelete) return;
    if (!window.confirm(`Delete staff record for ${member.name}? This cannot be undone.`)) return;
    setDeletingId(member.id);
    const { error: deleteError } = await supabase.from("staff").delete().eq("id", member.id);
    setDeletingId(null);
    if (deleteError) {
      window.alert(deleteError.message);
      return;
    }
    if (editing?.id === member.id) setEditing(null);
    await refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      birthday: form.birthday || null,
      address: form.address || null,
      phone_number: form.phone_number || null,
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_relationship: form.emergency_contact_relationship || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
      date_hired: form.date_hired || null,
    };

    const { error: saveError } = editing
      ? await supabase.from("staff").update(payload).eq("id", editing.id)
      : await supabase.from("staff").insert(payload);

    setSaving(false);
    if (saveError) setError(saveError.message);
    else refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Staff</h1>
          <p className="text-brand-text/60">Manage staff records and salary details</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4" />
          New Staff
        </Button>
      </div>

      {showForm && (
        <div className="mb-8 rounded-xl border border-brand-blue/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{editing ? "Edit Staff" : "Add Staff"}</h2>
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
              required
            />
            <Input
              label="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <Input
              label="Birthday"
              type="date"
              value={form.birthday}
              onChange={(e) => setForm({ ...form, birthday: e.target.value })}
            />
            <Input
              label="Phone Number"
              value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
            />
            <Input
              label="Emergency Contact Name"
              value={form.emergency_contact_name}
              onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
            />
            <Input
              label="Emergency Contact Relationship"
              value={form.emergency_contact_relationship}
              onChange={(e) =>
                setForm({ ...form, emergency_contact_relationship: e.target.value })
              }
            />
            <Input
              label="Emergency Contact Number"
              value={form.emergency_contact_phone}
              onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
            />
            <Input
              label="Date Hired"
              type="date"
              value={form.date_hired}
              onChange={(e) => setForm({ ...form, date_hired: e.target.value })}
            />
            <Input
              label="Monthly Salary (₱)"
              type="number"
              min={0}
              value={form.salary || ""}
              onChange={(e) => setForm({ ...form, salary: parseInt(e.target.value) || 0 })}
              required
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

      <div className="rounded-xl border border-brand-blue/10 bg-white overflow-x-auto">
        <table className="w-full min-w-[1200px] text-sm">
          <thead className="bg-brand-light/30">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Name</th>
              <th className="text-left px-4 py-3 font-semibold">Branch</th>
              <th className="text-left px-4 py-3 font-semibold">Birthday</th>
              <th className="text-left px-4 py-3 font-semibold">Address</th>
              <th className="text-left px-4 py-3 font-semibold">Phone</th>
              <th className="text-left px-4 py-3 font-semibold">Emergency Contact</th>
              <th className="text-left px-4 py-3 font-semibold">Date Hired</th>
              <th className="text-right px-4 py-3 font-semibold">Salary</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-brand-text/50">
                  No staff records yet.
                </td>
              </tr>
            ) : (
              staff.map((member) => (
                <tr key={member.id} className="border-t border-brand-blue/5 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{member.name}</td>
                  <td className="px-4 py-3">
                    {(member.branches as { name: string } | undefined)?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3">{member.birthday ?? "-"}</td>
                  <td className="px-4 py-3">{member.address ?? "-"}</td>
                  <td className="px-4 py-3">{member.phone_number ?? "-"}</td>
                  <td className="px-4 py-3">
                    {member.emergency_contact_name
                      ? `${member.emergency_contact_name} (${member.emergency_contact_relationship ?? "-"}) - ${member.emergency_contact_phone ?? "-"}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3">{member.date_hired ?? "-"}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(member.salary)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(member)}
                        className="text-brand-blue hover:text-brand-blue/70"
                        aria-label="Edit staff"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(member)}
                          disabled={deletingId === member.id}
                          className="text-red-600 hover:text-red-500 disabled:opacity-50"
                          aria-label="Delete staff"
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
    </div>
  );
}
