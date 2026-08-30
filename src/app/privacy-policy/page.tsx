import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/LegalDocumentView";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_HEADER_OFFSET_CLASS, SiteHeader } from "@/components/SiteHeader";
import { privacyPolicy } from "@/lib/legal/privacy-policy";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How The Laundry collects, uses, and protects personal information in compliance with the Philippine Data Privacy Act of 2012.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className={`flex-1 px-6 py-12 ${SITE_HEADER_OFFSET_CLASS}`}>
        <div className="mx-auto max-w-3xl">
          <LegalDocumentView document={privacyPolicy} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
