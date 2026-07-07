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
  return new Date().toISOString().split("T")[0];
}
