import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { LegalDocumentView } from "@/components/LegalDocumentView";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeaderActions } from "@/components/SiteHeaderActions";
import { termsAndConditions } from "@/lib/legal/terms-and-conditions";

export const metadata: Metadata = {
  title: "Terms and Conditions — The Laundry",
  description:
    "Terms and conditions for laundry services at The Laundry branches in Negros Occidental, including claims, liability, and customer responsibilities.",
};

export default function TermsAndConditionsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-brand-blue/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" aria-label="Back to homepage">
            <Logo size="sm" showTagline={false} />
          </Link>
          <SiteHeaderActions />
        </div>
      </header>

      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <LegalDocumentView document={termsAndConditions} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
