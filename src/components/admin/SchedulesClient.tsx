"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/utils";
import type { Branch, Schedule, Staff } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Plus, Pencil } from "lucide-react";
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
}: {
  branches: Branch[];
  initialSchedules: Schedule[];
  staff: Staff[];
}) {
  const supabase = createClient();
  const [schedules, setSchedules] = useState(initialSchedules);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  const [form, setForm] = useState({
    branch_id: branches[0]?.id ?? "",
    customer_name: "",
    customer_phone: "",
    service_type: "pickup" as Schedule["service_type"],
    scheduled_date: todayISO(),
    scheduled_time: "07:00",
    scheduled_time_out: "16:00",
    notes: "",
  });

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
    setForm({
      branch_id: branches[0]?.id ?? "",
      customer_name: "",
      customer_phone: "",
      service_type: "pickup",
      scheduled_date: todayISO(),
      scheduled_time: "07:00",
      scheduled_time_out: "16:00",
      notes: "",
    });
    setShowForm(true);
  }

  function openEdit(s: Schedule) {
    setEditing(s);
    setForm({
      branch_id: s.branch_id,
      customer_name: s.customer_name,
      customer_phone: s.customer_phone ?? "",
      service_type: s.service_type,
      scheduled_date: s.scheduled_date,
      scheduled_time: s.scheduled_time ?? "07:00",
      scheduled_time_out: s.scheduled_time_out ?? "16:00",
      notes: s.notes ?? "",
    });
    setShowForm(true);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      customer_phone: form.customer_phone || null,
      scheduled_time: form.scheduled_time || "07:00",
      scheduled_time_out: form.scheduled_time_out || "16:00",
      notes: form.notes || null,
    };

    const { error: saveError } = editing
      ? await supabase.from("schedules").update(payload).eq("id", editing.id)
      : await supabase.from("schedules").insert(payload);

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
        <div className="mb-8 rounded-xl border border-brand-blue/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            {editing ? "Edit Schedule" : "New Schedule"}
          </h2>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Branch"
              value={form.branch_id}
              onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
            <Select
              label="Shift"
              value={form.service_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  service_type: e.target.value as Schedule["service_type"],
                })
              }
              options={[
                { value: "pickup", label: "Morning Shift" },
                { value: "delivery", label: "Afternoon Shift" },
                { value: "both", label: "Whole Day" },
              ]}
            />
            <Select
              label="Staff Name"
              value={form.customer_name}
              onChange={(e) => {
                const selected = selectableStaff.find((s) => s.value === e.target.value);
                setForm({
                  ...form,
                  customer_name: e.target.value,
                  customer_phone: selected?.phone ?? form.customer_phone,
                });
              }}
              options={[
                { value: "", label: selectableStaff.length ? "Select staff" : "No staff records yet" },
                ...selectableStaff.map((member) => ({
                  value: member.value,
                  label: member.label,
                })),
              ]}
              required
            />
            <Input
              label="Role / Contact (Optional)"
              value={form.customer_phone}
              onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
              placeholder="e.g. Cashier, 0917..."
            />
            <Input
              label="Date"
              type="date"
              value={form.scheduled_date}
              onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
              required
            />
            <div className="sm:col-span-2 grid grid-cols-2 gap-4">
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
                onChange={(e) => setForm({ ...form, scheduled_time_out: e.target.value })}
              />
            </div>
            <Input
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <div className="sm:col-span-2 flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Update" : "Save"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
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
              schedules.map((s) => (
                <tr key={s.id} className="border-t border-brand-blue/5 hover:bg-gray-50">
                  <td className="px-4 py-3">{s.scheduled_date}</td>
                  <td className="px-4 py-3">{s.scheduled_time ?? "07:00"}</td>
                  <td className="px-4 py-3">{s.scheduled_time_out ?? "16:00"}</td>
                  <td className="px-4 py-3">
                    {(s.branches as { name: string } | undefined)?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div>{s.customer_name}</div>
                    {s.customer_phone && (
                      <div className="text-xs text-brand-text/50">{s.customer_phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{shiftLabel[s.service_type]}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEdit(s)}
                      className="text-brand-blue hover:text-brand-blue/70"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
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
