import { overduePostEventReports } from "./post-event-report-deadlines.js";
import { cancelEventInSession } from "./event-cancellation.js";
import { randomUUID } from "node:crypto";
import mongoose, { Types } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import { ACTIVE_DEFENSE_STATES } from "../../domain/event-defense.js";
import {
  type ClubObligation, type EventBudgetSummary, type EventProposalDetail,
  type EventProposalReviewRepository, type EventProposalSummary, type EventProposalTask,
  type EventProposalVersion, type EventReviewDecision,
} from "../../domain/event-proposal-review.js";
import {
  applyProposalDecisionInSession, approvedLines, conflict, mapDefenseSession, money, optionalText, requestedLines,
} from "./event-defense-helpers.js";
import { ucmsModels } from "./ucms-models.js";
import { overduePeriodicReports } from "./periodic-report-obligations.js";

type Doc = Record<string, unknown>;
const TASK_TYPE = "EVENT_PROPOSAL";
const reviewableStates = ["Pending Approval", "Under Review", "Re-defense Pending"];

function taskFrom(doc: Doc): EventProposalTask {
  return {
    id: String(doc._id), eventId: String(doc.entityId), title: String(doc.title),
    state: doc.state as EventProposalTask["state"],
    assigneeId: doc.assigneeId ? String(doc.assigneeId) : undefined,
    openedAt: doc.openedAt as Date, slaDueAt: doc.slaDueAt as Date | undefined,
  };
}

function decisionFrom(doc: Doc): EventReviewDecision {
  const comments = doc.comments as { sections?: string[]; conditions?: string[] } | undefined;
  return {
    id: String(doc._id), taskId: String(doc.approvalTaskId),
    outcome: doc.outcome as EventReviewDecision["outcome"], reason: optionalText(doc.reason),
    sections: comments?.sections ?? [], conditions: comments?.conditions ?? [],
    reviewNote: optionalText(doc.reviewNote), actorId: String(doc.actorId), at: doc.at as Date,
  };
}

function budgetFrom(doc: Doc, eventTitle?: string): EventBudgetSummary {
  return { id: String(doc._id), eventId: String(doc.eventId), ...(eventTitle ? { eventTitle } : {}),
    state: String(doc.state), requestedTotal: money(doc.requestedTotal), approvedTotal: money(doc.approvedTotal),
    lines: approvedLines(doc.lines) };
}

function eventFrom(doc: Doc, requestedBudgetTotal: number, property?: EventProposalSummary["property"]): EventProposalSummary {
  return {
    id: String(doc._id), clubId: String(doc.clubId ?? ""), clubName: String(doc.clubName ?? ""),
    title: String(doc.title), objective: optionalText(doc.objective),
    startAt: doc.startAt as Date, endAt: doc.endAt as Date, semesterCode: String(doc.semesterCode ?? ""),
    venueText: optionalText(doc.venueText), ...(property ? { property } : {}),
    audienceScope: String(doc.audienceScope ?? "PUBLIC"), capacity: Number(doc.capacity ?? 0),
    riskCategory: optionalText(doc.riskCategory), state: String(doc.state),
    conflictResult: optionalText(doc.conflictResult), conflictDetail: doc.conflictDetail ?? undefined,
    approvalConditions: Array.isArray(doc.approvalConditions) ? doc.approvalConditions.map(String) : [],
    currentRevisionNo: Number(doc.currentRevisionNo ?? 1),
    revisionDeadlineAt: doc.revisionDeadlineAt as Date | undefined, requestedBudgetTotal,
  };
}

export function mongoEventProposalReviewRepository(): EventProposalReviewRepository {
  const m = ucmsModels;
  const events = m.events!;
  const versions = m.eventProposalVersions!;
  const tasks = m.approvalTasks!;
  const decisions = m.approvalDecisions!;
  const budgets = m.eventBudgets!;
  const audits = m.auditLogs!;
  const notifications = m.notifications!;

  async function obligations(clubId: Types.ObjectId, now: Date): Promise<ClubObligation[]> {
    const [settlement, refund, report, postReports] = await Promise.all([
      budgets.exists({ clubId, settlementDueAt: { $lt: now }, settlementSubmittedAt: { $exists: false },
        state: { $nin: ["Cancelled", "Closed"] } }),
      budgets.exists({ clubId, recoveryDueAt: { $lt: now }, state: "Recovery Pending" }),
      overduePeriodicReports(clubId, now),
      overduePostEventReports(clubId, now),
    ]);
    return [...(settlement ? ["overdueSettlement" as const] : []), ...(refund ? ["overdueRefund" as const] : []),
      ...(report.length || postReports.length ? ["overdueReport" as const] : [])];
  }

  async function detail(eventId: Types.ObjectId, now: Date): Promise<EventProposalDetail | null> {
    const [event, taskDocs, versionDocs] = await Promise.all([
      events.findById(eventId).lean(),
      tasks.find({ entityType: TASK_TYPE, entityId: eventId }).sort({ openedAt: -1, _id: -1 }).lean(),
      versions.find({ eventId }).sort({ revisionNo: 1 }).lean(),
    ]);
    const task = taskDocs[0];
    if (!event || !task || !event.clubId) return null;
    const clubId = event.clubId as Types.ObjectId;
    const [decisionDocs, club, property, submitters, bookingDocs, budgetDocs, owed, defenseDocs] = await Promise.all([
      decisions.find({ approvalTaskId: { $in: taskDocs.map((item) => item._id) } }).sort({ at: 1 }).lean(),
      m.clubs!.findById(clubId).select({ name: 1, state: 1 }).lean(),
      event.propertyId ? m.properties!.findById(event.propertyId).select({ code: 1, name: 1 }).lean() : null,
      m.users!.find({ _id: { $in: versionDocs.map((version) => version.submittedBy) } })
        .select({ displayName: 1, email: 1 }).lean(),
      m.propertyBookings!.find({ eventId }).sort({ startAt: 1 }).lean(),
      budgets.find({ clubId, $or: [{ eventId }, { periodCode: event.semesterCode }] }).sort({ createdAt: -1 }).lean(),
      obligations(clubId, now),
      m.eventDefenseSessions!.find({ eventId }).sort({ createdAt: -1, _id: -1 }).lean(),
    ]);
    const propertyIds = bookingDocs.map((booking) => booking.propertyId);
    const [bookingProperties, budgetEvents] = await Promise.all([
      m.properties!.find({ _id: { $in: propertyIds } }).select({ code: 1, name: 1 }).lean(),
      events.find({ _id: { $in: budgetDocs.map((budget) => budget.eventId) } }).select({ title: 1 }).lean(),
    ]);
    const propertyById = new Map(bookingProperties.map((item) => [String(item._id), item]));
    const titleById = new Map(budgetEvents.map((item) => [String(item._id), String(item.title)]));
    const nameById = new Map(submitters.map((user) => [String(user._id),
      optionalText(user.displayName) ?? String(user.email)]));
    const mappedVersions: EventProposalVersion[] = versionDocs.map((version) => ({
      id: String(version._id), revisionNo: Number(version.revisionNo),
      payload: (version.payload ?? {}) as Record<string, unknown>,
      budgetLines: requestedLines(version.budgetLines), requestedBudgetTotal: money(version.requestedBudgetTotal),
      conflictResult: optionalText(version.conflictResult), submittedBy: String(version.submittedBy),
      submittedByName: nameById.get(String(version.submittedBy)), submittedAt: version.submittedAt as Date,
    }));
    const current = mappedVersions.find((version) => version.revisionNo === Number(event.currentRevisionNo))
      ?? mappedVersions.at(-1);
    const own = budgetDocs.find((budget) => String(budget.eventId) === String(eventId));
    const defenseHistory = defenseDocs.map(mapDefenseSession);
    const activeDefenseSession = defenseHistory.find((session) =>
      ACTIVE_DEFENSE_STATES.has(session.state) || (session.state === "DEFENDED" && !session.outcome));
    return {
      task: taskFrom(task),
      event: eventFrom(event, current?.requestedBudgetTotal ?? 0,
        property ? { id: String(property._id), code: String(property.code), name: String(property.name) } : undefined),
      versions: mappedVersions, decisions: decisionDocs.map(decisionFrom),
      club: { id: String(clubId), name: String(club?.name ?? event.clubName ?? ""), state: String(club?.state ?? ""),
        obligations: owed },
      bookings: bookingDocs.map((booking) => {
        const item = propertyById.get(String(booking.propertyId));
        return { id: String(booking._id), propertyCode: optionalText(item?.code), propertyName: optionalText(item?.name),
          startAt: booking.startAt as Date, endAt: booking.endAt as Date, state: String(booking.state) };
      }),
      semesterBudgets: budgetDocs.filter((budget) => budget !== own)
        .map((budget) => budgetFrom(budget, titleById.get(String(budget.eventId)))),
      ...(own ? { budget: budgetFrom(own, String(event.title)) } : {}),
      ...(activeDefenseSession ? { activeDefenseSession } : {}),
      ...(defenseHistory.length ? { defenseHistory } : {}),
    };
  }

  async function required(eventId: Types.ObjectId, now: Date) {
    const found = await detail(eventId, now);
    if (!found) throw new DomainError("event proposal not found", "not_found");
    return found;
  }

  return {
    async listOpen() {
      const taskDocs = await tasks.find({ entityType: TASK_TYPE, state: "Open" }).sort({ openedAt: 1, _id: 1 }).lean();
      if (!taskDocs.length) return [];
      const eventDocs = await events.find({ _id: { $in: taskDocs.map((task) => task.entityId) },
        state: { $in: reviewableStates } }).lean();
      const versionDocs = await versions.find({ eventId: { $in: eventDocs.map((event) => event._id) } })
        .select({ eventId: 1, revisionNo: 1, requestedBudgetTotal: 1 }).lean();
      const totals = new Map(versionDocs.map((version) =>
        [`${String(version.eventId)}:${String(version.revisionNo)}`, money(version.requestedBudgetTotal)]));
      const byId = new Map(eventDocs.map((event) => [String(event._id), event]));
      return taskDocs.flatMap((task) => {
        const event = byId.get(String(task.entityId));
        if (!event) return [];
        const total = totals.get(`${String(event._id)}:${String(event.currentRevisionNo ?? 1)}`) ?? 0;
        return [{ task: taskFrom(task), event: eventFrom(event, total) }];
      });
    },

    async find(eventId, now) {
      return detail(new Types.ObjectId(eventId), now);
    },

    async claim(eventId, officerId, now) {
      const id = new Types.ObjectId(eventId);
      const actorId = new Types.ObjectId(officerId);
      await mongoose.connection.transaction(async (session) => {
        const task = await tasks.findOne({ entityType: TASK_TYPE, entityId: id, state: "Open" })
          .sort({ openedAt: -1 }).session(session).lean();
        if (!task) return conflict("event proposal review is no longer open");
        if (task.assigneeId && String(task.assigneeId) !== officerId) {
          return conflict("event proposal review is assigned to another officer");
        }
        const claimed = await tasks.updateOne({ _id: task._id, state: "Open",
          $or: [{ assigneeId: { $exists: false } }, { assigneeId: null }, { assigneeId: actorId }] },
        { $set: { assigneeId: actorId } }, { session });
        if (claimed.matchedCount !== 1) return conflict("event proposal review was claimed");
        const changed = await events.updateOne({ _id: id, state: "Pending Approval" },
          { $set: { state: "Under Review" } }, { session });
        if (changed.matchedCount === 0
          && !(await events.exists({ _id: id, state: "Under Review" }).session(session))) {
          return conflict("event proposal cannot be reviewed in its current state");
        }
        if (changed.modifiedCount === 1) {
          await audits.create([{ entityType: "Event", entityId: id, action: "EVENT_PROPOSAL_REVIEW_CLAIMED",
            actorId, actorRole: "ICPDP_OFFICER", before: { state: "Pending Approval" },
            after: { state: "Under Review" }, correlationId: randomUUID(), at: now }], { session });
        }
      });
      return required(id, now);
    },

    async decide(eventId, officerId, input, now) {
      const id = new Types.ObjectId(eventId);
      await mongoose.connection.transaction(async (session) => {
        await applyProposalDecisionInSession(session, id, officerId, input, now, { requireDefendedSession: false });
      });
      return required(id, now);
    },

    async advanceLifecycle(now) {
      const overdue = await events.find({ state: "Revision Requested", revisionDeadlineAt: { $lt: now } })
        .select({ _id: 1, title: 1, currentRevisionNo: 1 }).lean();
      let expired = 0;
      for (const event of overdue) {
        await mongoose.connection.transaction(async (session) => {
          const changed = await events.updateOne({ _id: event._id, state: "Revision Requested" },
            { $set: { state: "Expired" } }, { session });
          if (changed.modifiedCount !== 1) return;
          await m.eventDefenseSessions!.updateMany(
            { eventId: event._id, state: { $in: ["SCHEDULED", "CONFIRMED", "RESCHEDULE_REQUESTED", "IN_PROGRESS"] } },
            { $set: { state: "CANCELLED", cancelReason: "Proposal revision deadline expired", updatedAt: now } },
            { session },
          );
          if (await audits.exists({ entityType: "Event", entityId: event._id, action: "EVENT_RESCHEDULED" }).session(session)) {
            const expiredEvent = await events.findById(event._id).session(session).lean();
            if (expiredEvent) {
              await cancelEventInSession(session, expiredEvent, "Reschedule revision expired", now, "PROPOSAL_EXPIRY", 24);
              await events.updateOne({ _id: event._id, state: "Cancelled" }, { $set: { state: "Expired" } }, { session });
            }
          }
          expired += 1;
          await audits.create([{ entityType: "Event", entityId: event._id, action: "EVENT_PROPOSAL_EXPIRED",
            actorRole: "SYSTEM", before: { state: "Revision Requested" }, after: { state: "Expired" },
            correlationId: randomUUID(), at: now }], { session });
          const version = await versions.findOne({ eventId: event._id, revisionNo: event.currentRevisionNo ?? 1 })
            .session(session).lean();
          if (version) {
            await notifications.create([{ recipientUserId: version.submittedBy, eventCode: "EVENT_PROPOSAL_EXPIRED",
              entityType: "Event", entityId: event._id, channels: ["IN_APP"], payload: { title: event.title },
              state: "Queued", dueAt: now, attempts: 0, createdAt: now }], { session });
          }
        });
      }
      const completed = await events.updateMany({ state: { $in: ["Upcoming", "Ongoing"] }, endAt: { $lte: now } },
        { $set: { state: "Completed" } });
      const started = await events.updateMany({ state: "Upcoming", startAt: { $lte: now }, endAt: { $gt: now } },
        { $set: { state: "Ongoing" } });
      return { expired, started: started.modifiedCount, completed: completed.modifiedCount };
    },
  };
}
