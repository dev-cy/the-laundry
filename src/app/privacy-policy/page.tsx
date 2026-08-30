import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { LegalDocumentView } from "@/components/LegalDocumentView";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeaderActions } from "@/components/SiteHeaderActions";
import { privacyPolicy } from "@/lib/legal/privacy-policy";

export const metadata: Metadata = {
  title: "Privacy Policy — The Laundry",
  description:
    "How The Laundry collects, uses, and protects personal information in compliance with the Philippine Data Privacy Act of 2012.",
};

export default function PrivacyPolicyPage() {
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
          <LegalDocumentView document={privacyPolicy} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
