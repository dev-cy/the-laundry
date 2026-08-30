import { createClient } from "@/lib/supabase/server";
import { getAssignedBranchId, getUserRole } from "@/lib/auth/roles";
import { resolveBranches } from "@/lib/branches";
import { ReportsPageClient } from "@/components/admin/ReportsClient";
import type { DailyReport, Staff } from "@/lib/types";

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = getUserRole(user);
  const assignedBranchId = getAssignedBranchId(user);
  const staffNeedsBranch = role === "staff" && !assignedBranchId;

  if (staffNeedsBranch) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Your staff account has no assigned branch. Ask an admin to assign one on the Users page
        before you can view or create reports.
      </div>
    );
  }

  const reportsQuery = supabase
    .from("daily_reports")
    .select("*, branches(name)")
    .order("report_date", { ascending: false })
    .limit(50);
  if (role === "staff" && assignedBranchId) reportsQuery.eq("branch_id", assignedBranchId);

  const [{ data: branches }, { data: reports }, { data: staff }] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    reportsQuery,
    supabase.from("staff").select("*").order("name"),
  ]);

  const resolvedBranches = resolveBranches(branches);
  const scopedBranches =
    role === "staff" && assignedBranchId
      ? resolvedBranches.filter((b) => b.id === assignedBranchId)
      : resolvedBranches;

  return (
    <ReportsPageClient
      branches={scopedBranches}
      initialStaff={(staff as Staff[]) ?? []}
      initialReports={(reports as DailyReport[]) ?? []}
      role={role}
      lockedBranchId={role === "staff" ? assignedBranchId : null}
    />
  );
}
