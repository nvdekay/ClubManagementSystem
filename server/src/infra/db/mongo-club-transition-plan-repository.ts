import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import { normalizeTransitionPlan, type ClubTransitionPlan, type ClubTransitionPlanRepository, type TransitionPlanInput } from "../../domain/club-transition-plan.js";
import { DomainError } from "../../domain/errors.js";
import type { TransitionObligation, TransitionTerm } from "../../domain/leadership-transition.js";
import { assertEventWriteAccess } from "./club-event-access.js";
import { openAccountabilityTask } from "./accountability-workflow.js";
import { clubOutstandingObligations } from "./club-obligations.js";
import { ucmsModels as m } from "./ucms-models.js";
type Doc = Record<string, unknown>;
function term(d: Doc): TransitionTerm { return { id: String(d._id), name: String(d.name), state: String(d.state), startAt: d.startAt as Date, endAt: d.endAt as Date }; }
export function mongoClubTransitionPlanRepository(): ClubTransitionPlanRepository {
  async function mapped(d: Doc): Promise<ClubTransitionPlan> {
    const target = await m.clubTerms!.findById(d.toTermId).lean();
    const handover = (d.handoverItems ?? {}) as { items?: TransitionPlanInput["handoverItems"]; earlyReason?: string };
    const obligations = (d.outstandingObligations ?? []) as TransitionObligation[];
    const audits = await m.auditLogs!.find({ entityType: "TransitionPlan", entityId: d._id }).sort({ at: 1, _id: 1 }).lean();
    return { id: String(d._id), state: String(d.state), revision: Number(d.__v ?? 0), fromTermId: String(d.fromTermId), toTermId: String(d.toTermId),
      input: { toTerm: { name: String(target?.name ?? ""), startAt: target?.startAt as Date, endAt: target?.endAt as Date },
        candidates: (d.candidates ?? []) as TransitionPlanInput["candidates"], handoverItems: handover.items ?? [], earlyReason: handover.earlyReason,
        assignees: Object.fromEntries(obligations.filter((o) => o.assigneeMembershipId).map((o) => [o.id, o.assigneeMembershipId])) }, obligations,
      history: audits.map((a) => ({ action: String(a.action), at: a.at as Date, reason: a.reason as string | undefined,
        snapshot: (a.after as { snapshot?: TransitionPlanInput } | undefined)?.snapshot })) };
  }
  async function required(clubId: string, id: string) {
    const d = await m.transitionPlans!.findOne({ _id: new Types.ObjectId(id), clubId: new Types.ObjectId(clubId) }).lean();
    if (!d) throw new DomainError("transition plan not found", "not_found");
    return mapped(d);
  }
  async function lock(session: ClientSession, clubId: string, userId: string, now: Date) {
    await assertEventWriteAccess(session, new Types.ObjectId(clubId), new Types.ObjectId(userId), "club.transition.plan", now);
    if (!(await m.clubs!.exists({ _id: new Types.ObjectId(clubId), state: "Active" }).session(session))) {
      throw new DomainError("club must be active to plan a transition", "conflict");
    }
  }
  async function audit(session: ClientSession, id: Types.ObjectId, userId: string, action: string, after: unknown, now: Date) {
    await m.auditLogs!.create([{ entityType: "TransitionPlan", entityId: id, action, actorId: new Types.ObjectId(userId),
      actorRole: "Club Leader", after, correlationId: randomUUID(), at: now }], { session });
  }
  async function current(session: ClientSession, clubId: string, id: string, revision: number) {
    const d = await m.transitionPlans!.findOne({ _id: new Types.ObjectId(id), clubId: new Types.ObjectId(clubId) }).session(session).lean();
    if (!d) throw new DomainError("transition plan not found", "not_found");
    if (!["Draft", "Returned"].includes(String(d.state)) || Number(d.__v ?? 0) !== revision) throw new DomainError("plan changed or is locked", "conflict");
    return d;
  }
  async function content(session: ClientSession, clubId: Types.ObjectId, raw: TransitionPlanInput, now: Date) {
    const input = normalizeTransitionPlan(raw);
    if (input.toTerm.startAt < now || input.toTerm.endAt <= now) throw new DomainError("target term must not begin in the past", "validation");
    const obligations = (await clubOutstandingObligations(clubId, session)).map((o) => ({ ...o, assigneeMembershipId: input.assignees[o.id] ?? "" }));
    return { input, obligations, fields: { candidates: input.candidates, outstandingObligations: obligations,
      handoverItems: { items: input.handoverItems, earlyReason: input.earlyReason } } };
  }
  return {
    async context(clubId, now) {
      const club = new Types.ObjectId(clubId);
      const [active, positions, members, docs, obligations] = await Promise.all([
        m.clubTerms!.findOne({ clubId: club, state: "Active", startAt: { $lte: now }, endAt: { $gt: now } }).lean(),
        m.clubPositions!.find({ clubId: club, isActive: true, $or: [{ isBoardSeat: true }, { isLeaderRole: true }] }).lean(),
        m.clubMemberships!.find({ clubId: club, state: "Active" }).lean(),
        m.transitionPlans!.find({ clubId: club }).sort({ submittedAt: -1, _id: -1 }).lean(), clubOutstandingObligations(club),
      ]);
      const users = await m.users!.find({ _id: { $in: members.map((d) => d.userId) } }).select({ displayName: 1 }).lean();
      const names = new Map(users.map((u) => [String(u._id), String(u.displayName)]));
      return { term: active ? term(active) : null, positions: positions.map((d) => ({ code: String(d.code), name: String(d.name), isLeaderRole: d.isLeaderRole === true, isSingleHolder: d.isSingleHolder !== false })),
        members: members.map((d) => ({ id: String(d._id), displayName: names.get(String(d.userId)) ?? "" })), obligations, plans: await Promise.all(docs.map(mapped)) };
    },
    async create(clubId, raw, userId, now) {
      const id = new Types.ObjectId();
      const targetId = new Types.ObjectId();
      await mongoose.connection.transaction(async (session) => {
        await lock(session, clubId, userId, now);
        const club = new Types.ObjectId(clubId);
        if (await m.transitionPlans!.exists({ clubId: club, state: { $in: ["Draft", "Returned", "Pending Confirmation"] } }).session(session)) throw new DomainError("an unfinished transition already exists", "conflict");
        const source = await m.clubTerms!.findOne({ clubId: club, state: "Active", startAt: { $lte: now }, endAt: { $gt: now } }).session(session).lean();
        if (!source) throw new DomainError("active term required", "conflict");
        const { input, fields } = await content(session, club, raw, now);
        await m.clubTerms!.create([{ _id: targetId, clubId: club, ...input.toTerm, state: "Planned" }], { session });
        await m.transitionPlans!.create([{ _id: id, clubId: club, fromTermId: source._id, toTermId: targetId,
          ...fields, state: "Draft", submittedBy: new Types.ObjectId(userId), submittedAt: now }], { session });
        await audit(session, id, userId, "TRANSITION_PLAN_CREATED", {}, now);
      });
      return required(clubId, String(id));
    },
    async save(clubId, id, revision, raw, userId, now) {
      await mongoose.connection.transaction(async (session) => {
        await lock(session, clubId, userId, now);
        const d = await current(session, clubId, id, revision);
        const { input, fields } = await content(session, new Types.ObjectId(clubId), raw, now);
        const changed = await m.clubTerms!.updateOne({ _id: d.toTermId, state: "Planned" }, { $set: input.toTerm }, { session });
        if (changed.matchedCount !== 1) throw new DomainError("target term is no longer planned", "conflict");
        await m.transitionPlans!.updateOne({ _id: d._id }, { $set: fields, $inc: { __v: 1 } }, { session });
        await audit(session, d._id as Types.ObjectId, userId, "TRANSITION_PLAN_SAVED", { revision: revision + 1 }, now);
      });
      return required(clubId, id);
    },
    async submit(clubId, id, revision, userId, now) {
      await mongoose.connection.transaction(async (session) => {
        await lock(session, clubId, userId, now);
        const d = await current(session, clubId, id, revision);
        const [source, target, positions] = await Promise.all([
          m.clubTerms!.findOne({ _id: d.fromTermId, state: "Active", clubId: new Types.ObjectId(clubId) }).session(session).lean(),
          m.clubTerms!.findOne({ _id: d.toTermId, state: "Planned", clubId: new Types.ObjectId(clubId) }).session(session).lean(),
          m.clubPositions!.find({ clubId: new Types.ObjectId(clubId), isActive: true, $or: [{ isBoardSeat: true }, { isLeaderRole: true }] }).session(session).lean(),
        ]);
        if (!source || !target || (target.endAt as Date) <= now) throw new DomainError("transition terms changed", "conflict");
        const handover = d.handoverItems as { items: TransitionPlanInput["handoverItems"]; earlyReason?: string };
        const candidates = d.candidates as TransitionPlanInput["candidates"];
        const obligations = d.outstandingObligations as TransitionObligation[];
        const snapshot = normalizeTransitionPlan({ toTerm: { name: String(target.name), startAt: target.startAt as Date, endAt: target.endAt as Date }, candidates,
          handoverItems: handover.items, earlyReason: handover.earlyReason, assignees: Object.fromEntries(obligations.filter((o) => o.assigneeMembershipId).map((o) => [o.id, o.assigneeMembershipId])) });
        if ((target.startAt as Date) < (source.endAt as Date) && !snapshot.earlyReason) throw new DomainError("an early handover requires a reason", "validation");
        if (!positions.some((p) => p.isLeaderRole === true) || candidates.some((c) => !positions.some((p) => p.code === c.positionCode)) || positions.some((p) => { const count = candidates.filter((c) => c.positionCode === p.code).length; return count < 1 || count > (p.isSingleHolder !== false ? 1 : 2); })) throw new DomainError("every board seat needs one candidate", "validation");
        const memberIds = candidates.map((c) => new Types.ObjectId(c.membershipId));
        const activeCount = await m.clubMemberships!.countDocuments({ _id: { $in: memberIds }, clubId: new Types.ObjectId(clubId), state: "Active" }).session(session);
        if (activeCount !== candidates.length) throw new DomainError("every candidate must be an active club member", "conflict");
        const live = await clubOutstandingObligations(new Types.ObjectId(clubId), session);
        if (live.some((o) => !candidates.some((c) => c.membershipId === snapshot.assignees[o.id]))) throw new DomainError("every obligation needs an assignee on the new board", "validation");
        const assigned = live.map((o) => ({ ...o, assigneeMembershipId: snapshot.assignees[o.id]! }));
        await m.transitionPlans!.updateOne({ _id: d._id }, { $set: { state: "Pending Confirmation", outstandingObligations: assigned,
          submittedBy: new Types.ObjectId(userId), submittedAt: now }, $inc: { __v: 1 }, $unset: { decidedBy: "", decidedAt: "" } }, { session });
        await openAccountabilityTask(session, "TRANSITION_PLAN", d._id as Types.ObjectId, new Types.ObjectId(clubId), `Leadership transition: ${String(target.name)}`, now);
        await audit(session, d._id as Types.ObjectId, userId, "TRANSITION_PLAN_SUBMITTED", { snapshot }, now);
      });
      return required(clubId, id);
    },
  };
}
