import { cn } from "@/lib/cn";
import { ChevronDown } from "lucide-react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className, id, ...props }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-brand-text">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            "h-10 w-full appearance-none rounded-lg border border-brand-blue/20 bg-white pl-4 pr-10 text-sm text-brand-text",
            "focus:outline-none focus:ring-2 focus:ring-brand-blue/40",
            className
          )}
          {...props}
        >
          {options.map((opt, idx) => (
            <option key={`${opt.value}-${opt.label}-${idx}`} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text/70"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
