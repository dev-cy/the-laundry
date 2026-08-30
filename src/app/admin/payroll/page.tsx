import { createClient } from "@/lib/supabase/server";
import { getUserRole, isAdminLike } from "@/lib/auth/roles";
import { resolveBranches } from "@/lib/branches";
import { PayrollClient } from "@/components/admin/PayrollClient";
import { currentMonthValue, historyDateRange, monthBounds } from "@/lib/payroll";
import type { Schedule, Staff, StaffCashAdvance } from "@/lib/types";

export default async function PayrollPage() {
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

  const month = currentMonthValue();
  const { start, end } = monthBounds(month);
  const history = historyDateRange();

  const [
    { data: branches },
    { data: staff },
    { data: schedules },
    { data: cashAdvances },
    { data: historySchedules },
    { data: historyCashAdvances },
  ] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    supabase.from("staff").select("*").order("name"),
    supabase
      .from("schedules")
      .select("*")
      .gte("scheduled_date", start)
      .lte("scheduled_date", end)
      .neq("status", "cancelled")
      .order("scheduled_date", { ascending: true }),
    supabase
      .from("staff_cash_advances")
      .select("*")
      .gte("advance_date", start)
      .lte("advance_date", end)
      .order("advance_date", { ascending: true }),
    supabase
      .from("schedules")
      .select("*")
      .gte("scheduled_date", history.start)
      .lte("scheduled_date", history.end)
      .neq("status", "cancelled")
      .order("scheduled_date", { ascending: true }),
    supabase
      .from("staff_cash_advances")
      .select("*")
      .gte("advance_date", history.start)
      .lte("advance_date", history.end)
      .order("advance_date", { ascending: true }),
  ]);

  return (
    <PayrollClient
      branches={resolveBranches(branches)}
      initialStaff={(staff as Staff[]) ?? []}
      initialSchedules={(schedules as Schedule[]) ?? []}
      initialCashAdvances={(cashAdvances as StaffCashAdvance[]) ?? []}
      initialHistorySchedules={(historySchedules as Schedule[]) ?? schedules ?? []}
      initialHistoryCashAdvances={(historyCashAdvances as StaffCashAdvance[]) ?? cashAdvances ?? []}
      role={role}
    />
  );
}
