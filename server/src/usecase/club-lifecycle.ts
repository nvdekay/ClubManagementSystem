import type { AuthRepository } from '../domain/auth.js'
import {
  nextSemester,
  validateLifecycleReason,
  type ClubLifecycleRepository,
} from '../domain/club-lifecycle.js'
import { DomainError } from '../domain/errors.js'
import type { PolicyRepository } from '../domain/policy.js'
import { isObjectId, requireIcpdpOfficer, type AccessActor } from './access.js'

// Lấy chi tiết vòng đời CLB, không có thì báo not_found
async function club(repo: ClubLifecycleRepository, clubId: string, now: Date) {
  if (!isObjectId(clubId)) {
    throw new DomainError('invalid club id', 'validation')
  }
  const found = await repo.detail(clubId, now)
  if (!found) {
    throw new DomainError('club not found', 'not_found')
  }
  return found
}

// Lấy học kỳ kế tiếp theo lịch học vụ hiện hành
async function semesterAfter(policy: PolicyRepository, now: Date) {
  return nextSemester((await policy.findEffective(now))?.academicCalendar ?? [], now)
}

// ICPDP xem vòng đời các CLB và các CLB sắp hết hạn tạm ngừng
export async function listClubLifecycles(
  repo: ClubLifecycleRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  now: Date,
) {
  await requireIcpdpOfficer(auth, actor)
  const clubs = await repo.list()
  return {
    clubs,
    expiringSuspensions: clubs.filter(
      (item) =>
        item.state === 'Suspended' &&
        item.suspension?.until &&
        item.suspension.until.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000,
    ),
  }
}

// ICPDP xem vòng đời một CLB và học kỳ kế tiếp
export async function getClubLifecycle(
  repo: ClubLifecycleRepository,
  policy: PolicyRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  clubId: string,
  now: Date,
) {
  await requireIcpdpOfficer(auth, actor)
  const [detail, semester] = await Promise.all([
    club(repo, clubId, now),
    semesterAfter(policy, now),
  ])
  return { club: detail, nextSemester: semester }
}

// ICPDP tạm ngừng một CLB Active, có thể kèm ngày kết thúc
export async function suspendClub(
  repo: ClubLifecycleRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  clubId: string,
  input: { reason: string; until?: Date },
  now: Date,
) {
  const actorId = await requireIcpdpOfficer(auth, actor)
  const reason = validateLifecycleReason(input.reason)
  if (input.until && (Number.isNaN(input.until.getTime()) || input.until <= now)) {
    throw new DomainError('the suspension must end in the future', 'validation', { field: 'until' })
  }
  const current = await club(repo, clubId, now)
  if (current.state !== 'Active') {
    throw new DomainError('only an active club can be suspended', 'conflict')
  }
  return repo.suspend(current.id, { reason, until: input.until ?? null }, actorId, now)
}

// ICPDP kích hoạt lại một CLB đang bị tạm ngừng
export async function reactivateClub(
  repo: ClubLifecycleRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  clubId: string,
  input: { reason: string },
  now: Date,
) {
  const actorId = await requireIcpdpOfficer(auth, actor)
  const reason = validateLifecycleReason(input.reason)
  const current = await club(repo, clubId, now)
  if (current.state !== 'Suspended') {
    throw new DomainError('only a suspended club can be reactivated', 'conflict')
  }
  await repo.reactivate(current.id, reason, actorId, now)
  return { reactivated: true as const }
}

// ICPDP lên lịch giải thể CLB từ học kỳ kế tiếp
/** FR-06: giải thể có hiệu lực từ học kỳ kế tiếp; hôm nay chưa có gì đổi trạng thái. */
export async function dissolveClub(
  repo: ClubLifecycleRepository,
  policy: PolicyRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  clubId: string,
  input: { reason: string },
  now: Date,
) {
  const actorId = await requireIcpdpOfficer(auth, actor)
  const reason = validateLifecycleReason(input.reason)
  const current = await club(repo, clubId, now)
  if (!['Active', 'Suspended'].includes(current.state) || current.dissolution) {
    throw new DomainError('this club cannot be scheduled for dissolution', 'conflict')
  }
  const semester = await semesterAfter(policy, now)
  if (!semester) {
    throw new DomainError('the academic calendar has no next semester', 'validation', {
      field: 'semester',
    })
  }
  const result = await repo.decideDissolution(
    current.id,
    {
      decidedAt: now,
      decidedBy: actorId,
      reason,
      effectiveSemester: semester.code,
      effectiveFrom: semester.startAt,
      effectiveTo: semester.endAt,
    },
    now,
  )
  // E1: officer được cảnh báo; các ngân sách này phải được đối soát trước khi học kỳ Dissolving kết thúc.
  return {
    ...result,
    effectiveSemester: semester.code,
    unreconciledBudgets: current.unreconciledBudgets.length,
  }
}

// Job: nhắc, tự kích hoạt lại và chuyển các bước giải thể CLB
/**
 * Job vòng đời (FR-09/10, đình chỉ có thời hạn): nhắc nhở, tự động kích hoạt lại và các bước
 * giải thể. Mọi bước đều idempotent, nên chạy lại — hay chạy sau khi downtime — đều an toàn.
 */
export async function runClubLifecycleJob(repo: ClubLifecycleRepository, now: Date) {
  const officers = await repo.officerIds()
  const reminders = await repo.suspensionsDueForReminder(now)
  for (const item of reminders) {
    await repo.markReminded(item.id, officers, now)
  }
  const expired = await repo.expiredSuspensions(now)
  for (const item of expired) {
    await repo.reactivate(item.id, 'Hết thời hạn tạm ngừng', null, now)
  }
  const dissolving = await repo.startDissolving(now)
  const dissolved = await repo.completeDissolutions(now)
  // UC15 bước 6: CLB có bước thất bại giữ nguyên trạng thái cũ, và ICPDP được báo.
  const failed = [...dissolving.failed, ...dissolved.failed]
  for (const failure of failed) {
    await repo.alertOfficers(
      { clubId: failure.clubId, step: failure.step, message: failure.message },
      officers,
      now,
    )
  }
  return {
    reminded: reminders.length,
    reactivated: expired.length,
    dissolving: dissolving.done.length,
    dissolved: dissolved.done.length,
    failed: failed.length,
  }
}

// Cảnh báo ICPDP khi cả lần chạy job vòng đời CLB thất bại
/** Cả lần chạy thất bại (vd database không kết nối được): báo ICPDP thay vì chỉ log. */
export async function alertClubLifecycleJobFailure(
  repo: ClubLifecycleRepository,
  message: string,
  now: Date,
) {
  return repo.alertOfficers({ clubId: null, step: 'job', message }, await repo.officerIds(), now)
}
