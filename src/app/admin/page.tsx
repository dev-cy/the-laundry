import { createClient } from "@/lib/supabase/server";
import { getAssignedBranchId, getUserRole } from "@/lib/auth/roles";
import { resolveBranches } from "@/lib/branches";
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

  const branchScopeId = role === "staff" ? assignedBranchId : null;
  const reportsQuery = supabase
    .from("daily_reports")
    .select("total_cash, unpaid, total_sales")
    .eq("report_date", today);
  const unpaidTxQuery = supabase
    .from("transactions")
    .select("amount")
    .eq("payment_status", "unpaid");
  const schedulesQuery = supabase
    .from("schedules")
    .select("id")
    .eq("status", "pending")
    .gte("scheduled_date", today);
  const inventoryQuery = supabase.from("inventory").select("id, quantity, low_stock_threshold");

  if (branchScopeId) {
    reportsQuery.eq("branch_id", branchScopeId);
    unpaidTxQuery.eq("branch_id", branchScopeId);
    schedulesQuery.eq("branch_id", branchScopeId);
    inventoryQuery.eq("branch_id", branchScopeId);
  }

  const [
    { data: branches },
    { data: todayReports },
    { data: unpaidTx },
    { data: pendingSchedules },
    { data: lowStock },
  ] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    reportsQuery,
    unpaidTxQuery,
    schedulesQuery,
    inventoryQuery,
  ]);

  const totalCash = todayReports?.reduce((s, r) => s + r.total_cash, 0) ?? 0;
  const totalUnpaid =
    todayReports?.reduce((s, r) => s + r.unpaid, 0) ??
    unpaidTx?.reduce((s, t) => s + t.amount, 0) ??
    0;
  const totalSales = todayReports?.reduce((s, r) => s + r.total_sales, 0) ?? 0;
  const lowStockCount =
    lowStock?.filter((i) => i.quantity <= i.low_stock_threshold).length ?? 0;

  return (
    <DashboardClient
      today={today}
      branches={resolveBranches(branches)}
      role={role}
      assignedBranchId={assignedBranchId}
      initialStats={{
        totalCash,
        totalUnpaid,
        totalSales,
        pendingSchedules: pendingSchedules?.length ?? 0,
        lowStockCount,
      }}
    />
  );
}
