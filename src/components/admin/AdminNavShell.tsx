"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  CreditCard,
  FileText,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Package,
  UserCog,
  Users,
  Wallet,
  Banknote,
  X,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import { roleLabel, type AppRole } from "@/lib/auth/roles";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/finance", label: "Finance", icon: LineChart },
  { href: "/admin/payroll", label: "Payroll", icon: Banknote },
  { href: "/admin/reports", label: "Reports", icon: FileText },
  { href: "/admin/attendance", label: "Sign In", icon: Clock },
  { href: "/admin/transactions", label: "Transactions", icon: CreditCard },
  { href: "/admin/schedules", label: "Schedules", icon: Calendar },
  { href: "/admin/cash-release", label: "Release Cash", icon: Wallet },
  { href: "/admin/users", label: "Users", icon: UserCog },
  { href: "/admin/staff", label: "Staff", icon: Users },
  { href: "/admin/inventory", label: "Inventory", icon: Package },
];

export function AdminNavShell({
  userEmail,
  role,
  children,
}: {
  userEmail: string | null;
  role: AppRole;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const navItems =
    role === "staff"
      ? NAV_ITEMS.filter((item) =>
          ["/admin", "/admin/reports", "/admin/attendance", "/admin/transactions"].includes(
            item.href
          )
        )
      : NAV_ITEMS;

  return (
    <div className="min-h-screen flex bg-gray-50 md:h-screen md:overflow-hidden">
      <button
        type="button"
        className="md:hidden fixed top-3 left-3 z-50 rounded-lg bg-brand-text text-white p-2 shadow-lg"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-label="Close navigation menu"
        />
      )}

      <aside
        className={[
          "w-64 bg-brand-text text-white flex flex-col shrink-0",
          "fixed inset-y-0 left-0 z-50 h-screen transition-transform duration-300",
          "md:relative md:translate-x-0 md:overflow-y-auto",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <div className="p-5 border-b border-white/10">
          <Logo size="sm" />
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          {userEmail && <p className="text-xs text-white/50 mb-3 truncate">{userEmail}</p>}
          <div className="mb-3">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/90">
              {roleLabel(role)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-white/70 hover:text-white w-full px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 md:h-screen md:overflow-y-auto">
        <div className="p-4 pt-16 sm:p-8 md:pt-8">{children}</div>
      </main>
    </div>
  );
}
