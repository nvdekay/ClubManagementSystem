import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import type { AccountabilityReminderRepository } from "../../domain/accountability-reminder.js";
import { DomainError } from "../../domain/errors.js";
import { clubBoardUserIds, queueNotifications } from "./club-board.js";
import { postEventDeadline } from "./post-event-report-deadlines.js";
import { ucmsModels as m } from "./ucms-models.js";
async function remindOnce(
  session: ClientSession,
  type: string,
  id: Types.ObjectId,
  clubId: Types.ObjectId,
  code: string,
  dueAt: Date,
  now: Date,
): Promise<number> {
  if (
    await m
      .auditLogs!.exists({
        entityType: type,
        entityId: id,
        action: code,
        "after.dueAt": dueAt,
      })
      .session(session)
  )
    return 0;
  await m.auditLogs!.create(
    [
      {
        entityType: type,
        entityId: id,
        action: code,
        actorRole: "SYSTEM",
        after: { dueAt },
        correlationId: randomUUID(),
        at: now,
      },
    ],
    { session },
  );
  const recipients: unknown[] = await clubBoardUserIds(clubId, session);
  if (code.endsWith("ESCALATED") || code === "REFUND_OVERDUE") {
    const roles = await m
      .roles!.find({ code: "ICPDP_OFFICER", scope: "system" })
      .session(session)
      .lean();
    const assignments = await m
      .userRoleAssignments!.find({
        roleId: { $in: roles.map((r) => r._id) },
        revokedAt: null,
      })
      .session(session)
      .lean();
    recipients.push(...assignments.map((a) => a.userId));
  }
  await queueNotifications(session, recipients, code, type, id, { dueAt }, now);
  return 1;
}
export function mongoAccountabilityReminderRepository(): AccountabilityReminderRepository {
  return {
    async remind(now) {
      let count = 0;
      const events = await m
        .events!.find({ organizerType: "CLUB", state: "Completed" })
        .select({ _id: 1 })
        .lean();
      for (const eventRef of events) {
        let changed = 0;
        await mongoose.connection.transaction(async (session) => {
          changed = 0;
          const event = await m
            .events!.findOneAndUpdate(
              { _id: eventRef._id, state: "Completed" },
              { $inc: { __v: 1 } },
              { session },
            )
            .lean();
          if (!event) return;
          if (
            event.audienceScope === "MEMBERS_ONLY" &&
            !(await m
              .eventBudgets!.exists({ eventId: event._id })
              .session(session))
          )
            return;
          const latest = await m
            .postEventReports!.findOne({ eventId: event._id })
            .sort({ versionNo: -1 })
            .session(session)
            .lean();
          if (
            latest &&
            ["Submitted", "Accepted"].includes(String(latest.state))
          )
            return;
          let deadline;
          try {
            deadline = await postEventDeadline(event, session);
          } catch (error) {
            if (error instanceof DomainError && error.kind === "unavailable")
              return;
            throw error;
          }
          if (now >= deadline.reminderAt)
            changed += await remindOnce(
              session,
              "Event",
              event._id as Types.ObjectId,
              event.clubId as Types.ObjectId,
              "REPORT_DUE_SOON",
              deadline.dueAt,
              now,
            );
          if (now > deadline.dueAt)
            changed += await remindOnce(
              session,
              "Event",
              event._id as Types.ObjectId,
              event.clubId as Types.ObjectId,
              "REPORT_DEADLINE_PASSED",
              deadline.dueAt,
              now,
            );
          if (now > deadline.escalationAt)
            changed += await remindOnce(
              session,
              "Event",
              event._id as Types.ObjectId,
              event.clubId as Types.ObjectId,
              "REPORT_ESCALATED",
              deadline.dueAt,
              now,
            );
        });
        count += changed;
      }
      const budgets = await m
        .eventBudgets!.find({
          state: {
            $in: ["Disbursed", "Reconciliation Pending", "Recovery Pending"],
          },
        })
        .select({ _id: 1 })
        .lean();
      for (const budgetRef of budgets) {
        let changed = 0;
        await mongoose.connection.transaction(async (session) => {
          changed = 0;
          const budget = await m
            .eventBudgets!.findOneAndUpdate(
              {
                _id: budgetRef._id,
                state: {
                  $in: [
                    "Disbursed",
                    "Reconciliation Pending",
                    "Recovery Pending",
                  ],
                },
              },
              { $inc: { __v: 1 } },
              { session },
            )
            .lean();
          if (!budget) return;
          const refund = budget.state === "Recovery Pending";
          const dueAt = (
            refund ? budget.recoveryDueAt : budget.settlementDueAt
          ) as Date | undefined;
          if (!dueAt) return;
          const id = budget._id as Types.ObjectId,
            club = budget.clubId as Types.ObjectId;
          if (now >= new Date(dueAt.getTime() - 2 * 86400000))
            changed += await remindOnce(
              session,
              "EventBudget",
              id,
              club,
              refund ? "REFUND_DUE_SOON" : "SETTLEMENT_DUE_SOON",
              dueAt,
              now,
            );
          if (now > dueAt)
            changed += await remindOnce(
              session,
              "EventBudget",
              id,
              club,
              refund ? "REFUND_OVERDUE" : "SETTLEMENT_OVERDUE",
              dueAt,
              now,
            );
        });
        count += changed;
      }
      return count;
    },
  };
}
