"use client";

import { useEffect, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

type DateMultiPickerProps = {
  selectedDates: string[];
  onChange: (dates: string[]) => void;
  multiple?: boolean;
  label?: string;
};

export function DateMultiPicker({
  selectedDates,
  onChange,
  multiple = true,
  label = "Dates",
}: DateMultiPickerProps) {
  const initialMonth =
    selectedDates.length > 0
      ? startOfMonth(new Date(`${selectedDates[0]}T00:00:00`))
      : startOfMonth(new Date());
  const [month, setMonth] = useState(initialMonth);

  useEffect(() => {
    if (selectedDates.length > 0) {
      const first = new Date(`${selectedDates[0]}T00:00:00`);
      if (!isSameMonth(first, month)) {
        setMonth(startOfMonth(first));
      }
    }
  }, [selectedDates, month]);

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
  });

  function toggleDate(iso: string) {
    if (multiple) {
      if (selectedDates.includes(iso)) {
        onChange(selectedDates.filter((d) => d !== iso));
      } else {
        onChange([...selectedDates, iso].sort());
      }
    } else {
      onChange([iso]);
    }
  }

  function removeDate(iso: string) {
    onChange(selectedDates.filter((d) => d !== iso));
  }

  return (
    <div>
      {label && (
        <p className="mb-1.5 block text-sm font-medium text-brand-text/80">{label}</p>
      )}

      <div className="rounded-lg border border-brand-blue/15 bg-gray-50/50 p-3">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            className="rounded-md p-1 text-brand-text/60 hover:bg-white hover:text-brand-text"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-brand-text">
            {format(month, "MMMM yyyy")}
          </span>
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="rounded-md p-1 text-brand-text/60 hover:bg-white hover:text-brand-text"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
            <div
              key={`${day}-${i}`}
              className="py-1 text-center text-[10px] font-semibold uppercase text-brand-text/45"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const iso = format(day, "yyyy-MM-dd");
            const selected = selectedDates.includes(iso);
            const inMonth = isSameMonth(day, month);
            const today = isToday(day);

            return (
              <button
                key={iso}
                type="button"
                onClick={() => toggleDate(iso)}
                className={cn(
                  "aspect-square rounded-md text-xs font-medium transition-colors",
                  !inMonth && "text-brand-text/25",
                  inMonth && !selected && "text-brand-text hover:bg-white",
                  selected && "bg-brand-blue text-white shadow-sm",
                  today && !selected && "ring-1 ring-brand-blue/40"
                )}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>

        {multiple && (
          <p className="mt-2 text-[11px] text-brand-text/50">
            Click dates to add or remove. {selectedDates.length} selected.
          </p>
        )}
      </div>

      {selectedDates.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedDates.map((iso) => (
            <span
              key={iso}
              className="inline-flex items-center gap-1 rounded-full bg-brand-light/30 px-2.5 py-0.5 text-xs font-medium text-brand-text"
            >
              {format(new Date(`${iso}T00:00:00`), "MMM d")}
              {multiple && (
                <button
                  type="button"
                  onClick={() => removeDate(iso)}
                  className="ml-0.5 text-brand-text/50 hover:text-brand-text"
                  aria-label={`Remove ${iso}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
