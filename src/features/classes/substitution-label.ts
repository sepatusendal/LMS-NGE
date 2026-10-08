import { parseLocalDate } from "@/lib/date";
import type { MySubstitution } from "./use-my-classes";

/** "Kamis, 8 Okt" — the one date a substitute assignment applies to. */
export function formatSubstitutionDate(date: string, locale: string): string {
  return parseLocalDate(date).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

/** "Kamis, 8 Okt · 14:30-15:30" (time left out when the class has no window that day). */
export function formatSubstitutionLabel(sub: MySubstitution, locale: string): string {
  const date = formatSubstitutionDate(sub.date, locale);
  return sub.startTime && sub.endTime ? `${date} · ${sub.startTime}-${sub.endTime}` : date;
}
