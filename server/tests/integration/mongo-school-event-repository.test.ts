import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoEventCheckInRepository } from "../../src/infra/db/mongo-event-checkin-repository.js";
import { mongoEventRegistrationRepository } from "../../src/infra/db/mongo-event-registration-repository.js";
import { mongoPublicDiscoveryRepository } from "../../src/infra/db/mongo-public-discovery-repository.js";
import { mongoSchoolEventRepository } from "../../src/infra/db/mongo-school-event-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-school-event-test-${process.pid}`;
const DAY = 24 * 60 * 60 * 1000;

describe.skipIf(!uri)("Mongo school event repository", () => {
  const now = new Date("2026-10-10T08:00:00Z");
  const officer = new Types.ObjectId();
  const leader = new Types.ObjectId();
  const student = new Types.ObjectId();
  const activeClub = new Types.ObjectId();
  const otherClub = new Types.ObjectId();
  const suspendedClub = new Types.ObjectId();
  const propertyId = new Types.ObjectId();
  const startAt = new Date(now.getTime() + 10 * DAY);
  const endAt = new Date(startAt.getTime() + 6 * 3_600_000);

  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
    await ucmsModels.users!.insertMany([
      { _id: officer, email: "o@fpt.edu.vn", displayName: "Cán bộ", googleSubject: "o", accountState: "Active", createdAt: now },
      { _id: leader, email: "l@fpt.edu.vn", displayName: "Chủ nhiệm", googleSubject: "l", accountState: "Active", createdAt: now },
      { _id: student, email: "s@fpt.edu.vn", displayName: "Sinh viên", googleSubject: "s", accountState: "Active", createdAt: now }]);
    await ucmsModels.clubs!.insertMany([
      { _id: activeClub, code: "CLB-HEBE", name: "HEBE", field: "Nghệ thuật", state: "Active", createdAt: now },
      { _id: otherClub, code: "CLB-EHC", name: "EHC", field: "Công nghệ", state: "Active", createdAt: now },
      { _id: suspendedClub, code: "CLB-FDS", name: "FDS", field: "Công nghệ", state: "Suspended", createdAt: now }]);
    await ucmsModels.properties!.create({ _id: propertyId, code: "HT-001", name: "Hội trường A", type: "HALL",
      bookableHours: {}, isActive: true });
    await ucmsModels.propertyBookings!.create({ propertyId, clubId: otherClub, clubName: "EHC", purpose: "Tập văn nghệ",
      startAt: new Date(startAt.getTime() + 3_600_000), endAt: new Date(startAt.getTime() + 2 * 3_600_000),
      semesterCode: "Fall 2026", state: "Approved", currentVersionNo: 1, createdAt: now });
    const membershipId = new Types.ObjectId();
    const positionId = new Types.ObjectId();
    await ucmsModels.clubMemberships!.create({ _id: membershipId, clubId: activeClub, userId: leader, state: "Active", joinedAt: now, statusHistory: [] });
    await ucmsModels.clubPositions!.create({ _id: positionId, clubId: activeClub, code: "LEADER", name: "Chủ nhiệm",
      isLeaderRole: true, isActive: true, permissionCodes: [] });
    await ucmsModels.clubPositionAssignments!.create({ clubId: activeClub, termId: new Types.ObjectId(), positionId,
      membershipId, effectiveFrom: now, assignedBy: officer });
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("creates, invites, withdraws, re-invites, publishes, and lets a student register and check in", async () => {
    const repo = mongoSchoolEventRepository();
    const deadline = new Date(startAt.getTime() - 3 * DAY);
    const { detail, outcome } = await repo.create({ title: "Ngày hội CLB 2026", objective: "Giới thiệu CLB",
      coordination: "Mỗi CLB một gian hàng", startAt, endAt, propertyId: String(propertyId), capacity: 300,
      semesterCode: "Fall 2026", invitation: { clubIds: [String(suspendedClub)], allActiveClubs: true, deadline } },
    String(officer), now);
    expect(detail).toMatchObject({ state: "Approved", conflictResult: "Warning", coordination: "Mỗi CLB một gian hàng",
      property: { code: "HT-001" }, counts: { invited: 2, pending: 2 } });
    expect(detail.conflicts).toMatchObject([{ kind: "booking", title: "EHC · Tập văn nghệ" }]);
    expect(outcome.skipped).toEqual([{ clubId: String(suspendedClub), reason: "notActive" }]);
    expect(await ucmsModels.notifications!.countDocuments({ recipientUserId: leader, eventCode: "SCHOOL_EVENT_INVITATION" })).toBe(1);

    const hebe = detail.invitations.find((item) => item.clubName === "HEBE")!;
    const withdrawn = await repo.withdraw(detail.id, hebe.id, String(officer), now);
    expect(withdrawn.counts).toMatchObject({ pending: 1, withdrawn: 1 });
    await expect(repo.withdraw(detail.id, hebe.id, String(officer), now)).rejects.toMatchObject({ kind: "conflict" });
    const again = await repo.invite(detail.id, { clubIds: [String(activeClub), String(otherClub)], allActiveClubs: false, deadline },
      String(officer), now);
    expect(again.outcome).toEqual({ invited: [String(activeClub)], skipped: [{ clubId: String(otherClub), reason: "alreadyInvited" }] });

    const published = await repo.publish(detail.id, String(officer), now);
    expect(published).toMatchObject({ state: "Upcoming", registrationCloseAt: startAt });
    expect(published.checkInCode).toMatch(/^[A-Z2-9]{6}$/);
    await expect(repo.publish(detail.id, String(officer), now)).rejects.toMatchObject({ kind: "conflict" });

    const listed = await mongoPublicDiscoveryRepository().listEvents({ status: "upcoming", search: "", page: 1, pageSize: 10 }, now);
    expect(listed.items.map((item) => [item.title, item.clubId])).toEqual([["Ngày hội CLB 2026", undefined]]);
    const registration = await mongoEventRegistrationRepository().register({ eventId: detail.id, studentId: String(student),
      answers: {}, allowOverbooking: false, now });
    expect(registration).toMatchObject({ state: "Confirmed", clubName: "ICPDP" });
    expect(registration.clubId).toBeUndefined();
    const checked = await mongoEventCheckInRepository().checkIn({ eventId: detail.id, studentId: String(student),
      method: "self", now: new Date(startAt.getTime() + 60_000) });
    expect(checked.created).toBe(true);

    expect(await repo.expireInvitations(new Date(deadline.getTime() + 1))).toBe(2);
    expect((await repo.find(detail.id))?.counts).toMatchObject({ expired: 2, pending: 0 });
    expect((await repo.list()).map((item) => item.title)).toEqual(["Ngày hội CLB 2026"]);
  });
});
