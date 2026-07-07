import { createClient } from "@/lib/supabase/server";
import { resolveBranches } from "@/lib/branches";
import { todayISO } from "@/lib/utils";
import { DashboardClient } from "@/components/admin/DashboardClient";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const today = todayISO();

  const [
    { data: branches },
    { data: todayReports },
    { data: unpaidTx },
    { data: pendingSchedules },
    { data: lowStock },
  ] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    supabase
      .from("daily_reports")
      .select("total_cash, unpaid, total_sales")
      .eq("report_date", today),
    supabase
      .from("transactions")
      .select("amount")
      .eq("payment_status", "unpaid"),
    supabase
      .from("schedules")
      .select("id")
      .eq("status", "pending")
      .gte("scheduled_date", today),
    supabase.from("inventory").select("id, quantity, low_stock_threshold"),
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
