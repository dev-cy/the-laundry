"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/utils";

type ChartSeries = "totalSales" | "cashReceived" | "unpaid";

type SalesTrendChartProps = {
  title: string;
  subtitle?: string;
  data: { label: string; totalSales: number; cashReceived: number; unpaid: number }[];
  series?: ChartSeries;
};

const SERIES_META: Record<
  ChartSeries,
  { label: string; bar: string; line: string }
> = {
  totalSales: {
    label: "Total sales",
    bar: "#2563eb",
    line: "#1d4ed8",
  },
  cashReceived: {
    label: "Cash received",
    bar: "#059669",
    line: "#047857",
  },
  unpaid: {
    label: "Unpaid",
    bar: "#d97706",
    line: "#b45309",
  },
};

export function SalesTrendChart({
  title,
  subtitle,
  data,
  series = "totalSales",
}: SalesTrendChartProps) {
  const meta = SERIES_META[series];
  const values = useMemo(() => data.map((point) => point[series]), [data, series]);
  const max = Math.max(...values, 1);
  const width = 640;
  const height = 220;
  const padX = 24;
  const padY = 20;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;
  const barGap = 2;
  const barWidth = data.length > 0 ? chartW / data.length - barGap : chartW;

  const points = values.map((value, index) => {
    const x = padX + index * (barWidth + barGap) + barWidth / 2;
    const y = padY + chartH - (value / max) * chartH;
    return { x, y, value, label: data[index]?.label ?? "" };
  });

  const linePath =
    points.length > 0
      ? points.map((point, i) => `${i === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")
      : "";

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-brand-blue/10 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-brand-text/70">{title}</p>
        <p className="mt-8 text-center text-sm text-brand-text/50">No data for this period.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-brand-blue/10 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-text/70">{title}</p>
          {subtitle && <p className="text-xs text-brand-text/50">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 text-xs text-brand-text/55">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: meta.bar }}
          />
          {meta.label}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-full"
          role="img"
          aria-label={`${title} chart`}
        >
          {points.map((point, index) => {
            const barHeight = chartH - (point.y - padY);
            const barX = padX + index * (barWidth + barGap);
            const barY = point.y;
            return (
              <g key={`${point.label}-${index}`}>
                <rect
                  x={barX}
                  y={barY}
                  width={Math.max(barWidth, 2)}
                  height={Math.max(barHeight, 0)}
                  rx={2}
                  fill={meta.bar}
                  opacity={0.35}
                >
                  <title>
                    {point.label}: {formatCurrency(point.value)}
                  </title>
                </rect>
              </g>
            );
          })}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={meta.line}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          )}
          {points.map((point, index) => (
            <circle
              key={`dot-${index}`}
              cx={point.x}
              cy={point.y}
              r={3}
              fill={meta.line}
            >
              <title>
                {point.label}: {formatCurrency(point.value)}
              </title>
            </circle>
          ))}
        </svg>
      </div>

      <div
        className="mt-2 grid gap-1 text-[10px] text-brand-text/45"
        style={{ gridTemplateColumns: `repeat(${Math.min(data.length, 31)}, minmax(0, 1fr))` }}
      >
        {data.map((point, index) => (
          <span key={`${point.label}-${index}`} className="truncate text-center">
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}
