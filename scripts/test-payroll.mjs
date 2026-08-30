#!/usr/bin/env node
/**
 * Payroll logic smoke tests (mirrors src/lib/payroll.ts — no TS import).
 * Run: node scripts/test-payroll.mjs
 */

const PAYROLL_HISTORY_START_MONTH = "2026-08";

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

function timeToMinutes(value) {
  if (!value) return 0;
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + (minutes || 0);
}

function minutesBetween(start, end) {
  const startMinutes = timeToMinutes(start);
  let endMinutes = timeToMinutes(end);
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  return Math.max(0, endMinutes - startMinutes);
}

function payPeriodBounds(monthValue, period) {
  const [year, month] = monthValue.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  if (period === "first") {
    return { start: `${monthValue}-01`, end: `${monthValue}-15` };
  }
  return {
    start: `${monthValue}-16`,
    end: `${monthValue}-${String(lastDay).padStart(2, "0")}`,
  };
}

function computeSchedulePayroll(schedule, dailySalary) {
  const scheduledMinutes = minutesBetween(
    schedule.scheduled_time ?? "07:00",
    schedule.scheduled_time_out ?? "16:00"
  );
  const manualOvertimeMinutes = Math.max(0, schedule.overtime_minutes ?? 0);
  const hourlyRate = dailySalary / (scheduledMinutes / 60 || 1);
  const overtimePay = (manualOvertimeMinutes / 60) * hourlyRate;
  return { overtimePay: Math.round(overtimePay), netPay: Math.round(dailySalary + overtimePay) };
}

function computeStaffPayrollSummaries({
  staff,
  schedules,
  cashAdvances,
  periodStart,
  periodEnd,
}) {
  return staff
    .map((member) => {
      const lines = schedules.filter(
        (s) =>
          s.staff_id === member.id &&
          s.scheduled_date >= periodStart &&
          s.scheduled_date <= periodEnd &&
          s.status !== "cancelled"
      );
      const memberAdvances = cashAdvances.filter(
        (a) =>
          a.staff_id === member.id &&
          a.advance_date >= periodStart &&
          a.advance_date <= periodEnd
      );
      const cashAdvanceDeduction = memberAdvances.reduce((sum, a) => sum + a.amount, 0);
      const grossPay = lines.length * member.salary;
      const netPay = Math.max(0, grossPay - cashAdvanceDeduction);
      return { shiftCount: lines.length, grossPay, cashAdvanceDeduction, netPay };
    })
    .filter((s) => s.shiftCount > 0 || s.cashAdvanceDeduction > 0);
}

console.log("Payroll logic tests\n");

const augSecond = payPeriodBounds("2026-08", "second");
assert(augSecond.end === "2026-08-31", "August 2026 second period ends on 31st");
assert(augSecond.start === "2026-08-16", "August 2026 second period starts on 16th");

const febSecond = payPeriodBounds("2026-02", "second");
assert(febSecond.end === "2026-02-28", "February 2026 second period ends on 28th (non-leap)");

const otSchedule = {
  scheduled_time: "07:00",
  scheduled_time_out: "16:00",
  overtime_minutes: 120,
  undertime_minutes: 0,
  status: "confirmed",
};
const otLine = computeSchedulePayroll(otSchedule, 450);
assert(otLine.overtimePay > 0, "Manual OT hours at regular rate increases pay");
assert(otLine.netPay > 450, "Net pay exceeds daily rate with manual OT");

const staff = [{ id: "s1", salary: 450 }];
const schedules = [
  { staff_id: "s1", scheduled_date: "2026-08-01", status: "confirmed" },
  { staff_id: "s1", scheduled_date: "2026-08-15", status: "confirmed" },
];
const summaries = computeStaffPayrollSummaries({
  staff,
  schedules,
  cashAdvances: [],
  periodStart: "2026-08-01",
  periodEnd: "2026-08-15",
});
assert(summaries.length === 1 && summaries[0].shiftCount === 2, "Two shifts in first half");

const advanceOnly = computeStaffPayrollSummaries({
  staff,
  schedules: [],
  cashAdvances: [{ staff_id: "s1", advance_date: "2026-08-10", amount: 200 }],
  periodStart: "2026-08-01",
  periodEnd: "2026-08-15",
});
assert(advanceOnly.length === 1, "Advance-only period still lists staff");
assert(advanceOnly[0].cashAdvanceDeduction === 200, "Cash advance amount tracked");

assert(PAYROLL_HISTORY_START_MONTH === "2026-08", "History starts August 2026");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
