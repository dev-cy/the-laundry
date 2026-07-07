import { createClient } from "@/lib/supabase/server";
import { getAssignedBranchId, getUserRole } from "@/lib/auth/roles";
import { resolveBranches } from "@/lib/branches";
import { TransactionsClient } from "@/components/admin/TransactionsClient";
import type { Transaction } from "@/lib/types";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = getUserRole(user);
  const assignedBranchId = getAssignedBranchId(user);

  const txQuery = supabase
    .from("transactions")
    .select("*, branches(name)")
    .order("transaction_date", { ascending: false })
    .limit(100);
  if (role === "staff" && assignedBranchId) txQuery.eq("branch_id", assignedBranchId);

  const [{ data: branches }, { data: transactions }] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    txQuery,
  ]);

  const resolvedBranches = resolveBranches(branches);
  const scopedBranches =
    role === "staff" && assignedBranchId
      ? resolvedBranches.filter((b) => b.id === assignedBranchId)
      : resolvedBranches;

  return (
    <TransactionsClient
      branches={scopedBranches}
      initialTransactions={(transactions as Transaction[]) ?? []}
      lockedBranchId={role === "staff" ? assignedBranchId : null}
    />
  );
}
