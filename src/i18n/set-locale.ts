"use server";

import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE, type Locale } from "./request";

export async function setLocale(locale: Locale) {
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, LOCALES.includes(locale) ? locale : DEFAULT_LOCALE, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}
