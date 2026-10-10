import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoBudgetDisbursementRepository } from "../../src/infra/db/mongo-budget-disbursement-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-budget-test-${process.pid}`;
const DAY = 24 * 60 * 60 * 1000;

function decimal(value: number) {
  return Types.Decimal128.fromString(String(value));
}

describe.skipIf(!uri)("Mongo budget disbursement repository", () => {
  const now = new Date("2026-10-10T08:00:00Z");
  const officer = new Types.ObjectId();
  const leader = new Types.ObjectId();
  const submitter = new Types.ObjectId();
  const clubId = new Types.ObjectId();
  const endAt = new Date(now.getTime() + 5 * DAY);

  async function budget(state: string, extra: Record<string, unknown> = {}, eventState = "Approved") {
    const eventId = new Types.ObjectId();
    await ucmsModels.events!.create({ _id: eventId, organizerType: "CLUB", clubId, clubName: "HEBE", title: `Sự kiện ${state}`,
      startAt: new Date(endAt.getTime() - 3_600_000), endAt, semesterCode: "Fall 2026", audienceScope: "PUBLIC",
      capacity: 50, state: eventState, currentRevisionNo: 1, createdAt: now });
    await ucmsModels.eventProposalVersions!.create({ eventId, revisionNo: 1, submittedBy: submitter, submittedAt: now, payload: {} });
    const doc = await ucmsModels.eventBudgets!.create({ eventId, clubId, state, periodCode: "Fall 2026",
      lines: [{ category: "Hậu cần", requestedAmount: 5_000_000, approvedAmount: 4_000_000, reason: "Giảm" }],
      requestedTotal: decimal(5_000_000), approvedTotal: decimal(4_000_000), approvedByDecisionId: new Types.ObjectId(),
      disbursedTotal: decimal(Number(extra.disbursedTotal ?? 0)), refundedTotal: decimal(Number(extra.refundedTotal ?? 0)),
      isSettlementLate: false, createdAt: now,
      ...(extra.settlementBalance !== undefined ? { settlementBalance: decimal(Number(extra.settlementBalance)) } : {}),
      ...(extra.recoveryAmount !== undefined ? { recoveryAmount: decimal(Number(extra.recoveryAmount)) } : {}) });
    return String(doc._id);
  }

  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
    await ucmsModels.users!.insertMany([
      { _id: officer, email: "o@fpt.edu.vn", displayName: "Cán bộ", googleSubject: "o", accountState: "Active", createdAt: now },
      { _id: leader, email: "l@fpt.edu.vn", displayName: "Chủ nhiệm", googleSubject: "l", accountState: "Active", createdAt: now }]);
    await ucmsModels.clubs!.create({ _id: clubId, code: "CLB-HEBE", name: "HEBE", field: "Nghệ thuật", state: "Active", createdAt: now });
    const membershipId = new Types.ObjectId();
    const positionId = new Types.ObjectId();
    await ucmsModels.clubMemberships!.create({ _id: membershipId, clubId, userId: leader, state: "Active", joinedAt: now, statusHistory: [] });
    await ucmsModels.clubPositions!.create({ _id: positionId, clubId, code: "LEADER", name: "Chủ nhiệm", isLeaderRole: true,
      isActive: true, permissionCodes: [] });
    await ucmsModels.clubPositionAssignments!.create({ clubId, termId: new Types.ObjectId(), positionId, membershipId,
      effectiveFrom: now, assignedBy: officer });
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("records advances, sets the settlement deadline and notifies the board and submitter", async () => {
    const repo = mongoBudgetDisbursementRepository();
    const id = await budget("Approved");
    expect((await repo.list()).map((item) => item.id)).toContain(id);
    expect((await repo.find(id))?.allowed).toEqual({ kind: "Advance", max: 4_000_000 });

    const first = await repo.record(id, String(officer), { kind: "Advance", amount: 1_500_000, disbursedAt: now,
      paymentReference: "UNC-01" }, now);
    expect(first).toMatchObject({ state: "Disbursed", disbursedTotal: 1_500_000,
      settlementDueAt: new Date(endAt.getTime() + 14 * DAY), allowed: { kind: "Advance", max: 2_500_000 } });
    expect(first.flows).toMatchObject([{ kind: "Advance", amount: 1_500_000, paymentReference: "UNC-01", recordedByName: "Cán bộ" }]);

    const second = await repo.record(id, String(officer), { kind: "Advance", amount: 2_500_000, disbursedAt: now }, now);
    expect(second).toMatchObject({ state: "Disbursed", disbursedTotal: 4_000_000 });
    expect(second.allowed).toBeUndefined();
    await expect(repo.record(id, String(officer), { kind: "Advance", amount: 1, disbursedAt: now }, now))
      .rejects.toMatchObject({ kind: "conflict" });

    const notified = await ucmsModels.notifications!.find({ entityId: new Types.ObjectId(id) }).distinct("recipientUserId");
    expect(notified.map(String).sort()).toEqual([String(leader), String(submitter)].sort());
    expect(await ucmsModels.auditLogs!.countDocuments({ entityId: new Types.ObjectId(id), action: "BUDGET_ADVANCE_RECORDED" })).toBe(2);
  });

  it("refuses an advance for a cancelled event", async () => {
    const repo = mongoBudgetDisbursementRepository();
    const id = await budget("Approved", {}, "Cancelled");
    await expect(repo.record(id, String(officer), { kind: "Advance", amount: 1, disbursedAt: now }, now))
      .rejects.toMatchObject({ kind: "conflict" });
  });

  it("closes after the exact top-up and after the full refund", async () => {
    const repo = mongoBudgetDisbursementRepository();
    const reconciled = await budget("Reconciled", { disbursedTotal: 3_000_000, settlementBalance: 500_000 });
    await expect(repo.record(reconciled, String(officer), { kind: "TopUp", amount: 400_000, disbursedAt: now }, now))
      .rejects.toMatchObject({ kind: "validation" });
    expect(await repo.record(reconciled, String(officer), { kind: "TopUp", amount: 500_000, disbursedAt: now }, now))
      .toMatchObject({ state: "Closed", disbursedTotal: 3_500_000 });

    const owed = await budget("Recovery Pending", { disbursedTotal: 3_000_000, recoveryAmount: 800_000 });
    expect(await repo.record(owed, String(officer), { kind: "Refund", amount: 300_000, disbursedAt: now }, now))
      .toMatchObject({ state: "Recovery Pending", refundedTotal: 300_000, allowed: { kind: "Refund", max: 500_000 } });
    await expect(repo.record(owed, String(officer), { kind: "Refund", amount: 600_000, disbursedAt: now }, now))
      .rejects.toMatchObject({ kind: "validation" });
    expect(await repo.record(owed, String(officer), { kind: "Refund", amount: 500_000, disbursedAt: now }, now))
      .toMatchObject({ state: "Closed", refundedTotal: 800_000 });
  });
});
