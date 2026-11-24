import { Types } from 'mongoose'
import type { AccessDenialAuditRepository } from '../../domain/access-denial.js'
import { ucmsModels as m } from './ucms-models.js'

// Repository ghi audit log khi truy cập bị từ chối (ACCESS_DENIED)
export function mongoAccessDenialAuditRepository(): AccessDenialAuditRepository {
  return {
    // Ghi một bản ghi ACCESS_DENIED vào audit log
    async record(denial) {
      await m.auditLogs!.create({
        entityType: denial.entityType,
        entityId: new Types.ObjectId(denial.entityId),
        action: 'ACCESS_DENIED',
        actorId: new Types.ObjectId(denial.actorId),
        reason: denial.reason,
        correlationId: denial.correlationId,
        after: {
          method: denial.method,
          route: denial.route,
          ...(denial.clubId ? { clubId: denial.clubId } : {}),
          ...(denial.requiredPermission ? { requiredPermission: denial.requiredPermission } : {}),
        },
        at: denial.at,
      })
    },
  }
}
