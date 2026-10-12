import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import type {
  BoardCandidate,
  BoardNominationDecision,
  BoardNominationDecisionInput,
  BoardNominationDetail,
  BoardNominationRepository,
  BoardNominationSeat,
  BoardPosition,
  BoardTerm,
} from "../../domain/board-nomination.js";
import { DomainError } from "../../domain/errors.js";
import { ucmsModels } from "./ucms-models.js";

function notFound(message: string): never {
  throw new DomainError(message, "not_found");
}

function conflict(message: string): never {
  throw new DomainError(message, "conflict");
}

function mapTerm(doc: Record<string, unknown>): BoardTerm {
  return { id: String(doc._id), name: String(doc.name), startAt: doc.startAt as Date,
    endAt: doc.endAt as Date, state: String(doc.state) };
}

function mapPosition(doc: Record<string, unknown>): BoardPosition {
  return { id: String(doc._id), code: String(doc.code), name: String(doc.name),
    unit: typeof doc.unit === "string" ? doc.unit : undefined,
    isLeaderRole: doc.isLeaderRole === true };
}

function mapSeat(doc: Record<string, unknown>, position: Record<string, unknown>,
  membership: Record<string, unknown>, user: Record<string, unknown>): BoardNominationSeat {
  return { id: String(doc._id), positionId: String(doc.positionId),
    positionCode: String(position.code), positionName: String(position.name),
    isLeaderRole: position.isLeaderRole === true, membershipId: String(doc.membershipId),
    userId: String(membership.userId), displayName: String(user.displayName ?? user.email),
    state: doc.state as BoardNominationSeat["state"],
    reason: typeof doc.reason === "string" ? doc.reason : undefined };
}

export function mongoBoardNominationRepository(): BoardNominationRepository {
  const clubs = ucmsModels.clubs!;
  const terms = ucmsModels.clubTerms!;
  const positions = ucmsModels.clubPositions!;
  const assignments = ucmsModels.clubPositionAssignments!;
  const memberships = ucmsModels.clubMemberships!;
  const users = ucmsModels.users!;
  const nominations = ucmsModels.boardNominations!;
  const seats = ucmsModels.boardNominationSeats!;
  const tasks = ucmsModels.approvalTasks!;
  const decisions = ucmsModels.approvalDecisions!;
  const roleAssignments = ucmsModels.userRoleAssignments!;
  const systemRoles = ucmsModels.roles!;
  const audits = ucmsModels.auditLogs!;
  const notifications = ucmsModels.notifications!;

  async function detail(nominationId: Types.ObjectId,
    session?: ClientSession): Promise<BoardNominationDetail | null> {
    const [nomination, task] = await Promise.all([
      nominations.findById(nominationId).session(session ?? null).lean(),
      tasks.findOne({ entityType: "BOARD_NOMINATION", entityId: nominationId })
        .sort({ openedAt: -1 }).session(session ?? null).lean(),
    ]);
    if (!nomination || !task) return null;
    const [club, term, seatDocs, decisionDocs] = await Promise.all([
      clubs.findById(nomination.clubId).session(session ?? null).lean(),
      terms.findById(nomination.termId).session(session ?? null).lean(),
      seats.find({ nominationId }).sort({ _id: 1 }).session(session ?? null).lean(),
      decisions.find({ approvalTaskId: task._id }).sort({ at: 1 }).session(session ?? null).lean(),
    ]);
    if (!club || !term) return null;
    const positionDocs = await positions.find({
      _id: { $in: seatDocs.map((seat) => seat.positionId) },
    }).session(session ?? null).lean();
    const membershipDocs = await memberships.find({
      _id: { $in: seatDocs.map((seat) => seat.membershipId) },
    }).session(session ?? null).lean();
    const userDocs = await users.find({
      _id: { $in: membershipDocs.map((membership) => membership.userId) },
    }).session(session ?? null).lean();
    const byPosition = new Map(positionDocs.map((item) => [String(item._id), item]));
    const byMembership = new Map(membershipDocs.map((item) => [String(item._id), item]));
    const byUser = new Map(userDocs.map((item) => [String(item._id), item]));
    const nominationSeats = seatDocs.flatMap((seat) => {
      const position = byPosition.get(String(seat.positionId));
      const membership = byMembership.get(String(seat.membershipId));
      const user = membership ? byUser.get(String(membership.userId)) : undefined;
      return position && membership && user ? [mapSeat(seat, position, membership, user)] : [];
    });
    function comments(decision: Record<string, unknown>) {
      return decision.comments as { confirmedSeatIds?: string[]; returnedSeatIds?: string[] } | undefined;
    }
    const mappedDecisions: BoardNominationDecision[] = decisionDocs.map((decision) => ({
      id: String(decision._id), taskId: String(decision.approvalTaskId),
      outcome: decision.outcome as BoardNominationDecision["outcome"],
      reason: typeof decision.reason === "string" ? decision.reason : undefined,
      confirmedSeatIds: comments(decision)?.confirmedSeatIds ?? [],
      returnedSeatIds: comments(decision)?.returnedSeatIds ?? [],
      actorId: String(decision.actorId), at: decision.at as Date,
    }));
    return {
      id: String(nomination._id), clubId: String(nomination.clubId),
      clubName: String(club.name), clubState: String(club.state), term: mapTerm(term),
      state: String(nomination.state), submittedBy: String(nomination.submittedBy),
      submittedAt: nomination.submittedAt as Date,
      task: { id: String(task._id), state: String(task.state),
        assigneeId: task.assigneeId ? String(task.assigneeId) : undefined,
        openedAt: task.openedAt as Date },
      seats: nominationSeats, decisions: mappedDecisions,
    };
  }

  async function officerIds(session: ClientSession): Promise<Types.ObjectId[]> {
    const role = await systemRoles.findOne({ code: "ICPDP_OFFICER", scope: "system" })
      .session(session).lean();
    if (!role) return [];
    const current = await roleAssignments.find({ roleId: role._id, revokedAt: null })
      .session(session).lean();
    return current.map((item) => item.userId as Types.ObjectId);
  }

  return {
    async getContext(clubId) {
      const clubObjectId = new Types.ObjectId(clubId);
      const club = await clubs.findById(clubObjectId).lean();
      if (!club) return null;
      const term = await terms.findOne({ clubId: clubObjectId, state: "Active" })
        .sort({ startAt: -1 }).lean();
      const positionDocs = await positions.find({ clubId: clubObjectId, isActive: true,
        $or: [{ isBoardSeat: true }, { isLeaderRole: true }] }).lean();
      const memberDocs = await memberships.find({ clubId: clubObjectId, state: "Active" })
        .sort({ joinedAt: 1, _id: 1 }).lean();
      const userDocs = await users.find({
        _id: { $in: memberDocs.map((membership) => membership.userId) },
        accountState: "Active",
      }).lean();
      const userById = new Map(userDocs.map((user) => [String(user._id), user]));
      const candidates: BoardCandidate[] = memberDocs.flatMap((membership) => {
        const user = userById.get(String(membership.userId));
        return user ? [{ membershipId: String(membership._id), userId: String(user._id),
          displayName: String(user.displayName), state: String(membership.state) }] : [];
      });
      const [termAssignments, pendingNominations] = term ? await Promise.all([
        assignments.find({ termId: term._id, clubId: clubObjectId,
          effectiveTo: { $in: [null] } }).lean(),
        nominations.find({ termId: term._id, state: "Pending Confirmation" }).lean(),
      ]) : [[], []];
      const pendingSeats = pendingNominations.length ? await seats.find({
        nominationId: { $in: pendingNominations.map((item) => item._id) },
        state: "Pending Confirmation",
      }).lean() : [];
      const leaderPositionIds = (await positions.find({ isLeaderRole: true, isActive: true })
        .select({ _id: 1 }).lean()).map((position) => position._id);
      let presidentConflictMembershipIds: string[] = [];
      if (term && leaderPositionIds.length) {
        const overlappingTerms = await terms.find({ state: { $in: ["Active", "Planned"] },
          startAt: { $lt: term.endAt }, endAt: { $gt: term.startAt } }).lean();
        const overlappingAssignments = await assignments.find({
          positionId: { $in: leaderPositionIds },
          termId: { $in: overlappingTerms.map((item) => item._id) },
          effectiveTo: { $in: [null] },
        }).lean();
        const leaderMemberships = overlappingAssignments.length ? await memberships.find({
          _id: { $in: overlappingAssignments.map((item) => item.membershipId) },
        }).lean() : [];
        const leaderUserIds = new Set(leaderMemberships.map((item) => String(item.userId)));
        presidentConflictMembershipIds = memberDocs.filter((item) => leaderUserIds.has(String(item.userId)))
          .map((item) => String(item._id));
      }
      return {
        clubId: String(club._id), clubName: String(club.name), clubState: String(club.state),
        term: term ? mapTerm(term) : null, positions: positionDocs.map(mapPosition), candidates,
        occupiedPositionIds: termAssignments.map((item) => String(item.positionId)),
        pendingPositionIds: pendingSeats.map((item) => String(item.positionId)),
        presidentConflictMembershipIds,
      };
    },

    async submit(clubId, actorId, termId, nominationSeats, now) {
      const clubObjectId = new Types.ObjectId(clubId);
      const termObjectId = new Types.ObjectId(termId);
      const actorObjectId = new Types.ObjectId(actorId);
      const nominationId = new Types.ObjectId();
      await mongoose.connection.transaction(async (session) => {
        const [club, term] = await Promise.all([
          clubs.findById(clubObjectId).session(session).lean(),
          terms.findOne({ _id: termObjectId, clubId: clubObjectId, state: "Active" })
            .session(session).lean(),
        ]);
        if (!club || !term || term.startAt > now || term.endAt <= now
          || !["Pending Setup", "Active"].includes(String(club.state))) {
          return conflict("club or active term changed before submission");
        }
        const positionIds = nominationSeats.map((seat) => new Types.ObjectId(seat.positionId));
        const memberIds = nominationSeats.map((seat) => new Types.ObjectId(seat.membershipId));
        const lockPositionIds = [...positionIds].sort((left, right) => left.toHexString()
          .localeCompare(right.toHexString()));
        for (const positionId of lockPositionIds) {
          await positions.updateOne({ _id: positionId, clubId: clubObjectId, isActive: true },
            { $currentDate: { updatedAt: true } }, { session });
        }
        const [positionDocs, memberDocs, occupied, pending] = await Promise.all([
          positions.find({ _id: { $in: positionIds }, clubId: clubObjectId, isActive: true,
            $or: [{ isBoardSeat: true }, { isLeaderRole: true }] }).session(session).lean(),
          memberships.find({ _id: { $in: memberIds }, clubId: clubObjectId, state: "Active" })
            .session(session).lean(),
          assignments.find({ clubId: clubObjectId, termId: termObjectId,
            positionId: { $in: positionIds }, effectiveTo: { $in: [null] } }).session(session).lean(),
          nominations.find({ clubId: clubObjectId, termId: termObjectId,
            state: "Pending Confirmation" }).session(session).lean(),
        ]);
        if (positionDocs.length !== positionIds.length || memberDocs.length !== memberIds.length) {
          return conflict("positions and nominees must remain active in this club");
        }
        const pendingSeatDocs = pending.length ? await seats.find({
          nominationId: { $in: pending.map((item) => item._id) },
          positionId: { $in: positionIds }, state: "Pending Confirmation",
        }).session(session).lean() : [];
        if (occupied.length || pendingSeatDocs.length) return conflict("a board seat is already occupied or pending");
        const leaderPositions = positionDocs.filter((position) => position.isLeaderRole);
        if (leaderPositions.length) {
          const leaderMembershipIds = nominationSeats.filter((seat) => leaderPositions.some((position) =>
            String(position._id) === seat.positionId)).map((seat) => new Types.ObjectId(seat.membershipId));
          for (const membershipId of [...leaderMembershipIds].sort((left, right) => left.toHexString()
            .localeCompare(right.toHexString()))) {
            await memberships.updateOne({ _id: membershipId, clubId: clubObjectId, state: "Active" },
              { $currentDate: { updatedAt: true } }, { session });
          }
          const allLeaderPositionIds = (await positions.find({ isLeaderRole: true, isActive: true })
            .select({ _id: 1 }).session(session).lean()).map((position) => position._id);
          const overlapTerms = await terms.find({ state: { $in: ["Active", "Planned"] },
            startAt: { $lt: term.endAt }, endAt: { $gt: term.startAt } }).session(session).lean();
          const leaderUserIds = memberDocs.filter((membership) => leaderMembershipIds.some((id) =>
            id.toString() === String(membership._id))).map((membership) => String(membership.userId));
          for (const userId of [...leaderUserIds].sort()) {
            await users.updateOne({ _id: new Types.ObjectId(userId) },
              { $currentDate: { updatedAt: true } }, { session });
          }
          const currentLeaderAssignments = await assignments.find({
            positionId: { $in: allLeaderPositionIds },
            termId: { $in: overlapTerms.map((item) => item._id) }, effectiveTo: { $in: [null] },
          }).session(session).lean();
          const currentLeaderMemberships = currentLeaderAssignments.length ? await memberships.find({
            _id: { $in: currentLeaderAssignments.map((item) => item.membershipId) },
            userId: { $in: leaderUserIds.map((userId) => new Types.ObjectId(userId)) },
          }).session(session).lean() : [];
          if (currentLeaderMemberships.length) return conflict("nominee has an overlapping president term");
        }
        await nominations.create([{
          _id: nominationId, clubId: clubObjectId, termId: termObjectId,
          state: "Pending Confirmation", submittedBy: actorObjectId, submittedAt: now,
        }], { session });
        const seatDocs = await seats.insertMany(nominationSeats.map((seat) => ({
          nominationId, positionId: new Types.ObjectId(seat.positionId),
          membershipId: new Types.ObjectId(seat.membershipId), state: "Pending Confirmation",
        })), { session });
        const taskDocs = await tasks.create([{
          entityType: "BOARD_NOMINATION", entityId: nominationId, clubId: clubObjectId,
          title: `Board nomination — ${String(club.name)}`, state: "Open", openedAt: now,
        }], { session });
        const recipientIds = await officerIds(session);
        if (recipientIds.length) {
          await notifications.insertMany(recipientIds.map((recipientUserId) => ({
            recipientUserId, eventCode: "BOARD_NOMINATION_SUBMITTED",
            entityType: "BoardNomination", entityId: nominationId, channels: ["IN_APP"],
            payload: { clubId, clubName: String(club.name) }, state: "Queued", dueAt: now, attempts: 0,
            createdAt: now,
          })), { session });
        }
        await audits.create([{
          entityType: "BoardNomination", entityId: nominationId,
          action: "BOARD_NOMINATION_SUBMITTED", actorId: actorObjectId, actorRole: "CLUB_LEADER",
          after: { clubId, termId, seats: nominationSeats },
          correlationId: randomUUID(), at: now,
        }], { session });
        void seatDocs;
        void taskDocs;
      });
      const result = await detail(nominationId);
      if (!result) return notFound("board nomination not found after submission");
      return result;
    },

    async listOpen() {
      const taskDocs = await tasks.find({ entityType: "BOARD_NOMINATION", state: "Open" })
        .sort({ openedAt: 1, _id: 1 }).lean();
      const results = await Promise.all(taskDocs.map((task) => detail(task.entityId as Types.ObjectId)));
      return results.filter((item): item is BoardNominationDetail => item !== null);
    },

    async find(nominationId) {
      return detail(new Types.ObjectId(nominationId));
    },

    async claim(nominationId, officerId, now) {
      const id = new Types.ObjectId(nominationId);
      const officerObjectId = new Types.ObjectId(officerId);
      await mongoose.connection.transaction(async (session) => {
        const task = await tasks.findOne({ entityType: "BOARD_NOMINATION", entityId: id,
          state: "Open" }).session(session).lean();
        if (!task) return conflict("board nomination is no longer open");
        if (task.assigneeId && String(task.assigneeId) !== officerId) {
          return conflict("board nomination is assigned to another officer");
        }
        const changed = await tasks.updateOne({ _id: task._id, state: "Open",
          $or: [{ assigneeId: { $exists: false } }, { assigneeId: null },
            { assigneeId: officerObjectId }] }, { $set: { assigneeId: officerObjectId } }, { session });
        if (changed.matchedCount !== 1) return conflict("board nomination was claimed");
        await audits.create([{
          entityType: "BoardNomination", entityId: id, action: "BOARD_NOMINATION_CLAIMED",
          actorId: officerObjectId, actorRole: "ICPDP_OFFICER",
          correlationId: randomUUID(), at: now,
        }], { session });
      });
      const result = await detail(id);
      if (!result) return notFound("board nomination not found");
      return result;
    },

    async decide(nominationId, officerId, input: BoardNominationDecisionInput, now) {
      const id = new Types.ObjectId(nominationId);
      const officerObjectId = new Types.ObjectId(officerId);
      await mongoose.connection.transaction(async (session) => {
        const nomination = await nominations.findOne({ _id: id, state: "Pending Confirmation" })
          .session(session).lean();
        const task = await tasks.findOne({ entityType: "BOARD_NOMINATION", entityId: id,
          state: "Open", assigneeId: officerObjectId }).session(session).lean();
        if (!nomination || !task) return conflict("board nomination cannot be decided");
        const pendingSeats = await seats.find({ nominationId: id,
          state: "Pending Confirmation" }).session(session).lean();
        const allIds = new Set(pendingSeats.map((seat) => String(seat._id)));
        const confirmedIds = new Set(input.confirmedSeatIds);
        const returnedById = new Map(input.returnedSeats.map((seat) => [seat.seatId, seat.reason]));
        if (confirmedIds.size + returnedById.size !== allIds.size
          || [...allIds].some((seatId) => !confirmedIds.has(seatId) && !returnedById.has(seatId))) {
          return conflict("nomination seats changed before decision");
        }
        const club = await clubs.findById(nomination.clubId).session(session).lean();
        const term = await terms.findOne({ _id: nomination.termId, clubId: nomination.clubId,
          state: "Active" }).session(session).lean();
        if (!club || !term || term.startAt > now || term.endAt <= now) {
          return conflict("club term is outside its active date range");
        }
        const lockPositionIds = [...new Set(pendingSeats.map((seat) => String(seat.positionId)))].sort();
        for (const positionId of lockPositionIds) {
          await positions.updateOne({ _id: new Types.ObjectId(positionId) },
            { $currentDate: { updatedAt: true } }, { session });
        }
        const positionsForSeats = await positions.find({
          _id: { $in: pendingSeats.map((seat) => seat.positionId) },
        }).session(session).lean();
        const seatMembershipIds = [...new Set(pendingSeats.map((seat) => String(seat.membershipId)))].sort();
        for (const membershipId of seatMembershipIds) {
          await memberships.updateOne({ _id: new Types.ObjectId(membershipId) },
            { $currentDate: { updatedAt: true } }, { session });
        }
        const membershipsForSeats = await memberships.find({
          _id: { $in: pendingSeats.map((seat) => seat.membershipId) },
        }).session(session).lean();
        const activeMembershipIds = new Set(membershipsForSeats
          .filter((membership) => membership.state === "Active")
          .map((membership) => String(membership._id)));
        const automaticReturnReasons = new Map<string, string>();
        for (const seat of pendingSeats) {
          if (confirmedIds.has(String(seat._id)) && !activeMembershipIds.has(String(seat.membershipId))) {
            confirmedIds.delete(String(seat._id));
            automaticReturnReasons.set(String(seat._id), "Nominee membership is no longer Active");
          }
        }
        const returned = new Map(returnedById);
        automaticReturnReasons.forEach((reason, seatId) => returned.set(seatId, reason));
        const leaderSeats = pendingSeats.filter((seat) => confirmedIds.has(String(seat._id))
          && positionsForSeats.some((position) => String(position._id) === String(seat.positionId)
            && position.isLeaderRole));
        if (leaderSeats.length) {
          const leaderUserIds = [...new Set(leaderSeats.map((seat) =>
            membershipsForSeats.find((item) => String(item._id) === String(seat.membershipId))?.userId)
            .filter((userId): userId is Types.ObjectId => Boolean(userId)))];
          for (const userId of leaderUserIds.sort((left, right) => String(left)
            .localeCompare(String(right)))) {
            await users.updateOne({ _id: new Types.ObjectId(String(userId)) },
              { $currentDate: { updatedAt: true } }, { session });
          }
          const allLeaderPositionIds = (await positions.find({ isLeaderRole: true, isActive: true })
            .select({ _id: 1 }).session(session).lean()).map((position) => position._id);
          const overlapTerms = await terms.find({ state: { $in: ["Active", "Planned"] },
            startAt: { $lt: term.endAt }, endAt: { $gt: term.startAt } }).session(session).lean();
          const overlapAssignments = await assignments.find({
            positionId: { $in: allLeaderPositionIds },
            termId: { $in: overlapTerms.map((item) => item._id) }, effectiveTo: { $in: [null] },
          }).session(session).lean();
          const overlapMemberships = overlapAssignments.length ? await memberships.find({
            _id: { $in: overlapAssignments.map((item) => item.membershipId) },
            userId: { $in: leaderUserIds },
          }).session(session).lean() : [];
          const overlappingUsers = new Set(overlapMemberships.map((item) => String(item.userId)));
          for (const seat of leaderSeats) {
            const nomineeUserId = membershipsForSeats.find((item) =>
              String(item._id) === String(seat.membershipId))?.userId;
            if (nomineeUserId && overlappingUsers.has(String(nomineeUserId))) {
              confirmedIds.delete(String(seat._id));
              returned.set(String(seat._id), "Nominee has an overlapping president term");
            }
          }
        }
        const finalConfirmed = pendingSeats.filter((seat) => confirmedIds.has(String(seat._id)));
        const finalReturned = pendingSeats.filter((seat) => returned.has(String(seat._id)));
        const decisionReason = input.reason?.trim() || (!finalConfirmed.length
          ? finalReturned.map((seat) => returned.get(String(seat._id))).filter(Boolean).join("; ")
          : undefined);
        for (const seat of finalConfirmed) {
          await assignments.create([{
            clubId: nomination.clubId, termId: nomination.termId,
            positionId: seat.positionId, membershipId: seat.membershipId,
            effectiveFrom: term.startAt, assignedBy: officerObjectId, confirmedBy: officerObjectId,
          }], { session });
          await seats.updateOne({ _id: seat._id, state: "Pending Confirmation" },
            { $set: { state: "Confirmed" } }, { session });
        }
        for (const seat of finalReturned) {
          await seats.updateOne({ _id: seat._id, state: "Pending Confirmation" },
            { $set: { state: "Returned", reason: returned.get(String(seat._id)) } }, { session });
        }
        const outcome = finalConfirmed.length ? "Approve" : "Reject";
        const nominationState = finalReturned.length || !finalConfirmed.length ? "Returned" : "Confirmed";
        await decisions.create([{
          approvalTaskId: task._id, outcome,
          reason: decisionReason, comments: {
            confirmedSeatIds: finalConfirmed.map((seat) => String(seat._id)),
            returnedSeatIds: finalReturned.map((seat) => String(seat._id)),
          }, actorId: officerObjectId, at: now,
        }], { session });
        await nominations.updateOne({ _id: id, state: "Pending Confirmation" }, {
          $set: { state: nominationState, decidedBy: officerObjectId, decidedAt: now,
            ...(decisionReason ? { reason: decisionReason } : {}) },
        }, { session });
        await tasks.updateOne({ _id: task._id, state: "Open" },
          { $set: { state: "Decided", closedAt: now } }, { session });
        const foundingLeaderConfirmed = club.state === "Pending Setup"
          && finalConfirmed.some((seat) => positionsForSeats.some((position) =>
            String(position._id) === String(seat.positionId) && position.isLeaderRole));
        if (foundingLeaderConfirmed) {
          await terms.updateOne({ _id: term._id, clubId: nomination.clubId, state: "Active" },
            { $set: { confirmedBy: officerObjectId, confirmedAt: now } }, { session });
          const changed = await clubs.updateOne({ _id: nomination.clubId, state: "Pending Setup" },
            { $set: { state: "Active", updatedAt: now } }, { session });
          if (changed.modifiedCount !== 1) return conflict("club state changed before activation");
        }
        const correlationId = randomUUID();
        await audits.create([{
          entityType: "BoardNomination", entityId: id,
          action: `BOARD_NOMINATION_${nominationState.toUpperCase().replace(" ", "_")}`,
          actorId: officerObjectId, actorRole: "ICPDP_OFFICER",
          before: { nominationState: "Pending Confirmation", clubState: club.state },
          after: { nominationState, clubState: foundingLeaderConfirmed ? "Active" : club.state,
            confirmedSeatIds: finalConfirmed.map((seat) => String(seat._id)),
            returnedSeatIds: finalReturned.map((seat) => String(seat._id)) },
          reason: decisionReason, correlationId, at: now,
        }], { session });
        const recipients = [...new Set([
          String(nomination.submittedBy),
          ...pendingSeats.map((seat) => String(membershipsForSeats.find((membership) =>
            String(membership._id) === String(seat.membershipId))?.userId ?? "")),
        ].filter(Boolean))].map((value) => new Types.ObjectId(value));
        if (recipients.length) {
          await notifications.insertMany(recipients.map((recipientUserId) => ({
            recipientUserId, eventCode: "BOARD_NOMINATION_DECIDED",
            entityType: "BoardNomination", entityId: id, channels: ["IN_APP"],
            payload: { state: nominationState, activatedClub: foundingLeaderConfirmed },
            state: "Queued", dueAt: now, attempts: 0, createdAt: now,
          })), { session });
        }
      });
      const result = await detail(id);
      if (!result) return notFound("board nomination not found after decision");
      return result;
    },
  };
}
