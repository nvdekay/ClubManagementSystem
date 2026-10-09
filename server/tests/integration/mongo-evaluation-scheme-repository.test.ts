import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_SCHEME_SETTINGS } from "../../src/domain/evaluation-scheme.js";
import { mongoEvaluationSchemeRepository } from "../../src/infra/db/mongo-evaluation-scheme-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-scheme-test-${process.pid}`;

describe.skipIf(!uri)("Mongo evaluation scheme repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("versions drafts per period, keeps one active scheme and only changes drafts", async () => {
    const repo = mongoEvaluationSchemeRepository();
    const officer = new Types.ObjectId().toString();
    const now = new Date("2026-10-10T08:00:00Z");
    const [first, concurrent] = await Promise.all([
      repo.createDraft("FA26", DEFAULT_SCHEME_SETTINGS, officer, now),
      repo.createDraft("FA26", DEFAULT_SCHEME_SETTINGS, officer, now),
    ]);
    expect([first.version, concurrent.version].sort()).toEqual([1, 2]);
    expect((await repo.createDraft("SP27", DEFAULT_SCHEME_SETTINGS, officer, now)).version).toBe(1);
    expect(first).toMatchObject({ state: "Draft", totalWeight: 100, thresholds: DEFAULT_SCHEME_SETTINGS.thresholds,
      dimensions: DEFAULT_SCHEME_SETTINGS.dimensions });
    expect(await ucmsModels.evaluationDimensions!.countDocuments({ schemeId: new Types.ObjectId(first.id) })).toBe(8);

    const edited = await repo.updateDraft(first.id, { dimensions: DEFAULT_SCHEME_SETTINGS.dimensions.slice(0, 3)
      .map((dimension) => ({ ...dimension, weight: dimension.code === "D1" ? 40 : 30 })),
      thresholds: { excellent: 90, good: 75, fair: 55 } }, officer, now);
    expect(edited).toMatchObject({ totalWeight: 100, thresholds: { excellent: 90, good: 75, fair: 55 } });
    expect(edited.dimensions.map((dimension) => dimension.code)).toEqual(["D1", "D2", "D3"]);

    expect((await repo.activate(first.id, officer, now)).state).toBe("Active");
    expect((await repo.activate(concurrent.id, officer, now)).state).toBe("Active");
    expect((await repo.find(first.id))?.state).toBe("Superseded");
    expect(await ucmsModels.evaluationSchemes!.countDocuments({ periodCode: "FA26", state: "Active" })).toBe(1);
    await expect(repo.updateDraft(first.id, DEFAULT_SCHEME_SETTINGS, officer, now)).rejects.toMatchObject({ kind: "conflict" });
    await expect(repo.deleteDraft(concurrent.id, officer, now)).rejects.toMatchObject({ kind: "conflict" });

    const spare = await repo.createDraft("FA26", DEFAULT_SCHEME_SETTINGS, officer, now);
    await repo.deleteDraft(spare.id, officer, now);
    expect(await repo.find(spare.id)).toBeNull();
    expect(await ucmsModels.evaluationDimensions!.countDocuments({ schemeId: new Types.ObjectId(spare.id) })).toBe(0);
    expect((await repo.list()).map((scheme) => `${scheme.periodCode}v${scheme.version}`)).toEqual(["SP27v1", "FA26v2", "FA26v1"]);
    expect(await ucmsModels.auditLogs!.distinct("action", { entityType: "EvaluationScheme" })).toEqual(
      expect.arrayContaining(["EVALUATION_SCHEME_CREATED", "EVALUATION_SCHEME_UPDATED",
        "EVALUATION_SCHEME_ACTIVATED", "EVALUATION_SCHEME_DELETED"]));
  });
});
