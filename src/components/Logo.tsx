import { BUSINESS } from "@/lib/constants";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  /** @deprecated Full logo SVG includes branding; kept for API compatibility */
  showTagline?: boolean;
}

const sizes = {
  sm: { diameter: 64, logoWidth: 44 },
  md: { diameter: 96, logoWidth: 68 },
  lg: { diameter: 140, logoWidth: 100 },
};

export function Logo({ size = "md" }: LogoProps) {
  const { diameter, logoWidth } = sizes[size];

  return (
    <div className="flex flex-col items-center">
      <div
        className="flex shrink-0 items-center justify-center rounded-full bg-white shadow-md"
        style={{ width: diameter, height: diameter }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.svg"
          alt={BUSINESS.name}
          width={logoWidth}
          height={Math.round(logoWidth * (797 / 659))}
          className="h-auto max-h-[85%] max-w-[85%] object-contain"
          style={{ width: logoWidth }}
        />
      </div>
    </div>
  );
}
