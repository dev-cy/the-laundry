"use client";

import { useEffect, useState } from "react";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { AppRole } from "@/lib/auth/roles";
import { roleLabel } from "@/lib/auth/roles";
import { Trash2 } from "lucide-react";
import { useLoadMore } from "@/lib/use-load-more";
import { LoadMoreFooter } from "@/components/ui/LoadMoreFooter";

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, AppRole>>({});
  const [branchDrafts, setBranchDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("staff");
  const [inviteBranchId, setInviteBranchId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  const canAssignSuperAdmin = currentUserRole === "super_admin";
  const canDeleteUsers = currentUserRole === "super_admin";
  const {
    visible: visibleUsers,
    hasMore: hasMoreUsers,
    loadMore: loadMoreUsers,
    remaining: remainingUsers,
  } = useLoadMore(users);

  function isDirty(user: ListedUser): boolean {
    const locked = user.role === "super_admin" && currentUserRole !== "super_admin";
    if (locked) return false;
    const role = roleDrafts[user.id] ?? user.role;
    const branch = branchDrafts[user.id] ?? "";
    const savedBranch = user.branch_id ?? "";
    if (role !== user.role) return true;
    return role === "staff" && branch !== savedBranch;
  }

  const dirtyUsers = users.filter(isDirty);

  async function fetchUsers(options?: { silent?: boolean }) {
    if (!options?.silent) setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    const data = (await res.json()) as {
      users?: ListedUser[];
      branches?: BranchOption[];
      currentUserRole?: AppRole;
      currentUserId?: string;
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
    setCurrentUserId(data.currentUserId ?? null);
    setRoleDrafts(Object.fromEntries(list.map((u) => [u.id, u.role])));
    setBranchDrafts(Object.fromEntries(list.map((u) => [u.id, u.branch_id ?? ""])));
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function saveEdits() {
    const edits = users.filter(isDirty);
    if (edits.length === 0) return;

    for (const u of edits) {
      const role = roleDrafts[u.id];
      const branchId = role === "staff" ? branchDrafts[u.id] || null : null;
      if (role === "staff" && !branchId) {
        setError(`Please assign a branch for ${u.email}.`);
        return;
      }
    }

    setSaving(true);
    setError(null);
    setInviteMessage(null);

    for (const u of edits) {
      const role = roleDrafts[u.id];
      if (!role) continue;
      const branchId = role === "staff" ? branchDrafts[u.id] || null : null;
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u.id, role, branchId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSaving(false);
        setError(data.error ?? `Failed to update ${u.email}.`);
        await fetchUsers({ silent: true });
        return;
      }
    }

    setSaving(false);
    setInviteMessage(
      edits.length === 1 ? "Updated 1 user." : `Updated ${edits.length} users.`
    );
    await fetchUsers({ silent: true });
  }

  async function inviteUser(e: React.FormEvent) {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setError("Enter an email address to invite.");
      return;
    }
    if (inviteRole === "staff" && !inviteBranchId) {
      setError("Please assign a branch when inviting Staff.");
      return;
    }
    if (inviteRole === "super_admin" && !canAssignSuperAdmin) {
      setError("Only a Super Admin can invite a Super Admin.");
      return;
    }

    setInviting(true);
    setError(null);
    setInviteMessage(null);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        role: inviteRole,
        branchId: inviteRole === "staff" ? inviteBranchId : null,
      }),
    });
    const data = (await res.json()) as { error?: string };
    setInviting(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to send invite.");
      return;
    }

    setInviteEmail("");
    setInviteRole("staff");
    setInviteBranchId("");
    setInviteMessage(`Invite sent to ${email}. They will receive an email to set their password.`);
    await fetchUsers();
  }

  async function deleteUser(u: ListedUser) {
    if (!canDeleteUsers) return;
    if (u.id === currentUserId) {
      setError("You cannot delete your own account.");
      return;
    }

    const roleText = roleLabel(u.role);
    if (
      !window.confirm(
        `Delete user ${u.email} (${roleText})? This permanently removes their login and cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingUserId(u.id);
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id }),
    });
    const data = (await res.json()) as { error?: string };
    setDeletingUserId(null);
    if (!res.ok) {
      setError(data.error ?? "Failed to delete user.");
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
      {inviteMessage && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {inviteMessage}
        </div>
      )}

      <form
        onSubmit={inviteUser}
        className="mb-6 rounded-xl border border-brand-blue/10 bg-white p-4 sm:p-5"
      >
        <h2 className="text-sm font-semibold text-brand-text">Invite user</h2>
        <p className="mt-1 text-sm text-brand-text/60">
          Sends a Supabase invite email with a link to set a password and access the dashboard.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Input
            label="Email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="staff@example.com"
            required
          />
          <Select
            label="Role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as AppRole)}
            options={[
              ...(canAssignSuperAdmin ? [{ value: "super_admin", label: "Super Admin" }] : []),
              { value: "admin", label: "Admin" },
              { value: "staff", label: "Staff" },
            ]}
          />
          {inviteRole === "staff" ? (
            <Select
              label="Assigned branch"
              value={inviteBranchId}
              onChange={(e) => setInviteBranchId(e.target.value)}
              options={[
                { value: "", label: "Select branch" },
                ...branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          ) : (
            <div className="hidden xl:block" aria-hidden="true" />
          )}
          <div className="flex items-end">
            <Button type="submit" className="w-full md:w-auto" disabled={inviting}>
              {inviting ? "Sending invite..." : "Send invite"}
            </Button>
          </div>
        </div>
      </form>

      {!canAssignSuperAdmin && (
        <p className="mb-4 text-sm text-brand-text/60">
          You are signed in as {roleLabel(currentUserRole)}. Only a Super Admin can assign the Super
          Admin role or delete users.
        </p>
      )}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-brand-text/60">
          {dirtyUsers.length === 0
            ? "No unsaved changes."
            : dirtyUsers.length === 1
              ? "1 unsaved change."
              : `${dirtyUsers.length} unsaved changes.`}
        </p>
        <Button
          type="button"
          disabled={dirtyUsers.length === 0 || saving || Boolean(deletingUserId)}
          onClick={() => void saveEdits()}
        >
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
      <div className="rounded-xl border border-brand-blue/10 bg-white overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-brand-light/30">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Email</th>
              <th className="text-left px-4 py-3 font-semibold whitespace-nowrap min-w-[10rem]">
                Account Created
              </th>
              <th className="text-left px-4 py-3 font-semibold">Role</th>
              <th className="text-left px-4 py-3 font-semibold">Assigned Branch (Staff)</th>
              {canDeleteUsers && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={canDeleteUsers ? 5 : 4}
                  className="px-4 py-8 text-center text-brand-text/50"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              visibleUsers.map((u) => {
                const locked =
                  u.role === "super_admin" && currentUserRole !== "super_admin";
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id} className="border-t border-brand-blue/5">
                    <td className="px-4 py-3">
                      {u.email}
                      {isSelf && (
                        <span className="ml-2 text-xs text-brand-text/40">(you)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatCreatedDate(u.created_at)}</td>
                    <td className="px-4 py-3 w-52">
                      <Select
                        label=""
                        value={roleDrafts[u.id] ?? u.role}
                        disabled={locked || saving}
                        onChange={(e) => {
                          setInviteMessage(null);
                          setRoleDrafts((prev) => ({
                            ...prev,
                            [u.id]: e.target.value as AppRole,
                          }));
                        }}
                        options={roleOptionsFor(u)}
                      />
                    </td>
                    <td className="px-4 py-3 w-72">
                      {roleDrafts[u.id] === "staff" ? (
                        <Select
                          label=""
                          value={branchDrafts[u.id] ?? ""}
                          disabled={locked || saving}
                          onChange={(e) => {
                            setInviteMessage(null);
                            setBranchDrafts((prev) => ({ ...prev, [u.id]: e.target.value }));
                          }}
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
                    {canDeleteUsers && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          {!isSelf && (
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              disabled={deletingUserId === u.id || saving}
                              onClick={() => deleteUser(u)}
                              aria-label={`Delete ${u.email}`}
                            >
                              <Trash2 className="w-4 h-4" />
                              {deletingUserId === u.id ? "Deleting..." : "Delete"}
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <LoadMoreFooter
          hasMore={hasMoreUsers}
          remaining={remainingUsers}
          onLoadMore={loadMoreUsers}
        />
      </div>
    </div>
  );
}
