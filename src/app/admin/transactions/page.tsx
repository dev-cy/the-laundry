import { createClient } from "@/lib/supabase/server";
import { resolveBranches } from "@/lib/branches";
import { TransactionsClient } from "@/components/admin/TransactionsClient";
import type { Transaction } from "@/lib/types";

export default async function TransactionsPage() {
  const supabase = await createClient();

  const [{ data: branches }, { data: transactions }] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    supabase
      .from("transactions")
      .select("*, branches(name)")
      .order("transaction_date", { ascending: false })
      .limit(100),
  ]);

  return (
    <TransactionsClient
      branches={resolveBranches(branches)}
      initialTransactions={(transactions as Transaction[]) ?? []}
    />
  );
}
