import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number;
  isCurrency?: boolean;
  variant?: "default" | "warning" | "success";
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
}: StatCardProps) {
  return (
    <div className={cn("rounded-xl border p-5 shadow-sm", variantStyles[variant])}>
      <p className="text-sm text-brand-text/60 mb-1">{label}</p>
      <p className="text-2xl font-bold text-brand-text">
        {isCurrency ? formatCurrency(value) : value}
      </p>
    </div>
  );
}
