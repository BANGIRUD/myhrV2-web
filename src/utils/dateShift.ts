const pad = (n: number) => String(n).padStart(2, "0");

/** Local `YYYY-MM-DD` (never via toISOString, which shifts to UTC). */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Shift date, ported from the legacy `get_date_shift()`: until 07:30 the night
 * shift of the previous calendar day is still "today".
 */
export function currentShiftDate(now: Date = new Date()): string {
  const d = new Date(now);
  const minutes = d.getHours() * 60 + d.getMinutes();
  if (minutes <= 7 * 60 + 30) d.setDate(d.getDate() - 1);
  return toIsoDate(d);
}

/** `YYYY-MM-DD` → `YYYY-MM` (pola kerja is monthly). */
export function toMonth(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** Human readable date, e.g. `15 Jun 2026`. */
export function formatDisplayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
