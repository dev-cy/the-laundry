import { createClient } from "@/lib/supabase/server";
import { getAssignedBranchId, getUserRole } from "@/lib/auth/roles";
import { resolveBranches } from "@/lib/branches";
import { AttendanceClient } from "@/components/admin/AttendanceClient";
import type { Schedule, Staff } from "@/lib/types";

function todayValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function AttendancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = getUserRole(user);
  const assignedBranchId = getAssignedBranchId(user);
  const staffNeedsBranch = role === "staff" && !assignedBranchId;
  const today = todayValue();

  if (staffNeedsBranch) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Your staff account has no assigned branch. Ask an admin to assign one on the Users page
        before you can record sign in.
      </div>
    );
  }

  const branchScope = role === "staff" ? assignedBranchId : null;
  const initialBranchId = branchScope ?? null;

  const staffQuery = supabase.from("staff").select("*").order("name");
  const scheduleQuery = supabase
    .from("schedules")
    .select("*")
    .eq("scheduled_date", today)
    .neq("status", "cancelled")
    .order("scheduled_time", { ascending: true });

  if (branchScope) {
    staffQuery.eq("branch_id", branchScope);
    scheduleQuery.eq("branch_id", branchScope);
  }

  const [{ data: branches }, { data: staff }, { data: schedules }] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    staffQuery,
    scheduleQuery,
  ]);

  const resolvedBranches = resolveBranches(branches);
  const scopedBranches =
    role === "staff" && assignedBranchId
      ? resolvedBranches.filter((branch) => branch.id === assignedBranchId)
      : resolvedBranches;

  return (
    <AttendanceClient
      branches={scopedBranches}
      initialStaff={(staff as Staff[]) ?? []}
      initialSchedules={(schedules as Schedule[]) ?? []}
      lockedBranchId={initialBranchId}
      role={role}
    />
  );
}
