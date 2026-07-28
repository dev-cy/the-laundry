import type { User } from "@supabase/supabase-js";

export type AppRole = "super_admin" | "admin" | "staff";

/**
 * Authorization must only use app_metadata — clients can edit user_metadata.
 * Unassigned users default to staff (least privilege).
 */
export function getUserRole(user: User | null): AppRole {
  const metadataRole = user?.app_metadata?.role as string | undefined;

  if (metadataRole === "super_admin") return "super_admin";
  if (metadataRole === "admin") return "admin";
  if (metadataRole === "staff") return "staff";
  return "staff";
}

export function isAdminLike(role: AppRole): boolean {
  return role === "super_admin" || role === "admin";
}

/** Only super admins can permanently delete records. */
export function canDeleteEntries(role: AppRole): boolean {
  return role === "super_admin";
}

export function canManageUsers(role: AppRole): boolean {
  return isAdminLike(role);
}

export function getAssignedBranchId(user: User | null): string | null {
  const branchId = user?.app_metadata?.branch_id as string | undefined;
  return branchId ?? null;
}

export function canAccessAdminPath(role: AppRole, pathname: string): boolean {
  if (isAdminLike(role)) return true;
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/reports") ||
    pathname.startsWith("/admin/transactions")
  );
}

export function roleLabel(role: AppRole): string {
  if (role === "super_admin") return "Super Admin";
  if (role === "staff") return "Staff";
  return "Admin";
}
