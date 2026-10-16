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

const inputFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

/** The `YYYY-MM-DD` value of a date input for an instant, read in Vietnam time. */
export function vnDateInput(value: string | number | Date = new Date()): string {
  return inputFormatter.format(new Date(value));
}

/** The instant a Vietnam calendar day (`YYYY-MM-DD`) starts, or the last millisecond of it. */
export function vnDayBoundary(day: string, edge: "start" | "end"): string {
  return new Date(`${day}T${edge === "start" ? "00:00:00.000" : "23:59:59.999"}+07:00`).toISOString();
}

/** The date input value of the day after today in Vietnam, for fields that must lie in the future. */
export function vnTomorrowInput(): string {
  return vnDateInput(Date.now() + 86_400_000);
}
