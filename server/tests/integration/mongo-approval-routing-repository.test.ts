import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoApprovalRoutingRepository } from "../../src/infra/db/mongo-approval-routing-repository.js";
import { ensureUcmsDatabase, ucmsModels as m } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const now = new Date("2026-11-07T00:00:00Z");

describe.skipIf(!uri)("Mongo approval routing repository (UC05)", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName: `ucms-routing-test-${process.pid}` });
    await ensureUcmsDatabase();
  }, 30_000);
  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("versions drafts, activates one set at a time with an audit, and never edits an active set", async () => {
    const repo = mongoApprovalRoutingRepository();
    const head = String(new Types.ObjectId());
    const rule = { id: "stage", requestType: "PROPERTY_BOOKING" as const, propertyTypes: ["STAGE" as const], requiredLevel: 2 as const, slaHours: 24 };
    const first = await repo.createDraft([rule], head, now);
    expect(first).toMatchObject({ versionNo: 1, state: "Draft" });
    await repo.saveDraft(first.id, [{ ...rule, slaHours: 48 }], head, now);
    expect((await repo.activate(first.id, head, now)).state).toBe("Active");
    await expect(repo.saveDraft(first.id, [], head, now)).rejects.toMatchObject({ kind: "conflict" });
    await expect(repo.activate(first.id, head, now)).rejects.toMatchObject({ kind: "conflict" });
    const second = await repo.createDraft([], head, now);
    expect(second.versionNo).toBe(2);
    await repo.activate(second.id, head, now);
    expect((await repo.list()).map((item) => [item.versionNo, item.state])).toEqual([[2, "Active"], [1, "Superseded"]]);
    expect(await m.auditLogs!.countDocuments({ action: "ROUTING_RULES_ACTIVATED" })).toBe(2);
    expect((await repo.find(first.id))?.rules[0]?.slaHours).toBe(48);
  });

  it("reads recent decided requests for simulation without writing", async () => {
    const repo = mongoApprovalRoutingRepository();
    const clubId = new Types.ObjectId();
    // Raw insert: only the type matters to the router.
    const { insertedId: propertyId } = await m.properties!.collection.insertOne({ code: "SK-1", name: "Stage", type: "STAGE" });
    const property = { _id: propertyId };
    const booking = await m.propertyBookings!.create({ propertyId: property._id, clubId, clubName: "C", purpose: "Show",
      startAt: now, endAt: now, semesterCode: "FA26", state: "Approved", currentVersionNo: 1, createdAt: now });
    await m.approvalTasks!.create({ entityType: "PROPERTY_BOOKING", entityId: booking._id, clubId, title: "C: Show",
      state: "Decided", openedAt: now, closedAt: now });
    const before = await m.approvalTasks!.find({}).lean();
    const samples = await repo.recentDecided(10);
    expect(samples).toEqual([expect.objectContaining({ entityType: "PROPERTY_BOOKING", entityId: String(booking._id),
      facts: { requestType: "PROPERTY_BOOKING", propertyType: "STAGE", openViolations: 0 } })]);
    expect(await m.approvalTasks!.find({}).lean()).toEqual(before);
  });
});
