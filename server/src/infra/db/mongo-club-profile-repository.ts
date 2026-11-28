import mongoose, { Types, type ClientSession } from 'mongoose'
import type {
  ClubDepartment,
  ClubProfile,
  ClubProfileRepository,
} from '../../domain/club-profile.js'
import { DomainError } from '../../domain/errors.js'
import { ucmsModels } from './ucms-models.js'
import { found, isDuplicateKey, writeAudit } from './repo-helpers.js'

// Ánh xạ document CLB thành ClubProfile
function profileFrom(doc: Record<string, unknown>): ClubProfile {
  const channels = Array.isArray(doc.channels)
    ? doc.channels.filter(
        (
          channel,
        ): channel is {
          label: string
          url: string
        } =>
          Boolean(channel) &&
          typeof channel === 'object' &&
          typeof (channel as { label?: unknown }).label === 'string' &&
          typeof (channel as { url?: unknown }).url === 'string',
      )
    : []
  return {
    id: String(doc._id),
    code: String(doc.code),
    name: String(doc.name),
    field: String(doc.field),
    state: String(doc.state),
    description: typeof doc.description === 'string' ? doc.description : undefined,
    contactEmail: typeof doc.contactEmail === 'string' ? doc.contactEmail : undefined,
    contactPhone: typeof doc.contactPhone === 'string' ? doc.contactPhone : undefined,
    charterUrl: typeof doc.charterUrl === 'string' ? doc.charterUrl : undefined,
    channels,
    operatingScope: typeof doc.operatingScope === 'string' ? doc.operatingScope : undefined,
    institutionalFields: doc.institutionalFields,
    updatedAt: doc.updatedAt as Date | undefined,
  }
}

// Ánh xạ document thành ClubDepartment
function departmentFrom(doc: Record<string, unknown>): ClubDepartment {
  return {
    id: String(doc._id),
    clubId: String(doc.clubId),
    name: String(doc.name),
    description: typeof doc.description === 'string' ? doc.description : undefined,
    sortOrder: Number(doc.sortOrder),
    isActive: doc.isActive === true,
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date | undefined,
  }
}

// Chuẩn hóa tên phòng ban để so sánh trùng
function normalizedName(name: string): string {
  return name.trim().toLocaleLowerCase('vi-VN')
}

// Đổi lỗi trùng khóa thành lỗi conflict về tên phòng ban
function duplicate(error: unknown): never {
  if (isDuplicateKey(error)) {
    throw new DomainError('department name already exists', 'conflict')
  }
  throw error
}

// Repository hồ sơ CLB và phòng ban/ban (UC09)
export function mongoClubProfileRepository(): ClubProfileRepository {
  const clubs = ucmsModels.clubs!
  const departments = ucmsModels.clubDepartments!
  const positions = ucmsModels.clubPositions!
  const memberships = ucmsModels.clubMemberships!

  async function findDepartment(
    clubId: Types.ObjectId,
    departmentId: Types.ObjectId,
    session: ClientSession,
  ) {
    const department = found(
      await departments.findOne({ _id: departmentId, clubId }).session(session).lean(),
      'club department not found',
    )
    return department
  }

  async function assertUnused(
    clubId: Types.ObjectId,
    department: Record<string, unknown>,
    session: ClientSession,
  ) {
    const roleCount = await positions
      .countDocuments({ clubId, isActive: true, unit: department.name })
      .session(session)
    const memberCount = await memberships
      .countDocuments({
        clubId,
        departmentId: department._id,
        state: { $in: ['Active', 'Inactive'] },
      })
      .session(session)
    if (roleCount || memberCount) {
      throw new DomainError('department is still in use', 'conflict', { roleCount, memberCount })
    }
  }

  async function list(clubId: string): Promise<ClubDepartment[]> {
    const docs = await departments
      .find({ clubId: new Types.ObjectId(clubId) })
      .sort({ isActive: -1, sortOrder: 1, name: 1 })
      .collation({ locale: 'vi' })
      .lean()
    return docs.map(departmentFrom)
  }

  return {
    // Tìm hồ sơ công khai của CLB
    async findProfile(clubId) {
      const club = await clubs.findById(new Types.ObjectId(clubId)).lean()
      return club ? profileFrom(club) : null
    },

    // Liệt kê phòng ban của CLB
    listDepartments: list,

    // Cập nhật hồ sơ CLB và ghi audit
    async updateProfile(clubId, actorId, input, now) {
      const id = new Types.ObjectId(clubId)
      await mongoose.connection.transaction(async (session) => {
        const before = found(await clubs.findById(id).session(session).lean(), 'club not found')
        const set: Record<string, unknown> = { channels: input.channels, updatedAt: now }
        const unset: Record<string, ''> = {}
        for (const key of [
          'description',
          'contactEmail',
          'contactPhone',
          'charterUrl',
          'operatingScope',
        ] as const) {
          if (input[key] === undefined) {
            unset[key] = ''
          } else {
            set[key] = input[key]
          }
        }
        await clubs.updateOne({ _id: id }, { $set: set, $unset: unset }, { session })
        await writeAudit(session, {
          entityType: 'Club',
          entityId: id,
          action: 'CLUB_PROFILE_UPDATED',
          actorId: new Types.ObjectId(actorId),
          actorRole: 'Club Leader',
          before: profileFrom(before),
          after: input,
          at: now,
        })
      })
      const updated = found(await clubs.findById(id).lean(), 'club not found')
      return profileFrom(updated)
    },

    // Áp mẫu phòng ban mặc định nếu CLB chưa có phòng ban
    async applyDepartmentTemplate(clubId, actorId, template, now) {
      const id = new Types.ObjectId(clubId)
      await mongoose.connection.transaction(async (session) => {
        if (await departments.exists({ clubId: id }).session(session)) {
          return
        }
        await departments.insertMany(
          template.map((department) => ({
            clubId: id,
            name: department.name,
            normalizedName: normalizedName(department.name),
            description: department.description,
            sortOrder: department.sortOrder,
            isActive: true,
            createdAt: now,
          })),
          { session },
        )
        await writeAudit(session, {
          entityType: 'Club',
          entityId: id,
          action: 'CLUB_DEPARTMENT_TEMPLATE_APPLIED',
          actorId: new Types.ObjectId(actorId),
          actorRole: 'Club Leader',
          after: { departments: template.map((department) => department.name) },
          at: now,
        })
      })
      return list(clubId)
    },

    // Tạo phòng ban mới, chặn trùng tên
    async createDepartment(clubId, actorId, input, now) {
      const id = new Types.ObjectId(clubId)
      let createdId: Types.ObjectId | undefined
      try {
        await mongoose.connection.transaction(async (session) => {
          if (!(await clubs.exists({ _id: id }).session(session))) {
            throw new DomainError('club not found', 'not_found')
          }
          const created = await departments.create(
            [
              {
                clubId: id,
                name: input.name,
                normalizedName: normalizedName(input.name),
                description: input.description,
                sortOrder: input.sortOrder,
                isActive: true,
                createdAt: now,
              },
            ],
            { session },
          )
          createdId = new Types.ObjectId(String(created[0]!._id))
          await writeAudit(session, {
            entityType: 'ClubDepartment',
            entityId: createdId,
            action: 'CLUB_DEPARTMENT_CREATED',
            actorId: new Types.ObjectId(actorId),
            actorRole: 'Club Leader',
            after: input,
            at: now,
          })
        })
      } catch (error) {
        duplicate(error)
      }
      const created = found(
        await departments.findById(createdId).lean(),
        'club department not found',
      )
      return departmentFrom(created)
    },

    // Cập nhật phòng ban, đổi tên chỉ khi chưa được dùng
    async updateDepartment(clubId, departmentId, actorId, input, now) {
      const clubObjectId = new Types.ObjectId(clubId)
      const departmentObjectId = new Types.ObjectId(departmentId)
      try {
        await mongoose.connection.transaction(async (session) => {
          const before = await findDepartment(clubObjectId, departmentObjectId, session)
          if (normalizedName(String(before.name)) !== normalizedName(input.name)) {
            await assertUnused(clubObjectId, before, session)
          }
          await departments.updateOne(
            { _id: departmentObjectId, clubId: clubObjectId },
            {
              $set: {
                name: input.name,
                normalizedName: normalizedName(input.name),
                sortOrder: input.sortOrder,
                updatedAt: now,
                ...(input.description ? { description: input.description } : {}),
              },
              ...(input.description ? {} : { $unset: { description: '' } }),
            },
            { session },
          )
          await writeAudit(session, {
            entityType: 'ClubDepartment',
            entityId: departmentObjectId,
            action: 'CLUB_DEPARTMENT_UPDATED',
            actorId: new Types.ObjectId(actorId),
            actorRole: 'Club Leader',
            before: departmentFrom(before),
            after: input,
            at: now,
          })
        })
      } catch (error) {
        duplicate(error)
      }
      const updated = found(
        await departments.findById(departmentObjectId).lean(),
        'club department not found',
      )
      return departmentFrom(updated)
    },

    // Tắt phòng ban chưa được dùng
    async deactivateDepartment(clubId, departmentId, actorId, now) {
      const clubObjectId = new Types.ObjectId(clubId)
      const departmentObjectId = new Types.ObjectId(departmentId)
      await mongoose.connection.transaction(async (session) => {
        const before = await findDepartment(clubObjectId, departmentObjectId, session)
        if (before.isActive !== true) {
          return
        }
        await assertUnused(clubObjectId, before, session)
        await departments.updateOne(
          { _id: departmentObjectId, clubId: clubObjectId, isActive: true },
          { $set: { isActive: false, updatedAt: now } },
          { session },
        )
        await writeAudit(session, {
          entityType: 'ClubDepartment',
          entityId: departmentObjectId,
          action: 'CLUB_DEPARTMENT_DEACTIVATED',
          actorId: new Types.ObjectId(actorId),
          actorRole: 'Club Leader',
          before: { isActive: true },
          after: { isActive: false },
          at: now,
        })
      })
      const updated = found(
        await departments.findById(departmentObjectId).lean(),
        'club department not found',
      )
      return departmentFrom(updated)
    },
  }
}
