import { Types, type ClientSession } from 'mongoose'
import type { ViolationOrigin, ViolationSeverity } from '../../domain/violation.js'
import { ucmsModels } from './ucms-models.js'
import { writeAudit } from './repo-helpers.js'

// Mở vụ vi phạm mới trong session kèm audit log VIOLATION_OPENED
/**
 * Mở một ca UC40 bên trong transaction của bên gọi, cho các flow tự phát sinh ca
 * (phát hiện trong báo cáo, thiếu báo cáo, hoàn tiền quá hạn). Sau đó ca đi theo UC40 như bình thường.
 */
export async function insertViolationCase(
  session: ClientSession,
  input: {
    clubId: Types.ObjectId
    originType: ViolationOrigin
    originRefId?: Types.ObjectId
    severity: ViolationSeverity
    title: string
    description?: string
    evidenceNote?: string
  },
  officerId: string,
  now: Date,
): Promise<Types.ObjectId> {
  const id = new Types.ObjectId()
  const actorId = new Types.ObjectId(officerId)
  await ucmsModels.violations!.create(
    [
      {
        _id: id,
        clubId: input.clubId,
        originType: input.originType,
        ...(input.originRefId ? { originRefId: input.originRefId } : {}),
        severity: input.severity,
        title: input.title,
        ...(input.description ? { description: input.description } : {}),
        evidence: input.evidenceNote
          ? [{ note: input.evidenceNote, addedBy: actorId, addedAt: now }]
          : [],
        state: 'Open',
        openedBy: actorId,
        openedAt: now,
      },
    ],
    { session },
  )
  await writeAudit(session, {
    entityType: 'Violation',
    entityId: id,
    action: 'VIOLATION_OPENED',
    actorId,
    actorRole: 'ICPDP_OFFICER',
    before: null,
    after: { state: 'Open', severity: input.severity, originType: input.originType },
    reason: input.title,
    at: now,
  })
  return id
}
