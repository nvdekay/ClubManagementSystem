import { randomUUID } from 'node:crypto'
import mongoose, { Types, type ClientSession } from 'mongoose'
import type { AuthUser } from '../../domain/auth.js'
import { DomainError } from '../../domain/errors.js'
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

// Tiền đọc từ DB sang number; trống hoặc không hợp lệ là 0
export function finiteMoney(value: unknown): number {
  return optionalNumber(value) ?? 0
}

// Chuyển number thành Decimal128
export function decimal(value: number) {
  return Types.Decimal128.fromString(String(value))
}

// Trả chuỗi không rỗng hoặc undefined
export function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

// Trả Date nếu giá trị là Date, ngược lại undefined
export function optionalDate(value: unknown): Date | undefined {
  return value instanceof Date ? value : undefined
}

// Chuyển giá trị sang number hoặc undefined nếu trống/không hợp lệ
export function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined
  }
  const parsed = Number(String(value))
  return Number.isFinite(parsed) ? parsed : undefined
}

// Ngày bắt buộc đọc từ DB; không phải Date là dữ liệu hỏng
export function storedDate(value: unknown, label: string): Date {
  if (!(value instanceof Date)) {
    throw new Error(`invalid ${label} date in database`)
  }
  return value
}

// Lọc mảng, chỉ giữ phần tử là object thường
export function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === 'object' && !Array.isArray(item),
      )
    : []
}

// Lọc mảng, chỉ giữ phần tử là chuỗi
export function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

// Ném lỗi conflict với thông báo cho trước
export function conflict(message: string): never {
  throw new DomainError(message, 'conflict')
}

// Ném lỗi not_found với thông báo cho trước
export function notFound(message: string): never {
  throw new DomainError(message, 'not_found')
}

// Trả giá trị nếu có, ngược lại ném not_found
export function found<T>(value: T | null | undefined, message: string): T {
  return value ?? notFound(message)
}

// Ánh xạ document user thành AuthUser
export function authUserFrom(doc: Record<string, unknown>): AuthUser {
  return {
    id: String(doc._id),
    email: String(doc.email),
    displayName: String(doc.displayName),
    avatarUrl: typeof doc.avatarUrl === 'string' ? doc.avatarUrl : undefined,
    accountState: doc.accountState === 'Locked' ? 'Locked' : 'Active',
    lockReason: typeof doc.lockReason === 'string' ? doc.lockReason : undefined,
  }
}

// Ghi một dòng audit log; correlationId mặc định là UUID mới
export async function writeAudit(
  session: ClientSession | null | undefined,
  entry: Record<string, unknown> & { correlationId?: unknown },
): Promise<void> {
  await m.auditLogs!.create([{ ...entry, correlationId: entry.correlationId ?? randomUUID() }], {
    session: session ?? null,
  })
}

// Id các user đang giữ vai trò ICPDP_OFFICER
export async function icpdpOfficerIds(session?: ClientSession | null): Promise<Types.ObjectId[]> {
  const roleIds = await m
    .roles!.find({ code: 'ICPDP_OFFICER', scope: 'system' })
    .session(session ?? null)
    .distinct('_id')
  const userIds = await m
    .userRoleAssignments!.find({ roleId: { $in: roleIds }, revokedAt: null })
    .session(session ?? null)
    .distinct('userId')
  return userIds.map((userId) => oid(String(userId)))
}

// Khoá dòng user (tăng __v) và xác nhận tài khoản đang Active
export async function lockActiveUser(session: ClientSession, userId: Types.ObjectId) {
  if (
    !(await m.users!.findOneAndUpdate(
      { _id: userId, accountState: 'Active' },
      { $inc: { __v: 1 } },
      { session },
    ))
  ) {
    throw new DomainError('account is not active', 'locked')
  }
}

// Khoá dòng gán vai trò ICPDP_OFFICER của user; không có thì forbidden
export async function lockIcpdpOfficerRole(session: ClientSession, userId: Types.ObjectId) {
  const roles = await m
    .roles!.find({ code: 'ICPDP_OFFICER', scope: 'system' })
    .session(session)
    .lean()
  if (
    !(await m.userRoleAssignments!.findOneAndUpdate(
      { userId, roleId: { $in: roles.map((r) => r._id) }, revokedAt: null },
      { $inc: { __v: 1 } },
      { session },
    ))
  ) {
    throw new DomainError('ICPDP officer role required', 'forbidden')
  }
}

// Đóng các approval task đang mở của một (hoặc nhiều) thực thể
export async function closeOpenTasks(
  session: ClientSession | null | undefined,
  entityType: string,
  entityId: unknown,
  now: Date,
): Promise<void> {
  await m.approvalTasks!.updateMany(
    { entityType, entityId, state: 'Open' },
    { $set: { state: 'Closed', closedAt: now } },
    { session: session ?? undefined },
  )
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
