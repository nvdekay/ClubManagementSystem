import { randomUUID } from "node:crypto";
import mongoose, { Types } from "mongoose";
import type {
  ApprovalRoutingRepository, RoutedRequestType, RoutingRule, RoutingRuleSet, RoutingSample, RiskCategory,
} from "../../domain/approval-routing.js";
import { DomainError } from "../../domain/errors.js";
import { openViolationCount } from "./approval-routing.js";
import { ucmsModels as m } from "./ucms-models.js";

type Doc = Record<string, unknown>;

function date(value: unknown): Date | undefined {
  return value instanceof Date ? value : undefined;
}

function ruleSetFrom(doc: Doc): RoutingRuleSet {
  return { id: String(doc._id), versionNo: Number(doc.versionNo), state: doc.state as RoutingRuleSet["state"],
    rules: (Array.isArray(doc.rules) ? doc.rules : []) as RoutingRule[], createdBy: String(doc.createdBy), createdAt: doc.createdAt as Date,
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
      await mongoose.connection.transaction(async (session) => {
        const previous = await sets.findOne({ state: "Active" }).session(session).lean();
        const activated = await sets.updateOne({ _id: target, state: "Draft" },
          { $set: { state: "Active", activatedBy: new Types.ObjectId(actorId), activatedAt: now } }, { session });
        if (activated.matchedCount !== 1) throw new DomainError("only a draft rule set can be activated", "conflict");
        if (previous) await sets.updateOne({ _id: previous._id, state: "Active" }, { $set: { state: "Superseded", supersededAt: now } }, { session });
        await m.auditLogs!.create([{ entityType: "RoutingRuleSet", entityId: target, action: "ROUTING_RULES_ACTIVATED",
          actorId: new Types.ObjectId(actorId), actorRole: "ICPDP Head",
          before: previous ? { activeVersionId: String(previous._id), versionNo: previous.versionNo } : undefined,
          after: { state: "Active" }, correlationId: randomUUID(), at: now }], { session });
      });
      return required(target);
    },
    async recentDecided(limit) {
      const tasks = await m.approvalTasks!.find({ entityType: { $in: ["CLUB_APPLICATION", "EVENT_PROPOSAL", "PROPERTY_BOOKING"] },
        state: "Decided" }).sort({ closedAt: -1, _id: -1 }).limit(limit).lean();
      const eventIds = tasks.filter((task) => task.entityType === "EVENT_PROPOSAL").map((task) => task.entityId);
      const bookingIds = tasks.filter((task) => task.entityType === "PROPERTY_BOOKING").map((task) => task.entityId);
      const [events, versions, bookings] = await Promise.all([
        m.events!.find({ _id: { $in: eventIds } }).select({ riskCategory: 1, currentRevisionNo: 1 }).lean(),
        m.eventProposalVersions!.find({ eventId: { $in: eventIds } }).select({ eventId: 1, revisionNo: 1, requestedBudgetTotal: 1 }).lean(),
        m.propertyBookings!.find({ _id: { $in: bookingIds } }).select({ propertyId: 1 }).lean(),
      ]);
      const properties = await m.properties!.find({ _id: { $in: bookings.map((row) => row.propertyId) } }).select({ type: 1 }).lean();
      const eventById = new Map(events.map((row) => [String(row._id), row]));
      const propertyType = new Map(properties.map((row) => [String(row._id), String(row.type)]));
      const bookingProperty = new Map(bookings.map((row) => [String(row._id), String(row.propertyId)]));
      const violationsByClub = new Map<string, number>();
      for (const clubId of new Set(tasks.flatMap((task) => (task.clubId ? [String(task.clubId)] : [])))) {
        violationsByClub.set(clubId, await openViolationCount(new Types.ObjectId(clubId)));
      }
      // Samples use today's compliance history; the rest of each request is read as it was decided.
      return tasks.map((task): RoutingSample => {
        const type = task.entityType as RoutedRequestType;
        const id = String(task.entityId);
        const event = eventById.get(id);
        const version = versions.filter((row) => String(row.eventId) === id).sort((a, b) => Number(b.revisionNo) - Number(a.revisionNo))[0];
        return { entityType: type, entityId: id, title: String(task.title ?? ""), decidedAt: (task.closedAt ?? task.openedAt) as Date,
          facts: { requestType: type, openViolations: violationsByClub.get(String(task.clubId)) ?? 0,
            ...(type === "EVENT_PROPOSAL" ? { amount: money(version?.requestedBudgetTotal),
              ...(event?.riskCategory ? { riskCategory: String(event.riskCategory) as RiskCategory } : {}) } : {}),
            ...(type === "PROPERTY_BOOKING" ? { propertyType: propertyType.get(bookingProperty.get(id) ?? "") } : {}) } };
      });
    },
  };
}
