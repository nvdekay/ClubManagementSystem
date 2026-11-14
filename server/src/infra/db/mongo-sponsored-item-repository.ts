import mongoose, { Types } from "mongoose";
import { randomUUID } from "node:crypto";
import { DomainError } from "../../domain/errors.js";
import { changeSponsoredItem, invoiceDeadline, type SponsoredBudget, type SponsoredItem,
  type SponsoredItemRepository } from "../../domain/sponsored-item.js";
import { assertEventWriteAccess } from "./club-event-access.js";
import { assertAccountabilityOfficer } from "./accountability-workflow.js";
import { ucmsModels as m } from "./ucms-models.js";
import { clubBoardUserIds, queueNotifications } from "./club-board.js";

export function mongoSponsoredItemRepository(): SponsoredItemRepository {
  async function find(id: string, clubId?: string): Promise<SponsoredBudget | null> {
    const budget = await m.eventBudgets!.findOne({ _id: new Types.ObjectId(id),
      ...(clubId ? { clubId: new Types.ObjectId(clubId) } : {}) }).lean();
    if (!budget || !Array.isArray(budget.sponsoredItems)) return null;
    const event = await m.events!.findById(budget.eventId).lean();
    return { id, eventId: String(budget.eventId), clubId: String(budget.clubId),
      eventState: String(event?.state), revision: Number(budget.__v ?? 0), items: budget.sponsoredItems as SponsoredItem[] };
  }
  return { find,
    async act(id, itemId, revision, actor, clubId, action, now) {
      const budgetId = new Types.ObjectId(id);
      const actorId = new Types.ObjectId(actor);
      await mongoose.connection.transaction(async (session) => {
        const budget = await m.eventBudgets!.findOne({ _id: budgetId,
          ...(clubId ? { clubId: new Types.ObjectId(clubId) } : {}) }).session(session).lean();
        if (!budget || !Array.isArray(budget.sponsoredItems)) throw new DomainError("sponsored budget not found", "not_found");
        if (clubId) {
          await assertEventWriteAccess(session, new Types.ObjectId(clubId), actorId, "club.expense.record", now);
          if (!["save", "image", "removeImage", "submit"].includes(action.kind)) throw new DomainError("officer action required", "forbidden");
        } else {
          await assertAccountabilityOfficer(session, actorId);
          if (!["return", "review", "pay"].includes(action.kind)) throw new DomainError("club action required", "forbidden");
        }
        const event = await m.events!.findOneAndUpdate({ _id: budget.eventId }, { $inc: { __v: 1 } }, { session }).lean();
        if (!event || !["Approved", "Upcoming", "Ongoing", "Completed", "Report Submitted", "Closed"].includes(String(event.state))) {
          throw new DomainError("event finance is paused while the event is cancelled or awaiting approval", "conflict");
        }
        const items = budget.sponsoredItems as SponsoredItem[];
        const index = items.findIndex((item) => item.id === itemId);
        if (index < 0) throw new DomainError("budget item not found", "not_found");
        if (action.kind === "image" && items.some((item) => item.images.some((image) => image.digest === action.image.digest))) {
          throw new DomainError("duplicate invoice image in this budget", "conflict");
        }
        const before = items[index]!;
        const updated = changeSponsoredItem(before, action, now);
        if (updated.amount > 0) {
          const expenseId = updated.expenseId ? new Types.ObjectId(updated.expenseId) : new Types.ObjectId();
          updated.expenseId = String(expenseId);
          await m.expenses!.updateOne({ _id: expenseId, eventBudgetId: budgetId }, {
            $set: { category: updated.category, amount: Types.Decimal128.fromString(String(updated.amount)),
              description: updated.description, hasEvidence: updated.images.length > 0,
              isOutOfCategory: updated.fundingDecision === "NOT_SPONSORED",
              isOverRemaining: updated.amount > updated.approvedAmount,
              ...(action.kind === "review" ? { reviewOutcome: updated.payable ? "Accepted" : "Rejected", reviewReason: updated.reviewReason } : {}) },
            $setOnInsert: { clubId: budget.clubId, eventId: budget.eventId, eventBudgetId: budgetId,
              spentAt: now, recordedBy: actorId, createdAt: now },
          }, { session, upsert: true });
        }
        const next = items.map((item, i) => i === index ? updated : item);
        const terminal = next.every((item) => item.fundingDecision === "NOT_SPONSORED"
          || ["Paid", "Rejected", "Expired"].includes(item.status)
          || (["Draft", "Returned"].includes(item.status) && now > invoiceDeadline(item)));
        const paidTotal = next.reduce((sum, item) => sum + (item.status === "Paid" ? item.payable ?? 0 : 0), 0);
        const changed = await m.eventBudgets!.updateOne({ _id: budgetId, __v: revision }, {
          $set: { sponsoredItems: next, state: terminal ? "Closed" : "Approved",
            disbursedTotal: Types.Decimal128.fromString(String(paidTotal)) }, $inc: { __v: 1 },
        }, { session });
        if (changed.modifiedCount !== 1) throw new DomainError("budget changed; reload before continuing", "conflict");
        await m.auditLogs!.create([{ entityType: "EventBudget", entityId: budgetId,
          action: `SPONSORED_ITEM_${action.kind.toUpperCase()}`, actorId,
          actorRole: clubId ? "Club Leader" : "ICPDP_OFFICER", before: { item: before },
          after: { item: updated }, correlationId: randomUUID(), at: now }], { session });
        if (["submit", "return", "review", "pay"].includes(action.kind)) {
          const version = await m.eventProposalVersions!.findOne({ eventId: budget.eventId }).sort({ revisionNo: -1 }).session(session).lean();
          const roles = action.kind === "submit" ? await m.roles!.find({ code: "ICPDP_OFFICER", scope: "system" }).session(session).distinct("_id") : [];
          const recipients = action.kind === "submit"
            ? await m.userRoleAssignments!.find({ roleId: { $in: roles }, revokedAt: null }).session(session).distinct("userId")
            : [...await clubBoardUserIds(budget.clubId as Types.ObjectId, session), version?.submittedBy];
          await queueNotifications(session, recipients, action.kind === "submit" ? "SPONSORED_ITEM_SUBMITTED" : "SPONSORED_ITEM_UPDATED",
            "Event", budget.eventId as Types.ObjectId, { title: event.title,
              category: updated.category, status: updated.status, payable: updated.payable,
              reason: updated.reviewReason, clubId: String(budget.clubId), budgetId: id }, now);
        }
      });
      const result = await find(id, clubId);
      if (!result) throw new DomainError("sponsored budget not found", "not_found");
      return result;
    },
  };
}
