import type { User } from "@supabase/supabase-js";

export type AppRole = "admin" | "staff";

export function getUserRole(user: User | null): AppRole {
  const metadataRole =
    (user?.app_metadata?.role as string | undefined) ??
    (user?.user_metadata?.role as string | undefined);
  return metadataRole === "staff" ? "staff" : "admin";
}

export function getAssignedBranchId(user: User | null): string | null {
  const branchId =
    (user?.app_metadata?.branch_id as string | undefined) ??
    (user?.user_metadata?.branch_id as string | undefined);
  return branchId ?? null;
}

export function canAccessAdminPath(role: AppRole, pathname: string): boolean {
  if (role === "admin") return true;
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/reports") ||
    pathname.startsWith("/admin/transactions")
  );
}
