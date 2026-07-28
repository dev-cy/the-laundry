"use client";

import { useEffect, useState } from "react";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { AppRole } from "@/lib/auth/roles";
import { roleLabel } from "@/lib/auth/roles";

type ListedUser = {
  id: string;
  email: string;
  created_at: string;
  role: AppRole;
  branch_id: string | null;
};

type BranchOption = {
  id: string;
  name: string;
};

function formatCreatedDate(value: string): string {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

export function UsersAdminClient() {
  const [users, setUsers] = useState<ListedUser[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<AppRole>("admin");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, AppRole>>({});
  const [branchDrafts, setBranchDrafts] = useState<Record<string, string>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const canAssignSuperAdmin = currentUserRole === "super_admin";

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    const data = (await res.json()) as {
      users?: ListedUser[];
      branches?: BranchOption[];
      currentUserRole?: AppRole;
      error?: string;
    };
    if (!res.ok) {
      setError(data.error ?? "Failed to load users.");
      setLoading(false);
      return;
    }
    const list = data.users ?? [];
    const branchList = data.branches ?? [];
    setUsers(list);
    setBranches(branchList);
    setCurrentUserRole(data.currentUserRole ?? "admin");
    setRoleDrafts(Object.fromEntries(list.map((u) => [u.id, u.role])));
    setBranchDrafts(Object.fromEntries(list.map((u) => [u.id, u.branch_id ?? ""])));
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function saveRole(userId: string) {
    const role = roleDrafts[userId];
    if (!role) return;
    const branchId = branchDrafts[userId] || null;
    if (role === "staff" && !branchId) {
      setError("Please assign a branch when role is Staff.");
      return;
    }
    setSavingUserId(userId);
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role, branchId }),
    });
    const data = (await res.json()) as { error?: string };
    setSavingUserId(null);
    if (!res.ok) {
      setError(data.error ?? "Failed to update role.");
      return;
    }
    await fetchUsers();
  }

  function roleOptionsFor(user: ListedUser): { value: AppRole; label: string }[] {
    const options: { value: AppRole; label: string }[] = [
      { value: "admin", label: "Admin" },
      { value: "staff", label: "Staff" },
    ];
    if (canAssignSuperAdmin || user.role === "super_admin") {
      options.unshift({ value: "super_admin", label: "Super Admin" });
    }
    return options;
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-brand-blue/10 bg-white p-6 text-sm text-brand-text/60">
        Loading users...
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {!canAssignSuperAdmin && (
        <p className="mb-4 text-sm text-brand-text/60">
          You are signed in as {roleLabel(currentUserRole)}. Only a Super Admin can assign the Super
          Admin role.
        </p>
      )}
      <div className="rounded-xl border border-brand-blue/10 bg-white overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-brand-light/30">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Email</th>
              <th className="text-left px-4 py-3 font-semibold">Account Created</th>
              <th className="text-left px-4 py-3 font-semibold">Role</th>
              <th className="text-left px-4 py-3 font-semibold">Assigned Branch (Staff)</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-brand-text/50">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const locked =
                  u.role === "super_admin" && currentUserRole !== "super_admin";
                return (
                  <tr key={u.id} className="border-t border-brand-blue/5">
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{formatCreatedDate(u.created_at)}</td>
                    <td className="px-4 py-3 w-52">
                      <Select
                        label=""
                        value={roleDrafts[u.id] ?? u.role}
                        disabled={locked}
                        onChange={(e) =>
                          setRoleDrafts((prev) => ({
                            ...prev,
                            [u.id]: e.target.value as AppRole,
                          }))
                        }
                        options={roleOptionsFor(u)}
                      />
                    </td>
                    <td className="px-4 py-3 w-72">
                      {roleDrafts[u.id] === "staff" ? (
                        <Select
                          label=""
                          value={branchDrafts[u.id] ?? ""}
                          disabled={locked}
                          onChange={(e) =>
                            setBranchDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))
                          }
                          options={[
                            { value: "", label: "Select branch" },
                            ...branches.map((b) => ({ value: b.id, label: b.name })),
                          ]}
                        />
                      ) : (
                        <span className="text-brand-text/40 text-xs">
                          Not required for {roleLabel(roleDrafts[u.id] ?? u.role)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 w-28">
                      <Button
                        type="button"
                        size="sm"
                        disabled={locked || savingUserId === u.id}
                        onClick={() => saveRole(u.id)}
                      >
                        {savingUserId === u.id ? "Saving..." : "Save"}
                      </Button>
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
