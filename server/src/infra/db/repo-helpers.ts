import mongoose, { Types, type ClientSession } from 'mongoose'
import { notificationChannels } from '../../domain/notification.js'
import { ucmsModels as m } from './ucms-models.js'

// Các tiện ích nhỏ dùng chung của các repository Mongo (trước đây mỗi file chép một bản)

// Chuyển chuỗi id thành ObjectId; ObjectId giữ nguyên
export function oid(value: string | Types.ObjectId): Types.ObjectId {
  return value instanceof Types.ObjectId ? value : new Types.ObjectId(value)
}

// Chuyển giá trị tiền (Decimal128/chuỗi/số) sang number, trống là 0
export function money(value: unknown): number {
  return Number(String(value ?? 0))
}

// Lỗi trùng khoá duy nhất của Mongo (mã 11000)
export function isDuplicateKey(error: unknown): boolean {
  return error instanceof mongoose.mongo.MongoServerError && error.code === 11000
}

// Escape ký tự đặc biệt của regex trong từ khoá tìm kiếm
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Phiên bản policy hiệu lực tại thời điểm `at` (null khi chưa cấu hình)
export async function policyAt(at: Date, session?: ClientSession | null) {
  return m
    .policyVersions!.findOne({ effectiveFrom: { $lte: at } })
    .sort({ effectiveFrom: -1, createdAt: -1, _id: -1 })
    .session(session ?? null)
    .lean()
}

// Xếp hàng một thông báo; kênh luôn do notificationChannels() của domain quyết định
export async function queueNotification(
  session: ClientSession | null | undefined,
  input: {
    recipientUserId: unknown
    eventCode: string
    entityType?: string
    entityId?: unknown
    payload: Record<string, unknown>
    now: Date
  },
): Promise<void> {
  await m.notifications!.create(
    [
      {
        recipientUserId: input.recipientUserId,
        eventCode: input.eventCode,
        ...(input.entityType ? { entityType: input.entityType } : {}),
        ...(input.entityId ? { entityId: input.entityId } : {}),
        channels: notificationChannels(input.eventCode),
        payload: input.payload,
        state: 'Queued',
        dueAt: input.now,
        attempts: 0,
        createdAt: input.now,
      },
    ],
    { session: session ?? null },
  )
}

// Xếp hàng cùng một thông báo cho nhiều người nhận (bỏ trùng, bỏ rỗng) bằng một lần insertMany;
// kênh luôn do notificationChannels() của domain quyết định
export async function queueNotifications(
  session: ClientSession | null | undefined,
  recipients: readonly unknown[],
  input: {
    eventCode: string
    entityType?: string
    entityId?: unknown
    payload: Record<string, unknown>
    now: Date
  },
): Promise<void> {
  const unique = [...new Set(recipients.filter(Boolean).map(String))]
  if (!unique.length) {
    return
  }
  await m.notifications!.insertMany(
    unique.map((userId) => ({
      recipientUserId: new Types.ObjectId(userId),
      eventCode: input.eventCode,
      ...(input.entityType ? { entityType: input.entityType } : {}),
      ...(input.entityId ? { entityId: input.entityId } : {}),
      channels: notificationChannels(input.eventCode),
      payload: input.payload,
      state: 'Queued',
      dueAt: input.now,
      attempts: 0,
      createdAt: input.now,
    })),
    { session: session ?? null },
  )
}
