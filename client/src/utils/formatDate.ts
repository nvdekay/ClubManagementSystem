import type { Locale } from "../i18n";

// Single source of truth for how the app renders backend timestamps.
const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

export function formatDate(value: string | number | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, DATE_FORMAT).format(new Date(value));
}

/** Calendar day only, in Vietnam time — for dates the server compares by day (e.g. leave dates). */
export function formatDay(value: string | number | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
}
