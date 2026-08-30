import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/LegalDocumentView";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_HEADER_OFFSET_CLASS, SiteHeader } from "@/components/SiteHeader";
import { termsAndConditions } from "@/lib/legal/terms-and-conditions";

export const metadata: Metadata = {
  title: "Terms and Conditions — The Laundry",
  description:
    "Terms and conditions for laundry services at The Laundry branches in Negros Occidental, including claims, liability, and customer responsibilities.",
};

export default function TermsAndConditionsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className={`flex-1 px-6 py-12 ${SITE_HEADER_OFFSET_CLASS}`}>
        <div className="mx-auto max-w-3xl">
          <LegalDocumentView document={termsAndConditions} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
