import type { TFunction } from 'i18next'

import type { AppBadgeTone } from '@/components/ui/badge/AppBadge'
import type {
  EvidenceInput,
  ViolationOrigin,
  ViolationSeverity,
  ViolationSummary,
} from '@/services/violations'

export const filters = ['active', 'awaiting', 'actions', 'closed', 'all'] as const
export type Filter = (typeof filters)[number]

// Kiểm tra ca vi phạm có thuộc bộ lọc đang chọn không
export function matches(filter: Filter, item: ViolationSummary): boolean {
  switch (filter) {
    case 'active':
      return ['Open', 'Under Investigation', 'Decision Issued'].includes(item.state)
    case 'awaiting':
      return item.state === 'Awaiting Club Response'
    case 'actions':
      return item.state === 'Corrective Action'
    case 'closed':
      return ['Resolved', 'Closed'].includes(item.state)
    default:
      return true
  }
}

// Dịch bộ lọc vi phạm sang nhãn hiển thị
export function filterLabel(t: TFunction, filter: Filter): string {
  switch (filter) {
    case 'active':
      return t('violations.filterActive')
    case 'awaiting':
      return t('violations.filterAwaiting')
    case 'actions':
      return t('violations.filterActions')
    case 'closed':
      return t('violations.filterClosed')
    default:
      return t('violations.filterAll')
  }
}

// Dịch nguồn gốc ca vi phạm sang nhãn hiển thị
export function originLabel(t: TFunction, origin: ViolationOrigin): string {
  switch (origin) {
    case 'COMPLAINT':
      return t('violations.originCOMPLAINT')
    case 'REPORT_FINDING':
      return t('violations.originREPORT_FINDING')
    case 'OVERDUE_REPORT':
      return t('violations.originOVERDUE_REPORT')
    case 'FINANCIAL_EXCEPTION':
      return t('violations.originFINANCIAL_EXCEPTION')
    case 'UNAUTHORIZED_EVENT':
      return t('violations.originUNAUTHORIZED_EVENT')
    case 'LATE_BOOKING_CANCELLATION':
      return t('violations.originLATE_BOOKING_CANCELLATION')
    default:
      return t('violations.originOTHER')
  }
}

// Dịch mức nghiêm trọng vi phạm sang nhãn hiển thị
export function severityLabel(t: TFunction, severity: ViolationSeverity): string {
  return severity === 'SERIOUS'
    ? t('violations.severitySERIOUS')
    : severity === 'MODERATE'
      ? t('violations.severityMODERATE')
      : t('violations.severityMINOR')
}

// Chọn màu badge theo mức nghiêm trọng
export function severityTone(severity: ViolationSeverity): AppBadgeTone {
  return severity === 'SERIOUS' ? 'danger' : severity === 'MODERATE' ? 'warning' : 'neutral'
}

// Dịch trạng thái ca vi phạm sang nhãn hiển thị
export function stateLabel(t: TFunction, state: string): string {
  switch (state) {
    case 'Open':
      return t('violations.stateOpen')
    case 'Under Investigation':
      return t('violations.stateUnderInvestigation')
    case 'Awaiting Club Response':
      return t('violations.stateAwaitingClubResponse')
    case 'Decision Issued':
      return t('violations.stateDecisionIssued')
    case 'Corrective Action':
      return t('violations.stateCorrectiveAction')
    case 'Resolved':
      return t('violations.stateResolved')
    case 'Closed':
      return t('violations.stateClosed')
    default:
      return state
  }
}

// Chọn màu badge theo trạng thái ca vi phạm
export function stateTone(state: string): AppBadgeTone {
  return state === 'Resolved' || state === 'Closed'
    ? 'success'
    : state === 'Awaiting Club Response'
      ? 'warning'
      : state === 'Decision Issued' || state === 'Corrective Action'
        ? 'danger'
        : 'info'
}

// Dịch hành động trong lịch sử ca vi phạm sang nhãn hiển thị
export function historyLabel(t: TFunction, action: string): string {
  switch (action) {
    case 'VIOLATION_OPENED':
      return t('violations.historyVIOLATION_OPENED')
    case 'VIOLATION_INVESTIGATING':
      return t('violations.historyVIOLATION_INVESTIGATING')
    case 'VIOLATION_EVIDENCE_ADDED':
      return t('violations.historyVIOLATION_EVIDENCE_ADDED')
    case 'VIOLATION_RESPONSE_REQUESTED':
      return t('violations.historyVIOLATION_RESPONSE_REQUESTED')
    case 'VIOLATION_RESPONSE_RECORDED':
      return t('violations.historyVIOLATION_RESPONSE_RECORDED')
    case 'VIOLATION_NO_RESPONSE_RECORDED':
      return t('violations.historyVIOLATION_NO_RESPONSE_RECORDED')
    case 'VIOLATION_DECIDED':
      return t('violations.historyVIOLATION_DECIDED')
    case 'VIOLATION_CLOSED_NO_VIOLATION':
      return t('violations.historyVIOLATION_CLOSED_NO_VIOLATION')
    case 'VIOLATION_ACTIONS_ASSIGNED':
      return t('violations.historyVIOLATION_ACTIONS_ASSIGNED')
    case 'VIOLATION_ACTION_VERIFIED':
      return t('violations.historyVIOLATION_ACTION_VERIFIED')
    case 'VIOLATION_ACTION_FAILED':
      return t('violations.historyVIOLATION_ACTION_FAILED')
    case 'VIOLATION_RESOLVED':
      return t('violations.historyVIOLATION_RESOLVED')
    case 'VIOLATION_RESPONSE_SUBMITTED':
      return t('violations.historyVIOLATION_RESPONSE_SUBMITTED')
    case 'CORRECTIVE_ACTION_SUBMITTED':
      return t('violations.historyCORRECTIVE_ACTION_SUBMITTED')
    case 'VIOLATION_ACCOUNT_LOCKED':
      return t('violations.historyVIOLATION_ACCOUNT_LOCKED')
    default:
      return action
  }
}

// Tách ô nhập thành từng minh chứng mỗi dòng
/** Mỗi dòng không rỗng là một minh chứng; dòng là đường link thì giữ nguyên là link. */
export function evidenceLines(value: string): EvidenceInput[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (/^https?:\/\//i.test(line) ? { note: line, url: line } : { note: line }))
}

// Ngày sau số ngày chỉ định, dạng giá trị input date
export function inputDate(daysAhead: number): string {
  const day = new Date(Date.now() + daysAhead * 86_400_000)
  return new Date(day.getTime() - day.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

// Đổi ngày thành ISO cuối ngày 23:59 giờ địa phương
export function endOfDay(value: string): string {
  return new Date(`${value}T23:59:00`).toISOString()
}

// Nhãn trạng thái của một hành động khắc phục
export function actionStateLabel(t: TFunction, state: string) {
  return state === 'Verified'
    ? t('violations.actionVerified')
    : state === 'Failed'
      ? t('violations.actionFailed')
      : t('violations.actionPending')
}

// Màu nhãn trạng thái của một hành động khắc phục
export function actionStateTone(state: string): AppBadgeTone {
  return state === 'Verified' ? 'success' : state === 'Failed' ? 'danger' : 'warning'
}
