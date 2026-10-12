import { describe, expect, it, vi } from "vitest";
import {
  nextPropertyCode, validatePropertyDetails, type Property, type PropertyDetails, type PropertyRepository,
} from "../../src/domain/property.js";
import {
  createProperty, deleteProperty, listProperties, setPropertyActive, updateProperty,
} from "../../src/usecase/property.js";

const now = new Date("2026-10-10T08:00:00Z");
const actor = { id: "000000000000000000000001", accountState: "Active" as const };
const officer = { systemRoleCodes: async () => ["ICPDP_OFFICER"] };
const student = { systemRoleCodes: async () => [] };
const id = "000000000000000000000002";

function room(overrides: Partial<PropertyDetails> = {}): PropertyDetails {
  return { name: " Phòng  Alpha ", location: "Tầng 2, nhà Alpha", capacity: 40, equipment: ["Máy chiếu", "Loa"],
    bookableHours: [{ day: 3, open: "07:00", close: "21:00" }, { day: 1, open: "08:00", close: "17:30" }],
    blackouts: [], ...overrides };
}

function repository(overrides: Partial<PropertyRepository> = {}) {
  const stored: Property = { id, code: "PH-001", type: "ROOM", isActive: true, ...room() };
  const repo: PropertyRepository = {
    list: async () => [stored], find: async (value) => value === id ? stored : null,
    create: vi.fn(async (input) => ({ ...input, id, code: "PH-002", isActive: true })),
    update: vi.fn(async (_id, details) => ({ ...stored, ...details })),
    setActive: vi.fn(async (_id, isActive) => ({ ...stored, isActive })),
    hasBookings: async () => false, remove: vi.fn(async () => undefined), ...overrides,
  };
  return repo;
}

describe("UC44 property catalogue rules", () => {
  it("normalizes text and sorts bookable hours by weekday", () => {
    expect(validatePropertyDetails("ROOM", room())).toEqual({
      name: "Phòng Alpha", location: "Tầng 2, nhà Alpha", capacity: 40, equipment: ["Máy chiếu", "Loa"],
      bookableHours: [{ day: 1, open: "08:00", close: "17:30" }, { day: 3, open: "07:00", close: "21:00" }],
      blackouts: [],
    });
  });

  it("requires capacity for rooms and halls and forbids it for equipment", () => {
    expect(() => validatePropertyDetails("HALL", room({ capacity: undefined }))).toThrow(/capacity/);
    expect(() => validatePropertyDetails("ROOM", room({ capacity: 0 }))).toThrow(/capacity/);
    expect(() => validatePropertyDetails("EQUIPMENT", room())).toThrow(/capacity/);
    expect(validatePropertyDetails("EQUIPMENT", room({ capacity: undefined })).capacity).toBeUndefined();
  });

  it("rejects invalid names, equipment, hours and blackouts", () => {
    for (const [overrides, field] of [
      [{ name: " " }, "name"], [{ location: "" }, "location"],
      [{ equipment: ["Loa", "loa"] }, "equipment"], [{ equipment: [" "] }, "equipment"],
      [{ bookableHours: [] }, "bookableHours"],
      [{ bookableHours: [{ day: 8, open: "07:00", close: "09:00" }] }, "bookableHours"],
      [{ bookableHours: [{ day: 1, open: "7:00", close: "09:00" }] }, "bookableHours"],
      [{ bookableHours: [{ day: 1, open: "10:00", close: "10:00" }] }, "bookableHours"],
      [{ bookableHours: [{ day: 1, open: "07:00", close: "09:00" }, { day: 1, open: "10:00", close: "11:00" }] },
        "bookableHours"],
      [{ blackouts: [{ startAt: now, endAt: now, reason: "Bảo trì" }] }, "blackouts"],
      [{ blackouts: [{ startAt: now, endAt: new Date(now.getTime() + 1), reason: " " }] }, "blackouts"],
    ] as const) {
      expect(() => validatePropertyDetails("ROOM", room(overrides as Partial<PropertyDetails>))).toThrow(field);
    }
  });

  it("numbers codes per type from the highest existing one", () => {
    expect(nextPropertyCode("ROOM", [])).toBe("PH-001");
    expect(nextPropertyCode("ROOM", ["PH-001", "PH-009", "HT-020", "PH-x"])).toBe("PH-010");
    expect(nextPropertyCode("HALL", ["PH-001"])).toBe("HT-001");
    expect(nextPropertyCode("EQUIPMENT", ["TB-999"])).toBe("TB-1000");
  });
});

describe("UC44 property use cases", () => {
  it("only lets ICPDP officers manage the catalogue", async () => {
    await expect(listProperties(repository(), student, actor)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(listProperties(repository(), officer, null)).rejects.toMatchObject({ kind: "unauthorized" });
    await expect(createProperty(repository(), student, actor, { type: "ROOM", ...room() }, now))
      .rejects.toMatchObject({ kind: "forbidden" });
  });

  it("creates with a validated payload and keeps the stored type on update", async () => {
    const repo = repository();
    await createProperty(repo, officer, actor, { type: "HALL", ...room() }, now);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ type: "HALL", name: "Phòng Alpha" }),
      actor.id, now);
    await expect(createProperty(repo, officer, actor, { type: "OFFICE" as "ROOM", ...room() }, now))
      .rejects.toMatchObject({ kind: "validation" });
    // The room keeps its type: equipment rules do not apply to it.
    await updateProperty(repo, officer, actor, id, room({ name: "Phòng Beta" }), now);
    expect(repo.update).toHaveBeenCalledWith(id, expect.objectContaining({ name: "Phòng Beta", capacity: 40 }),
      actor.id, now);
    await expect(updateProperty(repo, officer, actor, "000000000000000000000009", room(), now))
      .rejects.toMatchObject({ kind: "not_found" });
  });

  it("deactivates and deletes only a property that was never booked (BR41)", async () => {
    const repo = repository();
    await setPropertyActive(repo, officer, actor, id, false, now);
    expect(repo.setActive).toHaveBeenCalledWith(id, false, actor.id, now);
    await expect(deleteProperty(repo, officer, actor, id, now)).resolves.toEqual({ deleted: true });
    const booked = repository({ hasBookings: async () => true });
    await expect(deleteProperty(booked, officer, actor, id, now)).rejects.toMatchObject({ kind: "conflict" });
    expect(booked.remove).not.toHaveBeenCalled();
    await expect(deleteProperty(repo, officer, actor, "bad", now)).rejects.toMatchObject({ kind: "validation" });
  });
});
