import { createClient } from "@/lib/supabase/server";
import { getUserRole, isAdminLike } from "@/lib/auth/roles";
import { resolveBranches } from "@/lib/branches";
import { ExpensesClient } from "@/components/admin/ExpensesClient";
import type { Expense } from "@/lib/types";

export default async function ExpensesPage() {
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

  const [{ data: branches }, { data: expenses }] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    supabase
      .from("expenses")
      .select("*, branches(name)")
      .order("expense_date", { ascending: false })
      .limit(100),
  ]);

  return (
    <ExpensesClient
      branches={resolveBranches(branches)}
      initialExpenses={(expenses as Expense[]) ?? []}
      role={role}
    />
  );
}
