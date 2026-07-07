import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  Calendar,
  Package,
  Users,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/reports", label: "Reports", icon: FileText },
  { href: "/admin/transactions", label: "Transactions", icon: CreditCard },
  { href: "/admin/schedules", label: "Schedules", icon: Calendar },
  { href: "/admin/staff", label: "Staff", icon: Users },
  { href: "/admin/inventory", label: "Inventory", icon: Package },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-brand-text text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-white/10">
          <Logo size="sm" />
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          {user && (
            <p className="text-xs text-white/50 mb-3 truncate">{user.email}</p>
          )}
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-2 text-sm text-white/70 hover:text-white w-full px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-auto min-w-0">
        <div className="p-4 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
