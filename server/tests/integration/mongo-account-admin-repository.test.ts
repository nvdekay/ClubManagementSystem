import mongoose, { Types } from 'mongoose'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mongoAccountAdminRepository } from '../../src/infra/db/mongo-account-admin-repository.js'
import { ensureUcmsDatabase, ucmsModels as m } from '../../src/infra/db/ucms-models.js'

const uri = process.env.MONGO_URI
const now = new Date('2026-10-18T08:00:00Z')

describe.skipIf(!uri)('Mongo account administration (UC03)', () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? '', { dbName: `ucms-account-admin-test-${process.pid}` })
    await ensureUcmsDatabase()
  }, 30_000)
  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase()
    }
    await mongoose.disconnect()
  })

  it('shows club context and links an emergency lock to an open UC40 case', async () => {
    const [officer, student, clubId, termId, positionId, membershipId] = Array.from(
      { length: 6 },
      () => new Types.ObjectId(),
    )
    await m.users!.insertMany([
      {
        _id: officer,
        email: 'officer.admin@example.edu',
        displayName: 'Officer',
        accountState: 'Active',
        createdAt: now,
      },
      {
        _id: student,
        email: 'student.admin@example.edu',
        displayName: 'Student',
        accountState: 'Active',
        createdAt: now,
      },
    ])
    await m.clubs!.create({
      _id: clubId,
      code: 'ADM',
      name: 'Admin Club',
      field: 'Technology',
      state: 'Active',
      createdAt: now,
    })
    await m.clubMemberships!.create({
      _id: membershipId,
      clubId,
      userId: student,
      state: 'Active',
      joinedAt: now,
      statusHistory: [],
    })
    await m.clubPositions!.create({
      _id: positionId,
      clubId,
      code: 'CLUB_LEADER',
      name: 'Chủ nhiệm',
      isBoardSeat: true,
      isLeaderRole: true,
      isDefaultMemberRole: false,
      isSingleHolder: true,
      permissionCodes: [],
      isActive: true,
    })
    await m.clubPositionAssignments!.create({
      clubId,
      termId,
      positionId,
      membershipId,
      effectiveFrom: now,
      assignedBy: officer,
      confirmedBy: officer,
    })
    const [openCase, closedCase] = await m.violations!.create([
      {
        clubId,
        originType: 'MANUAL',
        severity: 'High',
        title: 'Fund misuse',
        description: 'd',
        evidence: [],
        state: 'Open',
        openedBy: officer,
        openedAt: now,
      },
      {
        clubId,
        originType: 'MANUAL',
        severity: 'Low',
        title: 'Old case',
        description: 'd',
        evidence: [],
        state: 'Closed',
        openedBy: officer,
        openedAt: now,
      },
    ])
    const repo = mongoAccountAdminRepository()

    await expect(
      repo.setLock({
        actorId: officer.toString(),
        targetId: student.toString(),
        locked: true,
        reason: 'case',
        violationId: String(closedCase!._id),
        now,
      }),
    ).rejects.toMatchObject({ kind: 'conflict' })
    await repo.setLock({
      actorId: officer.toString(),
      targetId: student.toString(),
      locked: true,
      reason: 'Emergency lock',
      violationId: String(openCase!._id),
      now,
    })

    const page = await repo.listUsers('student.admin', 1, 10)
    expect(page.items[0]).toMatchObject({
      user: { accountState: 'Locked' },
      clubs: [
        {
          clubId: String(clubId),
          clubName: 'Admin Club',
          membershipState: 'Active',
          positions: ['Chủ nhiệm'],
        },
      ],
      lockCase: {
        violationId: String(openCase!._id),
        title: 'Fund misuse',
        clubName: 'Admin Club',
      },
    })
    expect(
      await m.auditLogs!.countDocuments({
        entityType: 'Violation',
        entityId: openCase!._id,
        action: 'VIOLATION_ACCOUNT_LOCKED',
      }),
    ).toBe(1)
  }, 60_000)

  it('never leaves zero active, unlocked ICPDP officers', async () => {
    const [first, second] = [new Types.ObjectId(), new Types.ObjectId()]
    await m.users!.insertMany([
      {
        _id: first,
        email: 'first.officer@example.edu',
        displayName: 'First',
        accountState: 'Active',
        createdAt: now,
      },
      {
        _id: second,
        email: 'second.officer@example.edu',
        displayName: 'Second',
        accountState: 'Active',
        createdAt: now,
      },
    ])
    const role = await m.roles!.findOneAndUpdate(
      { code: 'ICPDP_OFFICER', scope: 'system' },
      {
        $setOnInsert: {
          code: 'ICPDP_OFFICER',
          name: 'ICPDP Officer',
          scope: 'system',
          isSystem: true,
        },
      },
      { upsert: true, new: true },
    )
    // Only these two accounts hold the role in this database.
    await m.userRoleAssignments!.deleteMany({ roleId: role!._id })
    await m.userRoleAssignments!.insertMany([
      { userId: first, roleId: role!._id, grantedBy: first, grantedAt: now },
      { userId: second, roleId: role!._id, grantedBy: first, grantedAt: now },
    ])
    const repo = mongoAccountAdminRepository()
    function revoke(actor: Types.ObjectId, target: Types.ObjectId) {
      return repo.applyRoleChange({
        actorId: String(actor),
        targetId: String(target),
        roleCode: 'ICPDP_OFFICER',
        action: 'revoke',
        reason: 'rotation',
        now,
      })
    }

    await repo.setLock({
      actorId: String(first),
      targetId: String(second),
      locked: true,
      reason: 'case',
      now,
    })
    // The other holder is locked, so the first officer is the last active one.
    await expect(revoke(second, first)).rejects.toMatchObject({ kind: 'conflict' })
    await expect(
      repo.setLock({
        actorId: String(second),
        targetId: String(first),
        locked: true,
        reason: 'x',
        now,
      }),
    ).rejects.toMatchObject({ kind: 'conflict' })
    expect((await m.users!.findById(first).lean())?.accountState).toBe('Active')

    await repo.setLock({
      actorId: String(first),
      targetId: String(second),
      locked: false,
      reason: 'ok',
      now,
    })
    await revoke(first, second)
    expect(await repo.systemRoles(String(second))).toEqual([])
    await expect(revoke(second, first)).rejects.toMatchObject({ kind: 'conflict' })
    expect(await repo.systemRoles(String(first))).toEqual(['ICPDP_OFFICER'])
  }, 60_000)
})
