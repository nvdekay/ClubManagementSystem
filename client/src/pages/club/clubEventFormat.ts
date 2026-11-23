import type { TFunction } from "i18next";

import type { AppBadgeTone } from "@/components/ui/badge/AppBadge";

/** Comments ICPDP stores on a decision (UC26): the parts to revise and any approval conditions. */
export type DecisionComments = { sections?: string[]; conditions?: string[] };

export const stateTones: Record<string, AppBadgeTone> = {
  Draft: "neutral",
  "Pending Approval": "warning",
  "Revision Requested": "warning",
  "Re-defense Pending": "info",
  Approved: "success",
  Upcoming: "success",
  Ongoing: "success",
  Completed: "neutral",
  "Report Submitted": "neutral",
  Closed: "neutral",
  Rejected: "danger",
  Cancelled: "danger",
  DRAFT: "neutral",
  CREATED: "success",
  PUBLIC: "success",
  ONGOING: "success",
  FINISH: "neutral",
  CANCELLED: "danger",
};

/** States of the self-funded internal event lifecycle; proposals to ICPDP use the title-case states. */
const internalStates = ["DRAFT", "CREATED", "PUBLIC", "ONGOING", "FINISH", "CANCELLED"];
export function isInternalState(state: string) {
  return internalStates.includes(state);
}

/** `clubEvents.PUBLIC` is the audience label, so the internal `PUBLIC` state has its own key. */
export function stateLabel(t: TFunction, state: string) {
  return state === "PUBLIC" ? t("clubEvents.statePUBLIC") : t(`clubEvents.${state}`, { defaultValue: state });
}

export function localTime(value: string) {
  return new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 16);
}

export function iso(value: string) {
  return new Date(`${value}:00+07:00`).toISOString();
}

export function numberError(t: TFunction, value: number, min: number, max: number) {
  if (!Number.isInteger(value)) return t("common.invalidNumber");
  if (value < min) return t("common.numberMin", { min });
  return value > max ? t("common.numberMax", { max }) : null;
}

export function sectionLabel(t: TFunction, value: string) {
  switch (value) {
    case "schedule": return t("eventReviews.sectionschedule");
    case "venue": return t("eventReviews.sectionvenue");
    case "content": return t("eventReviews.sectioncontent");
    case "risk": return t("eventReviews.sectionrisk");
    case "budget": return t("eventReviews.sectionbudget");
    default: return t("eventReviews.sectionother");
  }
}

export interface BookingScheduleOption {
  id: string;
  propertyId: string;
  propertyType?: string;
  startAt: string;
  endAt: string;
}

const CONSECUTIVE_SLOT_GAP_MS = 15 * 60_000;
const TIMEZONE_OFFSET_MS = 7 * 3600_000;
const DAY_MS = 86_400_000;

function vietnamDayIndex(timeMs: number): number {
  return Math.floor((timeMs + TIMEZONE_OFFSET_MS) / DAY_MS);
}

function mergeConsecutiveIntervals(intervals: readonly { startMs: number; endMs: number }[]) {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  const merged = [{ ...sorted[0]! }];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = merged[merged.length - 1]!;
    const next = sorted[i]!;
    const sameDay = vietnamDayIndex(prev.endMs - 1) === vietnamDayIndex(next.startMs);
    if (next.startMs <= prev.endMs || (sameDay && next.startMs - prev.endMs <= CONSECUTIVE_SLOT_GAP_MS)) {
      if (next.endMs > prev.endMs) prev.endMs = next.endMs;
    } else {
      merged.push({ ...next });
    }
  }
  return merged;
}

/** Validates attached facility bookings against the selected property and event intervals on the client. */
export function bookingsScheduleError(
  t: TFunction,
  bookingIds: readonly string[],
  availableBookings: readonly BookingScheduleOption[] | undefined,
  propertyId: string | undefined,
  intervals: readonly { startAt: string; endAt: string; propertyId?: string }[],
): string | null {
  if (!bookingIds.length || !availableBookings) return null;
  const parsedIntervals = intervals
    .map((item) => ({
      startMs: Date.parse(item.startAt),
      endMs: Date.parse(item.endAt),
      propertyId: item.propertyId || propertyId,
    }))
    .filter((item) => Number.isFinite(item.startMs) && Number.isFinite(item.endMs) && item.endMs > item.startMs);
  if (!parsedIntervals.length) return null;

  const sessionPropertyIds = new Set(
    parsedIntervals.map((item) => item.propertyId).filter((id): id is string => Boolean(id)),
  );
  if (propertyId) sessionPropertyIds.add(propertyId);

  const selected = bookingIds
    .map((id) => availableBookings.find((b) => b.id === id))
    .filter((b): b is BookingScheduleOption => Boolean(b));

  for (const booking of selected) {
    if (booking.propertyType !== "EQUIPMENT" && !sessionPropertyIds.has(booking.propertyId)) {
      return t("clubEvents.errors.bookingPropertyMismatch");
    }
  }

  for (const booking of selected) {
    const startMs = Date.parse(booking.startAt);
    const endMs = Date.parse(booking.endAt);
    const sameProperty = selected
      .filter((other) => other.propertyId === booking.propertyId)
      .map((other) => ({ startMs: Date.parse(other.startAt), endMs: Date.parse(other.endAt) }))
      .filter((item) => Number.isFinite(item.startMs) && Number.isFinite(item.endMs));
    const merged = mergeConsecutiveIntervals(sameProperty);
    const containing = merged.find((w) => w.startMs <= startMs && w.endMs >= endMs);
    const targetIntervals =
      booking.propertyType === "EQUIPMENT"
        ? parsedIntervals
        : parsedIntervals.filter((ev) => ev.propertyId === booking.propertyId);
    if (!containing || !targetIntervals.some((ev) => containing.startMs <= ev.startMs && containing.endMs >= ev.endMs)) {
      return t("clubEvents.errors.bookingScheduleNotCovered");
    }
  }
  return null;
}
