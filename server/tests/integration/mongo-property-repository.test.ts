import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PropertyInput } from "../../src/domain/property.js";
import { mongoPropertyRepository } from "../../src/infra/db/mongo-property-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-property-test-${process.pid}`;

function input(type: PropertyInput["type"], name: string): PropertyInput {
  return { type, name, location: "Tòa Alpha", ...(type === "EQUIPMENT" ? {} : { capacity: 50 }),
    equipment: ["Máy chiếu"], bookableHours: [{ day: 1, open: "07:00", close: "21:00" }], blackouts: [] };
}

describe.skipIf(!uri)("Mongo property repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("allocates distinct codes per type, even for concurrent creations", async () => {
    const repo = mongoPropertyRepository();
    const officer = new Types.ObjectId().toString();
    const now = new Date("2026-10-10T08:00:00Z");
    const rooms = await Promise.all(Array.from({ length: 5 }, (_, index) =>
      repo.create(input("ROOM", `Phòng ${index}`), officer, now)));
    expect(rooms.map((room) => room.code).sort()).toEqual(["PH-001", "PH-002", "PH-003", "PH-004", "PH-005"]);
    expect((await repo.create(input("HALL", "Hội trường A"), officer, now)).code).toBe("HT-001");
    const projector = await repo.create(input("EQUIPMENT", "Máy chiếu di động"), officer, now);
    expect(projector).toMatchObject({ code: "TB-001", isActive: true });
    expect(projector.capacity).toBeUndefined();
    expect(await ucmsModels.auditLogs!.countDocuments({ entityType: "Property", action: "PROPERTY_CREATED" })).toBe(7);
  });

  it("updates details, toggles activation and only deletes never-booked properties", async () => {
    const repo = mongoPropertyRepository();
    const officer = new Types.ObjectId().toString();
    const now = new Date("2026-10-10T09:00:00Z");
    const hall = await repo.create(input("HALL", "Hội trường B"), officer, now);
    const blackout = { startAt: new Date("2026-12-01T00:00:00Z"), endAt: new Date("2026-12-03T00:00:00Z"),
      reason: "Bảo trì điều hoà" };
    const updated = await repo.update(hall.id, { name: "Hội trường lớn", location: "Tòa Beta", capacity: 300,
      equipment: [], bookableHours: [{ day: 6, open: "08:00", close: "12:00" }], blackouts: [blackout] }, officer, now);
    expect(updated).toMatchObject({ code: hall.code, name: "Hội trường lớn", capacity: 300, blackouts: [blackout] });
    expect((await repo.setActive(hall.id, false, officer, now)).isActive).toBe(false);
    expect((await repo.list()).at(-1)?.id).toBe(hall.id); // inactive ones sort last

    await ucmsModels.propertyBookings!.create({ propertyId: new Types.ObjectId(hall.id),
      clubId: new Types.ObjectId(), clubName: "CLB A", purpose: "Sự kiện", startAt: now,
      endAt: new Date(now.getTime() + 3_600_000), semesterCode: "FA26", state: "Approved", createdAt: now });
    expect(await repo.hasBookings(hall.id)).toBe(true);
    await expect(repo.remove(hall.id, officer, now)).rejects.toMatchObject({ kind: "conflict" });
    expect(await repo.find(hall.id)).not.toBeNull();

    const spare = await repo.create(input("ROOM", "Phòng trống"), officer, now);
    await repo.remove(spare.id, officer, now);
    expect(await repo.find(spare.id)).toBeNull();
    expect(await ucmsModels.auditLogs!.distinct("action", { entityType: "Property" }))
      .toEqual(expect.arrayContaining(["PROPERTY_UPDATED", "PROPERTY_DEACTIVATED", "PROPERTY_DELETED"]));
  });
});
