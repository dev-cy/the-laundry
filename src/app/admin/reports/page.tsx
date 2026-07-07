import { createClient } from "@/lib/supabase/server";
import { getAssignedBranchId, getUserRole } from "@/lib/auth/roles";
import { resolveBranches } from "@/lib/branches";
import { ReportsPageClient } from "@/components/admin/ReportsClient";
import type { DailyReport } from "@/lib/types";

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = getUserRole(user);
  const assignedBranchId = getAssignedBranchId(user);

  const reportsQuery = supabase
    .from("daily_reports")
    .select("*, branches(name)")
    .order("report_date", { ascending: false })
    .limit(50);
  if (role === "staff" && assignedBranchId) reportsQuery.eq("branch_id", assignedBranchId);

  const [{ data: branches }, { data: reports }] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    reportsQuery,
  ]);

  const resolvedBranches = resolveBranches(branches);
  const scopedBranches =
    role === "staff" && assignedBranchId
      ? resolvedBranches.filter((b) => b.id === assignedBranchId)
      : resolvedBranches;

  return (
    <ReportsPageClient
      branches={scopedBranches}
      initialReports={(reports as DailyReport[]) ?? []}
      role={role}
      lockedBranchId={role === "staff" ? assignedBranchId : null}
    />
  );
}
