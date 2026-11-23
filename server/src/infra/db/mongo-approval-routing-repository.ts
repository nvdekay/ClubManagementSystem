import { randomUUID } from "node:crypto";
import mongoose, { Types } from "mongoose";
import type {
  ApprovalRoutingRepository, RoutedRequestType, RoutingRule, RoutingRuleSet, RoutingSample, RiskCategory,
} from "../../domain/approval-routing.js";
import { DomainError } from "../../domain/errors.js";
import { ucmsModels as m } from "./ucms-models.js";

type Doc = Record<string, unknown>;

function date(value: unknown): Date | undefined {
  return value instanceof Date ? value : undefined;
}

/** Rule sets saved while two-level approval existed still carry `requiredLevel`; it means nothing now. */
function withoutLegacyLevel(rule: Doc): RoutingRule {
  const copy = { ...rule };
  delete copy.requiredLevel;
  return copy as unknown as RoutingRule;
}

function ruleSetFrom(doc: Doc): RoutingRuleSet {
  return { id: String(doc._id), versionNo: Number(doc.versionNo), state: doc.state as RoutingRuleSet["state"],
    rules: (Array.isArray(doc.rules) ? doc.rules as Record<string, unknown>[] : []).map(withoutLegacyLevel), createdBy: String(doc.createdBy), createdAt: doc.createdAt as Date,
    ...(date(doc.updatedAt) ? { updatedAt: date(doc.updatedAt) } : {}),
    ...(doc.activatedBy ? { activatedBy: String(doc.activatedBy) } : {}),
    ...(date(doc.activatedAt) ? { activatedAt: date(doc.activatedAt) } : {}),
    ...(date(doc.supersededAt) ? { supersededAt: date(doc.supersededAt) } : {}) };
}

function money(value: unknown): number {
  return typeof value === "number" ? value : Number(String(value ?? 0)) || 0;
}

export function mongoApprovalRoutingRepository(): ApprovalRoutingRepository {
  const sets = m.routingRuleSets!;

  async function required(id: Types.ObjectId): Promise<RoutingRuleSet> {
    const doc = await sets.findById(id).lean();
    if (!doc) throw new DomainError("routing rule set not found", "not_found");
    return ruleSetFrom(doc as Doc);
  }

  return {
    async list() {
      return (await sets.find({}).sort({ versionNo: -1 }).limit(50).lean()).map((doc) => ruleSetFrom(doc as Doc));
    },
    async find(id) {
      const doc = await sets.findById(new Types.ObjectId(id)).lean();
      return doc ? ruleSetFrom(doc as Doc) : null;
    },
    async createDraft(rules, actorId, now) {
      const id = new Types.ObjectId();
      try {
        const latest = await sets.findOne({}).sort({ versionNo: -1 }).lean();
        await sets.create({ _id: id, versionNo: Number(latest?.versionNo ?? 0) + 1, state: "Draft", rules,
          createdBy: new Types.ObjectId(actorId), createdAt: now });
      } catch (error) {
        if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
          throw new DomainError("another version was created meanwhile; retry", "conflict");
        }
        throw error;
      }
      return required(id);
    },
    async saveDraft(id, rules, _actorId, now) {
      const changed = await sets.updateOne({ _id: new Types.ObjectId(id), state: "Draft" }, { $set: { rules, updatedAt: now } });
      if (changed.matchedCount !== 1) throw new DomainError("only a draft rule set can be edited", "conflict");
      return required(new Types.ObjectId(id));
    },
    async activate(id, actorId, now) {
      const target = new Types.ObjectId(id);
      // One attempt, no automatic retry: a concurrent activation must surface as 409, not silently
      // supersede the set the other head just activated.
      const session = await mongoose.startSession();
      try {
        session.startTransaction();
        const draft = await sets.findOne({ _id: target, state: "Draft" }).session(session).lean();
        if (!draft) throw new DomainError("only a draft rule set can be activated", "conflict");
        // Supersede first: the partial unique index uq_routing_active allows one Active set at any time.
        const previous = await sets.findOneAndUpdate({ state: "Active" }, { $set: { state: "Superseded", supersededAt: now } },
          { session }).lean();
        await sets.updateOne({ _id: target, state: "Draft" },
          { $set: { state: "Active", activatedBy: new Types.ObjectId(actorId), activatedAt: now } }, { session });
        await m.auditLogs!.create([{ entityType: "RoutingRuleSet", entityId: target, action: "ROUTING_RULES_ACTIVATED",
          actorId: new Types.ObjectId(actorId), actorRole: "ICPDP Head",
          before: previous ? { activeVersionId: String(previous._id), versionNo: previous.versionNo } : undefined,
          after: { state: "Active" }, correlationId: randomUUID(), at: now }], { session });
        await session.commitTransaction();
      } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        if (error instanceof mongoose.mongo.MongoServerError
          && (error.code === 11000 || error.code === 112 || error.hasErrorLabel("TransientTransactionError"))) {
          throw new DomainError("another rule set was activated meanwhile; reload and retry", "conflict");
        }
        throw error;
      } finally {
        await session.endSession();
      }
      return required(target);
    },
    async recentDecided(limit) {
      const tasks = await m.approvalTasks!.find({ entityType: { $in: ["CLUB_APPLICATION", "EVENT_PROPOSAL", "PROPERTY_BOOKING"] },
        state: "Decided" }).sort({ closedAt: -1, _id: -1 }).limit(limit).lean();
      const eventIds = tasks.filter((task) => task.entityType === "EVENT_PROPOSAL").map((task) => task.entityId);
      const bookingIds = tasks.filter((task) => task.entityType === "PROPERTY_BOOKING").map((task) => task.entityId);
      const clubIds = [...new Set(tasks.flatMap((task) => (task.clubId ? [String(task.clubId)] : [])))].map((id) => new Types.ObjectId(id));
      const [versions, bookings, violations] = await Promise.all([
        m.eventProposalVersions!.find({ eventId: { $in: eventIds } })
          .select({ eventId: 1, revisionNo: 1, submittedAt: 1, requestedBudgetTotal: 1, "payload.riskCategory": 1 }).lean(),
        m.propertyBookings!.find({ _id: { $in: bookingIds } }).select({ propertyId: 1 }).lean(),
        m.violations!.find({ clubId: { $in: clubIds } }).select({ clubId: 1, openedAt: 1, state: 1, resolvedAt: 1, decidedAt: 1 }).lean(),
      ]);
      const properties = await m.properties!.find({ _id: { $in: bookings.map((row) => row.propertyId) } }).select({ type: 1 }).lean();
      const propertyType = new Map(properties.map((row) => [String(row._id), String(row.type)]));
      const bookingProperty = new Map(bookings.map((row) => [String(row._id), String(row.propertyId)]));
      /** UC40 cases of the club that were open at `at` — the compliance history the router saw then. */
      function openAt(clubId: unknown, at: Date): number {
        return violations.filter((row) => String(row.clubId) === String(clubId) && (row.openedAt as Date) <= at
          && !(["Resolved", "Closed"].includes(String(row.state))
            && ((row.resolvedAt ?? row.decidedAt) as Date | undefined ?? at) <= at)).length;
      }
      // Facts are read as the router saw them when the review opened: the revision submitted then and its risk.
      return tasks.map((task): RoutingSample => {
        const type = task.entityType as RoutedRequestType;
        const id = String(task.entityId);
        const opened = task.openedAt as Date;
        const version = versions.filter((row) => String(row.eventId) === id && (row.submittedAt as Date) <= opened)
          .sort((a, b) => Number(b.revisionNo) - Number(a.revisionNo))[0];
        const risk = (version?.payload as Doc | undefined)?.riskCategory;
        return { entityType: type, entityId: id, title: String(task.title ?? ""), decidedAt: (task.closedAt ?? opened) as Date,
          facts: { requestType: type, openViolations: openAt(task.clubId, opened),
            ...(type === "EVENT_PROPOSAL" ? { amount: money(version?.requestedBudgetTotal),
              ...(typeof risk === "string" ? { riskCategory: risk as RiskCategory } : {}) } : {}),
            ...(type === "PROPERTY_BOOKING" ? { propertyType: propertyType.get(bookingProperty.get(id) ?? "") } : {}) } };
      });
    },
  };
}
