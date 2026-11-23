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

const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

/**
 * Event time in one fixed order for both languages, in Vietnam time:
 * "Th 6, 13/11 · 22:26" (vi) and "Fri 13 Nov · 22:26" (en). The browser's own vi pattern puts the time first.
 */
export function formatEventWhen(value: string | number | Date, locale: string): string {
  const date = new Date(value);
  const vi = locale.startsWith("vi");
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: VN_TIME_ZONE }).format(date);
  const day = new Intl.DateTimeFormat(locale, vi ? { day: "2-digit", month: "2-digit", timeZone: VN_TIME_ZONE }
    : { day: "numeric", month: "short", timeZone: VN_TIME_ZONE }).format(date).replace("-", "/");
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: VN_TIME_ZONE }).format(date);
  return `${weekday}${vi ? "," : ""} ${day} · ${time}`;
}

/** A calendar-badge pair, short enough for a narrow tile: { day: "13", month: "T11" } (vi) or "Nov" (en). */
export function formatDayBadge(value: string | number | Date, locale: string): { day: string; month: string } {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat(locale, { day: "2-digit", timeZone: VN_TIME_ZONE }).format(date);
  const month = locale.startsWith("vi")
    ? `T${new Intl.DateTimeFormat("en-GB", { month: "numeric", timeZone: VN_TIME_ZONE }).format(date)}`
    : new Intl.DateTimeFormat(locale, { month: "short", timeZone: VN_TIME_ZONE }).format(date);
  return { day, month };
}
