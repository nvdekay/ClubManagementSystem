// Single source of truth for how the app renders backend timestamps.
const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

export function formatDate(
  value: string | number | Date,
  locale: string,
): string {
  return new Intl.DateTimeFormat(locale, DATE_FORMAT).format(new Date(value));
}

const dayFormatters = new Map<string, Intl.DateTimeFormat>();

/** Calendar day only, in Vietnam time — for dates the server compares by day (e.g. leave dates). */
export function formatDay(
  value: string | number | Date | undefined,
  locale: string,
): string {
  if (value === undefined) return "—";

  let formatter = dayFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeZone: "Asia/Ho_Chi_Minh",
    });
    dayFormatters.set(locale, formatter);
  }
  return formatter.format(new Date(value));
}
