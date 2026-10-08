import { randomUUID } from "node:crypto";
import mongoose, { Types } from "mongoose";
import type { AccountAdminRepository, AdminUserPage } from "../../domain/account-admin.js";
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
      return {
        items: docs.map((doc) => ({
          user: mapUser(doc),
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
            ...(input.locked ? { lockReason: input.reason } : {}) },
          reason: input.reason, correlationId: randomUUID(), at: input.now,
        }], { session });
      });
    },
  };
}
