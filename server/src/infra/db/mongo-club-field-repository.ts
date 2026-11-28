import mongoose, { Types, type ClientSession } from 'mongoose'
import {
  DEFAULT_CLUB_FIELDS,
  normalizeClubFieldName,
  type ClubField,
  type ClubFieldRepository,
} from '../../domain/club-field.js'
import { DomainError } from '../../domain/errors.js'
import { ucmsModels } from './ucms-models.js'
import { found, isDuplicateKey, writeAudit } from './repo-helpers.js'

// Ánh xạ document thành ClubField
function fieldFrom(doc: Record<string, unknown>): ClubField {
  return {
    id: String(doc._id),
    name: String(doc.name),
    sortOrder: Number(doc.sortOrder ?? 0),
    isActive: doc.isActive !== false,
  }
}

// Repository danh mục lĩnh vực hoạt động của CLB
export function mongoClubFieldRepository(): ClubFieldRepository {
  const fields = ucmsModels.clubFields!
  const clubs = ucmsModels.clubs!
  const applications = ucmsModels.clubApplications!

  async function audit(
    session: ClientSession,
    id: unknown,
    action: string,
    actorId: string,
    before: unknown,
    after: unknown,
    at: Date,
  ): Promise<void> {
    await writeAudit(session, {
      entityType: 'ClubField',
      entityId: new Types.ObjectId(String(id)),
      action,
      actorId: new Types.ObjectId(actorId),
      actorRole: 'ICPDP_OFFICER',
      before,
      after,
      at,
    })
  }

  return {
    // Liệt kê lĩnh vực đang bật theo thứ tự hiển thị
    async listActive() {
      const docs = await fields
        .find({ isActive: true })
        .sort({ sortOrder: 1, name: 1 })
        .collation({ locale: 'vi' })
        .lean()
      return docs.map(fieldFrom)
    },
    // Liệt kê mọi lĩnh vực kèm số CLB và hồ sơ đang dùng
    async listWithUsage() {
      const docs = await fields
        .find()
        .sort({ isActive: -1, sortOrder: 1, name: 1 })
        .collation({ locale: 'vi' })
        .lean()
      const names = docs.map((doc) => String(doc.name))
      const [clubCounts, applicationCounts] = await Promise.all([
        clubs.aggregate<{ _id: string; count: number }>([
          { $match: { field: { $in: names } } },
          { $group: { _id: '$field', count: { $sum: 1 } } },
        ]),
        applications.aggregate<{ _id: string; count: number }>([
          { $match: { field: { $in: names } } },
          { $group: { _id: '$field', count: { $sum: 1 } } },
        ]),
      ])
      const clubsByName = new Map(clubCounts.map((item) => [item._id, item.count]))
      const applicationsByName = new Map(applicationCounts.map((item) => [item._id, item.count]))
      return docs.map((doc) => ({
        ...fieldFrom(doc),
        clubCount: clubsByName.get(String(doc.name)) ?? 0,
        applicationCount: applicationsByName.get(String(doc.name)) ?? 0,
      }))
    },
    // Tìm lĩnh vực theo id
    async find(id) {
      const doc = await fields.findById(new Types.ObjectId(id)).lean()
      return doc ? fieldFrom(doc) : null
    },
    // Tạo lĩnh vực mới, chặn trùng tên, ghi audit
    async create(input, actorId, now) {
      const normalizedName = normalizeClubFieldName(input.name)
      try {
        return await mongoose.connection.transaction(async (session) => {
          const hidden = await fields
            .findOne({ normalizedName, isActive: false })
            .session(session)
            .lean()
          if (hidden) {
            const restored = await fields
              .findOneAndUpdate(
                { _id: hidden._id, isActive: false },
                {
                  $set: {
                    name: input.name,
                    sortOrder: input.sortOrder,
                    isActive: true,
                    updatedAt: now,
                  },
                },
                { returnDocument: 'after', session },
              )
              .lean()
            if (!restored) {
              throw new DomainError('club field changed; reload and retry', 'conflict')
            }
            await audit(
              session,
              hidden._id,
              'CLUB_FIELD_RESTORED',
              actorId,
              { isActive: false },
              { name: input.name, isActive: true },
              now,
            )
            return fieldFrom(restored)
          }
          const [created] = await fields.create(
            [
              {
                name: input.name,
                normalizedName,
                sortOrder: input.sortOrder,
                isActive: true,
                createdAt: now,
                updatedAt: now,
              },
            ],
            { session },
          )
          await audit(
            session,
            created!._id,
            'CLUB_FIELD_CREATED',
            actorId,
            null,
            { name: input.name, sortOrder: input.sortOrder },
            now,
          )
          return fieldFrom(created!.toObject())
        })
      } catch (error) {
        if (isDuplicateKey(error)) {
          throw new DomainError('club field name already exists', 'conflict')
        }
        throw error
      }
    },
    // Cập nhật lĩnh vực và ghi audit
    async update(id, input, actorId, now) {
      const objectId = new Types.ObjectId(id)
      try {
        return await mongoose.connection.transaction(async (session) => {
          const current = found(
            await fields.findOne({ _id: objectId, isActive: true }).session(session).lean(),
            'club field not found',
          )
          const previousName = String(current.name)
          const updated = found(
            await fields
              .findOneAndUpdate(
                { _id: objectId, isActive: true },
                {
                  $set: {
                    name: input.name,
                    normalizedName: normalizeClubFieldName(input.name),
                    sortOrder: input.sortOrder,
                    updatedAt: now,
                  },
                },
                { returnDocument: 'after', session },
              )
              .lean(),
            'club field not found',
          )
          if (previousName !== input.name) {
            await clubs.updateMany(
              { field: previousName },
              { $set: { field: input.name, updatedAt: now } },
              { session },
            )
            await applications.updateMany(
              { field: previousName },
              { $set: { field: input.name, 'draftPayload.field': input.name } },
              { session },
            )
          }
          await audit(
            session,
            objectId,
            'CLUB_FIELD_UPDATED',
            actorId,
            { name: previousName, sortOrder: current.sortOrder },
            { name: input.name, sortOrder: input.sortOrder },
            now,
          )
          return fieldFrom(updated)
        })
      } catch (error) {
        if (isDuplicateKey(error)) {
          throw new DomainError('club field name already exists', 'conflict')
        }
        throw error
      }
    },
    // Xóa lĩnh vực (chỉ tắt nếu đang được dùng) và ghi audit
    async remove(id, actorId, now) {
      const objectId = new Types.ObjectId(id)
      return mongoose.connection.transaction(async (session) => {
        const current = found(
          await fields.findOne({ _id: objectId, isActive: true }).session(session).lean(),
          'club field not found',
        )
        const name = String(current.name)
        const inUse =
          Boolean(await clubs.exists({ field: name }).session(session)) ||
          Boolean(await applications.exists({ field: name }).session(session))
        if (inUse) {
          await fields.updateOne(
            { _id: objectId, isActive: true },
            { $set: { isActive: false, updatedAt: now } },
            { session },
          )
        } else {
          await fields.deleteOne({ _id: objectId }, { session })
        }
        const result = inUse ? 'deactivated' : 'deleted'
        await audit(
          session,
          objectId,
          inUse ? 'CLUB_FIELD_DEACTIVATED' : 'CLUB_FIELD_DELETED',
          actorId,
          { name, isActive: true },
          { result },
          now,
        )
        return result
      })
    },
  }
}

// Nạp danh mục lĩnh vực mặc định cho database mới
/**
 * Seed danh mục mặc định trên database mới. Khi ICPDP đã sửa danh mục (bất kỳ dòng audit ClubField
 * nào) thì không seed lại nữa, nên xoá hết các lĩnh vực vẫn giữ nguyên là đã xoá sau các lần khởi động lại.
 */
export async function ensureDefaultClubFields(now = new Date()): Promise<void> {
  const fields = ucmsModels.clubFields!
  if (
    (await fields.exists({})) ||
    (await ucmsModels.auditLogs!.exists({ entityType: 'ClubField' }))
  ) {
    return
  }
  await fields.bulkWrite(
    DEFAULT_CLUB_FIELDS.map((name, index) => ({
      updateOne: {
        filter: { normalizedName: normalizeClubFieldName(name) },
        update: {
          $setOnInsert: {
            name,
            normalizedName: normalizeClubFieldName(name),
            sortOrder: (index + 1) * 10,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
        },
        upsert: true,
      },
    })),
  )
}
