import { createClient } from "@/lib/supabase/server";
import { resolveBranches } from "@/lib/branches";
import { StaffClient } from "@/components/admin/StaffClient";
import type { Staff } from "@/lib/types";

export default async function StaffPage() {
  const supabase = await createClient();

  const [{ data: branches }, { data: staff }] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    supabase.from("staff").select("*, branches(name)").order("name").limit(200),
  ]);

  return (
    <StaffClient
      branches={resolveBranches(branches)}
      initialStaff={(staff as Staff[]) ?? []}
    />
  );
}
