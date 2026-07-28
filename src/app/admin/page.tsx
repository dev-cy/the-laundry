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

  if (role === "staff" && !assignedBranchId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Your staff account has no assigned branch. Ask an admin to assign one on the Users page
        before you can use the dashboard.
      </div>
    );
  }

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
  const reportUnpaid = todayReports?.reduce((s, r) => s + r.unpaid, 0) ?? 0;
  const txUnpaid = unpaidTx?.reduce((s, t) => s + t.amount, 0) ?? 0;
  // Prefer today's report unpaid when reports exist; otherwise fall back to unpaid transactions.
  const totalUnpaid = (todayReports?.length ?? 0) > 0 ? reportUnpaid : txUnpaid;
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
