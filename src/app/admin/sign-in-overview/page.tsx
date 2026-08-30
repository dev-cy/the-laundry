import { createClient } from "@/lib/supabase/server";
import { getUserRole, isAdminLike } from "@/lib/auth/roles";
import { resolveBranches } from "@/lib/branches";
import { SignInOverviewClient } from "@/components/admin/SignInOverviewClient";
import { currentMonthValue, monthBounds } from "@/lib/payroll";
import type { Schedule, Staff } from "@/lib/types";

export default async function SignInOverviewPage() {
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

  const [{ data: branches }, { data: staff }, { data: schedules }] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    supabase.from("staff").select("*").order("name"),
    supabase
      .from("schedules")
      .select("*")
      .gte("scheduled_date", start)
      .lte("scheduled_date", end)
      .neq("status", "cancelled")
      .order("scheduled_date", { ascending: false }),
  ]);

  return (
    <SignInOverviewClient
      branches={resolveBranches(branches)}
      initialStaff={(staff as Staff[]) ?? []}
      initialSchedules={(schedules as Schedule[]) ?? []}
    />
  );
}
