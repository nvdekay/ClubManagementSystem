import { randomUUID } from 'node:crypto'
import mongoose, { Types } from 'mongoose'
import type { ApplicationExpiryRepository } from '../../domain/application-expiry.js'
import { queueNotifications } from './repo-helpers.js'
import { ucmsModels as m } from './ucms-models.js'
// Repository hết hạn hồ sơ lập CLB quá hạn chỉnh sửa
export function mongoApplicationExpiryRepository(): ApplicationExpiryRepository {
  // Chuyển hồ sơ Revision Requested quá hạn sang Expired và thông báo founder
  return {
    async expire(now) {
      const ids = await m
        .clubApplications!.find({ state: 'Revision Requested', revisionDeadlineAt: { $lte: now } })
        .distinct('_id')
      let count = 0
      for (const id of ids) {
        const changed = await mongoose.connection.transaction(async (session) => {
          const doc = await m
            .clubApplications!.findOneAndUpdate(
              { _id: id, state: 'Revision Requested', revisionDeadlineAt: { $lte: now } },
              { $set: { state: 'Expired' } },
              { session },
            )
            .lean()
          if (!doc) {
            return false
          }
          await m.approvalTasks!.updateMany(
            { entityType: 'CLUB_APPLICATION', entityId: id, state: { $in: ['Open', 'Escalated'] } },
            { $set: { state: 'Closed', closedAt: now } },
            { session },
          )
          await m.auditLogs!.create(
            [
              {
                entityType: 'ClubApplication',
                entityId: id,
                action: 'CLUB_APPLICATION_EXPIRED',
                actorRole: 'SYSTEM',
                before: { state: 'Revision Requested' },
                after: { state: 'Expired', revisionDeadlineAt: doc.revisionDeadlineAt },
                correlationId: randomUUID(),
                at: now,
              },
            ],
            { session },
          )
          await queueNotifications(session, [doc.founderUserId], {
            eventCode: 'CLUB_APPLICATION_EXPIRED',
            entityType: 'ClubApplication',
            entityId: id as Types.ObjectId,
            payload: { clubName: doc.clubName },
            now,
          })
          return true
        })
        if (changed) {
          count++
        }
      }
      return count
    },
  }
}
