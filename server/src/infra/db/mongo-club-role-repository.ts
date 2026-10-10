import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import type {
  ClubRoleDefinition,
  ClubRoleOverview,
  ClubRoleRepository,
  ClubRoleStructureVersion,
} from "../../domain/club-role.js";
import { DomainError } from "../../domain/errors.js";
import { roleSnapshot } from "./mongo-leadership-transition-repository.js";
import { ucmsModels } from "./ucms-models.js";

type Doc = Record<string, unknown>;

function conflict(message: string): never {
  throw new DomainError(message, "conflict");
}

function definition(doc: Doc): ClubRoleDefinition {
  const { positionId: _positionId, ...role } = roleSnapshot(doc);
  return role;
}

function versionFrom(doc: Doc): ClubRoleStructureVersion {
  const roles = Array.isArray(doc.roles) ? doc.roles.filter((item): item is Doc =>
    Boolean(item) && typeof item === "object") : [];
  return {
    id: String(doc._id), versionNo: Number(doc.versionNo), effectiveFrom: doc.effectiveFrom as Date,
    source: String(doc.source), ...(typeof doc.reason === "string" ? { reason: doc.reason } : {}),
    createdBy: String(doc.createdBy), createdAt: doc.createdAt as Date,
    roles: roles.map((role) => ({ ...definition(role), positionId: String(role.positionId) })),
  };
}

/** Assignments still running (or not started yet) at `now`. */
function openAt(now: Date) {
  return { $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gt: now } }] };
}

export function mongoClubRoleRepository(): ClubRoleRepository {
  const clubs = ucmsModels.clubs!;
  const terms = ucmsModels.clubTerms!;
  const positions = ucmsModels.clubPositions!;
  const assignments = ucmsModels.clubPositionAssignments!;
  const memberships = ucmsModels.clubMemberships!;
  const departments = ucmsModels.clubDepartments!;
  const versions = ucmsModels.clubRoleStructureVersions!;
  const users = ucmsModels.users!;
  const audits = ucmsModels.auditLogs!;
  const notifications = ucmsModels.notifications!;

  /** BR56: every structural change appends a version; earlier versions are never touched. */
  async function appendVersion(clubId: Types.ObjectId, roleId: Types.ObjectId, actorId: Types.ObjectId,
    reason: string | undefined, now: Date, session: ClientSession): Promise<number> {
    const [latest, active] = await Promise.all([
      versions.findOne({ clubId }).sort({ versionNo: -1 }).session(session).lean(),
      positions.find({ clubId, isActive: true }).session(session).lean(),
    ]);
    const versionNo = Number(latest?.versionNo ?? 0) + 1;
    await versions.create([{ clubId, versionNo, effectiveFrom: now, source: "ROLE_MANAGEMENT",
      sourceRefId: roleId, roles: active.map(roleSnapshot), createdBy: actorId,
      ...(reason ? { reason } : {}), createdAt: now }], { session });
    return versionNo;
  }

  async function audit(entityType: string, entityId: Types.ObjectId, action: string, actorId: Types.ObjectId,
    before: unknown, after: unknown, reason: string | undefined, now: Date, session: ClientSession) {
    await audits.create([{ entityType, entityId, action, actorId, actorRole: "Club Leader",
      ...(before ? { before } : {}), after, ...(reason ? { reason } : {}),
      correlationId: randomUUID(), at: now }], { session });
  }

  async function notify(membershipId: Types.ObjectId, eventCode: string, assignmentId: Types.ObjectId,
    payload: Doc, now: Date, session: ClientSession) {
    const membership = await memberships.findById(membershipId).session(session).lean();
    if (!membership) return;
    await notifications.create([{ recipientUserId: membership.userId, eventCode,
      entityType: "ClubPositionAssignment", entityId: assignmentId, channels: ["IN_APP"], payload,
      state: "Queued", dueAt: now, attempts: 0, createdAt: now }], { session });
  }

  /** The unique (clubId, versionNo) index turns two concurrent structure edits into a conflict. */
  async function transaction(work: (session: ClientSession) => Promise<void>): Promise<void> {
    try {
      await mongoose.connection.transaction(work);
    } catch (error) {
      if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
        conflict("club role structure changed concurrently; reload and retry");
      }
      throw error;
    }
  }

  return {
    async overview(clubId, now): Promise<ClubRoleOverview | null> {
      const id = new Types.ObjectId(clubId);
      const [club, term, positionDocs, memberDocs, departmentDocs, versionDocs] = await Promise.all([
        clubs.findById(id).select({ state: 1 }).lean(),
        terms.findOne({ clubId: id, state: "Active", startAt: { $lte: now }, endAt: { $gt: now } })
          .select({ _id: 1 }).lean(),
        positions.find({ clubId: id, isActive: true }).sort({ isLeaderRole: -1, isBoardSeat: -1,
          isDefaultMemberRole: 1, name: 1 }).lean(),
        memberships.find({ clubId: id }).sort({ joinedAt: 1 }).lean(),
        departments.find({ clubId: id, isActive: true }).sort({ sortOrder: 1, name: 1 }).lean(),
        versions.find({ clubId: id }).sort({ versionNo: -1 }).lean(),
      ]);
      if (!club) return null;
      const assignmentDocs = term ? await assignments.find({ clubId: id, termId: term._id, ...openAt(now) })
        .sort({ effectiveFrom: 1 }).lean() : [];
      const userDocs = await users.find({ _id: { $in: memberDocs.map((member) => member.userId) } })
        .select({ displayName: 1, email: 1 }).lean();
      const userById = new Map(userDocs.map((user) => [String(user._id), user]));
      const members = memberDocs.map((member) => {
        const user = userById.get(String(member.userId));
        const email = String(user?.email ?? "");
        return { membershipId: String(member._id), email, state: String(member.state),
          displayName: typeof user?.displayName === "string" && user.displayName ? user.displayName : email };
      });
      const memberById = new Map(members.map((member) => [member.membershipId, member]));
      return {
        clubId, clubState: String(club.state), activeTermId: term ? String(term._id) : null,
        roles: positionDocs.map((position) => ({
          ...definition(position), id: String(position._id), isActive: true,
          holders: assignmentDocs.filter((assignment) => String(assignment.positionId) === String(position._id))
            .map((assignment) => {
              const member = memberById.get(String(assignment.membershipId));
              return { assignmentId: String(assignment._id), membershipId: String(assignment.membershipId),
                displayName: member?.displayName ?? "", email: member?.email ?? "",
                effectiveFrom: assignment.effectiveFrom as Date,
                ...(assignment.effectiveTo ? { effectiveTo: assignment.effectiveTo as Date } : {}) };
            }),
        })),
        members, departments: departmentDocs.map((department) => String(department.name)),
        versions: versionDocs.map(versionFrom),
      };
    },

    async createRole(clubId, actorId, input, now) {
      const club = new Types.ObjectId(clubId);
      const actor = new Types.ObjectId(actorId);
      await transaction(async (session) => {
        const roleId = new Types.ObjectId();
        const role = { code: `ROLE_${roleId.toHexString().slice(-8).toUpperCase()}`, name: input.name,
          ...(input.unit ? { unit: input.unit } : {}), isBoardSeat: false, isLeaderRole: false,
          isDefaultMemberRole: false, isSingleHolder: input.isSingleHolder, permissionCodes: input.permissionCodes };
        await positions.create([{ _id: roleId, clubId: club, ...role, isActive: true }], { session });
        const versionNo = await appendVersion(club, roleId, actor, input.reason, now, session);
        await audit("ClubPosition", roleId, "CLUB_ROLE_CREATED", actor, undefined, { ...role, versionNo },
          input.reason, now, session);
      });
    },

    async updateRole(clubId, roleId, actorId, input, now) {
      const club = new Types.ObjectId(clubId);
      const role = new Types.ObjectId(roleId);
      const actor = new Types.ObjectId(actorId);
      await transaction(async (session) => {
        const before = await positions.findOne({ _id: role, clubId: club, isActive: true, isLeaderRole: false })
          .session(session).lean();
        if (!before) return conflict("club role changed; reload and retry");
        const after = { name: input.name, unit: input.unit, isSingleHolder: input.isSingleHolder,
          permissionCodes: input.permissionCodes };
        await positions.updateOne({ _id: role }, {
          $set: { name: input.name, isSingleHolder: input.isSingleHolder, permissionCodes: input.permissionCodes,
            ...(input.unit ? { unit: input.unit } : {}) },
          ...(input.unit ? {} : { $unset: { unit: "" } }),
        }, { session });
        const versionNo = await appendVersion(club, role, actor, input.reason, now, session);
        const { name, unit, isSingleHolder, permissionCodes } = definition(before);
        await audit("ClubPosition", role, "CLUB_ROLE_UPDATED", actor,
          { name, unit, isSingleHolder, permissionCodes }, { ...after, versionNo }, input.reason, now, session);
      });
    },

    async deactivateRole(clubId, roleId, actorId, now) {
      const club = new Types.ObjectId(clubId);
      const role = new Types.ObjectId(roleId);
      const actor = new Types.ObjectId(actorId);
      await transaction(async (session) => {
        if (await assignments.exists({ clubId: club, positionId: role, ...openAt(now) }).session(session)) {
          return conflict("role still has holders; revoke them first");
        }
        const changed = await positions.updateOne({ _id: role, clubId: club, isActive: true, isLeaderRole: false,
          isDefaultMemberRole: false, isBoardSeat: false }, { $set: { isActive: false } }, { session });
        if (changed.modifiedCount !== 1) return conflict("club role changed; reload and retry");
        const versionNo = await appendVersion(club, role, actor, undefined, now, session);
        await audit("ClubPosition", role, "CLUB_ROLE_DEACTIVATED", actor, { isActive: true },
          { isActive: false, versionNo }, undefined, now, session);
      });
    },

    async assign(clubId, roleId, termId, actorId, input, now) {
      const club = new Types.ObjectId(clubId);
      const role = new Types.ObjectId(roleId);
      const actor = new Types.ObjectId(actorId);
      const membershipId = new Types.ObjectId(input.membershipId);
      await transaction(async (session) => {
        const [position, membership] = await Promise.all([
          positions.findOne({ _id: role, clubId: club, isActive: true }).session(session).lean(),
          memberships.findOne({ _id: membershipId, clubId: club, state: "Active" }).session(session).lean(),
        ]);
        if (!position) return conflict("club role changed; reload and retry");
        if (!membership) return conflict("only Active members can hold a club role");
        // ponytail: re-check inside the transaction; two simultaneous assigns can still both pass
        // (no write conflict on insert) — add a holder counter on the position if that ever matters.
        if (position.isSingleHolder !== false
          && await assignments.exists({ clubId: club, termId: new Types.ObjectId(termId), positionId: role,
            ...openAt(now) }).session(session)) {
          return conflict("role already has a holder; revoke it first");
        }
        const [created] = await assignments.create([{ clubId: club, termId: new Types.ObjectId(termId),
          positionId: role, membershipId, effectiveFrom: input.effectiveFrom,
          ...(input.effectiveTo ? { effectiveTo: input.effectiveTo } : {}),
          assignedBy: actor, confirmedBy: actor }], { session });
        const assignmentId = created!._id as Types.ObjectId;
        const after = { positionId: roleId, roleName: String(position.name), membershipId: input.membershipId,
          effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo };
        await audit("ClubPositionAssignment", assignmentId, "CLUB_ROLE_ASSIGNED", actor, undefined, after,
          undefined, now, session);
        await notify(membershipId, "CLUB_ROLE_ASSIGNED", assignmentId, { clubId, ...after }, now, session);
      });
    },

    async revoke(clubId, roleId, assignmentId, actorId, now) {
      const club = new Types.ObjectId(clubId);
      const role = new Types.ObjectId(roleId);
      const actor = new Types.ObjectId(actorId);
      const id = new Types.ObjectId(assignmentId);
      await transaction(async (session) => {
        const [assignment, position] = await Promise.all([
          assignments.findOne({ _id: id, clubId: club, positionId: role, ...openAt(now) }).session(session).lean(),
          positions.findById(role).session(session).lean(),
        ]);
        if (!assignment || !position) return conflict("role assignment already ended");
        // Same convention as UC21: an assignment that has not started yet ends at its own start.
        const start = assignment.effectiveFrom as Date;
        const effectiveTo = start > now ? start : now;
        await assignments.updateOne({ _id: id }, { $set: { effectiveTo } }, { session });
        const after = { positionId: roleId, roleName: String(position.name),
          membershipId: String(assignment.membershipId), effectiveTo };
        await audit("ClubPositionAssignment", id, "CLUB_ROLE_REVOKED", actor,
          { effectiveTo: assignment.effectiveTo ?? null }, after, undefined, now, session);
        await notify(assignment.membershipId as Types.ObjectId, "CLUB_ROLE_REVOKED", id, { clubId, ...after },
          now, session);
      });
    },
  };
}
