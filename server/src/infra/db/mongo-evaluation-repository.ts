import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import {
  DIMENSION_NAMES, severityPenalty,
  type Classification, type ClubMetrics, type DimensionView, type EvaluationDetail, type EvaluationRecord,
  type EvaluationRepository, type EvaluationState, type Lineage, type MetricValue,
} from "../../domain/evaluation.js";
import type { DimensionCode, SchemeThresholds } from "../../domain/evaluation-scheme.js";
import { clubBoardUserIds, queueNotifications } from "./club-board.js";
import { ucmsModels } from "./ucms-models.js";

type Doc = Record<string, unknown>;
const inScopeStates = ["Active", "Suspended", "Dissolving"];
const COMPUTED = "computedScore";

function decimal(value: number) {
  return Types.Decimal128.fromString(String(value));
}

function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(String(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function ids(docs: { _id?: unknown }[]): string[] {
  return docs.map((doc) => String(doc._id));
}

function metric(value: number, sourceEntity: string, sourceIds: string[] = []): MetricValue {
  return { value, sourceEntity, sourceIds };
}

export function mongoEvaluationRepository(): EvaluationRepository {
  const m = ucmsModels;
  const evaluations = m.evaluations!;
  const results = m.evaluationDimensionResults!;

  async function audit(session: ClientSession, id: Types.ObjectId, action: string, officerId: string, after: unknown,
    now: Date, reason?: string): Promise<void> {
    await m.auditLogs!.create([{ entityType: "Evaluation", entityId: id, action, actorId: new Types.ObjectId(officerId),
      actorRole: "ICPDP_OFFICER", after, ...(reason ? { reason } : {}), correlationId: randomUUID(), at: now }], { session });
  }

  async function records(docs: Doc[]): Promise<EvaluationRecord[]> {
    if (!docs.length) return [];
    const schemeIds = [...new Set(docs.map((doc) => String(doc.schemeId)))].map((id) => new Types.ObjectId(id));
    const [resultDocs, dimensionDocs, schemeDocs, clubs] = await Promise.all([
      results.find({ evaluationId: { $in: docs.map((doc) => doc._id) } }).lean(),
      m.evaluationDimensions!.find({ schemeId: { $in: schemeIds } }).lean(),
      m.evaluationSchemes!.find({ _id: { $in: schemeIds } }).select({ version: 1 }).lean(),
      m.clubs!.find({ _id: { $in: docs.map((doc) => doc.clubId) } }).select({ name: 1 }).lean(),
    ]);
    const clubName = new Map(clubs.map((club) => [String(club._id), String(club.name)]));
    const version = new Map(schemeDocs.map((scheme) => [String(scheme._id), Number(scheme.version)]));
    return docs.map((doc) => {
      const order = dimensionDocs.filter((item) => String(item.schemeId) === String(doc.schemeId))
        .sort((left, right) => String(left.code).localeCompare(String(right.code)));
      const dimensions: DimensionView[] = order.map((dimension) => {
        const result = resultDocs.find((item) => String(item.evaluationId) === String(doc._id) && item.dimensionCode === dimension.code);
        const evidence = Array.isArray(result?.evidence) ? result.evidence as (Lineage | { metric: string; value: number })[] : [];
        const computedEntry = evidence.find((item) => item.metric === COMPUTED);
        const score = optionalNumber(result?.score);
        return { code: String(dimension.code) as DimensionCode, name: DIMENSION_NAMES.get(String(dimension.code)) ?? String(dimension.name),
          weight: Number(String(dimension.weight)), allowsManual: dimension.allowsManual === true,
          ...(score !== undefined ? { score } : {}),
          ...(computedEntry ? { computedScore: Number(computedEntry.value) } : {}),
          insufficientData: result?.isInsufficientData === true, isManual: result?.isManual === true,
          ...(typeof result?.justification === "string" && result.justification ? { justification: result.justification } : {}),
          evidence: evidence.filter((item): item is Lineage => item.metric !== COMPUTED) };
      });
      const total = optionalNumber(doc.totalScore);
      return {
        id: String(doc._id), clubId: String(doc.clubId), clubName: clubName.get(String(doc.clubId)) ?? "",
        periodCode: String(doc.periodCode), schemeId: String(doc.schemeId), schemeVersion: version.get(String(doc.schemeId)) ?? 0,
        state: doc.state as EvaluationState, revisionNo: Number(doc.revisionNo ?? 1),
        ...(total !== undefined ? { totalScore: total } : {}),
        ...(typeof doc.classification === "string" && doc.classification ? { classification: doc.classification as Classification } : {}),
        ...(doc.generatedAt instanceof Date ? { generatedAt: doc.generatedAt } : {}),
        ...(doc.finalizedAt instanceof Date ? { finalizedAt: doc.finalizedAt } : {}),
        ...(doc.publishedAt instanceof Date ? { publishedAt: doc.publishedAt } : {}),
        dimensions,
      };
    });
  }

  function resultDocs(evaluationId: Types.ObjectId, items: { code: string; score?: number; computedScore?: number;
    insufficientData: boolean; isManual: boolean; justification?: string; evidence: Lineage[] }[], periodCode: string) {
    return items.map((item) => ({ evaluationId, dimensionCode: item.code,
      ...(item.score !== undefined ? { score: decimal(item.score) } : {}), isInsufficientData: item.insufficientData,
      isManual: item.isManual, ...(item.justification ? { justification: item.justification } : {}),
      evidence: [...item.evidence, ...(item.computedScore !== undefined ? [{ metric: COMPUTED, sourceEntity: "evaluationDimensionResults",
        sourceIds: [], sourcePeriod: periodCode, value: item.computedScore }] : [])] }));
  }

  return {
    async clubsInScope() {
      const clubs = await m.clubs!.find({ state: { $in: inScopeStates } }).sort({ name: 1 }).collation({ locale: "vi" })
        .select({ name: 1, state: 1 }).lean();
      return clubs.map((club) => ({ id: String(club._id), name: String(club.name), state: String(club.state) }));
    },

    async latest(periodCode) {
      const latestIds = await evaluations.aggregate<{ _id: Types.ObjectId; id: Types.ObjectId }>([
        { $match: { periodCode } }, { $sort: { revisionNo: -1 } },
        { $group: { _id: "$clubId", id: { $first: "$_id" } } }]);
      return records(await evaluations.find({ _id: { $in: latestIds.map((item) => item.id) } }).lean());
    },

    async find(id) {
      const doc = await evaluations.findById(new Types.ObjectId(id)).lean();
      if (!doc) return null;
      const [[record], revisions, scheme, published] = await Promise.all([
        records([doc]),
        evaluations.find({ clubId: doc.clubId, periodCode: doc.periodCode }).sort({ revisionNo: -1 }).lean(),
        m.evaluationSchemes!.findById(doc.schemeId).select({ thresholds: 1 }).lean(),
        evaluations.find({ clubId: doc.clubId, state: "Published", periodCode: { $ne: doc.periodCode } })
          .sort({ publishedAt: 1, revisionNo: 1 }).lean(),
      ]);
      const trend = new Map<string, Doc>();
      for (const item of published) trend.set(String(item.periodCode), item);
      return {
        ...record!,
        revisions: revisions.map((item) => ({ id: String(item._id), revisionNo: Number(item.revisionNo), state: item.state as EvaluationState,
          ...(optionalNumber(item.totalScore) !== undefined ? { totalScore: optionalNumber(item.totalScore) } : {}),
          ...(item.publishedAt instanceof Date ? { publishedAt: item.publishedAt } : {}) })),
        trend: [...trend.values()].map((item) => ({ periodCode: String(item.periodCode),
          ...(optionalNumber(item.totalScore) !== undefined ? { totalScore: optionalNumber(item.totalScore) } : {}),
          ...(typeof item.classification === "string" ? { classification: item.classification as Classification } : {}) })),
        thresholds: (scheme?.thresholds ?? { excellent: 85, good: 70, fair: 50 }) as SchemeThresholds,
      } satisfies EvaluationDetail;
    },

    async collectMetrics(clubId, period, now) {
      const club = new Types.ObjectId(clubId);
      const inPeriod = { $gte: period.startAt, $lte: period.endAt };
      const [eventDocs, memberDocs, leftDocs, applicationDocs, invitationDocs, budgetDocs, violationDocs, periodicDocs,
        leaderPositions] = await Promise.all([
        m.events!.find({ clubId: club, semesterCode: period.code }).select({ state: 1, audienceScope: 1 }).lean(),
        m.clubMemberships!.find({ clubId: club, state: { $in: ["Active", "Inactive"] } }).select({ userId: 1, state: 1 }).lean(),
        m.clubMemberships!.find({ clubId: club, state: { $in: ["Left", "Banned"] }, leftAt: inPeriod }).select({ _id: 1 }).lean(),
        m.recruitmentApplications!.find({ clubId: club, submittedAt: inPeriod }).select({ _id: 1 }).lean(),
        m.eventInvitations!.find({ clubId: club, status: "Accepted" }).select({ eventId: 1 }).lean(),
        m.eventBudgets!.find({ clubId: club, periodCode: period.code, state: { $ne: "Cancelled" } }).lean(),
        m.violations!.find({ clubId: club, openedAt: inPeriod }).select({ severity: 1, state: 1 }).lean(),
        m.periodicReports!.find({ clubId: club, periodCode: period.code, dueAt: { $lte: now } }).lean(),
        m.clubPositions!.find({ clubId: club, isLeaderRole: true, isActive: true }).distinct("_id"),
      ]);
      const completed = eventDocs.filter((event) => event.state === "Completed");
      const completedIds = completed.map((event) => event._id);
      const [registrationDocs, attendanceDocs, feedbackDocs, postReports, invitedEvents, leaderSeat] = await Promise.all([
        m.eventRegistrations!.find({ eventId: { $in: completedIds }, state: "Confirmed" }).select({ _id: 1 }).lean(),
        m.attendances!.find({ eventId: { $in: completedIds } }).select({ studentId: 1 }).lean(),
        m.eventFeedbacks!.find({ eventId: { $in: eventDocs.map((event) => event._id) } }).select({ scores: 1 }).lean(),
        m.postEventReports!.find({ clubId: club, eventId: { $in: eventDocs.map((event) => event._id) }, state: { $ne: "Draft" } }).lean(),
        m.events!.find({ _id: { $in: invitationDocs.map((item) => item.eventId) }, semesterCode: period.code }).select({ _id: 1 }).lean(),
        leaderPositions.length ? m.clubPositionAssignments!.findOne({ clubId: club, positionId: { $in: leaderPositions }, effectiveTo: null })
          .select({ _id: 1 }).lean() : null,
      ]);
      const memberIds = new Set(memberDocs.map((item) => String(item.userId)));
      const attendees = new Set(attendanceDocs.map((item) => String(item.studentId)));
      const outsiders = [...attendees].filter((id) => !memberIds.has(id));
      const ratings = feedbackDocs.flatMap((item) => Array.isArray(item.scores)
        ? (item.scores as { score?: unknown }[]).map((score) => Number(score.score)).filter(Number.isFinite).slice(0, 1) : []);
      const onTimePeriodic = periodicDocs.filter((item) => item.submittedAt instanceof Date && item.lateFlag !== true
        && item.submittedAt <= (item.dueAt as Date));
      const onTimePost = postReports.filter((item) => item.submittedAt instanceof Date && item.lateFlag !== true);
      const clean = budgetDocs.filter((item) => item.isSettlementLate !== true
        && !(item.settlementDueAt instanceof Date && item.settlementDueAt < now && !item.settlementSubmittedAt && item.state !== "Closed")
        && !(item.state === "Recovery Pending" && item.recoveryDueAt instanceof Date && item.recoveryDueAt < now));
      const found = violationDocs.filter((item) => ["Decision Issued", "Corrective Action", "Resolved"].includes(String(item.state)));
      const open = violationDocs.filter((item) => ["Open", "Under Investigation", "Awaiting Club Response"].includes(String(item.state)));
      const active = memberDocs.filter((item) => item.state === "Active");
      const publicCompleted = completed.filter((event) => event.audienceScope === "PUBLIC");
      const cancelled = eventDocs.filter((event) => event.state === "Cancelled");
      return {
        registrations: metric(registrationDocs.length, "eventRegistrations", ids(registrationDocs)),
        attendances: metric(attendanceDocs.length, "attendances", ids(attendanceDocs)),
        uniqueAttendees: metric(attendees.size, "attendances"),
        outsiderAttendees: metric(outsiders.length, "attendances"),
        activeMembers: metric(active.length, "clubMemberships", ids(active)),
        completedEvents: metric(completed.length, "events", ids(completed)),
        publicCompletedEvents: metric(publicCompleted.length, "events", ids(publicCompleted)),
        cancelledEvents: metric(cancelled.length, "events", ids(cancelled)),
        acceptedInvitations: metric(invitedEvents.length, "eventInvitations", ids(invitedEvents)),
        applications: metric(applicationDocs.length, "recruitmentApplications", ids(applicationDocs)),
        feedbackCount: metric(ratings.length, "eventFeedbacks", ids(feedbackDocs)),
        feedbackAverage: metric(ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : 0, "eventFeedbacks"),
        reportsDue: metric(periodicDocs.length + postReports.length, "periodicReports+postEventReports",
          [...ids(periodicDocs), ...ids(postReports)]),
        reportsOnTime: metric(onTimePeriodic.length + onTimePost.length, "periodicReports+postEventReports",
          [...ids(onTimePeriodic), ...ids(onTimePost)]),
        budgets: metric(budgetDocs.length, "eventBudgets", ids(budgetDocs)),
        budgetsClean: metric(clean.length, "eventBudgets", ids(clean)),
        leaderSeated: metric(leaderSeat ? 1 : 0, "clubPositionAssignments", leaderSeat ? [String(leaderSeat._id)] : []),
        membersLeft: metric(leftDocs.length, "clubMemberships", ids(leftDocs)),
        violationPenalty: metric(found.reduce((sum, item) => sum + severityPenalty(String(item.severity)), 0), "violations", ids(found)),
        openViolations: metric(open.length, "violations", ids(open)),
      } satisfies ClubMetrics;
    },

    async writeDraft(input, officerId, now) {
      let id = new Types.ObjectId();
      await mongoose.connection.transaction(async (session) => {
        const schemeId = new Types.ObjectId(input.scheme.id);
        if (input.target.kind === "replace") {
          id = new Types.ObjectId(input.target.evaluationId);
          const changed = await evaluations.updateOne({ _id: id, state: { $in: ["Draft", "Data Ready", "Under Review"] } },
            { $set: { schemeId, state: "Data Ready", generatedAt: now }, $unset: { totalScore: "", classification: "" } }, { session });
          if (changed.matchedCount !== 1) throw new DomainError("the evaluation changed; reload it", "conflict");
          await results.deleteMany({ evaluationId: id }, { session });
          await audit(session, id, "EVALUATION_REGENERATED", officerId, { state: "Data Ready" }, now);
        } else {
          let revisionNo = 1;
          if (input.target.kind === "revision") {
            const from = await evaluations.findOne({ _id: new Types.ObjectId(input.target.fromEvaluationId), state: "Published" })
              .session(session).lean();
            if (!from) throw new DomainError("only a published evaluation gets a revision", "conflict");
            revisionNo = Number(from.revisionNo) + 1;
          }
          await evaluations.create([{ _id: id, clubId: new Types.ObjectId(input.clubId), periodCode: input.periodCode, schemeId,
            state: "Data Ready", revisionNo, generatedAt: now }], { session });
          await audit(session, id, input.target.kind === "revision" ? "EVALUATION_REVISION_CREATED" : "EVALUATION_GENERATED",
            officerId, { state: "Data Ready", revisionNo }, now);
        }
        await results.insertMany(resultDocs(id, input.results, input.periodCode), { session });
      });
      return String(id);
    },

    async setManual(id, code, manual, officerId, now) {
      const evaluationId = new Types.ObjectId(id);
      await mongoose.connection.transaction(async (session) => {
        const evaluation = await evaluations.findOneAndUpdate({ _id: evaluationId, state: { $in: ["Draft", "Data Ready", "Under Review"] } },
          { $set: { state: "Under Review" } }, { session }).lean();
        if (!evaluation) throw new DomainError("only an evaluation under review can change", "conflict");
        const result = await results.findOne({ evaluationId, dimensionCode: code }).session(session).lean();
        const evidence = Array.isArray(result?.evidence) ? result.evidence as { metric: string; value: number }[] : [];
        const computed = evidence.find((item) => item.metric === COMPUTED)?.value;
        await results.updateOne({ evaluationId, dimensionCode: code }, manual
          ? { $set: { score: decimal(manual.score), isManual: true, justification: manual.justification } }
          : { $set: { isManual: false, ...(computed !== undefined ? { score: decimal(computed) } : {}) },
            $unset: { justification: "", ...(computed === undefined ? { score: "" } : {}) } },
        { session, upsert: true });
        await audit(session, evaluationId, manual ? "EVALUATION_MANUAL_SCORED" : "EVALUATION_MANUAL_CLEARED", officerId,
          { dimensionCode: code, ...(manual ? { score: manual.score } : {}) }, now, manual?.justification);
      });
    },

    async finalize(id, total, officerId, now) {
      const evaluationId = new Types.ObjectId(id);
      await mongoose.connection.transaction(async (session) => {
        const changed = await evaluations.updateOne({ _id: evaluationId, state: { $in: ["Draft", "Data Ready", "Under Review"] } }, {
          $set: { state: "Finalized", finalizedBy: new Types.ObjectId(officerId), finalizedAt: now,
            ...(total.totalScore !== undefined ? { totalScore: decimal(total.totalScore) } : {}),
            ...(total.classification ? { classification: total.classification } : {}) },
        }, { session });
        if (changed.matchedCount !== 1) throw new DomainError("this evaluation cannot be finalized now", "conflict");
        await audit(session, evaluationId, "EVALUATION_FINALIZED", officerId, total, now);
      });
    },

    async reopen(id, officerId, now) {
      const evaluationId = new Types.ObjectId(id);
      await mongoose.connection.transaction(async (session) => {
        const changed = await evaluations.updateOne({ _id: evaluationId, state: "Finalized" },
          { $set: { state: "Under Review" }, $unset: { totalScore: "", classification: "", finalizedBy: "", finalizedAt: "" } }, { session });
        if (changed.matchedCount !== 1) throw new DomainError("only a finalized, unpublished evaluation can be reopened", "conflict");
        await audit(session, evaluationId, "EVALUATION_REOPENED", officerId, { state: "Under Review" }, now);
      });
    },

    async publish(periodCode, officerId, now) {
      let published = 0;
      await mongoose.connection.transaction(async (session) => {
        published = 0;
        const latestIds = await evaluations.aggregate<{ _id: Types.ObjectId; id: Types.ObjectId; state: string }>([
          { $match: { periodCode } }, { $sort: { revisionNo: -1 } },
          { $group: { _id: "$clubId", id: { $first: "$_id" }, state: { $first: "$state" } } }]).session(session);
        for (const item of latestIds.filter((entry) => entry.state === "Finalized")) {
          const doc = await evaluations.findOneAndUpdate({ _id: item.id, state: "Finalized" },
            { $set: { state: "Published", publishedAt: now } }, { session, new: true }).lean();
          if (!doc) throw new DomainError("an evaluation changed while publishing", "conflict");
          published += 1;
          await audit(session, item.id, "EVALUATION_PUBLISHED", officerId, { state: "Published", periodCode }, now);
          await queueNotifications(session, await clubBoardUserIds(item._id, session), "EVALUATION_PUBLISHED", "Evaluation",
            item.id, { periodCode, totalScore: optionalNumber(doc.totalScore), classification: doc.classification,
              revisionNo: doc.revisionNo }, now);
        }
      });
      return published;
    },
  };
}
