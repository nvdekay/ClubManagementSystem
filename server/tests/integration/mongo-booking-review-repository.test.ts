import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoBookingReviewRepository } from "../../src/infra/db/mongo-booking-review-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-booking-test-${process.pid}`;
const HOUR = 60 * 60 * 1000;

describe.skipIf(!uri)("Mongo booking review repository", () => {
  const now = new Date("2026-10-10T08:00:00Z");
  const officer = new Types.ObjectId();
  const otherOfficer = new Types.ObjectId();
  const leader = new Types.ObjectId();
  const clubId = new Types.ObjectId();
  const suspendedClub = new Types.ObjectId();
  const propertyId = new Types.ObjectId();
  const startAt = new Date(now.getTime() + 48 * HOUR);
  const endAt = new Date(startAt.getTime() + 2 * HOUR);

  async function booking(club = clubId, slot = { startAt, endAt }) {
    const doc = await ucmsModels.propertyBookings!.create({ propertyId, clubId: club, clubName: "HEBE", purpose: "Tập văn nghệ",
      ...slot, semesterCode: "Fall 2026", headcount: 80, state: "Requested", currentVersionNo: 1, createdAt: now });
    await ucmsModels.approvalTasks!.create({ entityType: "PROPERTY_BOOKING", entityId: doc._id, clubId: club,
      title: "Tập văn nghệ", state: "Open", openedAt: now });
    return String(doc._id);
  }

  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
    await ucmsModels.clubs!.insertMany([
      { _id: clubId, code: "CLB-HEBE", name: "HEBE", field: "Nghệ thuật", state: "Active", createdAt: now },
      { _id: suspendedClub, code: "CLB-MM", name: "Mây Mưa", field: "Âm nhạc", state: "Suspended", createdAt: now }]);
    await ucmsModels.properties!.create({ _id: propertyId, code: "HT-001", name: "Hội trường A", type: "HALL",
      location: "Toà Alpha", capacity: 60, equipment: [], bookableHours: [], blackouts: [], isActive: true, createdAt: now });
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

  it("claims, approves, locks the slot and tells the club board", async () => {
    const repo = mongoBookingReviewRepository();
    const first = await booking();
    const second = await booking(clubId, { startAt: new Date(startAt.getTime() + HOUR), endAt: new Date(endAt.getTime() + HOUR) });
    expect((await repo.listOpen()).map((item) => item.booking.id)).toEqual([first, second]);

    const claimed = await repo.claim(first, String(officer), now);
    expect(claimed).toMatchObject({ booking: { state: "Under Review", property: { code: "HT-001", capacity: 60 } },
      task: { assigneeId: String(officer) }, club: { state: "Active" } });
    expect(claimed.conflicts).toMatchObject([{ id: second, blocking: false }]);
    await expect(repo.claim(first, String(otherOfficer), now)).rejects.toMatchObject({ kind: "conflict" });
    await expect(repo.decide(first, String(otherOfficer), { outcome: "Approve" }, now)).rejects.toMatchObject({ kind: "conflict" });

    const approved = await repo.decide(first, String(officer), { outcome: "Approve" }, now);
    expect(approved).toMatchObject({ booking: { state: "Approved" }, task: { state: "Decided" },
      decisions: [{ outcome: "Approve", versionNo: 1 }] });
    expect(await ucmsModels.notifications!.find({ entityId: new Types.ObjectId(first) }).distinct("recipientUserId"))
      .toEqual([leader]);

    // E1: the overlapping request cannot be approved any more, only sent back.
    await repo.claim(second, String(officer), now);
    expect((await repo.find(second, now))?.conflicts).toMatchObject([{ id: first, blocking: true }]);
    await expect(repo.decide(second, String(officer), { outcome: "Approve" }, now)).rejects.toMatchObject({ kind: "conflict" });
    const later = new Date(endAt.getTime() + 24 * HOUR);
    const returned = await repo.decide(second, String(officer), { outcome: "Request revision", reason: "Trùng giờ",
      alternative: { startAt: later, endAt: new Date(later.getTime() + HOUR), propertyId: String(propertyId) } }, now);
    expect(returned).toMatchObject({ booking: { state: "Revision Requested" },
      decisions: [{ outcome: "Request revision", reason: "Trùng giờ", alternative: { propertyLabel: "HT-001 · Hội trường A" } }] });
    expect(await ucmsModels.auditLogs!.countDocuments({ entityId: new Types.ObjectId(second),
      action: "PROPERTY_BOOKING_REVISION_REQUESTED" })).toBe(1);
  });

  it("refuses to approve a booking of a suspended club but lets the officer reject it", async () => {
    const repo = mongoBookingReviewRepository();
    const id = await booking(suspendedClub, { startAt: new Date(startAt.getTime() + 72 * HOUR), endAt: new Date(endAt.getTime() + 72 * HOUR) });
    await repo.claim(id, String(officer), now);
    await expect(repo.decide(id, String(officer), { outcome: "Approve" }, now)).rejects.toMatchObject({ kind: "conflict" });
    expect(await repo.decide(id, String(officer), { outcome: "Reject", reason: "CLB đang bị tạm ngừng" }, now))
      .toMatchObject({ booking: { state: "Rejected" } });
  });
});
