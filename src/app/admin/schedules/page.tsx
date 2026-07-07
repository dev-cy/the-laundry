import { createClient } from "@/lib/supabase/server";
import { resolveBranches } from "@/lib/branches";
import { SchedulesClient } from "@/components/admin/SchedulesClient";
import type { Schedule, Staff } from "@/lib/types";

export default async function SchedulesPage() {
  const supabase = await createClient();

  const [{ data: branches }, { data: schedules }, { data: staff }] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    supabase
      .from("schedules")
      .select("*, branches(name)")
      .order("scheduled_date", { ascending: true })
      .limit(100),
    supabase.from("staff").select("*").order("name"),
  ]);

  return (
    <SchedulesClient
      branches={resolveBranches(branches)}
      initialSchedules={(schedules as Schedule[]) ?? []}
      staff={(staff as Staff[]) ?? []}
    />
  );
}
