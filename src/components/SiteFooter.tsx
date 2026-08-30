import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SiteSocialLinks } from "@/components/SiteSocialLinks";
import { BUSINESS } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="bg-brand-text px-6 py-10 text-center text-sm text-white/70">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6">
        <Logo size="sm" showTagline={false} />

        <SiteSocialLinks variant="footer" />

        <nav
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-white/80"
          aria-label="Legal"
        >
          <Link href="/privacy-policy" className="transition-colors hover:text-white">
            Privacy Policy
          </Link>
          <span className="hidden text-white/30 sm:inline" aria-hidden="true">
            |
          </span>
          <Link href="/terms-and-conditions" className="transition-colors hover:text-white">
            Terms &amp; Conditions
          </Link>
        </nav>

        <p>
          &copy; {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
