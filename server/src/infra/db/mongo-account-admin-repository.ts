import { randomUUID } from "node:crypto";
import mongoose, { Types } from "mongoose";
import type {
  AccountAdminRepository, AdminLockCase, AdminUserClub, AdminUserPage,
} from "../../domain/account-admin.js";
import type { AuthUser } from "../../domain/auth.js";
import { DomainError } from "../../domain/errors.js";
import { ucmsModels } from "./ucms-models.js";

function mapUser(doc: Record<string, unknown>): AuthUser {
  return {
    id: String(doc._id), email: String(doc.email), displayName: String(doc.displayName),
    avatarUrl: typeof doc.avatarUrl === "string" ? doc.avatarUrl : undefined,
    accountState: doc.accountState === "Locked" ? "Locked" : "Active",
    lockReason: typeof doc.lockReason === "string" ? doc.lockReason : undefined,
  };
}

function escapedRegex(value: string): RegExp {
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

export function mongoAccountAdminRepository(): AccountAdminRepository {
  const users = ucmsModels.users!;
  const roles = ucmsModels.roles!;
  const assignments = ucmsModels.userRoleAssignments!;
  const audits = ucmsModels.auditLogs!;
  const memberships = ucmsModels.clubMemberships!;
  const clubs = ucmsModels.clubs!;
  const positionAssignments = ucmsModels.clubPositionAssignments!;
  const positions = ucmsModels.clubPositions!;
  const violations = ucmsModels.violations!;

  /** UC03 step 2: current (non-Left) memberships with the board seats held in each club. */
  async function clubContext(userIds: Types.ObjectId[]): Promise<Map<string, AdminUserClub[]>> {
    const membershipDocs = await memberships.find({ userId: { $in: userIds },
      state: { $nin: ["Left"] } }).lean();
    const [clubDocs, seatDocs] = await Promise.all([
      clubs.find({ _id: { $in: membershipDocs.map((item) => item.clubId) } }).select("_id name").lean(),
      positionAssignments.find({ membershipId: { $in: membershipDocs.map((item) => item._id) },
        effectiveTo: { $in: [null] } }).lean(),
    ]);
    const positionDocs = await positions.find({ _id: { $in: seatDocs.map((item) => item.positionId) } })
      .select("_id name").lean();
    const clubName = new Map(clubDocs.map((club) => [String(club._id), String(club.name)]));
    const positionName = new Map(positionDocs.map((item) => [String(item._id), String(item.name)]));
    const result = new Map<string, AdminUserClub[]>();
    for (const membership of membershipDocs) {
      const key = String(membership.userId);
      const seats = seatDocs.filter((seat) => String(seat.membershipId) === String(membership._id))
        .map((seat) => positionName.get(String(seat.positionId)))
        .filter((name): name is string => Boolean(name));
      result.set(key, [...(result.get(key) ?? []), { clubId: String(membership.clubId),
        clubName: clubName.get(String(membership.clubId)) ?? "", membershipState: String(membership.state),
        positions: seats }]);
    }
    return result;
  }

  /** UC03 A1: the case named by each locked user's latest lock audit. */
  async function lockCases(lockedIds: Types.ObjectId[]): Promise<Map<string, AdminLockCase>> {
    if (!lockedIds.length) return new Map();
    const lockAudits = await audits.find({ entityType: "User", entityId: { $in: lockedIds },
      action: "ACCOUNT_LOCKED" }).sort({ at: -1 }).lean();
    const latest = new Map<string, string>();
    for (const audit of lockAudits) {
      const key = String(audit.entityId);
      const violationId = (audit.after as { violationId?: string } | undefined)?.violationId;
      if (!latest.has(key)) latest.set(key, violationId ?? "");
    }
    const ids = [...new Set([...latest.values()].filter(Boolean))].map((id) => new Types.ObjectId(id));
    const caseDocs = ids.length ? await violations.find({ _id: { $in: ids } }).select("_id title clubId").lean() : [];
    const caseClubs = await clubs.find({ _id: { $in: caseDocs.map((item) => item.clubId) } })
      .select("_id name").lean();
    const byCase = new Map(caseDocs.map((item) => [String(item._id), {
      violationId: String(item._id), title: String(item.title),
      clubName: String(caseClubs.find((club) => String(club._id) === String(item.clubId))?.name ?? ""),
    }]));
    const result = new Map<string, AdminLockCase>();
    latest.forEach((violationId, userId) => {
      const found = byCase.get(violationId);
      if (found) result.set(userId, found);
    });
    return result;
  }

  return {
    async listUsers(search, limit): Promise<AdminUserPage> {
      const filter = search ? { $or: [
        { email: escapedRegex(search) }, { displayName: escapedRegex(search) },
      ] } : {};
      const [docs, total] = await Promise.all([
        users.find(filter).sort({ email: 1 }).limit(limit).lean(),
        users.countDocuments(filter),
      ]);
      const ids = docs.map((doc) => doc._id);
      const active = await assignments.find({ userId: { $in: ids }, revokedAt: null }).lean();
      const roleDocs = await roles.find({
        _id: { $in: active.map((assignment) => assignment.roleId) }, scope: "system",
      }).lean();
      const roleById = new Map(roleDocs.map((role) => [String(role._id), String(role.code)]));
      const [clubsByUser, casesByUser] = await Promise.all([clubContext(ids as Types.ObjectId[]),
        lockCases(docs.filter((doc) => doc.accountState === "Locked").map((doc) => doc._id as Types.ObjectId))]);
      return {
        items: docs.map((doc) => ({
          user: mapUser(doc),
          clubs: clubsByUser.get(String(doc._id)) ?? [],
          ...(casesByUser.has(String(doc._id)) ? { lockCase: casesByUser.get(String(doc._id)) } : {}),
          systemRoles: active.filter((assignment) => String(assignment.userId) === String(doc._id))
            .map((assignment) => roleById.get(String(assignment.roleId)))
            .filter((code): code is string => Boolean(code)),
        })),
        total,
      };
    },
    async findUser(userId) {
      const doc = await users.findById(new Types.ObjectId(userId)).lean();
      return doc ? mapUser(doc) : null;
    },
    async systemRoles(userId) {
      const active = await assignments.find({
        userId: new Types.ObjectId(userId), revokedAt: null,
      }).lean();
      const found = await roles.find({
        _id: { $in: active.map((assignment) => assignment.roleId) }, scope: "system",
      }).lean();
      return found.map((role) => String(role.code));
    },
    async applyRoleChange(input) {
      const actorId = new Types.ObjectId(input.actorId);
      const targetId = new Types.ObjectId(input.targetId);
      await mongoose.connection.transaction(async (session) => {
        const role = await roles.findOne({ code: input.roleCode, scope: "system", isSystem: true })
          .session(session).lean();
        if (!role) throw new DomainError("system role not found", "not_found");
        const existing = await assignments.findOne({
          userId: targetId, roleId: role._id, revokedAt: null,
        }).session(session).lean();
        if (input.action === "grant") {
          if (existing) throw new DomainError("role already granted", "conflict");
          await assignments.create([{
            userId: targetId, roleId: role._id, grantedBy: actorId,
            grantedAt: input.now,
          }], { session });
        } else {
          if (!existing) throw new DomainError("active role not found", "not_found");
          if (input.actorId === input.targetId && input.roleCode === "ICPDP_OFFICER") {
            throw new DomainError("cannot revoke your last admin role", "forbidden");
          }
          await assignments.updateOne({ _id: existing._id, revokedAt: null }, {
            $set: { revokedAt: input.now, revokedBy: actorId, reason: input.reason },
          }, { session });
        }
        await audits.create([{
          entityType: "User", entityId: targetId,
          action: input.action === "grant" ? "SYSTEM_ROLE_GRANTED" : "SYSTEM_ROLE_REVOKED",
          actorId,
          before: { roleCode: input.roleCode, active: input.action === "revoke" },
          after: { roleCode: input.roleCode, active: input.action === "grant" },
          reason: input.reason,
          correlationId: randomUUID(), at: input.now,
        }], { session });
      });
    },
    async setLock(input) {
      const actorId = new Types.ObjectId(input.actorId);
      const targetId = new Types.ObjectId(input.targetId);
      await mongoose.connection.transaction(async (session) => {
        const before = await users.findById(targetId).session(session).lean();
        if (!before) throw new DomainError("user not found", "not_found");
        const violationId = input.violationId ? new Types.ObjectId(input.violationId) : undefined;
        if (violationId) {
          const linked = await violations.findById(violationId).session(session).lean();
          if (!linked) throw new DomainError("violation case not found", "not_found");
          if (["Resolved", "Closed"].includes(String(linked.state))) {
            throw new DomainError("violation case is already closed", "conflict");
          }
          await audits.create([{
            entityType: "Violation", entityId: violationId, action: "VIOLATION_ACCOUNT_LOCKED",
            actorId, actorRole: "ICPDP_OFFICER", after: { userId: input.targetId, email: before.email },
            // The case history shows only the reason, so it names the locked account too.
            reason: `${String(before.email)} — ${input.reason}`, correlationId: randomUUID(), at: input.now,
          }], { session });
        }
        const afterState = input.locked ? "Locked" : "Active";
        await users.updateOne({ _id: targetId }, input.locked ? {
          $set: { accountState: afterState, lockReason: input.reason,
            lockedBy: actorId, lockedAt: input.now, updatedAt: input.now },
        } : {
          $set: { accountState: afterState, updatedAt: input.now },
          $unset: { lockReason: "", lockedBy: "", lockedAt: "" },
        }, { session });
        await audits.create([{
          entityType: "User", entityId: targetId,
          action: input.locked ? "ACCOUNT_LOCKED" : "ACCOUNT_UNLOCKED",
          actorId,
          before: { accountState: before.accountState, lockReason: before.lockReason },
          after: { accountState: afterState,
            ...(input.locked ? { lockReason: input.reason } : {}),
            ...(violationId ? { violationId: input.violationId } : {}) },
          reason: input.reason, correlationId: randomUUID(), at: input.now,
        }], { session });
      });
    },
  };
}
