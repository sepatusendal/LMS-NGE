/** Parses a "YYYY-MM-DD" date-only string as a local calendar date rather
 * than `new Date(str)`'s UTC-midnight interpretation, which rolls to the
 * wrong day once the local offset (e.g. WIB, UTC+7) is applied — see
 * src/features/substitutes/queries.ts's dayOfWeek for the same issue caught
 * earlier in the substitute workflow. */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Formats a Date using its local calendar components as "YYYY-MM-DD" —
 * the inverse of parseLocalDate, and the correct way to produce "today"
 * (or any other local date) as a date-only string. `.toISOString().slice(0, 10)`
 * instead converts to UTC first, which rolls to the wrong calendar day
 * whenever the local offset (e.g. WIB, UTC+7) pushes across midnight. */
export function formatLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today's date in the local calendar, as "YYYY-MM-DD". */
export function todayLocalDateStr(): string {
  return formatLocalDateStr(new Date());
}

/** Whether `dateStr` ("YYYY-MM-DD") is still within `days` days of today —
 * the client-side mirror of the 7-day RLS edit window on lesson_plans and
 * teaching_reports (see migration 20260911020000). Purely for UI (showing
 * the right form state / message); the database is the actual gate. */
export function isWithinEditWindow(dateStr: string, days = 7): boolean {
  const target = parseLocalDate(dateStr).getTime();
  const today = parseLocalDate(todayLocalDateStr()).getTime();
  const daysSince = Math.floor((today - target) / (24 * 60 * 60 * 1000));
  return daysSince <= days;
}
