import { createClient } from "@/lib/supabase/server";
import { resolveBranches } from "@/lib/branches";
import { ReportsPageClient } from "@/components/admin/ReportsClient";
import type { DailyReport, ReportEntry } from "@/lib/types";

export default async function ReportsPage() {
  const supabase = await createClient();

  const [{ data: branches }, { data: reports }, { data: entries }] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    supabase
      .from("daily_reports")
      .select("*, branches(name)")
      .order("report_date", { ascending: false })
      .limit(50),
    supabase.from("report_entries").select("*").order("created_at"),
  ]);

  const entriesByReport: Record<string, ReportEntry[]> = {};
  for (const entry of (entries as ReportEntry[] | null) ?? []) {
    if (!entry.report_id) continue;
    if (!entriesByReport[entry.report_id]) entriesByReport[entry.report_id] = [];
    entriesByReport[entry.report_id].push(entry);
  }

  return (
    <ReportsPageClient
      branches={resolveBranches(branches)}
      initialReports={(reports as DailyReport[]) ?? []}
      initialEntriesByReport={entriesByReport}
    />
  );
}
