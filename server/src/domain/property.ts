import { DomainError } from "./errors.js";

export const PROPERTY_TYPES = ["ROOM", "HALL", "EQUIPMENT"] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

/** Codes are generated per type when a property is created, e.g. PH-001. */
export const PROPERTY_CODE_PREFIX: Record<PropertyType, string> = { ROOM: "PH", HALL: "HT", EQUIPMENT: "TB" };

/** One bookable window; `day` 1 = Monday … 7 = Sunday. Days not listed cannot be booked. */
export interface BookableHours {
  day: number;
  open: string;
  close: string;
}

export interface Blackout {
  startAt: Date;
  endAt: Date;
  reason: string;
}

export interface PropertyDetails {
  name: string;
  location: string;
  capacity?: number;
  equipment: string[];
  bookableHours: BookableHours[];
  blackouts: Blackout[];
}

export interface PropertyInput extends PropertyDetails {
  type: PropertyType;
}

export interface Property extends PropertyInput {
  id: string;
  code: string;
  isActive: boolean;
}

export interface PropertyRepository {
  list(): Promise<Property[]>;
  find(id: string): Promise<Property | null>;
  /** Assigns the next free code for the type; retries on a concurrent code clash. */
  create(input: PropertyInput, actorId: string, now: Date): Promise<Property>;
  update(id: string, details: PropertyDetails, actorId: string, now: Date): Promise<Property>;
  setActive(id: string, isActive: boolean, actorId: string, now: Date): Promise<Property>;
  hasBookings(id: string): Promise<boolean>;
  remove(id: string, actorId: string, now: Date): Promise<void>;
}

const time = /^([01]\d|2[0-3]):[0-5]\d$/;

function invalid(field: string): never {
  throw new DomainError(`invalid property ${field}`, "validation", { field });
}

function text(value: string, max: number, field: string, required = true): string {
  const normalized = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if ((required && !normalized) || normalized.length > max) invalid(field);
  return normalized;
}

export function validatePropertyDetails(type: PropertyType, input: PropertyDetails): PropertyDetails {
  const name = text(input.name, 120, "name");
  const location = text(input.location, 200, "location");
  if (type === "EQUIPMENT") {
    if (input.capacity !== undefined) invalid("capacity");
  } else if (!Number.isInteger(input.capacity) || input.capacity! < 1 || input.capacity! > 10_000) {
    invalid("capacity");
  }
  if (!Array.isArray(input.equipment) || input.equipment.length > 30) invalid("equipment");
  const equipment = input.equipment.map((item) => text(item, 60, "equipment"));
  if (new Set(equipment.map((item) => item.toLocaleLowerCase("vi-VN"))).size !== equipment.length) {
    invalid("equipment");
  }
  if (!Array.isArray(input.bookableHours) || !input.bookableHours.length || input.bookableHours.length > 7) {
    invalid("bookableHours");
  }
  const days = new Set<number>();
  for (const window of input.bookableHours) {
    if (!Number.isInteger(window.day) || window.day < 1 || window.day > 7 || days.has(window.day)
      || !time.test(window.open) || !time.test(window.close) || window.open >= window.close) {
      invalid("bookableHours");
    }
    days.add(window.day);
  }
  if (!Array.isArray(input.blackouts) || input.blackouts.length > 50) invalid("blackouts");
  const blackouts = input.blackouts.map((blackout) => {
    if (!(blackout.startAt instanceof Date) || !(blackout.endAt instanceof Date)
      || Number.isNaN(blackout.startAt.getTime()) || Number.isNaN(blackout.endAt.getTime())
      || blackout.startAt >= blackout.endAt) invalid("blackouts");
    return { startAt: blackout.startAt, endAt: blackout.endAt, reason: text(blackout.reason, 200, "blackouts") };
  }).sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
  return {
    name, location, ...(type === "EQUIPMENT" ? {} : { capacity: input.capacity }), equipment,
    bookableHours: [...input.bookableHours].sort((left, right) => left.day - right.day)
      .map(({ day, open, close }) => ({ day, open, close })),
    blackouts,
  };
}

export function nextPropertyCode(type: PropertyType, existingCodes: readonly string[]): string {
  const prefix = PROPERTY_CODE_PREFIX[type];
  const numbers = existingCodes.map((code) => new RegExp(`^${prefix}-(\\d+)$`).exec(code)?.[1])
    .filter((value): value is string => Boolean(value)).map(Number);
  return `${prefix}-${String(Math.max(0, ...numbers) + 1).padStart(3, "0")}`;
}
