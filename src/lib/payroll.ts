import { PAYROLL_HISTORY_START_MONTH } from "@/lib/constants";
import type { Schedule, Staff, StaffCashAdvance } from "@/lib/types";

export type PayPeriod = "first" | "second";

export type PayrollScheduleInput = Pick<
  Schedule,
  | "id"
  | "branch_id"
  | "staff_id"
  | "customer_name"
  | "scheduled_date"
  | "scheduled_time"
  | "scheduled_time_out"
  | "actual_time_in"
  | "actual_time_out"
  | "overtime_minutes"
  | "undertime_minutes"
  | "daily_pay_override"
  | "status"
  | "service_type"
>;

export type SchedulePayrollLine = {
  scheduleId: string;
  date: string;
  shiftLabel: string;
  scheduledMinutes: number;
  workedMinutes: number;
  autoOvertimeMinutes: number;
  autoUndertimeMinutes: number;
  manualOvertimeMinutes: number;
  manualUndertimeMinutes: number;
  totalOvertimeMinutes: number;
  totalUndertimeMinutes: number;
  hourlyRate: number;
  basePay: number;
  dailySalary: number;
  hasPayOverride: boolean;
  overtimePay: number;
  undertimeDeduction: number;
  netPay: number;
  scheduledIn: string | null;
  scheduledOut: string | null;
  actualIn: string | null;
  actualOut: string | null;
  attendanceNeedsReview: boolean;
  attendanceReviewReason: string | null;
};

export type AttendanceVariance = {
  hasSignIn: boolean;
  hasSignOut: boolean;
  scheduledIn: string | null;
  scheduledOut: string | null;
  actualIn: string | null;
  actualOut: string | null;
  workedMinutes: number;
  suggestedOvertimeMinutes: number;
  suggestedUndertimeMinutes: number;
  needsReview: boolean;
  reviewReason: string | null;
};

export type StaffPayrollSummary = {
  staffId: string;
  staffName: string;
  branchId: string;
  branchName: string;
  branchLocation: string;
  dailySalary: number;
  shiftCount: number;
  basePay: number;
  overtimeMinutes: number;
  undertimeMinutes: number;
  overtimePay: number;
  undertimeDeduction: number;
  grossPay: number;
  cashAdvanceDeduction: number;
  netPay: number;
  pendingReviewCount: number;
  lines: SchedulePayrollLine[];
  cashAdvances: StaffCashAdvance[];
};

const SHIFT_LABELS: Record<Schedule["service_type"], string> = {
  pickup: "Morning",
  delivery: "Afternoon",
  both: "Whole day",
};

const ATTENDANCE_TOLERANCE_MINUTES = 5;

export function formatClockTime(value: string | null | undefined): string {
  if (!value) return "—";
  return value.slice(0, 5);
}

export function computeAttendanceVariance(
  schedule: Pick<
    PayrollScheduleInput,
    | "scheduled_time"
    | "scheduled_time_out"
    | "actual_time_in"
    | "actual_time_out"
    | "overtime_minutes"
    | "undertime_minutes"
  >
): AttendanceVariance {
  const scheduledIn = schedule.scheduled_time?.slice(0, 5) ?? null;
  const scheduledOut = schedule.scheduled_time_out?.slice(0, 5) ?? null;
  const actualIn = schedule.actual_time_in?.slice(0, 5) ?? null;
  const actualOut = schedule.actual_time_out?.slice(0, 5) ?? null;
  const hasSignIn = Boolean(actualIn);
  const hasSignOut = Boolean(actualOut);
  const manualOvertimeMinutes = Math.max(0, schedule.overtime_minutes ?? 0);
  const manualUndertimeMinutes = Math.max(0, schedule.undertime_minutes ?? 0);

  if (!hasSignIn || !hasSignOut) {
    const reasons: string[] = [];
    if (!hasSignIn) reasons.push("missing time in");
    if (!hasSignOut) reasons.push("missing time out");
    const manuallyAcknowledged =
      manualOvertimeMinutes > 0 || manualUndertimeMinutes > 0;
    return {
      hasSignIn,
      hasSignOut,
      scheduledIn,
      scheduledOut,
      actualIn,
      actualOut,
      workedMinutes: 0,
      suggestedOvertimeMinutes: 0,
      suggestedUndertimeMinutes: 0,
      needsReview: !manuallyAcknowledged,
      reviewReason: manuallyAcknowledged ? null : reasons.join(" and "),
    };
  }

  const scheduledStart = timeToMinutes(scheduledIn);
  let scheduledEnd = timeToMinutes(scheduledOut);
  const actualStart = timeToMinutes(actualIn);
  let actualEnd = timeToMinutes(actualOut);
  if (scheduledEnd <= scheduledStart) scheduledEnd += 24 * 60;
  if (actualEnd <= actualStart) actualEnd += 24 * 60;

  const workedMinutes = Math.max(0, actualEnd - actualStart);
  const scheduledMinutes = Math.max(0, scheduledEnd - scheduledStart);

  let suggestedUndertimeMinutes = Math.max(0, actualStart - scheduledStart);
  suggestedUndertimeMinutes += Math.max(0, scheduledEnd - actualEnd);
  let suggestedOvertimeMinutes = Math.max(0, actualEnd - scheduledEnd);

  const durationDiff = workedMinutes - scheduledMinutes;
  if (durationDiff > ATTENDANCE_TOLERANCE_MINUTES && suggestedOvertimeMinutes === 0) {
    suggestedOvertimeMinutes = durationDiff;
  }
  if (durationDiff < -ATTENDANCE_TOLERANCE_MINUTES && suggestedUndertimeMinutes === 0) {
    suggestedUndertimeMinutes = -durationDiff;
  }

  if (suggestedUndertimeMinutes <= ATTENDANCE_TOLERANCE_MINUTES) {
    suggestedUndertimeMinutes = 0;
  }
  if (suggestedOvertimeMinutes <= ATTENDANCE_TOLERANCE_MINUTES) {
    suggestedOvertimeMinutes = 0;
  }

  const otApproved =
    suggestedOvertimeMinutes === 0 ||
    manualOvertimeMinutes >= suggestedOvertimeMinutes;
  const utApproved =
    suggestedUndertimeMinutes === 0 ||
    manualUndertimeMinutes >= suggestedUndertimeMinutes;
  const hasSuggestion =
    suggestedOvertimeMinutes > 0 || suggestedUndertimeMinutes > 0;

  let reviewReason: string | null = null;
  if (hasSuggestion && (!otApproved || !utApproved)) {
    const parts: string[] = [];
    if (suggestedOvertimeMinutes > 0 && !otApproved) {
      parts.push(`${formatPayrollHoursLabel(suggestedOvertimeMinutes, "ot")} suggested`);
    }
    if (suggestedUndertimeMinutes > 0 && !utApproved) {
      parts.push(`${formatPayrollHoursLabel(suggestedUndertimeMinutes, "ut")} suggested`);
    }
    reviewReason = parts.join(", ");
  }

  return {
    hasSignIn,
    hasSignOut,
    scheduledIn,
    scheduledOut,
    actualIn,
    actualOut,
    workedMinutes,
    suggestedOvertimeMinutes,
    suggestedUndertimeMinutes,
    needsReview: hasSuggestion && (!otApproved || !utApproved),
    reviewReason,
  };
}

export function countPendingAttendanceReviews(lines: SchedulePayrollLine[]): number {
  return lines.filter((line) => line.attendanceNeedsReview).length;
}

export function timeToMinutes(value: string | null | undefined): number {
  if (!value) return 0;
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + (minutes || 0);
}

export function minutesBetween(
  start: string | null | undefined,
  end: string | null | undefined
): number {
  const startMinutes = timeToMinutes(start);
  let endMinutes = timeToMinutes(end);
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  return Math.max(0, endMinutes - startMinutes);
}

export function formatMinutesAsHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function formatPayrollDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isPayableSchedule(schedule: Pick<Schedule, "status">): boolean {
  return schedule.status !== "cancelled";
}

export function resolveStaffForSchedule(
  schedule: PayrollScheduleInput,
  staff: Staff[]
): Staff | undefined {
  if (schedule.staff_id) {
    return staff.find((member) => member.id === schedule.staff_id);
  }
  return staff.find(
    (member) =>
      member.branch_id === schedule.branch_id &&
      member.name.trim().toLowerCase() === schedule.customer_name.trim().toLowerCase()
  );
}

export function formatPayrollHoursLabel(minutes: number, kind: "ot" | "ut"): string {
  const hours = Math.round(minutes / 60);
  if (hours <= 0) return "";
  const unit = hours === 1 ? "1hr" : `${hours}hrs`;
  return kind === "ot" ? `${unit} OT` : `${unit} UT`;
}

export function resolveShiftDailyPay(
  schedule: Pick<PayrollScheduleInput, "daily_pay_override">,
  staffDailySalary: number
): { dailySalary: number; hasPayOverride: boolean } {
  if (schedule.daily_pay_override != null) {
    return { dailySalary: schedule.daily_pay_override, hasPayOverride: true };
  }
  return { dailySalary: staffDailySalary, hasPayOverride: false };
}

export function computeSchedulePayroll(
  schedule: PayrollScheduleInput,
  staffDailySalary: number
): SchedulePayrollLine {
  const { dailySalary, hasPayOverride } = resolveShiftDailyPay(schedule, staffDailySalary);
  const variance = computeAttendanceVariance(schedule);
  const scheduledMinutes = minutesBetween(
    schedule.scheduled_time ?? "07:00",
    schedule.scheduled_time_out ?? "16:00"
  );
  const manualOvertimeMinutes = Math.max(0, schedule.overtime_minutes ?? 0);
  const manualUndertimeMinutes = Math.max(0, schedule.undertime_minutes ?? 0);
  const totalOvertimeMinutes = manualOvertimeMinutes;
  const totalUndertimeMinutes = manualUndertimeMinutes;

  const scheduledHours = scheduledMinutes / 60 || 1;
  const hourlyRate = dailySalary / scheduledHours;
  const basePay = dailySalary;
  const overtimePay = (totalOvertimeMinutes / 60) * hourlyRate;
  const undertimeDeduction = (totalUndertimeMinutes / 60) * hourlyRate;
  const netPay = Math.max(0, Math.round(basePay + overtimePay - undertimeDeduction));

  return {
    scheduleId: schedule.id,
    date: schedule.scheduled_date,
    shiftLabel: SHIFT_LABELS[schedule.service_type],
    scheduledMinutes,
    workedMinutes: variance.workedMinutes || scheduledMinutes,
    autoOvertimeMinutes: variance.suggestedOvertimeMinutes,
    autoUndertimeMinutes: variance.suggestedUndertimeMinutes,
    manualOvertimeMinutes,
    manualUndertimeMinutes,
    totalOvertimeMinutes,
    totalUndertimeMinutes,
    hourlyRate,
    basePay,
    dailySalary,
    hasPayOverride,
    overtimePay: Math.round(overtimePay),
    undertimeDeduction: Math.round(undertimeDeduction),
    netPay,
    scheduledIn: variance.scheduledIn,
    scheduledOut: variance.scheduledOut,
    actualIn: variance.actualIn,
    actualOut: variance.actualOut,
    attendanceNeedsReview: variance.needsReview,
    attendanceReviewReason: variance.reviewReason,
  };
}

export function payPeriodBounds(
  monthValue: string,
  period: PayPeriod
): { start: string; end: string; label: string; shortLabel: string } {
  const [year, month] = monthValue.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();

  const formatDay = (day: number) =>
    new Date(year, month - 1, day).toLocaleDateString("en-PH", {
      month: "long",
      day: "numeric",
    });

  if (period === "first") {
    const start = `${monthValue}-01`;
    const end = `${monthValue}-15`;
    return {
      start,
      end,
      label: `${formatDay(1)} – ${formatDay(15)}`,
      shortLabel: "1 – 15",
    };
  }

  const start = `${monthValue}-16`;
  const end = `${monthValue}-${String(lastDay).padStart(2, "0")}`;
  return {
    start,
    end,
    label: `${formatDay(16)} – ${formatDay(lastDay)}`,
    shortLabel: `16 – ${lastDay}`,
  };
}

export function monthBounds(monthValue: string): { start: string; end: string } {
  const [year, month] = monthValue.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${monthValue}-01`,
    end: `${monthValue}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function defaultPayPeriod(): PayPeriod {
  return new Date().getDate() <= 15 ? "first" : "second";
}

export function isCurrentPayPeriod(month: string, period: PayPeriod): boolean {
  return month === currentMonthValue() && period === defaultPayPeriod();
}

export function listPayPeriodsFromStart(): { month: string; period: PayPeriod }[] {
  const items: { month: string; period: PayPeriod }[] = [];
  let month = PAYROLL_HISTORY_START_MONTH;
  let period: PayPeriod = "first";
  const endMonth = currentMonthValue();
  const endPeriod = defaultPayPeriod();

  for (;;) {
    items.push({ month, period });
    if (month === endMonth && period === endPeriod) break;

    if (period === "first") {
      period = "second";
    } else {
      period = "first";
      const [year, monthNum] = month.split("-").map(Number);
      const next = new Date(year, monthNum, 1);
      month = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    }
  }

  return items.reverse();
}

export function historyDateRange(): { start: string; end: string } {
  return {
    start: `${PAYROLL_HISTORY_START_MONTH}-01`,
    end: monthBounds(currentMonthValue()).end,
  };
}

export type StaffPayrollPeriodSnapshot = {
  month: string;
  period: PayPeriod;
  label: string;
  netPay: number;
  shiftCount: number;
  isCurrent: boolean;
  isSelected: boolean;
};

export function buildStaffPayrollHistory({
  staffId,
  staff,
  schedules,
  cashAdvances,
  branchNameById,
  branchLocationById,
  selectedMonth,
  selectedPeriod,
}: {
  staffId: string;
  staff: Staff[];
  schedules: PayrollScheduleInput[];
  cashAdvances: StaffCashAdvance[];
  branchNameById: Record<string, string>;
  branchLocationById: Record<string, string>;
  selectedMonth: string;
  selectedPeriod: PayPeriod;
}): StaffPayrollPeriodSnapshot[] {
  const member = staff.find((row) => row.id === staffId);
  if (!member) return [];

  return listPayPeriodsFromStart()
    .map(({ month, period }) => {
      const bounds = payPeriodBounds(month, period);
      const summaries = computeStaffPayrollSummaries({
        staff: [member],
        schedules,
        cashAdvances,
        branchNameById,
        branchLocationById,
        periodStart: bounds.start,
        periodEnd: bounds.end,
        branchId: null,
      });
      const summary = summaries[0];

      return {
        month,
        period,
        label: bounds.label,
        netPay: summary?.netPay ?? 0,
        shiftCount: summary?.shiftCount ?? 0,
        isCurrent: isCurrentPayPeriod(month, period),
        isSelected: month === selectedMonth && period === selectedPeriod,
      };
    })
    .filter((entry) => entry.netPay > 0);
}

export function computeStaffPayrollSummaryForStaff({
  staffId,
  staff,
  schedules,
  cashAdvances,
  branchNameById,
  branchLocationById,
  month,
  period,
}: {
  staffId: string;
  staff: Staff[];
  schedules: PayrollScheduleInput[];
  cashAdvances: StaffCashAdvance[];
  branchNameById: Record<string, string>;
  branchLocationById: Record<string, string>;
  month: string;
  period: PayPeriod;
}): StaffPayrollSummary | null {
  const bounds = payPeriodBounds(month, period);
  const member = staff.find((row) => row.id === staffId);
  if (!member) return null;

  return (
    computeStaffPayrollSummaries({
      staff: [member],
      schedules,
      cashAdvances,
      branchNameById,
      branchLocationById,
      periodStart: bounds.start,
      periodEnd: bounds.end,
      branchId: null,
    })[0] ?? null
  );
}

export function computeStaffPayrollSummaries({
  staff,
  schedules,
  cashAdvances,
  branchNameById,
  branchLocationById,
  periodStart,
  periodEnd,
  branchId,
}: {
  staff: Staff[];
  schedules: PayrollScheduleInput[];
  cashAdvances: StaffCashAdvance[];
  branchNameById: Record<string, string>;
  branchLocationById: Record<string, string>;
  periodStart: string;
  periodEnd: string;
  branchId: string | null;
}): StaffPayrollSummary[] {
  const filteredStaff = branchId
    ? staff.filter((member) => member.branch_id === branchId)
    : staff;

  return filteredStaff
    .map((member) => {
      const memberSchedules = schedules.filter((schedule) => {
        if (!isPayableSchedule(schedule)) return false;
        if (schedule.scheduled_date < periodStart || schedule.scheduled_date > periodEnd) {
          return false;
        }
        const matched = resolveStaffForSchedule(schedule, [member]);
        return matched?.id === member.id;
      });

      const lines = memberSchedules.map((schedule) =>
        computeSchedulePayroll(schedule, member.salary)
      );

      const memberAdvances = cashAdvances.filter(
        (advance) =>
          advance.staff_id === member.id &&
          advance.advance_date >= periodStart &&
          advance.advance_date <= periodEnd
      );
      const cashAdvanceDeduction = memberAdvances.reduce(
        (sum, advance) => sum + advance.amount,
        0
      );

      const basePay = lines.reduce((sum, line) => sum + line.basePay, 0);
      const overtimePay = lines.reduce((sum, line) => sum + line.overtimePay, 0);
      const undertimeDeduction = lines.reduce(
        (sum, line) => sum + line.undertimeDeduction,
        0
      );
      const grossPay = basePay + overtimePay - undertimeDeduction;
      const netPay = Math.max(0, grossPay - cashAdvanceDeduction);

      const summary: StaffPayrollSummary = {
        staffId: member.id,
        staffName: member.name,
        branchId: member.branch_id,
        branchName: branchNameById[member.branch_id] ?? "—",
        branchLocation: branchLocationById[member.branch_id] ?? "",
        dailySalary: member.salary,
        shiftCount: lines.length,
        basePay,
        overtimeMinutes: lines.reduce((sum, line) => sum + line.totalOvertimeMinutes, 0),
        undertimeMinutes: lines.reduce((sum, line) => sum + line.totalUndertimeMinutes, 0),
        overtimePay,
        undertimeDeduction,
        grossPay,
        cashAdvanceDeduction,
        netPay,
        pendingReviewCount: countPendingAttendanceReviews(lines),
        lines,
        cashAdvances: memberAdvances,
      };

      return summary;
    })
    .filter((summary) => summary.shiftCount > 0 || summary.cashAdvanceDeduction > 0)
    .sort((a, b) => a.staffName.localeCompare(b.staffName));
}

export function formatBranchPayrollLabel(location: string, name: string): string {
  const loc = location.trim().toUpperCase();
  if (!loc) return name;
  return `${loc} - ${name}`;
}
