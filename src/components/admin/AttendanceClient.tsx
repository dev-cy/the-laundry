"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Branch, Schedule, Staff } from "@/lib/types";
import { isAdminLike, type AppRole } from "@/lib/auth/roles";
import { resolveStaffForSchedule } from "@/lib/payroll";

function todayValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentTimeValue(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function formatTimeLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return value.slice(0, 5);
}

const SHIFT_LABELS: Record<Schedule["service_type"], string> = {
  pickup: "Morning",
  delivery: "Afternoon",
  both: "Whole day",
};

export function AttendanceClient({
  branches,
  initialStaff,
  initialSchedules,
  lockedBranchId,
  role,
}: {
  branches: Branch[];
  initialStaff: Staff[];
  initialSchedules: Schedule[];
  lockedBranchId: string | null;
  role: AppRole;
}) {
  const supabase = createClient();
  const [branchId, setBranchId] = useState(lockedBranchId ?? branches[0]?.id ?? "");
  const [staffId, setStaffId] = useState("");
  const [staff, setStaff] = useState(initialStaff);
  const [schedules, setSchedules] = useState(initialSchedules);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [forms, setForms] = useState<
    Record<string, { actual_time_in: string; actual_time_out: string }>
  >({});

  const branchStaff = useMemo(
    () =>
      staff
        .filter((member) => member.branch_id === branchId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [staff, branchId]
  );

  const selectedStaff = useMemo(
    () => branchStaff.find((member) => member.id === staffId),
    [branchStaff, staffId]
  );

  const todaySchedules = useMemo(() => {
    if (!selectedStaff) return [];
    return schedules
      .filter((schedule) => {
        if (schedule.scheduled_date !== todayValue()) return false;
        if (schedule.branch_id !== branchId) return false;
        if (schedule.status === "cancelled") return false;
        const matched = resolveStaffForSchedule(schedule, [selectedStaff]);
        return matched?.id === selectedStaff.id;
      })
      .sort((a, b) => (a.scheduled_time ?? "").localeCompare(b.scheduled_time ?? ""));
  }, [schedules, selectedStaff, branchId]);

  useEffect(() => {
    setForms(
      Object.fromEntries(
        todaySchedules.map((schedule) => [
          schedule.id,
          {
            actual_time_in: schedule.actual_time_in?.slice(0, 5) ?? "",
            actual_time_out: schedule.actual_time_out?.slice(0, 5) ?? "",
          },
        ])
      )
    );
  }, [todaySchedules]);

  useEffect(() => {
    if (!staffId && branchStaff.length > 0) {
      setStaffId(branchStaff[0].id);
    }
  }, [branchStaff, staffId]);

  async function reloadBranchData(nextBranchId: string) {
    setLoading(true);
    setError(null);

    const today = todayValue();
    const [{ data: nextStaff }, { data: nextSchedules }] = await Promise.all([
      supabase.from("staff").select("*").eq("branch_id", nextBranchId).order("name"),
      supabase
        .from("schedules")
        .select("*")
        .eq("branch_id", nextBranchId)
        .eq("scheduled_date", today)
        .neq("status", "cancelled")
        .order("scheduled_time", { ascending: true }),
    ]);

    if (nextStaff) setStaff(nextStaff as Staff[]);
    if (nextSchedules) setSchedules(nextSchedules as Schedule[]);
    setStaffId("");
    setLoading(false);
  }

  async function handleBranchChange(value: string) {
    setBranchId(value);
    setSuccess(null);
    await reloadBranchData(value);
  }

  async function saveSchedule(schedule: Schedule) {
    const form = forms[schedule.id];
    if (!form) return;

    setSavingId(schedule.id);
    setError(null);
    setSuccess(null);

    const payload = {
      actual_time_in: form.actual_time_in || null,
      actual_time_out: form.actual_time_out || null,
    };

    const { error: updateError } = await supabase
      .from("schedules")
      .update(payload)
      .eq("id", schedule.id);

    setSavingId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSchedules((current) =>
      current.map((row) => (row.id === schedule.id ? { ...row, ...payload } : row))
    );
    setSuccess(`Saved time in/out for ${selectedStaff?.name ?? "staff"}.`);
  }

  function setFormField(
    scheduleId: string,
    field: "actual_time_in" | "actual_time_out",
    value: string
  ) {
    setForms((current) => ({
      ...current,
      [scheduleId]: {
        ...current[scheduleId],
        [field]: value,
      },
    }));
  }

  function clockNow(scheduleId: string, field: "actual_time_in" | "actual_time_out") {
    setFormField(scheduleId, field, currentTimeValue());
  }

  const branchName = branches.find((branch) => branch.id === branchId)?.name ?? "Branch";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-text">Sign In</h1>
        <p className="text-brand-text/60 mt-1">
          Record time in and time out for today — {todayValue()}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-2xl">
        {isAdminLike(role) && !lockedBranchId ? (
          <Select
            label="Branch"
            value={branchId}
            onChange={(e) => handleBranchChange(e.target.value)}
            options={branches.map((branch) => ({ value: branch.id, label: branch.name }))}
          />
        ) : (
          <div>
            <p className="text-sm font-medium text-brand-text">Branch</p>
            <p className="mt-1 text-sm text-brand-text/70">{branchName}</p>
          </div>
        )}

        <Select
          label="Staff"
          value={staffId}
          onChange={(e) => {
            setStaffId(e.target.value);
            setSuccess(null);
          }}
          options={branchStaff.map((member) => ({ value: member.id, label: member.name }))}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 max-w-2xl">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 max-w-2xl">
          {success}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-brand-text/50">Loading branch staff…</p>
      ) : !selectedStaff ? (
        <p className="text-sm text-brand-text/50">Select a staff member to sign in.</p>
      ) : todaySchedules.length === 0 ? (
        <div className="rounded-xl border border-brand-blue/10 bg-white px-4 py-8 text-center text-sm text-brand-text/50 max-w-2xl">
          No shift scheduled for {selectedStaff.name} today at {branchName}.
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {todaySchedules.map((schedule) => {
            const form = forms[schedule.id] ?? { actual_time_in: "", actual_time_out: "" };
            return (
              <div
                key={schedule.id}
                className="rounded-xl border border-brand-blue/10 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-brand-text">{selectedStaff.name}</p>
                    <p className="text-xs text-brand-text/55">
                      {SHIFT_LABELS[schedule.service_type]} · Scheduled{" "}
                      {formatTimeLabel(schedule.scheduled_time)} –{" "}
                      {formatTimeLabel(schedule.scheduled_time_out)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Input
                      label="Time in"
                      type="time"
                      value={form.actual_time_in}
                      onChange={(e) =>
                        setFormField(schedule.id, "actual_time_in", e.target.value)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => clockNow(schedule.id, "actual_time_in")}
                      className="mt-2 text-xs font-medium text-brand-blue hover:underline"
                    >
                      Use current time
                    </button>
                  </div>
                  <div>
                    <Input
                      label="Time out"
                      type="time"
                      value={form.actual_time_out}
                      onChange={(e) =>
                        setFormField(schedule.id, "actual_time_out", e.target.value)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => clockNow(schedule.id, "actual_time_out")}
                      className="mt-2 text-xs font-medium text-brand-blue hover:underline"
                    >
                      Use current time
                    </button>
                  </div>
                </div>

                <Button
                  type="button"
                  className="mt-4"
                  disabled={savingId === schedule.id}
                  onClick={() => saveSchedule(schedule)}
                >
                  {savingId === schedule.id ? "Saving…" : "Save sign in"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
