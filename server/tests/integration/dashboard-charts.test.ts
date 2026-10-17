import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_FORM_REQUIREMENTS } from "../../src/domain/policy.js";
import { clubCharts, icpdpCharts } from "../../src/infra/db/dashboard-charts.js";
import { ensureUcmsDatabase, ucmsModels as m } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const now = new Date("2026-10-17T05:00:00Z");
const day = 86_400_000;
const club = new Types.ObjectId(), other = new Types.ObjectId(), actor = new Types.ObjectId();
const held = new Types.ObjectId(), campaign = new Types.ObjectId();

describe.skipIf(!uri)("Dashboard charts", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName: `ucms-dashboard-charts-${process.pid}` }); await ensureUcmsDatabase();
    await m.clubs!.create([
      { _id: club, code: "DC1", name: "Charts", field: "Technology", state: "Active", createdAt: now },
      { _id: other, code: "DC2", name: "Other", field: "Arts", state: "Suspended", createdAt: now },
    ]);
    await m.policyVersions!.create({ minFoundingMembers: 5, formRequirements: DEFAULT_FORM_REQUIREMENTS, reportDeadlines: [],
      conflictThresholdMinutes: 15, feedbackWindowHours: 72, feedbackMinRespondents: 2, allowOverbooking: false, enforceOverdueReportBlock: true,
      academicCalendar: [{ code: "Fall 2026", startAt: new Date("2026-09-01Z"), endAt: new Date("2027-01-01Z") }],
      effectiveFrom: new Date("2026-01-01Z"), createdBy: actor, createdAt: now });
    await m.approvalTasks!.create([
      { entityType: "EVENT_PROPOSAL", entityId: new Types.ObjectId(), clubId: club, title: "t", state: "Open", openedAt: now, slaDueAt: new Date(now.getTime() + day) },
      { entityType: "EVENT_PROPOSAL", entityId: new Types.ObjectId(), clubId: club, title: "t", state: "Escalated", openedAt: now, slaDueAt: new Date(now.getTime() - day) },
      { entityType: "PERIODIC_REPORT", entityId: new Types.ObjectId(), clubId: club, title: "t", state: "Decided", openedAt: now, slaDueAt: new Date(now.getTime() - day) },
    ]);
    const event = { clubId: club, organizerType: "CLUB", objective: "o", venueText: "v", audienceScope: "PUBLIC", capacity: 10, riskCategory: "LOW", semesterCode: "Fall 2026", createdAt: now };
    await m.events!.create([
      { ...event, _id: held, title: "Held", state: "Completed", startAt: new Date("2026-10-02T03:00:00Z"), endAt: new Date("2026-10-02T05:00:00Z") },
      { ...event, title: "Next", state: "Upcoming", startAt: new Date("2026-11-20T03:00:00Z"), endAt: new Date("2026-11-20T05:00:00Z") },
      { ...event, title: "Dropped", state: "Cancelled", startAt: new Date("2026-10-05T03:00:00Z"), endAt: new Date("2026-10-05T05:00:00Z") },
    ]);
    await m.eventBudgets!.create({ eventId: held, clubId: club, lines: [], requestedTotal: Types.Decimal128.fromString("5000000"),
      approvedTotal: Types.Decimal128.fromString("4000000"), approvedByDecisionId: new Types.ObjectId(), disbursedTotal: Types.Decimal128.fromString("3000000"),
      refundedTotal: Types.Decimal128.fromString("0"), state: "Disbursed", periodCode: "Fall 2026", createdAt: now });
    const students = [0, 1, 2].map(() => new Types.ObjectId());
    await m.clubMemberships!.create([
      { clubId: club, userId: students[0], state: "Active", joinedAt: new Date("2026-03-10Z"), statusHistory: [] },
      { clubId: club, userId: students[1], state: "Active", joinedAt: new Date("2026-09-10Z"), statusHistory: [] },
      { clubId: club, userId: students[2], state: "Left", joinedAt: new Date("2026-03-10Z"), leftAt: new Date("2026-08-10Z"), statusHistory: [] },
    ]);
    await m.eventRegistrations!.create(students.map((studentId, i) => ({ eventId: held, studentId, clubId: club,
      state: i === 2 ? "Cancelled" : "Confirmed", createdAt: now })));
    await m.attendances!.create({ eventId: held, studentId: students[0], clubId: club, checkedInAt: new Date("2026-10-02T03:10:00Z"), method: "self", finalized: true });
    await m.eventFeedbacks!.create([4, 5].map((score, i) => ({ eventId: held, studentId: students[i], clubId: club,
      attendanceId: new Types.ObjectId(), scores: [{ criterionCode: "overall", score }], isAnonymous: false, submittedAt: now })));
    await m.recruitmentCampaigns!.create({ _id: campaign, clubId: club, title: "Fall intake", positions: [], criteria: "c",
      windowStart: new Date("2026-09-01Z"), windowEnd: new Date("2026-09-30Z"), capacity: 5, selectionSteps: [], formSchema: [], state: "Completed", createdAt: now });
    await m.recruitmentApplications!.create(["Submitted", "Shortlisted", "Accepted", "Onboarded", "Draft"].map((state) => ({
      campaignId: campaign, clubId: club, userId: new Types.ObjectId(), state, answers: {}, attachments: [] })));
  }, 30000);
  afterAll(async () => { if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

  it("summarises the ICPDP queues, months, clubs and the semester budget", async () => {
    const charts = await icpdpCharts(now);
    expect(charts.queues).toEqual([{ entityType: "EVENT_PROPOSAL", onTime: 1, overdue: 1 }]);
    expect(charts.eventsByMonth.map((item) => item.month)).toEqual(
      ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"]);
    expect(charts.eventsByMonth.find((item) => item.month === "2026-10")?.count).toBe(1);
    expect(charts.eventsByMonth.find((item) => item.month === "2026-11")?.count).toBe(1);
    expect(charts.clubsByField).toEqual(expect.arrayContaining([{ field: "Technology", count: 1 }, { field: "Arts", count: 1 }]));
    expect(charts.budget).toEqual({ periodCode: "Fall 2026", approved: 4_000_000, disbursed: 3_000_000 });
  });

  it("summarises a club's members, turnout, recruitment funnel and feedback", async () => {
    const charts = await clubCharts(String(club), now);
    expect(charts.membersByMonth).toHaveLength(12);
    expect(charts.membersByMonth.find((item) => item.month === "2026-07")?.count).toBe(2);
    expect(charts.membersByMonth.at(-1)).toEqual({ month: "2026-10", count: 2 });
    expect(charts.eventTurnout).toEqual([expect.objectContaining({ title: "Held", registered: 2, attended: 1 })]);
    expect(charts.recruitment).toMatchObject({ title: "Fall intake", submitted: 4, shortlisted: 3, accepted: 2, onboarded: 1 });
    expect(charts.feedback).toEqual({ respondents: 2, average: 4.5, distribution: [0, 0, 0, 1, 1] });
  });
});
