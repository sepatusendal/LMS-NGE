/** Parses a "YYYY-MM-DD" date-only string as a local calendar date rather
 * than `new Date(str)`'s UTC-midnight interpretation, which rolls to the
 * wrong day once the local offset (e.g. WIB, UTC+7) is applied — see
 * src/features/substitutes/queries.ts's dayOfWeek for the same issue caught
 * earlier in the substitute workflow. */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}
