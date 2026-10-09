import { randomUUID } from "node:crypto";
import mongoose, { Types } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import type { ClubMembershipRecord, MembershipRepository, MembershipStatusChange,
  MembershipState, MembershipWithdrawalRequest } from "../../domain/membership.js";
import { isBeforeToday } from "../../domain/membership.js";
import { ucmsModels } from "./ucms-models.js";

function objectArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> =>
    Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function date(value: unknown): Date {
  return value instanceof Date ? value : new Date(String(value));
}

function history(value: unknown): MembershipStatusChange[] {
  return objectArray(value).flatMap((entry) => {
    // actorId is written as an ObjectId; older entries may hold a string — accept both.
    if (!("fromState" in entry) || typeof entry.toState !== "string" || !entry.actorId) return [];
    return [{ fromState: String(entry.fromState) as MembershipState,
      toState: entry.toState as MembershipState, effectiveDate: date(entry.effectiveDate),
      ...(typeof entry.reason === "string" ? { reason: entry.reason } : {}),
      actorId: String(entry.actorId), at: date(entry.at) }];
  });
}

function mapMembership(doc: Record<string, unknown>): ClubMembershipRecord {
  return { id: String(doc._id), clubId: String(doc.clubId), userId: String(doc.userId),
    state: String(doc.state) as MembershipState, joinedAt: date(doc.joinedAt),
    ...(doc.leftAt ? { leftAt: date(doc.leftAt) } : {}),
    ...(doc.departmentId ? { departmentId: String(doc.departmentId) } : {}),
    ...(typeof doc.defaultRole === "string" ? { defaultRole: doc.defaultRole } : {}),
    ...(doc.sourceApplicationId ? { sourceApplicationId: String(doc.sourceApplicationId) } : {}),
    ...(typeof doc.banReason === "string" ? { banReason: doc.banReason } : {}),
    statusHistory: history(doc.statusHistory) };
}

function mapRequest(doc: Record<string, unknown>): MembershipWithdrawalRequest {
  return { id: String(doc._id), membershipId: String(doc.membershipId),
    clubId: String(doc.clubId), userId: String(doc.userId), reason: String(doc.reason),
    requestedEffectiveDate: date(doc.requestedEffectiveDate),
    state: String(doc.state) as MembershipWithdrawalRequest["state"], createdAt: date(doc.createdAt),
    ...(doc.executedBy ? { executedBy: String(doc.executedBy) } : {}),
    ...(doc.executedAt ? { executedAt: date(doc.executedAt) } : {}) };
}

function duplicate(error: unknown): never {
  if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
    throw new DomainError("membership conflicts with an existing record", "conflict");
  }
  throw error;
}

export function mongoMembershipRepository(): MembershipRepository {
  const memberships = ucmsModels.clubMemberships!;
  const requests = ucmsModels.membershipWithdrawalRequests!;
  const clubs = ucmsModels.clubs!;
  const users = ucmsModels.users!;
  const terms = ucmsModels.clubTerms!;
  const positions = ucmsModels.clubPositions!;
  const assignments = ucmsModels.clubPositionAssignments!;
  const audits = ucmsModels.auditLogs!;
  const notifications = ucmsModels.notifications!;

  async function hasConfirmedBoardSeat(membershipId: Types.ObjectId, clubId: Types.ObjectId,
    at: Date, session?: mongoose.ClientSession): Promise<boolean> {
    const docs = await assignments.find({ membershipId, clubId, confirmedBy: { $exists: true, $ne: null },
      effectiveFrom: { $lte: at }, $or: [{ effectiveTo: { $exists: false } },
        { effectiveTo: null }, { effectiveTo: { $gt: at } }] })
      .select("positionId").session(session ?? null).lean();
    if (!docs.length) return false;
    return Boolean(await positions.exists({ _id: { $in: docs.map((item) => item.positionId) },
      clubId, isActive: true, $or: [{ isBoardSeat: true }, { isLeaderRole: true }] }).session(session ?? null));
  }

  async function closeAssignments(membershipId: Types.ObjectId, clubId: Types.ObjectId,
    effectiveDate: Date, session: mongoose.ClientSession): Promise<void> {
    const activeRange = { $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null },
      { effectiveTo: { $gt: effectiveDate } }] };
    await assignments.updateMany({ clubId, membershipId, effectiveFrom: { $lte: effectiveDate },
      ...activeRange }, { $set: { effectiveTo: effectiveDate } }, { session });
    const future = await assignments.find({ clubId, membershipId, effectiveFrom: { $gt: effectiveDate },
      ...activeRange }).select("_id effectiveFrom").session(session).lean();
    for (const assignment of future) {
      await assignments.updateOne({ _id: assignment._id },
        { $set: { effectiveTo: assignment.effectiveFrom } }, { session });
    }
  }

  async function membershipView(doc: Record<string, unknown>, includeHistory = true) {
    const [club, user, pending] = await Promise.all([
      clubs.findById(doc.clubId).select("name").lean(),
      users.findById(doc.userId).select("displayName").lean(),
      requests.findOne({ membershipId: doc._id, state: { $in: ["Pending", "Held"] } })
        .sort({ createdAt: -1 }).lean(),
    ]);
    const result = mapMembership(doc);
    return { ...result, ...(club ? { clubName: String(club.name) } : {}),
      ...(user ? { displayName: String(user.displayName) } : {}),
      ...(pending ? { pendingWithdrawal: mapRequest(pending) } : {}),
      ...(includeHistory ? {} : { statusHistory: [] }) };
  }

  async function managerIds(clubId: Types.ObjectId, now: Date,
    session: mongoose.ClientSession): Promise<Types.ObjectId[]> {
    const activeTerms = await terms.find({ clubId, state: "Active", startAt: { $lte: now }, endAt: { $gt: now } })
      .select("_id").session(session).lean();
    if (!activeTerms.length) return [];
    const managePositions = await positions.find({ clubId, isActive: true,
      $or: [{ permissionCodes: "club.member.manage" }, { isLeaderRole: true }] })
      .select("_id isLeaderRole").session(session).lean();
    if (!managePositions.length) return [];
    const managerPositionIds = managePositions.map((item) => item._id);
    const assignees = await assignments.find({ clubId, termId: { $in: activeTerms.map((item) => item._id) },
      positionId: { $in: managerPositionIds }, effectiveFrom: { $lte: now },
      $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gt: now } }] })
      .select("membershipId positionId confirmedBy").session(session).lean();
    const leaderPositionIds = new Set(managePositions.filter((item) => item.isLeaderRole)
      .map((item) => String(item._id)));
    const managerMembershipIds = assignees.filter((item) =>
      !leaderPositionIds.has(String(item.positionId)) || Boolean(item.confirmedBy))
      .map((item) => item.membershipId);
    const people = await memberships.find({ _id: { $in: managerMembershipIds }, clubId, state: "Active" })
      .select("userId").session(session).lean();
    return [...new Set(people.map((item) => String(item.userId)))].map((id) => new Types.ObjectId(id));
  }

  async function notify(input: { recipient: Types.ObjectId; entityId: Types.ObjectId;
    eventCode: string; clubId: Types.ObjectId; now: Date; payload?: Record<string, unknown>;
    entityType?: string; session: mongoose.ClientSession }) {
    await notifications.create([{
      recipientUserId: input.recipient, eventCode: input.eventCode,
      entityType: input.entityType ?? "ClubMembership",
      entityId: input.entityId, channels: ["IN_APP"],
      payload: { clubId: String(input.clubId), ...input.payload }, state: "Queued",
      dueAt: input.now, attempts: 0, createdAt: input.now,
    }], { session: input.session });
  }

  return {
    async listMine(userId) {
      const docs = await memberships.find({ userId: new Types.ObjectId(userId), state: { $in: ["Active", "Inactive"] } })
        .sort({ joinedAt: -1, _id: -1 }).lean();
      return Promise.all(docs.map((doc) => membershipView(doc)));
    },

    async listClub(clubId) {
      const docs = await memberships.find({ clubId: new Types.ObjectId(clubId),
        state: { $in: ["Active", "Inactive"] } }).sort({ state: 1, joinedAt: 1 }).lean();
      return Promise.all(docs.map((doc) => membershipView(doc)));
    },

    async changeState(input) {
      const clubId = new Types.ObjectId(input.clubId);
      const membershipId = new Types.ObjectId(input.membershipId);
      const actorId = new Types.ObjectId(input.actorId);
      try {
        await mongoose.connection.transaction(async (session) => {
          const current = await memberships.findOne({ _id: membershipId, clubId })
            .session(session).lean();
          if (!current) throw new DomainError("membership not found", "not_found");
          const fromState = String(current.state) as MembershipState;
          if (fromState === "Left" || fromState === "Banned") {
            throw new DomainError("membership state is final", "conflict");
          }
          const allowed = (fromState === "Active" && ["Inactive", "Banned"].includes(input.state))
            || (fromState === "Inactive" && ["Active", "Banned"].includes(input.state));
          if (!allowed) throw new DomainError("invalid membership state transition", "conflict");
          if (input.state === "Banned" && !input.reason) throw new DomainError("ban reason is required", "validation");
          if (input.state !== "Active" && await hasConfirmedBoardSeat(membershipId, clubId,
            input.effectiveDate, session)) {
            throw new DomainError("replace the confirmed board seat before ending this membership", "conflict");
          }
          const historyItem = { fromState, toState: input.state, effectiveDate: input.effectiveDate,
            ...(input.reason ? { reason: input.reason } : {}), actorId, at: input.now };
          const changed = await memberships.updateOne({ _id: membershipId, clubId, state: fromState }, {
            $set: { state: input.state, ...(input.state === "Banned" ? { banReason: input.reason } : {}) },
            $push: { statusHistory: historyItem },
          }, { session });
          if (changed.modifiedCount !== 1) throw new DomainError("membership changed before update", "conflict");
          if (input.state === "Banned") {
            await closeAssignments(membershipId, clubId, input.effectiveDate, session);
            await memberships.updateOne({ _id: membershipId }, { $unset: { defaultRole: "" } }, { session });
          }
          await audits.create([{
            entityType: "ClubMembership", entityId: membershipId,
            action: "CLUB_MEMBERSHIP_STATE_CHANGED", actorId, actorRole: "Club Member",
            before: { state: fromState }, after: { state: input.state,
              effectiveDate: input.effectiveDate, ...(input.reason ? { reason: input.reason } : {}) },
            correlationId: randomUUID(), at: input.now,
          }], { session });
          await notify({ recipient: new Types.ObjectId(String(current.userId)), entityId: membershipId,
            eventCode: `CLUB_MEMBERSHIP_${input.state.toUpperCase()}`, clubId, now: input.now,
            payload: { membershipId: String(membershipId), state: input.state }, session });
        });
      } catch (error) { duplicate(error); }
      const updated = await memberships.findById(membershipId).lean();
      if (!updated) throw new DomainError("membership not found", "not_found");
      return membershipView(updated);
    },

    async requestWithdrawal(input) {
      const membershipId = new Types.ObjectId(input.membershipId);
      const userId = new Types.ObjectId(input.userId);
      let requestId: Types.ObjectId | undefined;
      await mongoose.connection.transaction(async (session) => {
        const membership = await memberships.findOne({ _id: membershipId, userId,
          state: { $in: ["Active", "Inactive"] } }).session(session).lean();
        if (!membership) throw new DomainError("active membership not found", "not_found");
        const exists = await requests.exists({ membershipId, state: { $in: ["Pending", "Held"] } }).session(session);
        if (exists) throw new DomainError("a withdrawal request is already pending", "conflict");
        const held = await hasConfirmedBoardSeat(membershipId, new Types.ObjectId(String(membership.clubId)),
          input.now, session);
        const [created] = await requests.create([{
          membershipId, clubId: membership.clubId, userId, reason: input.reason,
          requestedEffectiveDate: input.requestedEffectiveDate, state: held ? "Held" : "Pending",
          createdAt: input.now,
        }], { session, ordered: true });
        requestId = new Types.ObjectId(String(created!._id));
        await audits.create([{
          entityType: "MembershipWithdrawalRequest", entityId: requestId,
          action: "MEMBERSHIP_WITHDRAWAL_REQUESTED", actorId: userId, actorRole: "Student",
          after: { membershipId, requestedEffectiveDate: input.requestedEffectiveDate,
            state: held ? "Held" : "Pending" }, correlationId: randomUUID(), at: input.now,
        }], { session, ordered: true });
        const recipients = await managerIds(new Types.ObjectId(String(membership.clubId)), input.now, session);
        for (const recipient of recipients) {
          await notify({ recipient, entityId: requestId, eventCode: "MEMBERSHIP_WITHDRAWAL_REQUESTED",
            clubId: new Types.ObjectId(String(membership.clubId)), now: input.now,
            entityType: "MembershipWithdrawalRequest",
            payload: { requestId: String(requestId), membershipId: String(membershipId), state: held ? "Held" : "Pending" }, session });
        }
      });
      const created = await requests.findById(requestId).lean();
      if (!created) throw new DomainError("withdrawal request not found", "not_found");
      return mapRequest(created);
    },

    async listMyWithdrawalRequests(userId) {
      const docs = await requests.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 }).lean();
      const clubDocs = await clubs.find({ _id: { $in: docs.map((doc) => doc.clubId) } }).select("_id name").lean();
      const names = new Map(clubDocs.map((club) => [String(club._id), String(club.name)]));
      return docs.map((doc) => ({ ...mapRequest(doc), clubName: names.get(String(doc.clubId)) }));
    },

    async listClubWithdrawalRequests(clubId) {
      const docs = await requests.find({ clubId: new Types.ObjectId(clubId) }).sort({ createdAt: -1 }).lean();
      const usersForRequests = await users.find({ _id: { $in: docs.map((doc) => doc.userId) } })
        .select("_id displayName").lean();
      const names = new Map(usersForRequests.map((user) => [String(user._id), String(user.displayName)]));
      return docs.map((doc) => ({ ...mapRequest(doc), memberName: names.get(String(doc.userId)) }));
    },

    async executeWithdrawal(input) {
      const clubId = new Types.ObjectId(input.clubId);
      const requestId = new Types.ObjectId(input.requestId);
      const actorId = new Types.ObjectId(input.actorId);
      await mongoose.connection.transaction(async (session) => {
        const request = await requests.findOne({ _id: requestId, clubId,
          state: { $in: ["Pending", "Held"] } }).session(session).lean();
        if (!request) throw new DomainError("pending withdrawal request not found", "not_found");
        const requestedDate = date(request.requestedEffectiveDate);
        if (requestedDate > input.now) throw new DomainError("withdrawal request is not effective yet", "conflict");
        const effectiveDate = isBeforeToday(requestedDate, input.now) ? input.now : requestedDate;
        const membershipId = new Types.ObjectId(String(request.membershipId));
        const member = await memberships.findOne({ _id: membershipId, userId: request.userId,
          state: { $in: ["Active", "Inactive"] } }).session(session).lean();
        if (!member) throw new DomainError("membership is no longer eligible to leave", "conflict");
        if (await hasConfirmedBoardSeat(membershipId, clubId, effectiveDate, session)) {
          if (request.state !== "Held") await requests.updateOne({ _id: requestId }, { $set: { state: "Held" } }, { session });
          throw new DomainError("replace the confirmed board seat before executing this request", "conflict");
        }
        const statusItem = { fromState: String(member.state), toState: "Left", effectiveDate,
          reason: request.reason, actorId, at: input.now };
        const changed = await memberships.updateOne({ _id: membershipId, state: member.state }, {
          $set: { state: "Left", leftAt: effectiveDate }, $unset: { defaultRole: "" },
          $push: { statusHistory: statusItem },
        }, { session });
        if (changed.modifiedCount !== 1) throw new DomainError("membership changed before execution", "conflict");
        await closeAssignments(membershipId, clubId, effectiveDate, session);
        await requests.updateOne({ _id: requestId, state: { $in: ["Pending", "Held"] } }, {
          $set: { state: "Executed", executedBy: actorId, executedAt: input.now },
        }, { session });
        await audits.create([{
          entityType: "ClubMembership", entityId: membershipId,
          action: "CLUB_MEMBERSHIP_LEFT", actorId, actorRole: "Club Member",
          before: { state: String(member.state) }, after: { state: "Left", effectiveDate, requestId },
          correlationId: randomUUID(), at: input.now,
        }, {
          entityType: "MembershipWithdrawalRequest", entityId: requestId,
          action: "MEMBERSHIP_WITHDRAWAL_EXECUTED", actorId, actorRole: "Club Member",
          before: { state: String(request.state) }, after: { state: "Executed", membershipId },
          correlationId: randomUUID(), at: input.now,
        }], { session, ordered: true });
        await notify({ recipient: new Types.ObjectId(String(member.userId)), entityId: membershipId,
          eventCode: "CLUB_MEMBERSHIP_LEFT", clubId, now: input.now,
          payload: { membershipId: String(membershipId), state: "Left", requestId: String(requestId) }, session });
      });
      const request = await requests.findById(requestId).lean();
      const membership = request ? await memberships.findById(request.membershipId).lean() : null;
      if (!membership) throw new DomainError("membership not found", "not_found");
      return membershipView(membership);
    },
  };
}
