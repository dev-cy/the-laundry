import { createClient } from "@/lib/supabase/server";
import { resolveBranches } from "@/lib/branches";
import { CashReleaseClient } from "@/components/admin/CashReleaseClient";
import type { CashRelease } from "@/lib/types";

export default async function CashReleasePage() {
  const supabase = await createClient();

  const [{ data: branches }, { data: releases }] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    supabase
      .from("cash_releases")
      .select("*, branches(name)")
      .order("release_date", { ascending: false })
      .limit(100),
  ]);

  return (
    <CashReleaseClient
      branches={resolveBranches(branches)}
      initialReleases={(releases as CashRelease[]) ?? []}
    />
  );
}
