import { cn } from "@/lib/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "inverse";
  size?: "sm" | "md" | "lg";
  href?: string;
}

const variants = {
  primary: "bg-brand-blue text-white hover:bg-brand-blue/90 shadow-sm",
  secondary:
    "bg-brand-light text-brand-text hover:bg-brand-light/80 border border-brand-blue/20",
  ghost: "text-brand-blue hover:bg-brand-light/30",
  danger: "bg-red-500 text-white hover:bg-red-600",
  inverse: "bg-white text-brand-blue hover:bg-brand-light shadow-sm",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  href,
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
    variants[variant],
    sizes[size],
    className
  );

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
