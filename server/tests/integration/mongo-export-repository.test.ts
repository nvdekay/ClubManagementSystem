import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoExportRepository } from "../../src/infra/db/mongo-export-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-export-test-${process.pid}`;

describe.skipIf(!uri)("Mongo export repository", () => {
  const now = new Date("2026-10-10T08:00:00Z");
  const fa26 = { periodCode: "FA26", from: new Date("2026-09-01T00:00:00Z"), to: new Date("2026-12-31T00:00:00Z") };
  const robotics = new Types.ObjectId();
  const music = new Types.ObjectId();
  const an = new Types.ObjectId();
  const binh = new Types.ObjectId();
  const finalized = new Types.ObjectId();
  const open = new Types.ObjectId();

  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
    const m = ucmsModels;
    await m.users!.insertMany([
      { _id: an, email: "an@fpt.edu.vn", displayName: "Nguyễn An", googleSubject: "an", accountState: "Active", createdAt: now },
      { _id: binh, email: "binh@fpt.edu.vn", displayName: "Trần Bình", googleSubject: "binh", accountState: "Active", createdAt: now }]);
    await m.clubs!.insertMany([
      { _id: robotics, code: "CLB-R", name: "CLB Robotics", field: "Công nghệ", state: "Active", contactEmail: "r@fpt.edu.vn", createdAt: now },
      { _id: music, code: "CLB-M", name: "CLB Âm nhạc", field: "Nghệ thuật", state: "Suspended", createdAt: now }]);
    await m.clubMemberships!.insertMany([
      { clubId: robotics, userId: an, state: "Active", joinedAt: new Date("2026-02-01"), statusHistory: [] },
      { clubId: robotics, userId: binh, state: "Left", joinedAt: new Date("2026-02-01"), leftAt: new Date("2026-05-01"), statusHistory: [] },
      { clubId: music, userId: binh, state: "Active", joinedAt: new Date("2026-10-01"), statusHistory: [] }]);
    const event = { clubId: robotics, clubName: "CLB Robotics", semesterCode: "FA26", audienceScope: "PUBLIC",
      capacity: 50, state: "Completed", createdAt: now };
    await m.events!.insertMany([
      { ...event, _id: finalized, title: "Hackathon", startAt: new Date("2026-10-01T02:00:00Z"),
        endAt: new Date("2026-10-01T10:00:00Z"), attendanceFinalized: true },
      { ...event, _id: open, title: "Workshop", startAt: new Date("2026-10-05T02:00:00Z"),
        endAt: new Date("2026-10-05T04:00:00Z"), attendanceFinalized: false },
      { ...event, _id: new Types.ObjectId(), title: "Draft idea", state: "Draft", startAt: new Date("2026-10-06T02:00:00Z"),
        endAt: new Date("2026-10-06T04:00:00Z") }]);
    await m.eventRegistrations!.insertMany([
      { eventId: finalized, studentId: an, clubId: robotics, state: "Confirmed", createdAt: now },
      { eventId: finalized, studentId: binh, clubId: robotics, state: "Cancelled", createdAt: now },
      { eventId: open, studentId: an, clubId: robotics, state: "Confirmed", createdAt: now }]);
    await m.attendances!.insertMany([
      { eventId: finalized, studentId: an, clubId: robotics, checkedInAt: now, method: "self", finalized: true },
      { eventId: open, studentId: an, clubId: robotics, checkedInAt: now, method: "self" }]);
    await m.complaints!.insertMany([
      { complainantId: an, recipient: "ICPDP", clubId: robotics, type: "Góp ý", description: "Ẩn danh",
        isAnonymous: true, state: "Submitted", submittedAt: new Date("2026-10-02") },
      { complainantId: binh, recipient: "CLUB", clubId: robotics, type: "Khen", description: "Công khai",
        isAnonymous: false, state: "Submitted", submittedAt: new Date("2026-10-03") }]);
    await m.violations!.create({ clubId: robotics, originType: "COMPLAINT", severity: "Nhẹ", title: "Trễ báo cáo",
      state: "Open", openedBy: an, openedAt: new Date("2026-10-04") });
    const scheme = new Types.ObjectId();
    const published = await m.evaluations!.create({ clubId: robotics, periodCode: "FA26", schemeId: scheme,
      state: "Published", totalScore: new Types.Decimal128("82.5"), classification: "Tốt", revisionNo: 2, publishedAt: now });
    await m.evaluations!.insertMany([
      { clubId: robotics, periodCode: "FA26", schemeId: scheme, state: "Published", totalScore: new Types.Decimal128("70"),
        classification: "Tốt", revisionNo: 1, publishedAt: now },
      { clubId: music, periodCode: "FA26", schemeId: scheme, state: "Finalized", revisionNo: 1 }]);
    await m.evaluationDimensionResults!.insertMany([
      { evaluationId: published._id, dimensionCode: "D1", score: new Types.Decimal128("90"), evidence: [] },
      { evaluationId: published._id, dimensionCode: "D3", isInsufficientData: true, evidence: [] }]);
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("exports clubs with active member counts, filtered by club and status", async () => {
    const repo = mongoExportRepository();
    const all = await repo.table("CLUBS", {});
    expect(all.rows).toEqual([["CLB-M", "CLB Âm nhạc", "Nghệ thuật", "Suspended", 1, null, expect.any(String)],
      ["CLB-R", "CLB Robotics", "Công nghệ", "Active", 1, "r@fpt.edu.vn", expect.any(String)]]);
    expect((await repo.table("CLUBS", { status: "Active" })).rows).toHaveLength(1);
    expect((await repo.table("CLUBS", { clubId: music.toString() })).rows[0]?.[1]).toBe("CLB Âm nhạc");
  });

  it("exports members active during the period", async () => {
    const members = await mongoExportRepository().table("MEMBERS", fa26);
    // Bình left Robotics in May, before FA26 started.
    expect(members.rows.map((row) => `${row[0]}|${row[1]}`)).toEqual(["CLB Âm nhạc|Trần Bình", "CLB Robotics|Nguyễn An"]);
  });

  it("reports attendance only for finalized events and skips unlisted states", async () => {
    const events = await mongoExportRepository().table("EVENTS", fa26);
    expect(events.rows.map((row) => [row[1], row[7], row[9], row[10], row[11]])).toEqual([
      ["Hackathon", 1, 1, "Có", 1], ["Workshop", 1, 0, "Chưa", null]]);
  });

  it("never exports the identity of anonymous senders (BR61)", async () => {
    const compliance = await mongoExportRepository().table("COMPLIANCE", { clubId: robotics.toString() });
    expect(compliance.rows.map((row) => [row[0], row[6]])).toEqual([["Góp ý gửi ICPDP", "Ẩn danh"],
      ["Góp ý gửi CLB", "Trần Bình <binh@fpt.edu.vn>"], ["Hồ sơ vi phạm", "ICPDP"]]);
    expect(JSON.stringify(compliance.rows)).not.toContain("an@fpt.edu.vn");
    expect((await mongoExportRepository().table("COMPLIANCE", { status: "Open" })).rows).toHaveLength(1);
    expect((await mongoExportRepository().table("COMPLIANCE", { status: "Submitted" })).rows).toHaveLength(2);
  });

  it("exports only the latest published evaluation, marking insufficient data", async () => {
    const evaluations = await mongoExportRepository().table("EVALUATIONS", fa26);
    expect(evaluations.columns).toHaveLength(13);
    expect(evaluations.rows).toHaveLength(1);
    expect(evaluations.rows[0]?.slice(0, 5)).toEqual(["CLB Robotics", "FA26", 90, null, "Thiếu dữ liệu"]);
    expect(evaluations.rows[0]?.slice(10, 12)).toEqual([82.5, "Tốt"]);
    expect((await mongoExportRepository().table("FINANCE", fa26)).rows).toEqual([]);
  });

  it("audits each export", async () => {
    const officer = new Types.ObjectId().toString();
    await mongoExportRepository().audit({ actorId: officer, type: "CLUBS", format: "xlsx", filter: {}, rowCount: 2, at: now });
    expect(await ucmsModels.auditLogs!.findOne({ entityType: "DataExport" }).lean()).toMatchObject({
      action: "DATA_EXPORTED", after: { type: "CLUBS", format: "xlsx", rowCount: 2 } });
  });
});
