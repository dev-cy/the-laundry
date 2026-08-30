import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth/roles";
import { resolveBranches } from "@/lib/branches";
import { InventoryClient } from "@/components/admin/InventoryClient";
import type { InventoryItem } from "@/lib/types";

export default async function InventoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = getUserRole(user);

  const [{ data: branches }, { data: items }] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    supabase
      .from("inventory")
      .select("*, branches(name), inventory_catalog(*)")
      .order("item_name", { foreignTable: "inventory_catalog" }),
  ]);

  return (
    <InventoryClient
      branches={resolveBranches(branches)}
      initialItems={(items as InventoryItem[]) ?? []}
      role={role}
    />
  );
}
