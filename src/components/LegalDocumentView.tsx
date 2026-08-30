import Link from "next/link";
import type { LegalDocument } from "@/lib/legal/types";

function Paragraphs({ items }: { items: string[] }) {
  return (
    <>
      {items.map((text) => (
        <p key={text.slice(0, 48)} className="leading-relaxed text-brand-text/80">
          {text}
        </p>
      ))}
    </>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-6 text-brand-text/80">
      {items.map((item) => (
        <li key={item.slice(0, 48)} className="leading-relaxed">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function LegalDocumentView({ document }: { document: LegalDocument }) {
  return (
    <article className="space-y-10">
      <header className="space-y-4 border-b border-brand-blue/10 pb-8">
        <h1 className="text-3xl font-bold tracking-tight text-brand-text sm:text-4xl">
          {document.title}
        </h1>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-brand-text/60">
          <p>
            <span className="font-medium text-brand-text/80">Effective date:</span>{" "}
            {document.effectiveDate}
          </p>
          <p>
            <span className="font-medium text-brand-text/80">Last updated:</span>{" "}
            {document.lastUpdated}
          </p>
        </div>
        <div className="space-y-4">
          <Paragraphs items={document.intro} />
        </div>
      </header>

      <div className="space-y-10">
        {document.sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24 space-y-4">
            <h2 className="text-xl font-semibold text-brand-text">{section.title}</h2>
            {section.paragraphs && <Paragraphs items={section.paragraphs} />}
            {section.list && <BulletList items={section.list} />}
            {section.subsections?.map((subsection) => (
              <div key={subsection.title} className="space-y-3 pl-0 sm:pl-4">
                <h3 className="text-base font-semibold text-brand-text/90">{subsection.title}</h3>
                <Paragraphs items={subsection.paragraphs} />
                {subsection.list && <BulletList items={subsection.list} />}
              </div>
            ))}
          </section>
        ))}
      </div>

      <footer className="rounded-2xl border border-brand-blue/10 bg-brand-light/10 p-6 text-sm text-brand-text/70">
        <p>
          Questions?{" "}
          <Link href="/" className="font-medium text-brand-blue hover:underline">
            Return to homepage
          </Link>{" "}
          or contact us using the phone number and social links in the site footer.
        </p>
      </footer>
    </article>
  );
}
