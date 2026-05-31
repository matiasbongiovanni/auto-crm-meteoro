import type { Subscription } from "@/types/crm";

export function monthKey(date: string): string {
  if (!date || typeof date !== "string") return "";
  const trimmed = date.trim();
  if (trimmed.length < 7) return "";
  return trimmed.slice(0, 7);
}

export function monthRange(key: string): { start: string; end: string } {
  if (!key || key.length < 7) {
    const today = new Date().toISOString().slice(0, 7);
    return monthRange(today);
  }
  const [year, month] = key.split("-").map(Number);
  const start = `${key}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${key}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export function cycleFactor(billing_cycle: string): number {
  if (billing_cycle === "trimestral") return 1 / 3;
  if (billing_cycle === "semestral") return 1 / 6;
  if (billing_cycle === "anual") return 1 / 12;
  return 1;
}

export function monthlySubscriptionCost(subs: Subscription[], targetMonth: string): number {
  const { start, end } = monthRange(targetMonth);
  return subs
    .filter((sub) => {
      if (sub.status !== "activa") return false;
      const startDate = sub.start_date || "";
      if (startDate && startDate > end) return false;
      const cancelledAt = sub.cancelled_at || "";
      if (cancelledAt && cancelledAt < start) return false;
      return true;
    })
    .reduce((acc, sub) => acc + (sub.amount_usd || 0) * cycleFactor(sub.billing_cycle), 0);
}

export function filterByMonth<T extends { period_month?: string; fecha: string }>(
  rows: T[],
  month: string,
): T[] {
  if (!month) return rows;
  return rows.filter((row) => {
    const key = monthKey(row.period_month || row.fecha);
    return key === month;
  });
}

export function prevMonth(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function nextMonth(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function last24Months(): string[] {
  const keys: string[] = [];
  const today = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

export function subsActiveInMonth(subs: Subscription[], targetMonth: string): Subscription[] {
  const { start, end } = monthRange(targetMonth);
  return subs.filter((sub) => {
    if (sub.status === "cancelada" && sub.cancelled_at && sub.cancelled_at < start) return false;
    if (sub.status === "pausada") return false;
    const startDate = sub.start_date || "";
    if (startDate && startDate > end) return false;
    return true;
  });
}

export function monthlySubscriptionDetail(
  subs: Subscription[],
  targetMonth: string,
): Array<{ sub: Subscription; cost: number }> {
  return subsActiveInMonth(subs, targetMonth)
    .map((sub) => ({ sub, cost: (sub.amount_usd || 0) * cycleFactor(sub.billing_cycle) }))
    .sort((a, b) => b.cost - a.cost);
}
