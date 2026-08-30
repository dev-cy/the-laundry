import { DENOMINATIONS } from "./constants";
import type { CashQuantities, ReportEntry } from "./types";

export function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString("en-PH")}`;
}

export function calcTotalCash(qty: CashQuantities): number {
  return DENOMINATIONS.reduce((sum, d) => {
    const key = `qty_${d}` as keyof CashQuantities;
    return sum + d * (qty[key] ?? 0);
  }, 0);
}

export function calcReportTotals(
  entries: Pick<ReportEntry, "total_payment" | "payment_received">[]
) {
  const totalSales = entries.reduce((sum, e) => sum + e.total_payment, 0);
  const unpaid = entries
    .filter((e) => !e.payment_received)
    .reduce((sum, e) => sum + e.total_payment, 0);
  const cashReceived = entries
    .filter((e) => e.payment_received)
    .reduce((sum, e) => sum + e.total_payment, 0);

  return { totalSales, unpaid, cashReceived };
}

export function formatDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function todayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Unique named customers + one count per unnamed transaction. */
export function countCustomersFromTransactions(
  txs: { customer_name?: string | null }[] | null | undefined
): number {
  const named = new Set<string>();
  let unnamed = 0;
  for (const tx of txs ?? []) {
    const name = tx.customer_name?.trim();
    if (!name) unnamed += 1;
    else named.add(name.toLowerCase());
  }
  return named.size + unnamed;
}

export function formatWeightKg(whole: number, frac: number): string {
  if (whole === 0 && frac === 0) return "—";
  return `${whole}.${frac} kg`;
}

export function serviceTypeLabel(value: string): string {
  if (value === "blankets") return "Blankets";
  if (value === "comforters") return "Comforters";
  return "Regular";
}
