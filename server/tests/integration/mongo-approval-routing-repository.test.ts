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
    const rule = { id: "stage", requestType: "PROPERTY_BOOKING" as const, propertyTypes: ["STAGE" as const], slaHours: 24 };
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

  it("keeps exactly one Active set when two drafts are activated at the same time", async () => {
    const repo = mongoApprovalRoutingRepository();
    await m.routingRuleSets!.deleteMany({});
    const head = String(new Types.ObjectId());
    const [one, two] = [await repo.createDraft([], head, now), await repo.createDraft([], head, now)];
    const results = await Promise.allSettled([repo.activate(one.id, head, now), repo.activate(two.id, head, now)]);
    expect(await m.routingRuleSets!.countDocuments({ state: "Active" })).toBe(1);
    // Exactly one activation wins; the other gets a 409 conflict.
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.reason).toMatchObject({ kind: "conflict" });
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
  it("simulates with the facts of the reviewed revision and the cases open at that time", async () => {
    await m.approvalTasks!.deleteMany({});
    const repo = mongoApprovalRoutingRepository();
    const clubId = new Types.ObjectId();
    const eventId = new Types.ObjectId();
    const opened = new Date("2026-10-01T00:00:00Z");
    await m.eventProposalVersions!.collection.insertMany([
      { eventId, revisionNo: 1, submittedAt: new Date("2026-09-30T00:00:00Z"), requestedBudgetTotal: 30_000_000, payload: { riskCategory: "HIGH" } },
      { eventId, revisionNo: 2, submittedAt: new Date("2026-10-05T00:00:00Z"), requestedBudgetTotal: 0, payload: { riskCategory: "LOW" } }]);
    await m.violations!.collection.insertMany([
      { clubId, state: "Open", openedAt: new Date("2026-09-01T00:00:00Z") },
      { clubId, state: "Resolved", openedAt: new Date("2026-08-01T00:00:00Z"), resolvedAt: new Date("2026-09-15T00:00:00Z") },
      { clubId, state: "Open", openedAt: new Date("2026-10-10T00:00:00Z") }]);
    await m.approvalTasks!.create({ entityType: "EVENT_PROPOSAL", entityId: eventId, clubId, title: "Gala", state: "Decided",
      openedAt: opened, closedAt: new Date("2026-10-02T00:00:00Z") });
    expect((await repo.recentDecided(5))[0]?.facts).toEqual({ requestType: "EVENT_PROPOSAL", amount: 30_000_000,
      riskCategory: "HIGH", openViolations: 1 });
  });
});
