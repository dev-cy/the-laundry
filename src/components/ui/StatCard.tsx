import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value?: number;
  isCurrency?: boolean;
  variant?: "default" | "warning" | "success";
  periods?: { label: string; value: number }[];
  subtitle?: string;
}

const variantStyles = {
  default: "bg-white border-brand-blue/10",
  warning: "bg-amber-50 border-amber-200",
  success: "bg-emerald-50 border-emerald-200",
};

export function StatCard({
  label,
  value,
  isCurrency = true,
  variant = "default",
  periods,
  subtitle,
}: StatCardProps) {
  const formatValue = (amount: number) =>
    isCurrency ? formatCurrency(amount) : amount.toLocaleString("en-PH");

  const valueClass =
    variant === "warning"
      ? "text-amber-700"
      : variant === "success"
        ? "text-emerald-700"
        : "text-brand-text";

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border shadow-sm",
        periods ? "h-full min-h-[220px] p-5" : "p-4",
        variantStyles[variant]
      )}
    >
      <p className="text-sm font-medium text-brand-text/70">{label}</p>
      {subtitle && <p className="mt-0.5 text-xs text-brand-text/50">{subtitle}</p>}

      {periods ? (
        <>
          <div className="mt-4">
            <p className={cn("text-3xl font-bold tracking-tight", valueClass)}>
              {formatValue(periods[0]?.value ?? 0)}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-brand-text/45">
              Daily
            </p>
          </div>
          <dl className="mt-auto space-y-2 border-t border-black/5 pt-4">
            {periods.slice(1).map((period) => (
              <div key={period.label} className="flex items-baseline justify-between gap-3">
                <dt className="text-xs text-brand-text/55">{period.label}</dt>
                <dd className={cn("text-sm font-semibold tabular-nums", valueClass)}>
                  {formatValue(period.value)}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <p className={cn("mt-1.5 text-2xl font-bold tracking-tight tabular-nums", valueClass)}>
          {formatValue(value ?? 0)}
        </p>
      )}
    </div>
  );
}
