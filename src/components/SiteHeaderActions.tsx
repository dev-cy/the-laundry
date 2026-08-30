import { SiteSocialLinks } from "@/components/SiteSocialLinks";

function ActionDivider() {
  return <span className="mx-0.5 h-4 w-px shrink-0 bg-brand-blue/15" aria-hidden="true" />;
}

export function SiteHeaderActions() {
  return (
    <div className="flex items-center rounded-full border border-brand-blue/10 bg-white/95 p-1 shadow-sm backdrop-blur-sm">
      <SiteSocialLinks variant="header" />

      <ActionDivider />
      <a
        href="/login"
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-brand-blue px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue/90"
      >
        Login
      </a>
    </div>
  );
}
