import { Types, type ClientSession } from "mongoose";
import type { ReportDeadline } from "../../domain/policy.js";
import { DomainError } from "../../domain/errors.js";
import { ucmsModels as m } from "./ucms-models.js";
type Doc = Record<string, unknown>;
export async function postEventDeadline(
  event: Doc,
  session?: ClientSession,
): Promise<{
  policyVersionId: string;
  dueAt: Date;
  reminderAt: Date;
  escalationAt: Date;
}> {
  const first = await m
    .postEventReports!.findOne({ eventId: event._id })
    .sort({ versionNo: 1 })
    .session(session ?? null)
    .lean();
  const frozen = first?.preloadedFigures as
    { dueAt?: Date; policyVersionId?: string } | undefined;
  const policy = frozen?.policyVersionId
    ? await m
        .policyVersions!.findById(frozen.policyVersionId)
        .session(session ?? null)
        .lean()
    : await m
        .policyVersions!.findOne({ effectiveFrom: { $lte: event.endAt } })
        .sort({ effectiveFrom: -1, createdAt: -1, _id: -1 })
        .session(session ?? null)
        .lean();
  const deadline = ((policy?.reportDeadlines ?? []) as ReportDeadline[]).find(
    (d) => d.reportType === "POST_EVENT",
  );
  if (!policy || !deadline)
    throw new DomainError(
      "post-event report deadline is not configured",
      "unavailable",
    );
  const dueAt =
    frozen?.dueAt ??
    new Date(
      (event.endAt as Date).getTime() +
        deadline.dueDaysAfterPeriodEnd * 86400000,
    );
  return {
    policyVersionId: String(policy._id),
    dueAt,
    reminderAt: new Date(
      dueAt.getTime() - deadline.remindBeforeDays * 86400000,
    ),
    escalationAt: new Date(
      dueAt.getTime() + deadline.escalateAfterDays * 86400000,
    ),
  };
}
export async function overduePostEventReports(
  clubId: Types.ObjectId | undefined,
  now: Date,
  session?: ClientSession,
): Promise<Types.ObjectId[]> {
  const events = await m
    .events!.find({
      organizerType: "CLUB",
      ...(clubId ? { clubId } : {}),
      state: { $in: ["Completed", "Report Submitted"] },
    })
    .session(session ?? null)
    .lean();
  const overdue: Types.ObjectId[] = [];
  for (const event of events) {
    if (
      event.audienceScope === "MEMBERS_ONLY" &&
      !(await m
        .eventBudgets!.exists({ eventId: event._id })
        .session(session ?? null))
    )
      continue;
    const latest = await m
      .postEventReports!.findOne({ eventId: event._id })
      .sort({ versionNo: -1 })
      .session(session ?? null)
      .lean();
    if (latest && ["Submitted", "Accepted"].includes(String(latest.state)))
      continue;
    try {
      if ((await postEventDeadline(event, session)).dueAt < now)
        overdue.push(event._id as Types.ObjectId);
    } catch (error) {
      if (!(error instanceof DomainError && error.kind === "unavailable"))
        throw error;
    }
  }
  return overdue;
}
