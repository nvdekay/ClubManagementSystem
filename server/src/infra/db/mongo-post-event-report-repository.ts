import mongoose, { Types, type ClientSession } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import {
  summarizeFeedback,
  FEEDBACK_CRITERION,
} from "../../domain/event-feedback.js";
import {
  assertReportSubmission,
  type PostEventReport,
  type PostEventReportRepository,
  type ReportDetail,
  type ReportSnapshot,
} from "../../domain/post-event-report.js";
import { postEventDeadline } from "./post-event-report-deadlines.js";
import { assertEventWriteAccess } from "./club-event-access.js";
import {
  accountabilityAudit,
  assertAccountabilityOfficer,
  claimAccountabilityTask,
  decideAccountabilityTask,
  openAccountabilityTask,
} from "./accountability-workflow.js";
import { ucmsModels as m } from "./ucms-models.js";

type Doc = Record<string, unknown>;
function oid(value: string) {
  return new Types.ObjectId(value);
}
function money(value: unknown) {
  return Number(String(value ?? 0));
}
export function mongoPostEventReportRepository(): PostEventReportRepository {
  async function snapshot(
    event: Doc,
    now: Date,
    session?: ClientSession,
  ): Promise<ReportSnapshot> {
    const eventId = event._id;
    const policy = await m
      .policyVersions!.findOne({ effectiveFrom: { $lte: now } })
      .sort({ effectiveFrom: -1, createdAt: -1, _id: -1 })
      .session(session ?? null)
      .lean();
    if (!policy)
      throw new DomainError("policy is not configured", "unavailable");
    const deadline = await postEventDeadline(event, session);
    const [proposal, attendees, confirmed, budget, feedbacks] =
      await Promise.all([
        m
          .eventProposalVersions!.findOne({
            eventId,
            revisionNo: event.currentRevisionNo,
          })
          .session(session ?? null)
          .lean(),
        m
          .attendances!.find({ eventId, finalized: true })
          .session(session ?? null)
          .lean(),
        m
          .eventRegistrations!.countDocuments({ eventId, state: "Confirmed" })
          .session(session ?? null),
        m
          .eventBudgets!.findOne({ eventId })
          .session(session ?? null)
          .lean(),
        m
          .eventFeedbacks!.find({ eventId })
          .session(session ?? null)
          .lean(),
      ]);
    const expenses = budget
      ? await m
          .expenses!.find({ eventBudgetId: budget._id })
          .session(session ?? null)
          .lean()
      : [];
    const ratings = feedbacks.map((f) =>
      Number(
        ((f.scores ?? []) as Doc[]).find(
          (s) => s.criterionCode === FEEDBACK_CRITERION,
        )?.score ?? 0,
      ),
    );
    const summary = summarizeFeedback(
      ratings,
      Number(policy.feedbackMinRespondents),
    );
    const attended = attendees.filter(
      (a) => !((a.abnormalFlags ?? []) as string[]).includes("no-show"),
    ).length;
    return {
      proposal: proposal
        ? {
            revisionNo: proposal.revisionNo,
            payload: proposal.payload,
            budgetLines: proposal.budgetLines,
            conditions: event.approvalConditions ?? [],
          }
        : null,
      attendance: {
        confirmed,
        attended,
        absent: attendees.length - attended,
        finalizedAt: attendees[0]?.finalizedAt as Date | undefined,
      },
      budget: budget
        ? {
            state: budget.state,
            approvedTotal: money(budget.approvedTotal),
            disbursedTotal: money(budget.disbursedTotal),
            acceptedTotal:
              budget.acceptedTotal == null ? null : money(budget.acceptedTotal),
          }
        : null,
      expenses: expenses.map((e) => ({
        id: String(e._id),
        category: e.category,
        amount: money(e.amount),
        hasEvidence: e.hasEvidence === true,
      })),
      feedback: !summary.visible
        ? summary
        : {
            ...summary,
            comments: feedbacks
              .map((f) => String(f.comment ?? ""))
              .filter(Boolean),
          },
      policyVersionId: deadline.policyVersionId,
      dueAt: deadline.dueAt,
    };
  }
  async function detail(
    eventId: string,
    clubId: string | undefined,
    now: Date,
    session?: ClientSession,
  ): Promise<ReportDetail | null> {
    const event = await m
      .events!.findOne({
        _id: oid(eventId),
        organizerType: "CLUB",
        ...(clubId ? { clubId: oid(clubId) } : {}),
      })
      .session(session ?? null)
      .lean();
    if (
      !event ||
      !["Completed", "Report Submitted", "Closed"].includes(String(event.state))
    )
      return null;
    const budget = await m
      .eventBudgets!.exists({ eventId: event._id })
      .session(session ?? null);
    if (event.audienceScope === "MEMBERS_ONLY" && !budget) return null;
    const docs = await m
      .postEventReports!.find({ eventId: event._id })
      .sort({ versionNo: -1, _id: -1 })
      .session(session ?? null)
      .lean();
    const preview = await snapshot(event, now, session);
    const tasks = await m
      .approvalTasks!.find({
        entityType: "POST_EVENT_REPORT",
        entityId: { $in: docs.map((d) => d._id) },
        state: "Open",
      })
      .session(session ?? null)
      .lean();
    const versions: PostEventReport[] = docs.map((d) => {
      const task = tasks.find((t) => String(t.entityId) === String(d._id));
      return {
        id: String(d._id),
        eventId,
        clubId: String(event.clubId),
        eventTitle: String(event.title),
        eventState: String(event.state),
        state: String(d.state),
        versionNo: Number(d.versionNo),
        revision: Number(event.__v ?? 0),
        lateFlag: d.lateFlag === true,
        actualResult: String(d.actualResult),
        incidents: d.incidents as string | undefined,
        lessonsLearned: d.lessonsLearned as string | undefined,
        evidence: (d.evidence ?? []) as PostEventReport["evidence"],
        submittedAt: d.submittedAt as Date | undefined,
        decisionOutcome: d.decisionOutcome as string | undefined,
        decisionReason: d.decisionReason as string | undefined,
        findingViolationId: d.findingViolationId
          ? String(d.findingViolationId)
          : undefined,
        preloadedFigures: d.preloadedFigures as unknown as ReportSnapshot,
        task: task
          ? {
              id: String(task._id),
              assigneeId: task.assigneeId ? String(task.assigneeId) : undefined,
            }
          : undefined,
      };
    });
    const dueAt =
      versions.find((v) => v.submittedAt)?.preloadedFigures.dueAt ??
      preview.dueAt;
    return {
      obligation: {
        eventId,
        eventTitle: String(event.title),
        state: String(event.state),
        revision: Number(event.__v ?? 0),
        dueAt,
        overdue:
          now > dueAt &&
          !versions.some((version) => Boolean(version.submittedAt)),
        attendanceFinalized: event.attendanceFinalized === true,
        report: versions[0],
      },
      versions,
      preview,
    };
  }
  return {
    async list(clubId, now) {
      const events = await m
        .events!.find({
          organizerType: "CLUB",
          state: { $in: ["Completed", "Report Submitted", "Closed"] },
          ...(clubId ? { clubId: oid(clubId) } : {}),
        })
        .sort({ endAt: -1, _id: -1 })
        .lean();
      const details = await Promise.all(
        events.map(async (e) => {
          try { const d = await detail(String(e._id), clubId, now); return d?.obligation; }
          catch (error) {
            if (!(error instanceof DomainError) || error.kind !== "unavailable") throw error;
            return { eventId: String(e._id), eventTitle: String(e.title), state: String(e.state), revision: Number(e.__v ?? 0), configurationError: "REPORT_DEADLINE_NOT_CONFIGURED" as const };
          }
        }),
      );
      return details.filter((d): d is NonNullable<typeof d> => Boolean(d));
    },
    find: detail,
    async act(eventId, clubId, actor, action, now) {
      await mongoose.connection.transaction(async (session) => {
        const actorId = oid(actor);
        const event = await m
          .events!.findOne({
            _id: oid(eventId),
            organizerType: "CLUB",
            ...(clubId ? { clubId: oid(clubId) } : {}),
          })
          .session(session)
          .lean();
        if (!event) throw new DomainError("event not found", "not_found");
        const eventClub = event.clubId as Types.ObjectId;
        if (clubId)
          await assertEventWriteAccess(
            session,
            eventClub,
            actorId,
            "club.report.submit",
            now,
          );
        else await assertAccountabilityOfficer(session, actorId);
        const locked = await m
          .events!.findOneAndUpdate(
            { _id: event._id, __v: action.revision },
            { $inc: { __v: 1 } },
            { session },
          )
          .lean();
        if (!locked)
          throw new DomainError(
            "event changed; reload before continuing",
            "conflict",
          );
        const current = await detail(eventId, clubId, now, session);
        if (!current)
          throw new DomainError(
            "event has no reporting obligation",
            "conflict",
          );
        const report = current.versions[0];
        let reportId = report ? oid(report.id) : new Types.ObjectId();
        let after: unknown = {};
        let reason: string | undefined;
        if (action.kind === "save") {
          assertReportSubmission(
            String(event.state),
            event.attendanceFinalized === true,
            false,
          );
          if (
            report &&
            !["Draft", "Returned for correction"].includes(report.state)
          )
            throw new DomainError("submitted report is immutable", "conflict");
          if (report?.state === "Draft")
            await m.postEventReports!.updateOne(
              { _id: reportId, state: "Draft" },
              { $set: action.input },
              { session },
            );
          else {
            reportId = new Types.ObjectId();
            await m.postEventReports!.create(
              [
                {
                  _id: reportId,
                  eventId: event._id,
                  clubId: eventClub,
                  ...action.input,
                  state: "Draft",
                  versionNo: (report?.versionNo ?? 0) + 1,
                  preloadedFigures: current.preview,
                },
              ],
              { session },
            );
          }
          after = { reportId, input: action.input };
        } else if (action.kind === "submit") {
          assertReportSubmission(
            String(event.state),
            event.attendanceFinalized === true,
            false,
          );
          if (!report || report.state !== "Draft")
            throw new DomainError(
              "save a draft report before submitting",
              "conflict",
            );
          const figures = await snapshot(event, now, session);
          await m.postEventReports!.updateOne(
            { _id: reportId, state: "Draft" },
            {
              $set: {
                state: "Submitted",
                preloadedFigures: figures,
                lateFlag: now > figures.dueAt,
                submittedBy: actorId,
                submittedAt: now,
              },
            },
            { session },
          );
          await m.events!.updateOne(
            { _id: event._id },
            { $set: { state: "Report Submitted" } },
            { session },
          );
          await openAccountabilityTask(
            session,
            "POST_EVENT_REPORT",
            reportId,
            eventClub,
            current.obligation.eventTitle,
            now,
          );
          after = { reportId, versionNo: report.versionNo, figures };
        } else if (action.kind === "claim") {
          if (!report || report.state !== "Submitted")
            throw new DomainError("no report awaits review", "conflict");
          await claimAccountabilityTask(
            session,
            "POST_EVENT_REPORT",
            reportId,
            actorId,
          );
        } else if (action.kind === "overdue") {
          if (!current.obligation.overdue)
            throw new DomainError("report is not overdue", "conflict");
          if (
            await m
              .auditLogs!.exists({
                entityType: "Event",
                entityId: event._id,
                action: "REPORT_OVERDUE",
              })
              .session(session)
          )
            throw new DomainError(
              "missing report already recorded",
              "conflict",
            );
          reason = action.reason;
          after = { dueAt: current.obligation.dueAt };
        } else {
          if (
            !report ||
            report.state !== "Submitted" ||
            event.state !== "Report Submitted"
          )
            throw new DomainError("no report awaits review", "conflict");
          reason = action.reason.trim();
          if (
            action.outcome !== "return" &&
            (event.attendanceFinalized !== true ||
              report.preloadedFigures.attendance.attended !==
                current.preview.attendance.attended ||
              report.preloadedFigures.attendance.absent !==
                current.preview.attendance.absent ||
              report.preloadedFigures.attendance.confirmed !==
                current.preview.attendance.confirmed)
          ) {
            throw new DomainError(
              "attendance figures disagree; return the report for correction",
              "conflict",
            );
          }
          if (action.outcome === "finding") {
            if (
              !action.violationId ||
              !(await m
                .violations!.exists({
                  _id: oid(action.violationId),
                  clubId: eventClub,
                  originType: "REPORT_FINDING",
                  originRefId: event._id,
                })
                .session(session))
            )
              throw new DomainError(
                "linked report finding case is required",
                "validation",
              );
          }
          await decideAccountabilityTask(
            session,
            "POST_EVENT_REPORT",
            reportId,
            actorId,
            action.outcome === "return" ? "Request revision" : "Approve",
            reason,
            now,
          );
          await m.postEventReports!.updateOne(
            { _id: reportId },
            {
              $set: {
                state:
                  action.outcome === "return"
                    ? "Returned for correction"
                    : "Accepted",
                decisionOutcome: action.outcome,
                decisionReason: reason,
                decidedBy: actorId,
                decidedAt: now,
                ...(action.violationId
                  ? { findingViolationId: oid(action.violationId) }
                  : {}),
              },
            },
            { session },
          );
          await m.events!.updateOne(
            { _id: event._id },
            {
              $set: {
                state: action.outcome === "return" ? "Completed" : "Closed",
              },
            },
            { session },
          );
          after = {
            reportId,
            outcome: action.outcome,
            violationId: action.violationId,
          };
        }
        await accountabilityAudit(
          session,
          "Event",
          event._id as Types.ObjectId,
          eventClub,
          actorId,
          `REPORT_${action.kind.toUpperCase()}`,
          after,
          now,
          !clubId,
          reason,
        );
      });
      return (await detail(eventId, clubId, now))!;
    },
  };
}
