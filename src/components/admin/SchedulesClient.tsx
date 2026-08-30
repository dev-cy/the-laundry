"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/utils";
import type { Branch, Schedule, Staff } from "@/lib/types";
import { canDeleteEntries, type AppRole } from "@/lib/auth/roles";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DateMultiPicker } from "@/components/ui/DateMultiPicker";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useLoadMore } from "@/lib/use-load-more";
import { LoadMoreFooter } from "@/components/ui/LoadMoreFooter";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";

export function SchedulesClient({
  branches,
  initialSchedules,
  staff,
  role,
}: {
  branches: Branch[];
  initialSchedules: Schedule[];
  staff: Staff[];
  role: AppRole;
}) {
  const supabase = createClient();
  const [schedules, setSchedules] = useState(initialSchedules);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canDelete = canDeleteEntries(role);
  const {
    visible: visibleSchedules,
    hasMore: hasMoreSchedules,
    loadMore: loadMoreSchedules,
    remaining: remainingSchedules,
  } = useLoadMore(schedules);
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  const [form, setForm] = useState({
    branch_id: branches[0]?.id ?? "",
    customer_name: "",
    service_type: "pickup" as Schedule["service_type"],
    scheduled_time: "07:00",
    scheduled_time_out: "16:00",
    notes: "",
  });
  const [selectedDates, setSelectedDates] = useState<string[]>([todayISO()]);

  const shiftPresets: Record<
    Schedule["service_type"],
    { timeIn: string; timeOut: string }
  > = {
    pickup: { timeIn: "07:00", timeOut: "16:00" },
    delivery: { timeIn: "13:00", timeOut: "21:00" },
    both: { timeIn: "07:00", timeOut: "21:00" },
  };

  const branchNameById = useMemo(
    () => Object.fromEntries(branches.map((branch) => [branch.id, branch.name])),
    [branches]
  );

  const selectableStaff = useMemo(
    () =>
      staff
        .map((member) => ({
          value: member.name,
          label: member.name,
          phone: member.phone_number ?? "",
          branch_id: member.branch_id,
          inSelectedBranch: member.branch_id === form.branch_id,
          branchName: branchNameById[member.branch_id] ?? "Unknown branch",
        }))
        .sort((a, b) => {
          if (a.inSelectedBranch !== b.inSelectedBranch) {
            return a.inSelectedBranch ? -1 : 1;
          }
          return a.label.localeCompare(b.label);
        })
        .map((member) => ({
          value: member.value,
          label: member.inSelectedBranch
            ? `${member.value} - Assigned (${member.branchName})`
            : `${member.value} - Other Branch (${member.branchName})`,
          phone: member.phone,
        })),
    [staff, form.branch_id, branchNameById]
  );

  function openNew() {
    setEditing(null);
    setError(null);
    setForm({
      branch_id: branches[0]?.id ?? "",
      customer_name: "",
      service_type: "pickup",
      scheduled_time: "07:00",
      scheduled_time_out: "16:00",
      notes: "",
    });
    setSelectedDates([todayISO()]);
    setShowForm(true);
  }

  function openEdit(s: Schedule) {
    setEditing(s);
    setError(null);
    setForm({
      branch_id: s.branch_id,
      customer_name: s.customer_name,
      service_type: s.service_type,
      scheduled_time: s.scheduled_time ?? "07:00",
      scheduled_time_out: s.scheduled_time_out ?? "16:00",
      notes: s.notes ?? "",
    });
    setSelectedDates([s.scheduled_date]);
    setShowForm(true);
  }

  function handleShiftChange(serviceType: Schedule["service_type"]) {
    const preset = shiftPresets[serviceType];
    setForm((current) => ({
      ...current,
      service_type: serviceType,
      scheduled_time: preset.timeIn,
      scheduled_time_out: preset.timeOut,
    }));
  }

  async function refresh() {
    const { data } = await supabase
      .from("schedules")
      .select("*, branches(name)")
      .order("scheduled_date", { ascending: true })
      .limit(100);
    if (data) setSchedules(data as Schedule[]);
    setShowForm(false);
    setEditing(null);
  }

  async function handleDelete(s: Schedule) {
    if (!canDelete) return;
    if (
      !window.confirm(
        `Delete schedule for ${s.customer_name} on ${s.scheduled_date}? This cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingId(s.id);
    const { error: deleteError } = await supabase.from("schedules").delete().eq("id", s.id);
    setDeletingId(null);
    if (deleteError) {
      window.alert(deleteError.message);
      return;
    }
    if (editing?.id === s.id) setEditing(null);
    await refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedDates.length === 0) {
      setError("Select at least one date.");
      return;
    }
    if (!form.customer_name.trim()) {
      setError("Select a staff member.");
      return;
    }

    setSaving(true);
    setError(null);

    const staffMember = staff.find((member) => member.name === form.customer_name);
    const basePayload = {
      branch_id: form.branch_id,
      staff_id: staffMember?.id ?? null,
      customer_name: form.customer_name.trim(),
      customer_phone: staffMember?.phone_number ?? null,
      service_type: form.service_type,
      scheduled_time: form.scheduled_time || "07:00",
      scheduled_time_out: form.scheduled_time_out || "16:00",
      notes: form.notes.trim() || null,
    };

    if (editing) {
      const { error: saveError } = await supabase
        .from("schedules")
        .update({ ...basePayload, scheduled_date: selectedDates[0] })
        .eq("id", editing.id);
      setSaving(false);
      if (saveError) {
        setError(saveError.message);
      } else {
        refresh();
      }
      return;
    }

    const rows = selectedDates.map((scheduled_date) => ({
      ...basePayload,
      scheduled_date,
    }));
    const { error: saveError } = await supabase.from("schedules").insert(rows);

    setSaving(false);
    if (saveError) {
      setError(saveError.message);
    } else {
      refresh();
    }
  }

  const shiftLabel: Record<Schedule["service_type"], string> = {
    pickup: "Morning Shift",
    delivery: "Afternoon Shift",
    both: "Whole Day",
  };
  const today = new Date();
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
  });

  const schedulesByDate = schedules.reduce<Record<string, Schedule[]>>((acc, schedule) => {
    const key = schedule.scheduled_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(schedule);
    return acc;
  }, {});

  const selectedDaySchedules = selectedCalendarDate
    ? schedulesByDate[selectedCalendarDate] ?? []
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Staff Schedules</h1>
          <p className="text-brand-text/60">Manage staff duty schedules per branch</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4" />
          New Schedule
        </Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl border border-brand-blue/10">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-brand-blue/10 bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-brand-text">
                  {editing ? "Edit Schedule" : "New Schedule"}
                </h2>
                <p className="text-xs text-brand-text/55">
                  {editing
                    ? "Update this duty shift"
                    : "Schedule one staff member across multiple days at once"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg p-1.5 text-brand-text/50 hover:bg-gray-100 hover:text-brand-text"
                aria-label="Close form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mx-5 mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <Select
                label="Branch"
                value={form.branch_id}
                onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                options={branches.map((b) => ({ value: b.id, label: b.name }))}
              />

              <Select
                label="Staff"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                options={[
                  {
                    value: "",
                    label: selectableStaff.length ? "Select staff" : "No staff records yet",
                  },
                  ...selectableStaff.map((member) => ({
                    value: member.value,
                    label: member.label,
                  })),
                ]}
                required
              />

              <Select
                label="Shift"
                value={form.service_type}
                onChange={(e) =>
                  handleShiftChange(e.target.value as Schedule["service_type"])
                }
                options={[
                  { value: "pickup", label: "Morning Shift (7 AM – 4 PM)" },
                  { value: "delivery", label: "Afternoon Shift (1 PM – 9 PM)" },
                  { value: "both", label: "Whole Day (7 AM – 9 PM)" },
                ]}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Time In"
                  type="time"
                  value={form.scheduled_time}
                  onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })}
                />
                <Input
                  label="Time Out"
                  type="time"
                  value={form.scheduled_time_out}
                  onChange={(e) =>
                    setForm({ ...form, scheduled_time_out: e.target.value })
                  }
                />
              </div>

              <DateMultiPicker
                label={editing ? "Date" : "Dates"}
                selectedDates={selectedDates}
                onChange={setSelectedDates}
                multiple={!editing}
              />

              <Input
                label="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any extra details…"
              />

              <div className="flex gap-3 pt-1">
                <Button type="submit" disabled={saving}>
                  {saving
                    ? "Saving…"
                    : editing
                      ? "Update"
                      : selectedDates.length > 1
                        ? `Save ${selectedDates.length} shifts`
                        : "Save"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mb-8 rounded-xl border border-brand-blue/10 bg-white p-4 sm:p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-text">Staff Calendar Overview</h2>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
            >
              Previous
            </Button>
            <span className="text-sm font-medium text-brand-text min-w-[130px] text-center">
              {format(calendarMonth, "MMMM yyyy")}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
            >
              Next
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div
                  key={day}
                  className="rounded-md bg-brand-light/20 px-2 py-1 text-center text-xs font-semibold text-brand-text/70"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const daySchedules = schedulesByDate[key] ?? [];
                const isToday = isSameDay(day, today);
                const inMonth = isSameMonth(day, calendarMonth);
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setSelectedCalendarDate(key)}
                    className={[
                      "min-h-28 w-full rounded-lg border p-2 text-left transition-colors",
                      inMonth ? "bg-white border-brand-blue/10 hover:bg-brand-light/10" : "bg-gray-50 border-gray-200",
                      isToday ? "ring-2 ring-brand-blue border-brand-blue/30" : "",
                    ].join(" ")}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className={[
                          "text-xs font-semibold",
                          inMonth ? "text-brand-text" : "text-brand-text/40",
                        ].join(" ")}
                      >
                        {format(day, "d")}
                      </span>
                      {isToday && (
                        <span className="rounded-full bg-brand-blue px-2 py-0.5 text-[10px] font-semibold text-white">
                          Today
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {daySchedules.slice(0, 3).map((s) => (
                        <div
                          key={s.id}
                          className="truncate rounded bg-brand-light/20 px-2 py-1 text-[11px] text-brand-text"
                          title={`${s.customer_name} - ${shiftLabel[s.service_type]}`}
                        >
                          {s.customer_name} - {shiftLabel[s.service_type]}
                        </div>
                      ))}
                      {daySchedules.length > 3 && (
                        <div className="text-[11px] font-medium text-brand-blue">
                          +{daySchedules.length - 3} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {selectedCalendarDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl border border-brand-blue/10">
            <div className="flex items-center justify-between border-b border-brand-blue/10 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-brand-text">Schedule Details</h3>
                <p className="text-sm text-brand-text/60">{selectedCalendarDate}</p>
              </div>
              <Button type="button" variant="ghost" onClick={() => setSelectedCalendarDate(null)}>
                Close
              </Button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5 space-y-4">
              {branches.map((branch) => {
                const branchSchedules = selectedDaySchedules.filter(
                  (schedule) => schedule.branch_id === branch.id
                );
                return (
                  <div key={branch.id} className="rounded-lg border border-brand-blue/10">
                    <div className="bg-brand-light/20 px-4 py-2 border-b border-brand-blue/10">
                      <h4 className="font-medium text-brand-text">{branch.name}</h4>
                    </div>
                    {branchSchedules.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-brand-text/50">No staff scheduled.</p>
                    ) : (
                      <div className="divide-y divide-brand-blue/5">
                        {branchSchedules.map((schedule) => (
                          <div
                            key={schedule.id}
                            className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3"
                          >
                            <div>
                              <p className="font-medium text-brand-text">{schedule.customer_name}</p>
                              <p className="text-xs text-brand-text/60">
                                {shiftLabel[schedule.service_type]}
                              </p>
                            </div>
                            <p className="text-sm font-medium text-brand-blue whitespace-nowrap">
                              {(schedule.scheduled_time ?? "07:00").slice(0, 5)} -{" "}
                              {(schedule.scheduled_time_out ?? "16:00").slice(0, 5)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-brand-blue/10 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-light/30">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Date</th>
              <th className="text-left px-4 py-3 font-semibold">Time In</th>
              <th className="text-left px-4 py-3 font-semibold">Time Out</th>
              <th className="text-left px-4 py-3 font-semibold">Branch</th>
              <th className="text-left px-4 py-3 font-semibold">Staff</th>
              <th className="text-left px-4 py-3 font-semibold">Shift</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {schedules.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-brand-text/50">
                  No schedules yet.
                </td>
              </tr>
            ) : (
              visibleSchedules.map((s) => (
                <tr key={s.id} className="border-t border-brand-blue/5 hover:bg-gray-50">
                  <td className="px-4 py-3">{s.scheduled_date}</td>
                  <td className="px-4 py-3">{s.scheduled_time ?? "07:00"}</td>
                  <td className="px-4 py-3">{s.scheduled_time_out ?? "16:00"}</td>
                  <td className="px-4 py-3">
                    {(s.branches as { name: string } | undefined)?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">{s.customer_name}</td>
                  <td className="px-4 py-3">{shiftLabel[s.service_type]}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(s)}
                        className="text-brand-blue hover:text-brand-blue/70"
                        aria-label="Edit schedule"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(s)}
                          disabled={deletingId === s.id}
                          className="text-red-600 hover:text-red-500 disabled:opacity-50"
                          aria-label="Delete schedule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <LoadMoreFooter
          hasMore={hasMoreSchedules}
          remaining={remainingSchedules}
          onLoadMore={loadMoreSchedules}
        />
      </div>
    </div>
  );
}
