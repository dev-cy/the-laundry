import { createClient } from "@/lib/supabase/server";
import { canManageUsers, getUserRole } from "@/lib/auth/roles";
import { UsersAdminClient } from "@/components/admin/UsersAdminClient";

export default async function UsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!canManageUsers(getUserRole(user))) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        You do not have permission to access this page.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-text">Users</h1>
        <p className="text-brand-text/60">
          Manage roles and delete accounts. Super Admins can delete any user except themselves.
        </p>
      </div>
      <UsersAdminClient />
    </div>
  );
}
