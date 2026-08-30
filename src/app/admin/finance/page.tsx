import { createClient } from "@/lib/supabase/server";
import { getAssignedBranchId, getUserRole, isAdminLike } from "@/lib/auth/roles";
import { resolveBranches } from "@/lib/branches";
import { fetchFinanceStats } from "@/lib/finance-stats";
import { todayISO } from "@/lib/utils";
import { FinanceClient } from "@/components/admin/FinanceClient";

export default async function FinancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = getUserRole(user);

  if (!isAdminLike(role)) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        You do not have permission to access this page.
      </div>
    );
  }

  const assignedBranchId = getAssignedBranchId(user);
  const today = todayISO();
  const branchScopeId = null;

  const [{ data: branches }, initialStats] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    fetchFinanceStats(supabase, today, branchScopeId),
  ]);

  return (
    <FinanceClient
      today={today}
      branches={resolveBranches(branches)}
      role={role}
      assignedBranchId={assignedBranchId}
      initialStats={initialStats}
    />
  );
}
