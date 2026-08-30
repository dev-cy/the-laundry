"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadMoreFooter } from "@/components/ui/LoadMoreFooter";
import type { Schedule, StaffCashAdvance } from "@/lib/types";
import { useLoadMore } from "@/lib/use-load-more";
import { formatCurrency } from "@/lib/utils";
import {
  formatBranchPayrollLabel,
  formatPayrollDate,
  formatPayrollHoursLabel,
  type PayPeriod,
  type SchedulePayrollLine,
  type StaffPayrollPeriodSnapshot,
  type StaffPayrollSummary,
} from "@/lib/payroll";

function SectionCard({
  title,
  totalValue,
  children,
}: {
  title: string;
  totalValue: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-brand-blue/10 bg-white overflow-hidden">
      <div className="flex items-center justify-between border-b border-brand-blue/10 px-4 py-3">
        <h4 className="text-sm font-semibold text-brand-text">{title}</h4>
        <span className="text-sm font-semibold text-brand-blue tabular-nums">{totalValue}</span>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function LineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-brand-text/65">{label}</span>
      <span className="font-medium text-brand-text tabular-nums">{value}</span>
    </div>
  );
}

function minutesToHours(minutes: number): string {
  if (minutes <= 0) return "";
  return String(Math.round(minutes / 60));
}

function hoursToMinutes(hours: number): number {
  return Math.max(0, Math.round(hours) * 60);
}

function previewAdjustmentAmount(
  dailySalary: number,
  scheduledMinutes: number,
  minutes: number
): number {
  if (minutes <= 0) return 0;
  const hourlyRate = dailySalary / (scheduledMinutes / 60 || 1);
  return Math.round((minutes / 60) * hourlyRate);
}

type ShiftDraft = {
  ot: number;
  ut: number;
  dailyPay: string;
};

type EditView = {
  scheduleId: string;
  type: "ot" | "ut";
};

const PAYROLL_HISTORY_DROPDOWN_SIZE = 3;

function periodKey(month: string, period: PayPeriod) {
  return `${month}:${period}`;
}

export function PayrollDetailsModal({
  summary,
  periodLabel,
  schedules,
  staffPayrollHistory,
  canEditOtUt,
  onClose,
  onSaveShiftPay,
  onAdvanceAdded,
  onSelectPeriod,
}: {
  summary: StaffPayrollSummary;
  periodLabel: string;
  schedules: Schedule[];
  staffPayrollHistory: StaffPayrollPeriodSnapshot[];
  canEditOtUt: boolean;
  onClose: () => void;
  onSaveShiftPay: (
    scheduleId: string,
    overtimeMinutes: number,
    undertimeMinutes: number,
    dailyPayOverride: number | null
  ) => Promise<void>;
  onAdvanceAdded: (advance: StaffCashAdvance) => void;
  onSelectPeriod: (month: string, period: PayPeriod) => void;
}) {
  const supabase = createClient();
  const [editView, setEditView] = useState<EditView | null>(null);
  const [hoursInput, setHoursInput] = useState("");
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [savingAdvance, setSavingAdvance] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [advanceForm, setAdvanceForm] = useState({
    amount: "",
    advance_date: summary.cashAdvances[0]?.advance_date ?? summary.lines[0]?.date ?? "",
    notes: "",
  });
  const [draftShifts, setDraftShifts] = useState<Record<string, ShiftDraft>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const scheduleById = useMemo(
    () => Object.fromEntries(schedules.map((schedule) => [schedule.id, schedule])),
    [schedules]
  );

  const lineByScheduleId = useMemo(
    () => Object.fromEntries(summary.lines.map((line) => [line.scheduleId, line])),
    [summary.lines]
  );

  useEffect(() => {
    setDraftShifts(
      Object.fromEntries(
        summary.lines.map((line) => {
          const schedule = scheduleById[line.scheduleId];
          return [
            line.scheduleId,
            {
              ot: schedule?.overtime_minutes ?? line.manualOvertimeMinutes ?? 0,
              ut: schedule?.undertime_minutes ?? line.manualUndertimeMinutes ?? 0,
              dailyPay: String(line.basePay),
            },
          ];
        })
      )
    );
    setEditView(null);
    setSaveError(null);
  }, [summary.staffId, summary.lines, scheduleById]);

  useEffect(() => {
    if (!editView) {
      setHoursInput("");
      return;
    }
    const draft = draftShifts[editView.scheduleId];
    const minutes = draft?.[editView.type] ?? 0;
    setHoursInput(minutesToHours(minutes));
    setSaveError(null);
  }, [editView, draftShifts]);

  const {
    visible: visibleHistory,
    hasMore: hasMoreHistory,
    loadMore: loadMoreHistory,
    remaining: remainingHistory,
  } = useLoadMore(staffPayrollHistory, PAYROLL_HISTORY_DROPDOWN_SIZE);

  const selectedHistoryEntry = useMemo(
    () => staffPayrollHistory.find((entry) => entry.isSelected),
    [staffPayrollHistory]
  );

  const historyDropdownItems = useMemo(() => {
    const merged = [...visibleHistory];
    if (
      selectedHistoryEntry &&
      !merged.some(
        (entry) =>
          entry.month === selectedHistoryEntry.month &&
          entry.period === selectedHistoryEntry.period
      )
    ) {
      merged.push(selectedHistoryEntry);
    }
    const order = new Map(
      staffPayrollHistory.map((entry, index) => [
        periodKey(entry.month, entry.period),
        index,
      ])
    );
    return merged.sort(
      (a, b) =>
        (order.get(periodKey(a.month, a.period)) ?? 0) -
        (order.get(periodKey(b.month, b.period)) ?? 0)
    );
  }, [visibleHistory, selectedHistoryEntry, staffPayrollHistory]);
  const {
    visible: visibleLines,
    hasMore: hasMoreLines,
    loadMore: loadMoreLines,
    remaining: remainingLines,
  } = useLoadMore(summary.lines);
  const {
    visible: visibleAdvances,
    hasMore: hasMoreAdvances,
    loadMore: loadMoreAdvances,
    remaining: remainingAdvances,
  } = useLoadMore(summary.cashAdvances);

  const editingLine = editView ? lineByScheduleId[editView.scheduleId] : null;
  const editingDraft = editView ? draftShifts[editView.scheduleId] : null;

  function openShiftEditor(scheduleId: string) {
    if (!canEditOtUt) return;
    setEditView({ scheduleId, type: "ot" });
  }

  function resolveDailyPayOverride(dailyPayValue: string): number | null {
    const parsed = parseInt(dailyPayValue, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return parsed === summary.dailySalary ? null : parsed;
  }

  async function handleSaveShift() {
    if (!editView || !editingLine || !editingDraft) return;

    const parsedHours = parseInt(hoursInput, 10);
    const minutes = Number.isFinite(parsedHours) ? hoursToMinutes(parsedHours) : 0;
    const nextDraft: ShiftDraft = {
      ...editingDraft,
      ot: editView.type === "ot" ? minutes : editingDraft.ot,
      ut: editView.type === "ut" ? minutes : editingDraft.ut,
    };

    setSaving(true);
    setSaveError(null);
    try {
      await onSaveShiftPay(
        editView.scheduleId,
        nextDraft.ot,
        nextDraft.ut,
        resolveDailyPayOverride(nextDraft.dailyPay)
      );
      setDraftShifts((state) => ({ ...state, [editView.scheduleId]: nextDraft }));
      setEditView(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save shift pay.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddAdvance(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseInt(advanceForm.amount, 10);
    if (!amount || amount <= 0) {
      setAdvanceError("Enter a valid amount.");
      return;
    }
    if (!advanceForm.advance_date) {
      setAdvanceError("Select a date.");
      return;
    }

    setSavingAdvance(true);
    setAdvanceError(null);

    const { data, error } = await supabase
      .from("staff_cash_advances")
      .insert({
        staff_id: summary.staffId,
        branch_id: summary.branchId,
        amount,
        advance_date: advanceForm.advance_date,
        notes: advanceForm.notes.trim() || null,
      })
      .select("*")
      .single();

    setSavingAdvance(false);
    if (error) {
      setAdvanceError(error.message);
      return;
    }

    if (data) {
      onAdvanceAdded(data as StaffCashAdvance);
      setShowAdvanceForm(false);
      setAdvanceForm({ amount: "", advance_date: advanceForm.advance_date, notes: "" });
    }
  }

  const draftDailyPay = parseInt(editingDraft?.dailyPay ?? "", 10);
  const effectiveDailyPay =
    Number.isFinite(draftDailyPay) && draftDailyPay >= 0
      ? draftDailyPay
      : editingLine?.dailySalary ?? summary.dailySalary;

  const editPreview =
    editingLine && editView
      ? previewAdjustmentAmount(
          effectiveDailyPay,
          editingLine.scheduledMinutes,
          hoursToMinutes(parseInt(hoursInput, 10) || 0)
        )
      : 0;

  function renderShiftRow(line: SchedulePayrollLine, interactive: boolean) {
    const draft = draftShifts[line.scheduleId];
    const otMinutes = draft?.ot ?? line.totalOvertimeMinutes;
    const utMinutes = draft?.ut ?? line.totalUndertimeMinutes;
    const otLabel = formatPayrollHoursLabel(otMinutes, "ot");
    const utLabel = formatPayrollHoursLabel(utMinutes, "ut");
    const payAmount = formatCurrency(line.basePay);

    const left = (
      <span className="text-sm text-brand-text/70">
        {formatPayrollDate(line.date)}
        {otLabel && <span className="ml-2 text-xs font-medium text-emerald-700">{otLabel}</span>}
        {utLabel && <span className="ml-2 text-xs font-medium text-amber-700">{utLabel}</span>}
      </span>
    );

    const right = (
      <span className="text-sm font-semibold text-brand-text tabular-nums">
        {payAmount}
        {line.hasPayOverride && (
          <span className="ml-0.5 text-brand-blue" title="Custom daily rate">
            *
          </span>
        )}
      </span>
    );

    if (interactive) {
      return (
        <button
          key={line.scheduleId}
          type="button"
          onClick={() => openShiftEditor(line.scheduleId)}
          className="flex w-full items-center justify-between gap-3 py-2 text-left hover:opacity-80"
        >
          {left}
          {right}
        </button>
      );
    }

    return (
      <div key={line.scheduleId} className="flex items-center justify-between gap-3 py-2">
        {left}
        {right}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-gray-50 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payroll-details-title"
      >
        <div className="overflow-y-auto flex-1 px-5 pt-6 pb-4">
          {editView && editingLine && editingDraft ? (
            <>
              <button
                type="button"
                onClick={() => setEditView(null)}
                className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>

              <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-blue/70">
                Shift pay
              </p>
              <h2 className="mt-1 text-xl font-bold text-brand-text">
                {formatPayrollDate(editingLine.date)}
              </h2>
              <p className="mt-1 text-sm text-brand-text/60">{summary.staffName}</p>

              <div className="mt-5">
                <Input
                  label="Daily salary (₱)"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  placeholder={String(summary.dailySalary)}
                  value={editingDraft.dailyPay}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDraftShifts((state) => ({
                      ...state,
                      [editView.scheduleId]: {
                        ...editingDraft,
                        dailyPay: value,
                      },
                    }));
                  }}
                />
                <p className="mt-2 text-xs text-brand-text/50">
                  Default daily rate is {formatCurrency(summary.dailySalary)}. Change for holidays
                  or special days — saved amounts show a * on the list.
                </p>
              </div>

              <div className="mt-5 flex rounded-lg border border-brand-blue/15 bg-white p-1">
                {(["ot", "ut"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEditView({ scheduleId: editView.scheduleId, type })}
                    className={[
                      "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      editView.type === type
                        ? "bg-brand-blue text-white"
                        : "text-brand-text/65 hover:bg-brand-light/20",
                    ].join(" ")}
                  >
                    {type === "ot" ? "OT" : "UT"}
                  </button>
                ))}
              </div>

              <div className="mt-5">
                <Input
                  label="Hours"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  placeholder="0"
                  value={hoursInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      setHoursInput("");
                      return;
                    }
                    const parsed = parseInt(value, 10);
                    if (Number.isFinite(parsed) && parsed >= 0) {
                      setHoursInput(String(parsed));
                    }
                  }}
                />
                <p className="mt-2 text-xs text-brand-text/50">
                  {editView.type === "ot"
                    ? "OT is paid at the regular hourly rate from the daily salary above."
                    : "UT is deducted at the regular hourly rate from the daily salary above."}
                  {effectiveDailyPay > 0 && (
                    <span className="block mt-1 tabular-nums">
                      Hourly rate:{" "}
                      {formatCurrency(
                        Math.round(
                          effectiveDailyPay / (editingLine.scheduledMinutes / 60 || 1)
                        )
                      )}
                    </span>
                  )}
                </p>
                {editPreview > 0 && (
                  <p
                    className={[
                      "mt-3 text-sm font-semibold tabular-nums",
                      editView.type === "ot" ? "text-emerald-700" : "text-amber-700",
                    ].join(" ")}
                  >
                    {editView.type === "ot"
                      ? `+${formatCurrency(editPreview)}`
                      : `−${formatCurrency(editPreview)}`}
                  </p>
                )}
              </div>

              {saveError && (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {saveError}
                </p>
              )}

              <Button
                type="button"
                className="mt-6 w-full"
                disabled={saving}
                onClick={handleSaveShift}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </>
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-blue/70">
                Payroll details
              </p>
              <h2 id="payroll-details-title" className="mt-1 text-xl font-bold text-brand-text">
                {summary.staffName}
              </h2>
              <p className="mt-1 text-sm text-brand-text/60">{periodLabel}</p>
              <p className="text-sm text-brand-text/60">
                {formatBranchPayrollLabel(summary.branchLocation, summary.branchName)}
              </p>

              {staffPayrollHistory.length > 1 && (
                <div className="mt-4">
                  <Select
                    label="Past payrolls"
                    value={
                      selectedHistoryEntry
                        ? periodKey(selectedHistoryEntry.month, selectedHistoryEntry.period)
                        : periodKey(staffPayrollHistory[0].month, staffPayrollHistory[0].period)
                    }
                    onChange={(e) => {
                      const [month, period] = e.target.value.split(":");
                      onSelectPeriod(month, period as PayPeriod);
                    }}
                    options={historyDropdownItems.map((entry) => ({
                      value: periodKey(entry.month, entry.period),
                      label: `${entry.label} — ${formatCurrency(entry.netPay)}${
                        entry.isCurrent ? " (Current)" : ""
                      }`,
                    }))}
                  />
                  {hasMoreHistory && (
                    <button
                      type="button"
                      onClick={loadMoreHistory}
                      className="mt-2 text-xs font-medium text-brand-blue hover:underline"
                    >
                      Load more ({remainingHistory} remaining)
                    </button>
                  )}
                </div>
              )}

              <div className="mt-5 rounded-xl bg-brand-light/25 px-4 py-3">
                {canEditOtUt && summary.lines.length > 0 && (
                  <p className="mb-3 text-xs text-brand-text/55">
                    Click or tap a date to set daily pay, OT, or UT. * marks a custom daily rate.
                  </p>
                )}
                {summary.lines.length === 0 ? (
                  <p className="py-2 text-center text-sm text-brand-text/50">No shifts this period.</p>
                ) : (
                  visibleLines.map((line) => renderShiftRow(line, canEditOtUt))
                )}
                <LoadMoreFooter
                  hasMore={hasMoreLines}
                  remaining={remainingLines}
                  onLoadMore={loadMoreLines}
                />

                {summary.lines.length > 0 && (
                  <div className="mt-2 border-t border-brand-blue/15 pt-2 space-y-1">
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-sm font-medium text-brand-text/70">Overtime (OT)</span>
                      <span className="text-sm font-semibold text-emerald-700 tabular-nums">
                        {summary.overtimePay > 0
                          ? `+${formatCurrency(summary.overtimePay)}`
                          : formatCurrency(0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-sm font-medium text-brand-text/70">Undertime (UT)</span>
                      <span className="text-sm font-semibold text-amber-700 tabular-nums">
                        {summary.undertimeDeduction > 0
                          ? `−${formatCurrency(summary.undertimeDeduction)}`
                          : formatCurrency(0)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-3">
                <SectionCard
                  title="Cash advances"
                  totalValue={`Deduct ${formatCurrency(summary.cashAdvanceDeduction)}`}
                >
                  {summary.cashAdvances.length === 0 ? (
                    <p className="text-sm text-brand-text/50">No cash advances on file.</p>
                  ) : (
                    visibleAdvances.map((advance) => (
                      <LineRow
                        key={advance.id}
                        label={formatPayrollDate(advance.advance_date)}
                        value={`−${formatCurrency(advance.amount)}`}
                      />
                    ))
                  )}
                  <LoadMoreFooter
                    hasMore={hasMoreAdvances}
                    remaining={remainingAdvances}
                    onLoadMore={loadMoreAdvances}
                  />
                  {!showAdvanceForm ? (
                    <button
                      type="button"
                      onClick={() => setShowAdvanceForm(true)}
                      className="mt-2 text-xs font-medium text-brand-blue hover:underline"
                    >
                      + Record cash advance
                    </button>
                  ) : (
                    <form
                      onSubmit={handleAddAdvance}
                      className="mt-3 space-y-3 border-t border-brand-blue/10 pt-3"
                    >
                      {advanceError && <p className="text-xs text-red-600">{advanceError}</p>}
                      <Input
                        label="Amount (₱)"
                        type="number"
                        min={1}
                        value={advanceForm.amount}
                        onChange={(e) =>
                          setAdvanceForm({ ...advanceForm, amount: e.target.value })
                        }
                        required
                      />
                      <Input
                        label="Date"
                        type="date"
                        value={advanceForm.advance_date}
                        onChange={(e) =>
                          setAdvanceForm({ ...advanceForm, advance_date: e.target.value })
                        }
                        required
                      />
                      <Input
                        label="Notes (optional)"
                        value={advanceForm.notes}
                        onChange={(e) =>
                          setAdvanceForm({ ...advanceForm, notes: e.target.value })
                        }
                      />
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={savingAdvance}>
                          {savingAdvance ? "Saving…" : "Save advance"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAdvanceForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}
                </SectionCard>
              </div>

              <div className="mt-4 rounded-xl bg-brand-light/35 px-4 py-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-brand-text/70">Days worked</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(summary.basePay)}</span>
                </div>
                {summary.overtimePay > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-text/70">Overtime</span>
                    <span className="font-semibold text-emerald-700 tabular-nums">
                      +{formatCurrency(summary.overtimePay)}
                    </span>
                  </div>
                )}
                {summary.undertimeDeduction > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-text/70">Undertime</span>
                    <span className="font-semibold text-amber-700 tabular-nums">
                      −{formatCurrency(summary.undertimeDeduction)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-brand-blue/10 pt-2 text-sm">
                  <span className="font-medium text-brand-text">Gross</span>
                  <span className="font-bold tabular-nums">{formatCurrency(summary.grossPay)}</span>
                </div>
                {summary.cashAdvanceDeduction > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-text/70">Cash advances</span>
                    <span className="font-semibold text-amber-700 tabular-nums">
                      −{formatCurrency(summary.cashAdvanceDeduction)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-1">
                  <span className="font-semibold text-brand-text">Net payout</span>
                  <span className="text-lg font-bold text-brand-text tabular-nums">
                    {formatCurrency(summary.netPay)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-brand-blue/10 bg-white p-4">
          <Button type="button" variant="ghost" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
