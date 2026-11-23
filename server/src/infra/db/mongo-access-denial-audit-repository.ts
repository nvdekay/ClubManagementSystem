import { Types } from "mongoose";
import type { AccessDenialAuditRepository } from "../../domain/access-denial.js";
import { ucmsModels as m } from "./ucms-models.js";

export function mongoAccessDenialAuditRepository(): AccessDenialAuditRepository {
  return {
    async record(denial) {
      await m.auditLogs!.create({
        entityType: denial.entityType, entityId: new Types.ObjectId(denial.entityId), action: "ACCESS_DENIED",
        actorId: new Types.ObjectId(denial.actorId), reason: denial.reason, correlationId: denial.correlationId,
        after: { method: denial.method, route: denial.route,
          ...(denial.clubId ? { clubId: denial.clubId } : {}),
          ...(denial.requiredPermission ? { requiredPermission: denial.requiredPermission } : {}) },
        at: denial.at,
      });
    },
  };
}
