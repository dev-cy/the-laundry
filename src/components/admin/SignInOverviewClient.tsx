"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
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
  staffId: string;
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

type StaffLogSummary = {
  staffId: string;
  staffName: string;
  branchLabel: string;
  shiftCount: number;
  reviewCount: number;
};

function HoursCell({ ot, ut }: { ot: string; ut: string }) {
  if (ot === "—" && ut === "—") return "—";
  return (
    <>
      {ot !== "—" && <span className="text-emerald-700">{ot}</span>}
      {ot !== "—" && ut !== "—" && " · "}
      {ut !== "—" && <span className="text-amber-700">{ut}</span>}
    </>
  );
}

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
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
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
        staffId: member.id,
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

  const staffSummaries = useMemo(() => {
    const byStaff = new Map<
      string,
      {
        staffId: string;
        staffName: string;
        branchNames: Set<string>;
        shiftCount: number;
        reviewCount: number;
      }
    >();

    for (const row of rows) {
      const existing = byStaff.get(row.staffId);
      if (!existing) {
        byStaff.set(row.staffId, {
          staffId: row.staffId,
          staffName: row.staffName,
          branchNames: new Set([row.branchName]),
          shiftCount: 1,
          reviewCount: row.status !== "ok" ? 1 : 0,
        });
        continue;
      }
      existing.branchNames.add(row.branchName);
      existing.shiftCount += 1;
      if (row.status !== "ok") existing.reviewCount += 1;
    }

    return [...byStaff.values()]
      .map((entry) => ({
        staffId: entry.staffId,
        staffName: entry.staffName,
        branchLabel: [...entry.branchNames].sort().join(", "),
        shiftCount: entry.shiftCount,
        reviewCount: entry.reviewCount,
      }))
      .sort((a, b) => a.staffName.localeCompare(b.staffName));
  }, [rows]);

  const selectedStaff =
    staffSummaries.find((entry) => entry.staffId === selectedStaffId) ?? null;
  const staffRows = selectedStaff
    ? rows.filter((row) => row.staffId === selectedStaff.staffId)
    : [];
  const reviewCount = selectedStaff
    ? selectedStaff.reviewCount
    : staffSummaries.reduce((sum, entry) => sum + entry.reviewCount, 0);

  const listItems = selectedStaff ? staffRows : staffSummaries;
  const {
    visible: visibleItems,
    hasMore,
    loadMore,
    remaining,
  } = useLoadMore(listItems);

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

    const staffQuery = supabase.from("staff").select("*").order("name");

    if (branchFilter) {
      scheduleQuery = scheduleQuery.eq("branch_id", branchFilter);
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
    setSelectedStaffId(null);
    await reloadData(value, selectedBranch);
  }

  async function handleBranchChange(value: string) {
    setSelectedBranch(value);
    setSelectedStaffId(null);
    await reloadData(month, value);
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4">
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
            Staff time-ins per payroll cut-off — {period.label}, {month.split("-")[0]}
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            label="Month"
            type="month"
            value={month}
            min={PAYROLL_HISTORY_START_MONTH}
            onChange={(e) => handleMonthChange(e.target.value)}
          />
          <Select
            label="Cut-off"
            value={payPeriod}
            onChange={(e) => {
              setPayPeriod(e.target.value as PayPeriod);
              setSelectedStaffId(null);
            }}
            options={periodOptions}
          />
          <Select
            label="Branch"
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

      {selectedStaff ? (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedStaffId(null)}
            >
              <ChevronLeft className="h-4 w-4" />
              All staff
            </Button>
            <div>
              <p className="font-semibold text-brand-text">{selectedStaff.staffName}</p>
              <p className="text-xs text-brand-text/55">
                {selectedStaff.branchLabel} · {selectedStaff.shiftCount}{" "}
                {selectedStaff.shiftCount === 1 ? "shift" : "shifts"}
              </p>
            </div>
          </div>

          <SignInLogTable
            rows={visibleItems as SignInRow[]}
            emptyLabel="No shifts for this staff in this cut-off."
          />
        </div>
      ) : (
        <div className="space-y-2">
          {staffSummaries.length === 0 ? (
            <div className="rounded-xl border border-brand-blue/10 bg-white px-4 py-10 text-center text-sm text-brand-text/50">
              No shifts for this cut-off.
            </div>
          ) : (
            (visibleItems as StaffLogSummary[]).map((entry) => (
              <button
                key={entry.staffId}
                type="button"
                onClick={() => setSelectedStaffId(entry.staffId)}
                className="flex w-full items-center justify-between gap-4 rounded-xl border border-brand-blue/10 bg-white px-4 py-4 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <div>
                  <p className="font-semibold text-brand-text">{entry.staffName}</p>
                  <p className="text-xs text-brand-text/55">
                    {entry.branchLabel} · {entry.shiftCount}{" "}
                    {entry.shiftCount === 1 ? "shift" : "shifts"}
                    {entry.reviewCount > 0 &&
                      ` · ${entry.reviewCount} to review`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {entry.reviewCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                      <AlertTriangle className="h-3 w-3" aria-hidden />
                      Review
                    </span>
                  )}
                  <ChevronRight className="h-5 w-5 text-brand-text/35" />
                </div>
              </button>
            ))
          )}
        </div>
      )}

      <LoadMoreFooter hasMore={hasMore} remaining={remaining} onLoadMore={loadMore} />

      {loading && (
        <p className="mt-3 text-xs text-brand-text/50">Updating sign-in log…</p>
      )}
    </div>
  );
}

function SignInLogTable({
  rows,
  emptyLabel,
}: {
  rows: SignInRow[];
  emptyLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-brand-blue/10 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-brand-blue/10 bg-brand-light/20 text-xs uppercase tracking-wide text-brand-text/55">
            <tr>
              <th className="px-4 py-3 font-semibold">Date</th>
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
                <td colSpan={8} className="px-4 py-10 text-center text-brand-text/50">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.scheduleId} className="hover:bg-brand-light/10">
                  <td className="whitespace-nowrap px-4 py-3 text-brand-text/80">
                    {formatPayrollDate(row.date)}
                  </td>
                  <td className="px-4 py-3 text-brand-text/70">{row.branchName}</td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-brand-text/70">
                    {row.scheduledLabel}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">{row.actualIn}</td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">{row.actualOut}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">
                    <HoursCell ot={row.suggestedOt} ut={row.suggestedUt} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">
                    <HoursCell ot={row.approvedOt} ut={row.approvedUt} />
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
    </div>
  );
}
