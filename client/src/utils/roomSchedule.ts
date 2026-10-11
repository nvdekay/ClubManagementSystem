import type { TFunction } from "i18next";
import type { BookingSlot } from "@/services/facilityBookings";

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export type Weekday = typeof WEEKDAYS[number];

/** "Thứ 4" / "Wednesday" for 1 = Monday … 7 = Sunday. */
export function weekdayLabel(t: TFunction, weekday: number): string {
  return t(`roomAllocations.weekday${weekday as Weekday}`);
}

/** "Slot 4 · 15:20–17:40" when the slot catalogue is known. */
export function slotLabel(t: TFunction, slot: number, slots: readonly BookingSlot[]): string {
  const found = slots.find((item) => item.number === slot);
  return `${t("facilityBookings.slot", { number: slot })}${found ? ` · ${found.start}–${found.end}` : ""}`;
}
