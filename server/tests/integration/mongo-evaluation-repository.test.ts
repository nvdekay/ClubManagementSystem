import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_SCHEME_SETTINGS } from "../../src/domain/evaluation-scheme.js";
import { mongoEvaluationRepository } from "../../src/infra/db/mongo-evaluation-repository.js";
import { mongoEvaluationSchemeRepository } from "../../src/infra/db/mongo-evaluation-scheme-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";
import {
  evaluationOverview, finalizeEvaluation, generateEvaluations, publishEvaluations, regenerateEvaluation, setManualScore,
  type EvaluationDeps,
} from "../../src/usecase/evaluation.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-evaluation-test-${process.pid}`;
const DAY = 24 * 60 * 60 * 1000;

describe.skipIf(!uri)("Mongo evaluation repository", () => {
  const now = new Date("2026-12-20T08:00:00Z");
  const semester = { code: "Fall 2026", startAt: new Date("2026-09-01T00:00:00Z"), endAt: new Date("2026-12-31T00:00:00Z") };
  const officer = new Types.ObjectId();
  const leader = new Types.ObjectId();
  const students = [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()];
  const clubId = new Types.ObjectId();
  const quietClub = new Types.ObjectId();
  const actor = { id: String(officer), accountState: "Active" as const };
  let deps: EvaluationDeps;

  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
    await ucmsModels.users!.insertMany([officer, leader, ...students].map((_id, index) => ({ _id, email: `u${index}@fpt.edu.vn`,
      displayName: `U${index}`, googleSubject: `g${index}`, accountState: "Active", createdAt: now })));
    await ucmsModels.clubs!.insertMany([
      { _id: clubId, code: "CLB-HEBE", name: "HEBE", field: "Nghệ thuật", state: "Active", createdAt: now },
      { _id: quietClub, code: "CLB-AAA", name: "An Quiet", field: "Khác", state: "Active", createdAt: now }]);
    const membershipId = new Types.ObjectId();
    const positionId = new Types.ObjectId();
    await ucmsModels.clubMemberships!.insertMany([
      { _id: membershipId, clubId, userId: leader, state: "Active", joinedAt: now, statusHistory: [] },
      { clubId, userId: students[0], state: "Active", joinedAt: now, statusHistory: [] }]);
    await ucmsModels.clubPositions!.create({ _id: positionId, clubId, code: "LEADER", name: "Chủ nhiệm", isLeaderRole: true,
      isActive: true, permissionCodes: [] });
    await ucmsModels.clubPositionAssignments!.create({ clubId, termId: new Types.ObjectId(), positionId, membershipId,
      effectiveFrom: now, assignedBy: officer });
    const eventId = new Types.ObjectId();
    await ucmsModels.events!.insertMany([
      { _id: eventId, organizerType: "CLUB", clubId, clubName: "HEBE", title: "Đêm nhạc", startAt: new Date("2026-10-01T12:00:00Z"),
        endAt: new Date("2026-10-01T15:00:00Z"), semesterCode: "Fall 2026", audienceScope: "PUBLIC", capacity: 50, state: "Completed",
        currentRevisionNo: 1, createdAt: now },
      { clubId, clubName: "HEBE", organizerType: "CLUB", title: "Huỷ", startAt: new Date("2026-11-01T12:00:00Z"),
        endAt: new Date("2026-11-01T15:00:00Z"), semesterCode: "Fall 2026", audienceScope: "PUBLIC", capacity: 50, state: "Cancelled",
        currentRevisionNo: 1, createdAt: now }]);
    for (const [index, studentId] of [leader, ...students].entries()) {
      const registration = await ucmsModels.eventRegistrations!.create({ eventId, studentId, clubId, state: "Confirmed", answers: {}, createdAt: now });
      if (index < 3) {
        const attendance = await ucmsModels.attendances!.create({ eventId, studentId, registrationId: registration._id, clubId,
          checkedInAt: now, method: "self", abnormalFlags: [], finalized: true });
        await ucmsModels.eventFeedbacks!.create({ eventId, attendanceId: attendance._id, studentId, clubId,
          scores: [{ criterionCode: "OVERALL", score: 5 }], isAnonymous: false, submittedAt: now });
      }
    }
    await ucmsModels.violations!.create({ clubId, originType: "OTHER", severity: "MODERATE", title: "Vi phạm", evidence: [],
      state: "Resolved", openedBy: officer, openedAt: new Date("2026-10-05T00:00:00Z") });
    await ucmsModels.policyVersions!.create({ effectiveFrom: new Date("2026-01-01"), createdBy: officer, createdAt: now,
      minFoundingMembers: 3, formRequirements: {}, reportDeadlines: [], conflictThresholdMinutes: 0, feedbackWindowHours: 48,
      feedbackMinRespondents: 3, allowOverbooking: false, enforceOverdueReportBlock: false, academicCalendar: [semester] });
    const schemes = mongoEvaluationSchemeRepository();
    const draft = await schemes.createDraft("Fall 2026", DEFAULT_SCHEME_SETTINGS, String(officer), now);
    await schemes.activate(draft.id, String(officer), now);
    deps = { repo: mongoEvaluationRepository(), schemes, auth: { systemRoleCodes: async () => ["ICPDP_OFFICER"] },
      policy: { findEffective: async () => ({ id: "p", effectiveFrom: now, createdBy: "x", createdAt: now, minFoundingMembers: 3,
        formRequirements: {} as never, reportDeadlines: [], conflictThresholdMinutes: 0, feedbackWindowHours: 48,
        feedbackMinRespondents: 3, allowOverbooking: false, enforceOverdueReportBlock: false, academicCalendar: [semester] }) } };
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("generates drafts with lineage, takes manual scores, finalizes, publishes the period and revises", async () => {
    const overview = await generateEvaluations(deps, actor, "Fall 2026", now);
    expect(overview.rows.map((row) => [row.clubName, row.state])).toEqual([["An Quiet", "Data Ready"], ["HEBE", "Data Ready"]]);
    expect(overview.canPublish).toBe(false);
    const hebeRow = overview.rows.find((row) => row.clubName === "HEBE")!;
    const quietRow = overview.rows.find((row) => row.clubName === "An Quiet")!;

    const hebe = await deps.repo.find(hebeRow.evaluationId!);
    const score = Object.fromEntries(hebe!.dimensions.map((item) => [item.code, item.score]));
    // 4 registrations, 3 check-ins, 3 unique of 2 members; 2 of 3 attendees are outside the club.
    expect(score).toMatchObject({ D1: 87.5, D3: 100, D4: 50, D7: 100, D8: 75 });
    expect(score.D5).toBeUndefined();
    expect(hebe!.dimensions.find((item) => item.code === "D1")!.evidence.find((item) => item.metric === "attendances"))
      .toMatchObject({ value: 3, sourceEntity: "attendances", sourcePeriod: "Fall 2026" });

    await expect(setManualScore(deps, actor, hebe!.id, "D1", { score: 50, justification: "x" }, now)).rejects.toMatchObject({ kind: "conflict" });
    const manual = await setManualScore(deps, actor, hebe!.id, "D5", { score: 60, justification: "Nộp báo cáo qua email" }, now);
    expect(manual).toMatchObject({ state: "Under Review" });
    expect(manual.dimensions.find((item) => item.code === "D5")).toMatchObject({ score: 60, isManual: true });

    const regenerated = await regenerateEvaluation(deps, actor, hebe!.id, now);
    expect(regenerated.dimensions.find((item) => item.code === "D5")).toMatchObject({ score: 60, isManual: true });

    await finalizeEvaluation(deps, actor, quietRow.evaluationId!, now);
    const finalized = await finalizeEvaluation(deps, actor, hebe!.id, now);
    expect(finalized).toMatchObject({ state: "Finalized" });
    expect(finalized.totalScore).toBeGreaterThan(0);
    expect(finalized.classification).toBeDefined();

    const published = await publishEvaluations(deps, actor, "Fall 2026", now);
    expect(published.rows.every((row) => row.state === "Published")).toBe(true);
    expect(await ucmsModels.notifications!.countDocuments({ recipientUserId: leader, eventCode: "EVALUATION_PUBLISHED" })).toBe(1);

    const revision = await regenerateEvaluation(deps, actor, hebe!.id, new Date(now.getTime() + DAY));
    expect(revision).toMatchObject({ revisionNo: 2, state: "Data Ready" });
    expect(revision.revisions.map((item) => [item.revisionNo, item.state])).toEqual([[2, "Data Ready"], [1, "Published"]]);
    const after = await evaluationOverview(deps, actor, "Fall 2026", now);
    expect(after.canPublish).toBe(false);
    await expect(publishEvaluations(deps, actor, "Fall 2026", now)).rejects.toMatchObject({ kind: "conflict" });
  });
});
