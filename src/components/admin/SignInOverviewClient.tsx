"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadMoreFooter } from "@/components/ui/LoadMoreFooter";
import type { Branch, Schedule, Staff } from "@/lib/types";
import { useLoadMore } from "@/lib/use-load-more";
import {
  computeAttendanceVariance,
  currentMonthValue,
  defaultPayPeriod,
  formatClockTime,
  formatPayrollDate,
  formatPayrollHoursLabel,
  isCurrentPayPeriod,
  isPayableSchedule,
  monthBounds,
  payPeriodBounds,
  resolveStaffForSchedule,
  type PayPeriod,
} from "@/lib/payroll";
import { PAYROLL_HISTORY_START_MONTH } from "@/lib/constants";

function monthHeading(monthValue: string): string {
  const [year, month] = monthValue.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });
}

type SignInRow = {
  scheduleId: string;
  date: string;
  staffName: string;
  branchName: string;
  scheduledLabel: string;
  actualIn: string;
  actualOut: string;
  suggestedOt: string;
  suggestedUt: string;
  approvedOt: string;
  approvedUt: string;
  status: "ok" | "review" | "missing";
  statusLabel: string;
};

export function SignInOverviewClient({
  branches,
  initialStaff,
  initialSchedules,
}: {
  branches: Branch[];
  initialStaff: Staff[];
  initialSchedules: Schedule[];
}) {
  const supabase = createClient();
  const [month, setMonth] = useState(currentMonthValue());
  const [payPeriod, setPayPeriod] = useState<PayPeriod>(defaultPayPeriod());
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [staff, setStaff] = useState(initialStaff);
  const [schedules, setSchedules] = useState(initialSchedules);
  const [loading, setLoading] = useState(false);

  const branchNameById = useMemo(
    () => Object.fromEntries(branches.map((branch) => [branch.id, branch.name])),
    [branches]
  );

  const period = payPeriodBounds(month, payPeriod);
  const branchId = selectedBranch === "all" ? null : selectedBranch;
  const viewingPast = !isCurrentPayPeriod(month, payPeriod);

  const rows = useMemo(() => {
    const items: SignInRow[] = [];

    for (const schedule of schedules) {
      if (!isPayableSchedule(schedule)) continue;
      if (schedule.scheduled_date < period.start || schedule.scheduled_date > period.end) {
        continue;
      }
      if (branchId && schedule.branch_id !== branchId) continue;

      const member = resolveStaffForSchedule(schedule, staff);
      if (!member) continue;

      const variance = computeAttendanceVariance(schedule);
      const missing = !variance.hasSignIn || !variance.hasSignOut;
      const status: SignInRow["status"] = missing
        ? "missing"
        : variance.needsReview
          ? "review"
          : "ok";
      const statusLabel =
        status === "missing"
          ? "Missing sign-in"
          : status === "review"
            ? "Needs OT/UT approval"
            : "OK";

      items.push({
        scheduleId: schedule.id,
        date: schedule.scheduled_date,
        staffName: member.name,
        branchName: branchNameById[schedule.branch_id] ?? "—",
        scheduledLabel: `${formatClockTime(variance.scheduledIn)} – ${formatClockTime(variance.scheduledOut)}`,
        actualIn: formatClockTime(variance.actualIn),
        actualOut: formatClockTime(variance.actualOut),
        suggestedOt: formatPayrollHoursLabel(variance.suggestedOvertimeMinutes, "ot") || "—",
        suggestedUt: formatPayrollHoursLabel(variance.suggestedUndertimeMinutes, "ut") || "—",
        approvedOt:
          formatPayrollHoursLabel(Math.max(0, schedule.overtime_minutes ?? 0), "ot") || "—",
        approvedUt:
          formatPayrollHoursLabel(Math.max(0, schedule.undertime_minutes ?? 0), "ut") || "—",
        status,
        statusLabel,
      });
    }

    return items.sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) return byDate;
      return a.staffName.localeCompare(b.staffName);
    });
  }, [schedules, staff, period.start, period.end, branchId, branchNameById]);

  const reviewCount = rows.filter((row) => row.status !== "ok").length;

  const {
    visible: visibleRows,
    hasMore: hasMoreRows,
    loadMore: loadMoreRows,
    remaining: remainingRows,
  } = useLoadMore(rows);

  const periodOptions = useMemo(() => {
    const second = payPeriodBounds(month, "second");
    return [
      { value: "first", label: `1 – 15 (${monthHeading(month)})` },
      { value: "second", label: `${second.shortLabel} (${monthHeading(month)})` },
    ];
  }, [month]);

  async function reloadData(nextMonth: string, nextBranch: string) {
    setLoading(true);
    const bounds = monthBounds(nextMonth);
    const branchFilter = nextBranch === "all" ? null : nextBranch;

    let scheduleQuery = supabase
      .from("schedules")
      .select("*")
      .gte("scheduled_date", bounds.start)
      .lte("scheduled_date", bounds.end)
      .neq("status", "cancelled")
      .order("scheduled_date", { ascending: false });

    let staffQuery = supabase.from("staff").select("*").order("name");

    if (branchFilter) {
      scheduleQuery = scheduleQuery.eq("branch_id", branchFilter);
      staffQuery = staffQuery.eq("branch_id", branchFilter);
    }

    const [{ data: nextSchedules }, { data: nextStaff }] = await Promise.all([
      scheduleQuery,
      staffQuery,
    ]);

    if (nextSchedules) setSchedules(nextSchedules as Schedule[]);
    if (nextStaff) setStaff(nextStaff as Staff[]);
    setLoading(false);
  }

  async function handleMonthChange(value: string) {
    setMonth(value);
    await reloadData(value, selectedBranch);
  }

  async function handleBranchChange(value: string) {
    setSelectedBranch(value);
    await reloadData(month, value);
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-brand-text">Sign-In Log</h1>
            {viewingPast && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                Past cut-off
              </span>
            )}
          </div>
          <p className="mt-1 text-brand-text/60">
            Staff time-ins per payroll cut-off — {period.label}, {monthHeading(month)}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
          <Input
            label=""
            type="month"
            value={month}
            min={PAYROLL_HISTORY_START_MONTH}
            onChange={(e) => handleMonthChange(e.target.value)}
          />
          <Select
            label=""
            value={payPeriod}
            onChange={(e) => setPayPeriod(e.target.value as PayPeriod)}
            options={periodOptions}
          />
          <Select
            label=""
            value={selectedBranch}
            onChange={(e) => handleBranchChange(e.target.value)}
            options={[
              { value: "all", label: "All Branches" },
              ...branches.map((branch) => ({ value: branch.id, label: branch.name })),
            ]}
          />
        </div>
      </div>

      {reviewCount > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {reviewCount} shift{reviewCount === 1 ? "" : "s"} in this cut-off need review — missing
          sign-in or suggested OT/UT pending approval in Payroll.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-brand-blue/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-brand-blue/10 bg-brand-light/20 text-xs uppercase tracking-wide text-brand-text/55">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Staff</th>
                <th className="px-4 py-3 font-semibold">Branch</th>
                <th className="px-4 py-3 font-semibold">Scheduled</th>
                <th className="px-4 py-3 font-semibold">Time in</th>
                <th className="px-4 py-3 font-semibold">Time out</th>
                <th className="px-4 py-3 font-semibold">Suggested</th>
                <th className="px-4 py-3 font-semibold">Approved</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-blue/5">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-brand-text/50">
                    No shifts for this cut-off.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr key={row.scheduleId} className="hover:bg-brand-light/10">
                    <td className="whitespace-nowrap px-4 py-3 text-brand-text/80">
                      {formatPayrollDate(row.date)}
                    </td>
                    <td className="px-4 py-3 font-medium text-brand-text">{row.staffName}</td>
                    <td className="px-4 py-3 text-brand-text/70">{row.branchName}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-brand-text/70">
                      {row.scheduledLabel}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">{row.actualIn}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">{row.actualOut}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      {row.suggestedOt === "—" && row.suggestedUt === "—" ? (
                        "—"
                      ) : (
                        <>
                          {row.suggestedOt !== "—" && (
                            <span className="text-emerald-700">{row.suggestedOt}</span>
                          )}
                          {row.suggestedOt !== "—" && row.suggestedUt !== "—" && " · "}
                          {row.suggestedUt !== "—" && (
                            <span className="text-amber-700">{row.suggestedUt}</span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      {row.approvedOt === "—" && row.approvedUt === "—" ? (
                        "—"
                      ) : (
                        <>
                          {row.approvedOt !== "—" && (
                            <span className="text-emerald-700">{row.approvedOt}</span>
                          )}
                          {row.approvedOt !== "—" && row.approvedUt !== "—" && " · "}
                          {row.approvedUt !== "—" && (
                            <span className="text-amber-700">{row.approvedUt}</span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                          row.status === "ok"
                            ? "bg-emerald-100 text-emerald-800"
                            : row.status === "missing"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800",
                        ].join(" ")}
                      >
                        {row.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <LoadMoreFooter
          hasMore={hasMoreRows}
          remaining={remainingRows}
          onLoadMore={loadMoreRows}
        />
      </div>

      {loading && (
        <p className="mt-3 text-xs text-brand-text/50">Updating sign-in log…</p>
      )}
    </div>
  );
}
