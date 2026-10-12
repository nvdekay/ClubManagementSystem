import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_CLUB_FIELDS } from "../../src/domain/club-field.js";
import {
  ensureDefaultClubFields, mongoClubFieldRepository,
} from "../../src/infra/db/mongo-club-field-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-club-field-test-${process.pid}`;

describe.skipIf(!uri)("Mongo club field repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("seeds the default catalog once and manages fields with usage-aware deletion", async () => {
    const now = new Date("2026-10-10T08:00:00Z");
    const officer = new Types.ObjectId().toString();
    const repo = mongoClubFieldRepository();
    await ensureDefaultClubFields(now);
    await ensureDefaultClubFields(now);
    expect((await repo.listActive()).map((field) => field.name)).toEqual([...DEFAULT_CLUB_FIELDS]);

    const tech = (await repo.listActive()).find((field) => field.name === "Công nghệ")!;
    await ucmsModels.clubs!.create({ code: "CLB-FIELD", name: "Tech Club", field: "Công nghệ",
      state: "Active", createdAt: now });
    await ucmsModels.clubApplications!.create({ clubName: "Draft Club", field: "Công nghệ",
      founderUserId: new Types.ObjectId(), state: "Draft", currentVersionNo: 1, createdAt: now,
      draftPayload: { clubName: "Draft Club", fieldId: tech.id, field: "Công nghệ", _revision: 0 } });

    await repo.update(tech.id, { name: "Công nghệ thông tin", sortOrder: 5 }, officer, now);
    expect(await ucmsModels.clubs!.findOne({ code: "CLB-FIELD" }).lean())
      .toMatchObject({ field: "Công nghệ thông tin" });
    expect(await ucmsModels.clubApplications!.findOne({ clubName: "Draft Club" }).lean())
      .toMatchObject({ field: "Công nghệ thông tin", draftPayload: { field: "Công nghệ thông tin" } });
    expect((await repo.listWithUsage()).find((field) => field.id === tech.id))
      .toMatchObject({ clubCount: 1, applicationCount: 1 });

    await expect(repo.create({ name: " ngôn  NGỮ ", sortOrder: 1 }, officer, now))
      .rejects.toMatchObject({ kind: "conflict" });
    await expect(repo.update(tech.id, { name: "Thể thao", sortOrder: 1 }, officer, now))
      .rejects.toMatchObject({ kind: "conflict" });

    // In use → hidden, unused → removed; re-adding a hidden name restores it.
    expect(await repo.remove(tech.id, officer, now)).toBe("deactivated");
    const art = (await repo.listActive()).find((field) => field.name === "Nghệ thuật")!;
    expect(await repo.remove(art.id, officer, now)).toBe("deleted");
    expect(await repo.find(art.id)).toBeNull();
    expect((await repo.listActive()).map((field) => field.name)).not.toContain("Công nghệ thông tin");
    const restored = await repo.create({ name: "Công nghệ thông tin", sortOrder: 5 }, officer, now);
    expect(restored).toMatchObject({ id: tech.id, isActive: true });
    expect(await ucmsModels.auditLogs!.countDocuments({ entityType: "ClubField" })).toBe(4);

    // The catalog was edited, so the defaults are not seeded back.
    await ensureDefaultClubFields(now);
    expect(await repo.find(art.id)).toBeNull();
  });
});
