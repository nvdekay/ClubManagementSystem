import { Types } from "mongoose";
import type { ClubDashboardCharts, DashboardMonthCount, IcpdpDashboardCharts } from "../../domain/dashboard.js";
import { FEEDBACK_CRITERION } from "../../domain/event-feedback.js";
import type { AcademicSemester } from "../../domain/policy.js";
import { ucmsModels as m } from "./ucms-models.js";

type Doc = Record<string, unknown>;
const VN_OFFSET = 7 * 3600_000;
const HELD_EVENT_STATES = ["Approved", "Upcoming", "Ongoing", "Completed", "Report Submitted", "Closed"];
const FINISHED_EVENT_STATES = ["Completed", "Report Submitted", "Closed"];
const FIELD_LIMIT = 7;

/** First instant of the Vietnam-time month `offset` months away from `now`. */
function monthStart(now: Date, offset: number): Date {
  const local = new Date(now.getTime() + VN_OFFSET);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + offset, 1) - VN_OFFSET);
}
function monthKey(start: Date): string {
  return new Date(start.getTime() + VN_OFFSET).toISOString().slice(0, 7);
}
function months(now: Date, from: number, to: number): { key: string; start: Date; end: Date }[] {
  const out = [];
  for (let offset = from; offset <= to; offset += 1) {
    const start = monthStart(now, offset);
    out.push({ key: monthKey(start), start, end: monthStart(now, offset + 1) });
  }
  return out;
}
function money(value: unknown): number {
  return value === null || value === undefined ? 0 : Number(String(value));
}

export async function icpdpCharts(now: Date): Promise<IcpdpDashboardCharts> {
  const window = months(now, -5, 2);
  const [tasks, events, fields, states, policy] = await Promise.all([
    m.approvalTasks!.find({ state: { $in: ["Open", "Escalated"] } }).select({ entityType: 1, slaDueAt: 1 }).lean(),
    m.events!.find({ state: { $in: HELD_EVENT_STATES }, startAt: { $gte: window[0]!.start, $lt: window.at(-1)!.end } })
      .select({ startAt: 1 }).lean(),
    m.clubs!.aggregate<{ _id: string | null; count: number }>([
      { $match: { state: { $in: ["Active", "Suspended", "Dissolving"] } } },
      { $group: { _id: "$field", count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }]),
    m.clubs!.aggregate<{ _id: string; count: number }>([
      { $match: { state: { $ne: "Dissolved" } } }, { $group: { _id: "$state", count: { $sum: 1 } } }]),
    m.policyVersions!.findOne({ effectiveFrom: { $lte: now } }).sort({ effectiveFrom: -1, createdAt: -1, _id: -1 }).lean(),
  ]);
  const queues = new Map<string, { onTime: number; overdue: number }>();
  for (const task of tasks) {
    const entry = queues.get(String(task.entityType)) ?? { onTime: 0, overdue: 0 };
    if (task.slaDueAt instanceof Date && task.slaDueAt < now) entry.overdue += 1; else entry.onTime += 1;
    queues.set(String(task.entityType), entry);
  }
  const semester = ((policy?.academicCalendar ?? []) as AcademicSemester[])
    .find((item) => item.startAt <= now && now < item.endAt);
  const [budget] = semester ? await m.eventBudgets!.aggregate<{ approved: unknown; disbursed: unknown }>([
    { $match: { periodCode: semester.code, state: { $nin: ["Cancelled", "Rejected"] } } },
    { $group: { _id: null, approved: { $sum: { $toDouble: { $ifNull: ["$approvedTotal", 0] } } },
      disbursed: { $sum: { $toDouble: { $ifNull: ["$disbursedTotal", 0] } } } } }]) : [];
  const head = fields.slice(0, FIELD_LIMIT).map((item) => ({ field: item._id ?? "", count: item.count }));
  const tail = fields.slice(FIELD_LIMIT).reduce((sum, item) => sum + item.count, 0);
  return {
    queues: [...queues].map(([entityType, counts]) => ({ entityType, ...counts }))
      .sort((a, b) => b.onTime + b.overdue - (a.onTime + a.overdue) || a.entityType.localeCompare(b.entityType)),
    eventsByMonth: window.map((month) => ({ month: month.key,
      count: events.filter((event) => (event.startAt as Date) >= month.start && (event.startAt as Date) < month.end).length })),
    clubsByField: tail ? [...head, { field: "other", count: tail }] : head,
    clubsByState: states.map((item) => ({ state: item._id, count: item.count })),
    budget: { ...(semester ? { periodCode: semester.code } : {}), approved: money(budget?.approved), disbursed: money(budget?.disbursed) },
  };
}

/** When a Left or Banned membership stopped counting; `leftAt` first, else the last history entry into that state. */
function endedAt(doc: Doc): Date | undefined {
  if (doc.leftAt instanceof Date) return doc.leftAt;
  if (doc.state !== "Left" && doc.state !== "Banned") return undefined;
  const history = Array.isArray(doc.statusHistory) ? doc.statusHistory as Doc[] : [];
  const last = [...history].reverse().find((item) => item.toState === doc.state);
  const at = last?.effectiveDate ?? last?.at;
  return at instanceof Date ? at : new Date(0);
}

export async function clubCharts(clubId: string, now: Date): Promise<ClubDashboardCharts> {
  const club = new Types.ObjectId(clubId);
  const [memberships, finished, campaign, feedbacks] = await Promise.all([
    m.clubMemberships!.find({ clubId: club }).select({ joinedAt: 1, leftAt: 1, state: 1, statusHistory: 1 }).lean(),
    m.events!.find({ clubId: club, state: { $in: FINISHED_EVENT_STATES } }).sort({ startAt: -1 }).limit(6)
      .select({ title: 1, startAt: 1 }).lean(),
    m.recruitmentCampaigns!.findOne({ clubId: club, state: { $ne: "Draft" } }).sort({ windowStart: -1, createdAt: -1 })
      .select({ title: 1 }).lean(),
    m.eventFeedbacks!.find({ clubId: club }).select({ scores: 1 }).lean(),
  ]);
  const membersByMonth: DashboardMonthCount[] = months(now, -11, 0).map((month) => {
    const cut = month.end < now ? month.end : now;
    return { month: month.key, count: memberships.filter((doc) => (doc.joinedAt as Date) < cut
      && !((endedAt(doc) ?? cut) < cut)).length };
  });
  const ids = finished.map((event) => event._id);
  const [registered, attended, applications] = await Promise.all([
    m.eventRegistrations!.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { eventId: { $in: ids }, state: "Confirmed" } }, { $group: { _id: "$eventId", count: { $sum: 1 } } }]),
    m.attendances!.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { eventId: { $in: ids }, checkedInAt: { $ne: null } } }, { $group: { _id: "$eventId", count: { $sum: 1 } } }]),
    campaign ? m.recruitmentApplications!.find({ campaignId: campaign._id, state: { $ne: "Draft" } }).select({ state: 1 }).lean() : [],
  ]);
  function count(rows: { _id: Types.ObjectId; count: number }[], id: unknown) {
    return rows.find((row) => String(row._id) === String(id))?.count ?? 0;
  }
  function inState(states: string[]) {
    return applications.filter((doc) => states.includes(String(doc.state))).length;
  }
  const ratings = feedbacks.map((doc) => Number(((doc.scores ?? []) as Doc[])
    .find((score) => score.criterionCode === FEEDBACK_CRITERION)?.score ?? 0)).filter((value) => value >= 1 && value <= 5);
  return {
    membersByMonth,
    eventTurnout: [...finished].reverse().map((event) => ({ eventId: String(event._id), title: String(event.title),
      startAt: event.startAt as Date, registered: count(registered, event._id), attended: count(attended, event._id) })),
    ...(campaign ? { recruitment: { campaignId: String(campaign._id), title: String(campaign.title),
      submitted: applications.length,
      shortlisted: inState(["Shortlisted", "Accepted", "Waitlisted", "Onboarded", "Declined"]),
      accepted: inState(["Accepted", "Onboarded", "Declined"]), onboarded: inState(["Onboarded"]) } } : {}),
    feedback: { respondents: ratings.length,
      ...(ratings.length ? { average: Math.round(ratings.reduce((sum, value) => sum + value, 0) / ratings.length * 10) / 10 } : {}),
      distribution: [1, 2, 3, 4, 5].map((value) => ratings.filter((rating) => Math.round(rating) === value).length) },
  };
}
