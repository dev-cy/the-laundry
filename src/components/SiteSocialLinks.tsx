import { Phone } from "lucide-react";
import { FacebookIcon } from "@/components/ui/FacebookIcon";
import { BUSINESS } from "@/lib/constants";
import { getFacebookUrl } from "@/lib/site-url";

type SiteSocialLinksProps = {
  variant?: "header" | "footer";
};

const styles = {
  header: {
    wrapper: "flex items-center gap-0.5",
    icon: "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-brand-blue transition-colors hover:bg-brand-light/60",
    divider: "mx-0.5 h-4 w-px shrink-0 bg-brand-blue/15",
    iconSize: "h-[18px] w-[18px]",
    strokeWidth: 2.25,
  },
  footer: {
    wrapper: "flex items-center justify-center gap-1",
    icon: "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/10 hover:text-white",
    divider: "mx-1 h-4 w-px shrink-0 bg-white/20",
    iconSize: "h-[18px] w-[18px]",
    strokeWidth: 2.25,
  },
} as const;

function SocialDivider({ className }: { className: string }) {
  return <span className={className} aria-hidden="true" />;
}

export function SiteSocialLinks({ variant = "header" }: SiteSocialLinksProps) {
  const facebookUrl = getFacebookUrl();
  const phoneHref = `tel:${BUSINESS.phone.replace(/\s/g, "")}`;
  const s = styles[variant];

  return (
    <div className={s.wrapper}>
      <a href={phoneHref} className={s.icon} aria-label={`Call ${BUSINESS.phone}`}>
        <Phone className={s.iconSize} strokeWidth={s.strokeWidth} />
      </a>

      {facebookUrl && (
        <>
          <SocialDivider className={s.divider} />
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={s.icon}
            aria-label="Visit us on Facebook"
          >
            <FacebookIcon className={s.iconSize} />
          </a>
        </>
      )}
    </div>
  );
}
