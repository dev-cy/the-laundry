import { BUSINESS } from "@/lib/constants";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

const sizes = {
  sm: { icon: 40, text: "text-lg" },
  md: { icon: 56, text: "text-2xl" },
  lg: { icon: 80, text: "text-3xl" },
};

export function Logo({ size = "md", showTagline = true }: LogoProps) {
  const s = sizes[size];

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="rounded-full bg-white shadow-md flex items-center justify-center"
        style={{ width: s.icon, height: s.icon }}
      >
        <svg
          viewBox="0 0 48 48"
          width={s.icon * 0.65}
          height={s.icon * 0.65}
          fill="none"
          aria-hidden
        >
          <path
            d="M8 6 C8 6 24 2 40 6 L38 14 C38 14 24 10 10 14 Z"
            stroke="#3A8CC9"
            strokeWidth="2.5"
            fill="none"
          />
          <circle cx="24" cy="30" r="12" stroke="#7EC8E3" strokeWidth="2" fill="#E8F6FB" />
          <path
            d="M16 32 Q20 28 24 32 Q28 36 32 32"
            stroke="#3A8CC9"
            strokeWidth="1.5"
            fill="none"
          />
          <circle cx="20" cy="26" r="1.5" fill="#7EC8E3" />
          <circle cx="28" cy="24" r="1" fill="#7EC8E3" />
          <circle cx="26" cy="30" r="1.2" fill="#7EC8E3" />
        </svg>
      </div>
      <span className={`font-bold tracking-wide text-brand-blue ${s.text}`}>
        {BUSINESS.name.toUpperCase()}
      </span>
      {showTagline && (
        <span className="text-xs tracking-widest text-brand-blue/70 uppercase">
          {BUSINESS.tagline}
        </span>
      )}
    </div>
  );
}
