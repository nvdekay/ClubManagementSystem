import { randomUUID } from 'node:crypto'
import mongoose, { Types } from 'mongoose'
import { DomainError } from '../../domain/errors.js'
import type { AuthRepository } from '../../domain/auth.js'
import type { GoogleIdentity } from '../../domain/google-identity.js'
import { ucmsModels } from './ucms-models.js'
import { authUserFrom } from './repo-helpers.js'

// Repository xác thực: tạo/tìm user Google, role hệ thống, CLB và audit đăng nhập
/** `allowedDomain` là ALLOWED_DOMAIN của server: một domain, danh sách phân cách bằng dấu phẩy, hoặc "*". */
export function mongoAuthRepository(allowedDomain: string): AuthRepository {
  const domains = allowedDomain
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean)
  const users = ucmsModels.users!
  const profiles = ucmsModels.studentProfiles!
  const assignments = ucmsModels.userRoleAssignments!
  const roles = ucmsModels.roles!
  const memberships = ucmsModels.clubMemberships!
  const applications = ucmsModels.clubApplications!
  const clubs = ucmsModels.clubs!
  const audits = ucmsModels.auditLogs!

  return {
    // Trả danh sách domain email được phép đăng nhập
    async allowedDomains() {
      return domains
    },
    // Tạo hoặc cập nhật user từ danh tính Google, từ chối nếu sai subject
    async findOrCreateGoogleUser(identity: GoogleIdentity, email, now) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          return await mongoose.connection.transaction(async (session) => {
            const existing = await users.findOne({ email }).session(session).lean()
            if (existing && existing.googleSubject && existing.googleSubject !== identity.subject) {
              throw new DomainError('Google identity does not match account', 'forbidden')
            }
            if (existing?.accountState === 'Locked') {
              return authUserFrom(existing)
            }
            let userDoc: Record<string, unknown>
            if (!existing) {
              const created = await users.create(
                [
                  {
                    email,
                    googleSubject: identity.subject,
                    displayName: identity.displayName,
                    avatarUrl: identity.avatarUrl,
                    accountState: 'Active',
                    createdAt: now,
                    lastLoginAt: now,
                  },
                ],
                { session },
              )
              userDoc = created[0]!.toObject()
            } else {
              await users.updateOne(
                { _id: existing._id },
                {
                  $set: {
                    googleSubject: identity.subject,
                    displayName: identity.displayName,
                    ...(identity.avatarUrl ? { avatarUrl: identity.avatarUrl } : {}),
                    lastLoginAt: now,
                    updatedAt: now,
                  },
                },
                { session },
              )
              userDoc = {
                ...existing,
                displayName: identity.displayName,
                ...(identity.avatarUrl ? { avatarUrl: identity.avatarUrl } : {}),
              }
            }
            await profiles.updateOne(
              { userId: userDoc._id },
              {
                $set: { fullName: identity.displayName, syncedAt: now },
                $setOnInsert: { userId: userDoc._id },
              },
              { upsert: true, session },
            )
            return authUserFrom(userDoc)
          })
        } catch (error) {
          if (
            error instanceof mongoose.mongo.MongoServerError &&
            error.code === 11000 &&
            attempt < 2
          ) {
            continue
          }
          throw error
        }
      }
      throw new DomainError('unable to create Google account', 'conflict')
    },
    // Tìm user theo id
    async findUserById(userId) {
      const user = await users.findById(new Types.ObjectId(userId)).lean()
      return user ? authUserFrom(user) : null
    },
    // Lấy mã role hệ thống đang hiệu lực của user
    async systemRoleCodes(userId) {
      const current = await assignments
        .find({
          userId: new Types.ObjectId(userId),
          revokedAt: null,
        })
        .lean()
      const roleIds = current.map((assignment) => assignment.roleId)
      const found = await roles
        .find({ _id: { $in: roleIds }, scope: 'system', isSystem: true })
        .lean()
      return found.map((role) => String(role.code))
    },
    // Lấy id các CLB user là thành viên Active hoặc founder đang Pending Setup
    async clubIds(userId) {
      const userObjectId = new Types.ObjectId(userId)
      const memberDocs = await memberships.find({ userId: userObjectId, state: 'Active' }).lean()
      const founderApplications = await applications
        .find({
          founderUserId: userObjectId,
          state: 'Approved',
          createdClubId: { $exists: true },
        })
        .lean()
      const pending = await clubs
        .find({
          _id: { $in: founderApplications.map((application) => application.createdClubId) },
          state: 'Pending Setup',
        })
        .lean()
      return [
        ...new Set([
          ...memberDocs.map((membership) => String(membership.clubId)),
          ...pending.map((club) => String(club._id)),
        ]),
      ]
    },
    // Ghi audit log lần thử đăng nhập
    async auditLogin(attempt, now) {
      await audits.create({
        entityType: 'LoginAttempt',
        entityId: attempt.userId ? new Types.ObjectId(attempt.userId) : new Types.ObjectId(),
        action: attempt.action,
        actorId: attempt.userId ? new Types.ObjectId(attempt.userId) : undefined,
        after: attempt.email ? { email: attempt.email } : undefined,
        reason: attempt.reason,
        correlationId: randomUUID(),
        at: now,
      })
    },
  }
}
