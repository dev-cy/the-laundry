"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const showLabel = Boolean(label?.trim());

  return (
    <div className="flex flex-col gap-1">
      {showLabel && (
        <label htmlFor={fieldId} className="text-sm font-medium text-brand-text">
          {label}
        </label>
      )}
      <input
        id={fieldId}
        className={cn(
          "rounded-lg border border-brand-blue/20 bg-white px-3 py-2 text-sm text-brand-text",
          "placeholder:text-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/40",
          error && "border-red-400",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
