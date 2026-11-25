import { parseLocalDate } from "@/lib/date";

export function intlLocale(locale: string): string {
  return locale === "en" ? "en-US" : "id-ID";
}

/** A "YYYY-MM-DD" column, shown as a calendar day. */
export function formatDay(date: string, locale: string): string {
  return parseLocalDate(date).toLocaleDateString(intlLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(intlLocale(locale), { dateStyle: "long", timeStyle: "short" });
}
