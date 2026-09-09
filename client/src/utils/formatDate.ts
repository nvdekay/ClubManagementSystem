import type { Locale } from "../i18n";

// Single source of truth for how the app renders backend timestamps.
const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

export function formatDate(value: string | number | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, DATE_FORMAT).format(new Date(value));
}
