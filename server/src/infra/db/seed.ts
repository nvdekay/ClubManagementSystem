// Thêm hoặc làm mới các bản ghi demo xác định mà không xoá dữ liệu của user: npm run seed.
import mongoose, { Types } from 'mongoose'
import { loadConfig } from '../config/index.js'
import { pdpClubs, pdpEvents } from './pdp-demo-data.js'
import { ensureUcmsDatabase, ucmsModels } from './ucms-models.js'

const config = loadConfig()

// Chuyển chuỗi hex thành ObjectId
function objectId(value: string): Types.ObjectId {
  return new Types.ObjectId(value)
}

// Tính mã học kỳ của một ngày
// Các học kỳ của FPT University: Spring tháng 1–4, Summer tháng 5–8, Fall tháng 9–12 (giờ Việt Nam).
function semesterCode(date: Date): string {
  const local = new Date(date.getTime() + 7 * 3_600_000)
  const month = local.getUTCMonth()
  const season = month < 4 ? 'Spring' : month < 8 ? 'Summer' : 'Fall'
  return `${season} ${local.getUTCFullYear()}`
}

// Upsert hàng loạt document vào một collection theo _id
async function upsertMany(
  collection: keyof typeof ucmsModels,
  documents: Array<Record<string, unknown> & { _id: Types.ObjectId }>,
): Promise<void> {
  const model = ucmsModels[collection]
  if (!model) {
    throw new Error(`missing UCMS model: ${String(collection)}`)
  }
  await model.bulkWrite(
    documents.map((document) => ({
      replaceOne: {
        filter: { _id: document._id },
        replacement: document,
        upsert: true,
      },
    })),
  )
}

// Xoá dữ liệu demo hư cấu cũ do seed tạo
// Bản demo giả tưởng trước đó (F-Code, F-Japan…) dùng các id cố định này; chỉ những
// bản ghi do seed sở hữu đó bị xoá để snapshot PDP thay thế chúng.
async function removeFictionalDemo(): Promise<void> {
  function ids(prefix: string, count: number): Types.ObjectId[] {
    return Array.from({ length: count }, (_, index) => objectId(`${prefix}${index + 1}`))
  }
  const removals: Array<[keyof typeof ucmsModels, Types.ObjectId[]]> = [
    ['users', ['100', '101', '102', '103'].map((suffix) => objectId(suffix.padStart(24, '0')))],
    ['clubs', ids('10000000000000000000000', 5)],
    ['clubTerms', ids('20000000000000000000000', 5)],
    ['clubPositions', ids('30000000000000000000000', 5)],
    ['clubMemberships', ids('40000000000000000000000', 3)],
    ['clubPositionAssignments', ids('50000000000000000000000', 3)],
    ['recruitmentCampaigns', ids('60000000000000000000000', 2)],
    ['events', [...ids('70000000000000000000000', 4), objectId('700000000000000000000010')]],
  ]
  for (const [collection, list] of removals) {
    await ucmsModels[collection]!.deleteMany({ _id: { $in: list } })
  }
}

// Seed snapshot dữ liệu CLB của PDP
async function seedPdpSnapshot(now: Date): Promise<void> {
  const clubIdByCode = new Map(pdpClubs.map((club) => [club.code, objectId(club.id)]))
  const clubNameByCode = new Map(pdpClubs.map((club) => [club.code, club.name]))

  await upsertMany(
    'clubs',
    pdpClubs.map((club) => ({
      _id: objectId(club.id),
      code: club.code,
      name: club.name,
      field: club.field,
      state: 'Active',
      ...('description' in club ? { description: club.description } : {}),
      ...('logoUrl' in club ? { logoUrl: club.logoUrl } : {}),
      channels: { pdp: club.pdpUrl },
      createdAt: now,
      updatedAt: now,
    })),
  )

  await upsertMany(
    'events',
    pdpEvents.map((event) => {
      const clubId = clubIdByCode.get(event.clubCode)
      if (!clubId) {
        throw new Error(`event ${event.pdpEventId} references unknown club ${event.clubCode}`)
      }
      const startAt = new Date(event.startAt)
      return {
        _id: objectId(event.id),
        clubId,
        clubName: clubNameByCode.get(event.clubCode),
        title: event.title,
        objective: event.objective,
        startAt,
        endAt: new Date(event.endAt),
        ...('coverImageUrl' in event ? { coverImageUrl: event.coverImageUrl } : {}),
        semesterCode: semesterCode(startAt),
        venueText: event.venueText,
        organizerType: 'CLUB',
        audienceScope: 'PUBLIC',
        capacity: 0,
        confirmedRegistrationCount: 0,
        nextWaitlistPosition: 1,
        waitlistEnabled: false,
        state: 'Completed',
        allowWalkIn: false,
        currentRevisionNo: 1,
        publishedAt: startAt,
        attendanceFinalized: false,
        createdAt: startAt,
      }
    }),
  )
}

try {
  await mongoose.connect(config.MONGO_URI, { serverSelectionTimeoutMS: 5_000 })
  await ensureUcmsDatabase()
  await removeFictionalDemo()
  await seedPdpSnapshot(new Date())
  // Không bao giờ log MONGO_URI — nó có thể chứa thông tin đăng nhập (SEC-04).
  console.log(
    `demo data ready: ${pdpClubs.length} clubs and ${pdpEvents.length} events from the PDP snapshot`,
  )
} catch (error) {
  console.error('demo seed failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
