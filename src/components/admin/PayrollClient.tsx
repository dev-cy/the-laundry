"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatCard } from "@/components/ui/StatCard";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PayrollDetailsModal } from "@/components/admin/PayrollDetailsModal";
import type { Branch, Schedule, Staff, StaffCashAdvance } from "@/lib/types";
import { isAdminLike, type AppRole } from "@/lib/auth/roles";
import { formatCurrency } from "@/lib/utils";
import {
  buildStaffPayrollHistory,
  computeStaffPayrollSummaries,
  computeStaffPayrollSummaryForStaff,
  currentMonthValue,
  defaultPayPeriod,
  historyDateRange,
  isCurrentPayPeriod,
  monthBounds,
  payPeriodBounds,
  formatPayrollHoursLabel,
  type PayPeriod,
  type StaffPayrollSummary,
} from "@/lib/payroll";
import { PAYROLL_HISTORY_START_MONTH } from "@/lib/constants";
import { useLoadMore } from "@/lib/use-load-more";
import { LoadMoreFooter } from "@/components/ui/LoadMoreFooter";
import { ChevronRight } from "lucide-react";

function monthHeading(monthValue: string): string {
  const [year, month] = monthValue.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });
}

export function PayrollClient({
  branches,
  initialStaff,
  initialSchedules,
  initialCashAdvances,
  initialHistorySchedules,
  initialHistoryCashAdvances,
  role,
}: {
  branches: Branch[];
  initialStaff: Staff[];
  initialSchedules: Schedule[];
  initialCashAdvances: StaffCashAdvance[];
  initialHistorySchedules?: Schedule[];
  initialHistoryCashAdvances?: StaffCashAdvance[];
  role: AppRole;
}) {
  const supabase = createClient();
  const [month, setMonth] = useState(currentMonthValue());
  const [payPeriod, setPayPeriod] = useState<PayPeriod>(defaultPayPeriod());
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [staff, setStaff] = useState(initialStaff);
  const [schedules, setSchedules] = useState(initialSchedules);
  const [cashAdvances, setCashAdvances] = useState(initialCashAdvances);
  const [historySchedules, setHistorySchedules] = useState<Schedule[]>(
    initialHistorySchedules ?? initialSchedules
  );
  const [historyAdvances, setHistoryAdvances] = useState<StaffCashAdvance[]>(
    initialHistoryCashAdvances ?? initialCashAdvances
  );
  const [loading, setLoading] = useState(false);
  const [detailsSummary, setDetailsSummary] = useState<StaffPayrollSummary | null>(null);

  const branchNameById = useMemo(
    () => Object.fromEntries(branches.map((branch) => [branch.id, branch.name])),
    [branches]
  );
  const branchLocationById = useMemo(
    () => Object.fromEntries(branches.map((branch) => [branch.id, branch.location])),
    [branches]
  );

  const period = payPeriodBounds(month, payPeriod);
  const branchId = selectedBranch === "all" ? null : selectedBranch;
  const viewingPast = !isCurrentPayPeriod(month, payPeriod);

  const staffPayrollHistory = useMemo(() => {
    if (!detailsSummary) return [];
    return buildStaffPayrollHistory({
      staffId: detailsSummary.staffId,
      staff,
      schedules: historySchedules,
      cashAdvances: historyAdvances,
      branchNameById,
      branchLocationById,
      selectedMonth: month,
      selectedPeriod: payPeriod,
    });
  }, [
    detailsSummary,
    staff,
    historySchedules,
    historyAdvances,
    branchNameById,
    branchLocationById,
    month,
    payPeriod,
  ]);

  const detailsSchedules = useMemo(() => {
    const bounds = payPeriodBounds(month, payPeriod);
    return historySchedules.filter(
      (schedule) =>
        schedule.scheduled_date >= bounds.start && schedule.scheduled_date <= bounds.end
    );
  }, [historySchedules, month, payPeriod]);

  useEffect(() => {
    void loadHistoryData(selectedBranch);
  }, [selectedBranch]);

  async function loadHistoryData(branch: string) {
    const range = historyDateRange();
    const branchFilter = branch === "all" ? null : branch;

    let scheduleQuery = supabase
      .from("schedules")
      .select("*")
      .gte("scheduled_date", range.start)
      .lte("scheduled_date", range.end)
      .neq("status", "cancelled")
      .order("scheduled_date", { ascending: true });

    let advanceQuery = supabase
      .from("staff_cash_advances")
      .select("*")
      .gte("advance_date", range.start)
      .lte("advance_date", range.end)
      .order("advance_date", { ascending: true });

    if (branchFilter) {
      scheduleQuery = scheduleQuery.eq("branch_id", branchFilter);
      advanceQuery = advanceQuery.eq("branch_id", branchFilter);
    }

    const [{ data: historyScheduleRows }, { data: historyAdvanceRows }] = await Promise.all([
      scheduleQuery,
      advanceQuery,
    ]);

    if (historyScheduleRows) setHistorySchedules(historyScheduleRows as Schedule[]);
    if (historyAdvanceRows) setHistoryAdvances(historyAdvanceRows as StaffCashAdvance[]);
  }

  const summaries = useMemo(
    () =>
      computeStaffPayrollSummaries({
        staff,
        schedules,
        cashAdvances,
        branchNameById,
        branchLocationById,
        periodStart: period.start,
        periodEnd: period.end,
        branchId,
      }),
    [
      staff,
      schedules,
      cashAdvances,
      branchNameById,
      branchLocationById,
      period.start,
      period.end,
      branchId,
    ]
  );

  const totals = useMemo(
    () =>
      summaries.reduce(
        (acc, row) => ({
          shifts: acc.shifts + row.shiftCount,
          grossPay: acc.grossPay + row.grossPay,
          cashAdvances: acc.cashAdvances + row.cashAdvanceDeduction,
          netPay: acc.netPay + row.netPay,
        }),
        { shifts: 0, grossPay: 0, cashAdvances: 0, netPay: 0 }
      ),
    [summaries]
  );

  const {
    visible: visibleSummaries,
    hasMore: hasMoreSummaries,
    loadMore: loadMoreSummaries,
    remaining: remainingSummaries,
  } = useLoadMore(summaries);

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
      .order("scheduled_date", { ascending: true });

    let staffQuery = supabase.from("staff").select("*").order("name");
    let advanceQuery = supabase
      .from("staff_cash_advances")
      .select("*")
      .gte("advance_date", bounds.start)
      .lte("advance_date", bounds.end)
      .order("advance_date", { ascending: true });

    if (branchFilter) {
      scheduleQuery = scheduleQuery.eq("branch_id", branchFilter);
      staffQuery = staffQuery.eq("branch_id", branchFilter);
      advanceQuery = advanceQuery.eq("branch_id", branchFilter);
    }

    const [{ data: nextSchedules }, { data: nextStaff }, { data: nextAdvances }] =
      await Promise.all([scheduleQuery, staffQuery, advanceQuery]);

    if (nextSchedules) setSchedules(nextSchedules as Schedule[]);
    if (nextStaff) setStaff(nextStaff as Staff[]);
    if (nextAdvances) setCashAdvances(nextAdvances as StaffCashAdvance[]);
    setLoading(false);
  }

  async function handleMonthChange(value: string) {
    setMonth(value);
    setDetailsSummary(null);
    await reloadData(value, selectedBranch);
  }

  async function handleBranchChange(value: string) {
    setSelectedBranch(value);
    setDetailsSummary(null);
    await Promise.all([reloadData(month, value), loadHistoryData(value)]);
  }

  function selectStaffPayPeriod(staffId: string, nextMonth: string, nextPeriod: PayPeriod) {
    setMonth(nextMonth);
    setPayPeriod(nextPeriod);

    const match = computeStaffPayrollSummaryForStaff({
      staffId,
      staff,
      schedules: historySchedules,
      cashAdvances: historyAdvances,
      branchNameById,
      branchLocationById,
      month: nextMonth,
      period: nextPeriod,
    });
    setDetailsSummary(match);

    void reloadData(nextMonth, selectedBranch);
  }

  async function saveScheduleShiftPay(
    scheduleId: string,
    overtimeMinutes: number,
    undertimeMinutes: number,
    dailyPayOverride: number | null
  ) {
    const payload = {
      overtime_minutes: Math.max(0, overtimeMinutes),
      undertime_minutes: Math.max(0, undertimeMinutes),
      daily_pay_override: dailyPayOverride,
    };

    const { error } = await supabase
      .from("schedules")
      .update(payload)
      .eq("id", scheduleId);

    if (error) throw new Error(error.message);

    const updateList = (list: Schedule[]) =>
      list.map((schedule) =>
        schedule.id === scheduleId ? { ...schedule, ...payload } : schedule
      );

    const nextHistory = updateList(historySchedules);
    setHistorySchedules(nextHistory);
    setSchedules(updateList(schedules));

    if (detailsSummary) {
      refreshDetailsSummary(detailsSummary.staffId, cashAdvances, nextHistory);
    }
  }

  function handleAdvanceAdded(advance: StaffCashAdvance) {
    const nextAdvances = [...cashAdvances, advance];
    setCashAdvances(nextAdvances);
    setHistoryAdvances((current) => [...current, advance]);
    if (detailsSummary?.staffId === advance.staff_id) {
      refreshDetailsSummary(advance.staff_id, nextAdvances, historySchedules);
    }
  }

  function refreshDetailsSummary(
    staffId: string,
    nextAdvances: StaffCashAdvance[],
    nextSchedules: Schedule[]
  ) {
    const match = computeStaffPayrollSummaryForStaff({
      staffId,
      staff,
      schedules: nextSchedules,
      cashAdvances: nextAdvances,
      branchNameById,
      branchLocationById,
      month,
      period: payPeriod,
    });
    if (match) setDetailsSummary(match);
  }

  const periodOptions = useMemo(() => {
    const second = payPeriodBounds(month, "second");
    return [
      { value: "first", label: `1 – 15 (${monthHeading(month)})` },
      { value: "second", label: `${second.shortLabel} (${monthHeading(month)})` },
    ];
  }, [month]);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-brand-text">Payroll</h1>
            {viewingPast && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                Past payroll
              </span>
            )}
          </div>
          <p className="text-brand-text/60 mt-1">
            Semi-monthly pay — {period.label}, {monthHeading(month)}
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
            onChange={(e) => {
              setPayPeriod(e.target.value as PayPeriod);
              setDetailsSummary(null);
            }}
            options={periodOptions}
          />
          {isAdminLike(role) && (
            <Select
              label=""
              value={selectedBranch}
              onChange={(e) => handleBranchChange(e.target.value)}
              options={[
                { value: "all", label: "All Branches" },
                ...branches.map((branch) => ({ value: branch.id, label: branch.name })),
              ]}
            />
          )}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Net Payout" value={totals.netPay} variant="success" />
        <StatCard label="Gross Pay" value={totals.grossPay} />
        <StatCard label="Cash Advances" value={totals.cashAdvances} variant="warning" />
        <StatCard label="Shifts" value={totals.shifts} isCurrency={false} />
      </div>

      <p className="mb-4 text-xs text-brand-text/50">
        Payday is twice a month: <strong>1–15</strong> and <strong>16–last day</strong>. Tap a staff
        member to view details, enter OT/UT hours per date, and review past cut-offs.
      </p>

      <div className="space-y-2">
        {summaries.length === 0 ? (
          <div className="rounded-xl border border-brand-blue/10 bg-white px-4 py-10 text-center text-sm text-brand-text/50">
            No payroll records for this cut-off. Add schedules and daily salaries first.
          </div>
        ) : (
          visibleSummaries.map((row) => (
            <button
              key={row.staffId}
              type="button"
              onClick={() => setDetailsSummary(row)}
              className="flex w-full items-center justify-between gap-4 rounded-xl border border-brand-blue/10 bg-white px-4 py-4 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              <div>
                <p className="font-semibold text-brand-text">{row.staffName}</p>
                <p className="text-xs text-brand-text/55">
                  {row.branchName} · {row.shiftCount} day{row.shiftCount === 1 ? "" : "s"}
                  {row.overtimeMinutes > 0 &&
                    ` · ${formatPayrollHoursLabel(row.overtimeMinutes, "ot")}`}
                  {row.undertimeMinutes > 0 &&
                    ` · ${formatPayrollHoursLabel(row.undertimeMinutes, "ut")}`}
                  {row.cashAdvanceDeduction > 0 &&
                    ` · Advances −${formatCurrency(row.cashAdvanceDeduction)}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-brand-text tabular-nums">
                  {formatCurrency(row.netPay)}
                </span>
                <ChevronRight className="h-5 w-5 text-brand-text/35" />
              </div>
            </button>
          ))
        )}
      </div>

      <LoadMoreFooter
        hasMore={hasMoreSummaries}
        remaining={remainingSummaries}
        onLoadMore={loadMoreSummaries}
      />

      {loading && (
        <p className="mt-3 text-xs text-brand-text/50">Updating payroll data…</p>
      )}

      {detailsSummary && (
        <PayrollDetailsModal
          summary={detailsSummary}
          periodLabel={period.label}
          schedules={detailsSchedules}
          staffPayrollHistory={staffPayrollHistory}
          canEditOtUt={isAdminLike(role)}
          onClose={() => setDetailsSummary(null)}
          onSaveShiftPay={saveScheduleShiftPay}
          onAdvanceAdded={handleAdvanceAdded}
          onSelectPeriod={(nextMonth, nextPeriod) =>
            selectStaffPayPeriod(detailsSummary.staffId, nextMonth, nextPeriod)
          }
        />
      )}
    </div>
  );
}
