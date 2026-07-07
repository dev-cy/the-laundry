import { createClient } from "@/lib/supabase/server";
import { AdminNavShell } from "@/components/admin/AdminNavShell";
import { getUserRole } from "@/lib/auth/roles";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = getUserRole(user);

  return (
    <AdminNavShell userEmail={user?.email ?? null} role={role}>
      {children}
    </AdminNavShell>
  );
}
