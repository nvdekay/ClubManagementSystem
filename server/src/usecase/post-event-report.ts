import type { ClubAccessRepository } from '../domain/access.js'
import type { AuthRepository } from '../domain/auth.js'
import {
  type PostEventReportRepository,
  type ReportAction,
  normalizeReport,
} from '../domain/post-event-report.js'
import { DomainError, orNotFound } from '../domain/errors.js'
import { assertClubOrOfficer, type AccessActor } from './access.js'
import { financeId } from './event-finance.js'
export interface PostEventReportDeps {
  repo: PostEventReportRepository
  access: ClubAccessRepository
  auth: Pick<AuthRepository, 'systemRoleCodes'>
}
// Liệt kê báo cáo sau sự kiện theo CLB hoặc cho ICPDP
export async function listPostEventReports(
  deps: PostEventReportDeps,
  actor: AccessActor | null,
  clubId: string | undefined,
  now: Date,
) {
  await assertClubOrOfficer(deps, actor, clubId && financeId(clubId), 'club.report.submit', now)
  return deps.repo.list(clubId, now)
}
// Xem chi tiết báo cáo sau sự kiện
export async function getPostEventReport(
  deps: PostEventReportDeps,
  actor: AccessActor | null,
  eventId: string,
  clubId: string | undefined,
  now: Date,
) {
  await assertClubOrOfficer(deps, actor, clubId && financeId(clubId), 'club.report.submit', now)
  const detail = orNotFound(await deps.repo.find(financeId(eventId), clubId, now), 'report event')
  return detail
}
// Thực hiện thao tác báo cáo sau sự kiện (lưu, nộp, nhận, quyết định, quá hạn)
export async function actOnPostEventReport(
  deps: PostEventReportDeps,
  actor: AccessActor | null,
  eventId: string,
  clubId: string | undefined,
  action: ReportAction,
  now: Date,
) {
  await assertClubOrOfficer(deps, actor, clubId && financeId(clubId), 'club.report.submit', now)
  if (
    clubId
      ? !['save', 'submit'].includes(action.kind)
      : !['claim', 'decision', 'overdue'].includes(action.kind)
  ) {
    throw new DomainError('action not allowed for this workspace', 'forbidden')
  }
  if (!Number.isInteger(action.revision) || action.revision < 0) {
    throw new DomainError('invalid revision', 'validation')
  }
  if (action.kind === 'save') {
    action = { ...action, input: normalizeReport(action.input) }
  }
  if (action.kind === 'decision' || action.kind === 'overdue') {
    if (!action.reason.trim() || action.reason.length > 2000) {
      throw new DomainError('a decision reason is required', 'validation')
    }
  }
  if (action.kind === 'decision' && action.outcome === 'finding' && !action.violationId) {
    throw new DomainError(
      'create a linked REPORT_FINDING case before accepting with finding',
      'validation',
    )
  }
  if (action.kind === 'decision' && action.violationId) {
    financeId(action.violationId)
  }
  return deps.repo.act(financeId(eventId), clubId, actor!.id, action, now)
}
