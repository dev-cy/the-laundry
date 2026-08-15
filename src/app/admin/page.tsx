import { createClient } from "@/lib/supabase/server";
import { getAssignedBranchId, getUserRole } from "@/lib/auth/roles";
import { resolveBranches } from "@/lib/branches";
import { fetchDashboardStats } from "@/lib/dashboard-stats";
import { todayISO } from "@/lib/utils";
import { DashboardClient } from "@/components/admin/DashboardClient";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = getUserRole(user);
  const assignedBranchId = getAssignedBranchId(user);
  const today = todayISO();

  if (role === "staff" && !assignedBranchId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Your staff account has no assigned branch. Ask an admin to assign one on the Users page
        before you can use the dashboard.
      </div>
    );
  }

  const branchScopeId = role === "staff" ? assignedBranchId : null;
  const [{ data: branches }, initialStats] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    fetchDashboardStats(supabase, today, branchScopeId),
  ]);

  return (
    <DashboardClient
      today={today}
      branches={resolveBranches(branches)}
      role={role}
      assignedBranchId={assignedBranchId}
      initialStats={initialStats}
    />
  );
}
