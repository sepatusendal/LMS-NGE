// When the policy pop-up comes back. Pure rules shared by the admin form and
// the pop-up itself. The pop-up is a reminder: the banner stays regardless, and
// nothing here records a confirmation. Keep this file free of server imports.

import { z } from "zod";
import { roleLandingPath, type AppRole } from "@/features/auth/role-routes";

export const POPUP_FREQUENCIES = ["ONCE", "PER_SESSION", "PER_DAY", "INTERVAL", "APP_OPEN", "PAGE_VISIT"] as const;
export const POPUP_PAGES = ["ALL", "HOME"] as const;
export const AFTER_SNOOZES = ["STOP", "FIRM"] as const;

const wholeNumber = (min: number, max: number) => z.number().int().min(min).max(max);

export const popupSettingsSchema = z.object({
  frequency: z.enum(POPUP_FREQUENCIES),
  /** Used by INTERVAL only. */
  intervalHours: wholeNumber(1, 168),
  pages: z.enum(POPUP_PAGES),
  /** Shortest time between two appearances; 0 for none. */
  minGapMinutes: wholeNumber(0, 1440),
  /** null means no limit, here and below. */
  maxPerDay: wholeNumber(1, 50).nullable(),
  maxTotal: wholeNumber(1, 500).nullable(),
  /** How many times "later" may be used. */
  maxSnoozes: wholeNumber(0, 50).nullable(),
  afterSnoozes: z.enum(AFTER_SNOOZES),
});
export type PopupSettings = z.infer<typeof popupSettingsSchema>;
export type PopupFrequency = PopupSettings["frequency"];

export const POPUP_PRESETS = ["RELAXED", "NORMAL", "INTENSE", "URGENT"] as const;
export type PopupPreset = (typeof POPUP_PRESETS)[number];

export const PRESET_SETTINGS: Record<PopupPreset, PopupSettings> = {
  RELAXED: {
    frequency: "PER_DAY", intervalHours: 4, pages: "HOME", minGapMinutes: 0,
    maxPerDay: null, maxTotal: 3, maxSnoozes: null, afterSnoozes: "STOP",
  },
  NORMAL: {
    frequency: "PER_SESSION", intervalHours: 4, pages: "ALL", minGapMinutes: 60,
    maxPerDay: 3, maxTotal: null, maxSnoozes: null, afterSnoozes: "STOP",
  },
  INTENSE: {
    frequency: "APP_OPEN", intervalHours: 4, pages: "ALL", minGapMinutes: 15,
    maxPerDay: 6, maxTotal: null, maxSnoozes: 5, afterSnoozes: "FIRM",
  },
  URGENT: {
    frequency: "PAGE_VISIT", intervalHours: 4, pages: "ALL", minGapMinutes: 5,
    maxPerDay: null, maxTotal: null, maxSnoozes: 3, afterSnoozes: "FIRM",
  },
};

export const DEFAULT_POPUP_SETTINGS = PRESET_SETTINGS.NORMAL;

/** Anything missing or unreadable falls back to the default. */
export function parsePopupSettings(value: unknown): PopupSettings {
  const parsed = popupSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_POPUP_SETTINGS;
}

export function presetOf(settings: PopupSettings): PopupPreset | "CUSTOM" {
  const keys = Object.keys(DEFAULT_POPUP_SETTINGS) as (keyof PopupSettings)[];
  const match = POPUP_PRESETS.find((preset) =>
    keys.every(
      (key) =>
        // The interval means nothing for the other frequencies.
        (key === "intervalHours" && settings.frequency !== "INTERVAL") ||
        PRESET_SETTINGS[preset][key] === settings[key],
    ),
  );
  return match ?? "CUSTOM";
}

// ── Pages ──────────────────────────────────────────────────────────────────

/** Never interrupted: reading and signing, attendance (which the company rules
 * require) including writing the plan a check-in may ask for, and the profile
 * page, where signing out lives. */
const NO_POPUP = ["/kebijakan", "/absensi", "/lesson-plan/new", "/profile"];

export function isUnder(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isPopupPage(pathname: string, settings: PopupSettings, role: AppRole): boolean {
  if (isUnder(pathname, NO_POPUP)) return false;
  return settings.pages === "ALL" || pathname === roleLandingPath[role];
}

// ── History ────────────────────────────────────────────────────────────────

/** One row per person per packet (policy_popup_states). */
export interface PopupState {
  shownCount: number;
  /** "YYYY-MM-DD" in Jakarta time: the day shownOnDay counts. */
  shownDay: string | null;
  shownOnDay: number;
  snoozeCount: number;
  lastShownAt: string | null;
  lastSessionId: string | null;
}

export const EMPTY_POPUP_STATE: PopupState = {
  shownCount: 0,
  shownDay: null,
  shownOnDay: 0,
  snoozeCount: 0,
  lastShownAt: null,
  lastSessionId: null,
};

export function jakartaDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export type PopupEvent = "SHOWN" | "SNOOZED";

/** The same arithmetic as record_policy_popup, so the screen does not have to
 * wait for the server before deciding about the next page. */
export function applyPopupEvent(state: PopupState, event: PopupEvent, now: Date, sessionId: string): PopupState {
  if (event === "SNOOZED") return { ...state, snoozeCount: state.snoozeCount + 1 };
  const today = jakartaDay(now);
  return {
    ...state,
    shownCount: state.shownCount + 1,
    shownOnDay: state.shownDay === today ? state.shownOnDay + 1 : 1,
    shownDay: today,
    lastShownAt: now.toISOString(),
    lastSessionId: sessionId,
  };
}

export interface PopupMoment {
  now: Date;
  sessionId: string;
  /** Already appeared since the app was opened. */
  shownThisOpen: boolean;
  role: AppRole;
}

/** FIRM has no "later": the person picks reading now or, for tutors, going to
 * attendance. Only tutors can ever get it. */
export type PopupDecision = "NONE" | "NORMAL" | "FIRM";

export function decidePopup(settings: PopupSettings, state: PopupState, moment: PopupMoment): PopupDecision {
  const { now, sessionId, shownThisOpen, role } = moment;
  const outOfSnoozes = settings.maxSnoozes !== null && state.snoozeCount >= settings.maxSnoozes;
  if (outOfSnoozes && settings.afterSnoozes === "STOP") return "NONE";

  if (settings.maxTotal !== null && state.shownCount >= settings.maxTotal) return "NONE";
  const today = jakartaDay(now);
  if (settings.maxPerDay !== null && state.shownDay === today && state.shownOnDay >= settings.maxPerDay) {
    return "NONE";
  }
  const sinceLast = state.lastShownAt ? now.getTime() - new Date(state.lastShownAt).getTime() : Infinity;
  if (sinceLast < settings.minGapMinutes * 60_000) return "NONE";

  const blockedByFrequency: Record<PopupFrequency, boolean> = {
    ONCE: state.shownCount > 0,
    PER_SESSION: state.lastSessionId === sessionId,
    PER_DAY: state.shownDay === today,
    INTERVAL: sinceLast < settings.intervalHours * 3_600_000,
    APP_OPEN: shownThisOpen,
    PAGE_VISIT: false,
  };
  if (blockedByFrequency[settings.frequency]) return "NONE";

  return outOfSnoozes && role === "TEACHER" ? "FIRM" : "NORMAL";
}
