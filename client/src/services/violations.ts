import { apiClient } from '@/services/apiRequest'
import type { Page } from '@/services/discovery'
export const VIOLATION_ORIGINS = [
  'COMPLAINT',
  'REPORT_FINDING',
  'OVERDUE_REPORT',
  'FINANCIAL_EXCEPTION',
  'UNAUTHORIZED_EVENT',
  'LATE_BOOKING_CANCELLATION',
  'OTHER',
] as const
export type ViolationOrigin = (typeof VIOLATION_ORIGINS)[number]
export const VIOLATION_SEVERITIES = ['MINOR', 'MODERATE', 'SERIOUS'] as const
export type ViolationSeverity = (typeof VIOLATION_SEVERITIES)[number]

export interface ViolationEvidence {
  note: string
  url?: string
  addedBy: string
  addedAt: string
}

export interface ViolationSummary {
  id: string
  clubId: string
  clubName: string
  originType: ViolationOrigin
  severity: ViolationSeverity
  title: string
  state: string
  openedAt: string
  responseDueAt?: string
  responseOverdue: boolean
  pendingActions: number
}

/** Server-side queue filters; `open` (not Resolved/Closed) is not a tab, it feeds pickers. */
export type ViolationFilter = 'all' | 'active' | 'awaiting' | 'actions' | 'closed' | 'open'

export interface ViolationPage extends Page<ViolationSummary> {
  /** Cases per filter across every page, for the tab badges. */
  counts: Record<ViolationFilter, number>
}

export interface CorrectiveAction {
  submission?: {
    note: string
    evidence: { note: string; url?: string }[]
    submittedBy: string
    submittedAt: string
  }
  id: string
  description: string
  dueAt: string
  state: 'Pending' | 'Verified' | 'Failed'
  linkedLifecycleAction?: 'SUSPEND' | 'DISSOLVE'
  verifiedBy?: string
  verifiedAt?: string
}

export interface ViolationDetail {
  id: string
  clubId: string
  clubName: string
  clubState: string
  originType: ViolationOrigin
  originRefId?: string
  severity: ViolationSeverity
  title: string
  description?: string
  evidence: ViolationEvidence[]
  state: string
  clubResponse?: {
    requestMessage: string
    requestedBy: string
    requestedAt: string
    dueAt: string
    source?: 'CLUB' | 'RECORDED_BY_ICPDP' | 'NO_RESPONSE'
    text?: string
    respondedAt?: string
  }
  decisionReason?: string
  decisionEvidence: ViolationEvidence[]
  openedBy: string
  openedAt: string
  decidedAt?: string
  responseDueAt?: string
  resolvedAt?: string
  actions: CorrectiveAction[]
  source?: { kind: 'event' | 'budget'; id: string; label: string }
  names: Record<string, string>
  history: { action: string; at: string; actorName?: string; reason?: string }[]
}

export interface ViolationSources {
  events: { id: string; title: string; startAt: string; state: string }[]
  budgets: { id: string; eventTitle: string; state: string }[]
}

export interface EvidenceInput {
  note: string
  url?: string
}

export interface OpenViolationInput {
  clubId: string
  originType: ViolationOrigin
  originRefId?: string
  severity: ViolationSeverity
  title: string
  description?: string
  evidence?: EvidenceInput[]
}

export type ViolationStep =
  | { type: 'investigate' }
  | { type: 'addEvidence'; evidence: EvidenceInput }
  | { type: 'requestResponse'; message: string; dueAt?: string }
  | { type: 'recordResponse'; text?: string; noResponse?: boolean }
  | {
      type: 'decide'
      finding: 'VIOLATION' | 'NO_VIOLATION'
      reason: string
      evidence?: EvidenceInput[]
    }
  | {
      type: 'addActions'
      actions: {
        description: string
        dueAt: string
        linkedLifecycleAction?: 'SUSPEND' | 'DISSOLVE'
      }[]
    }
  | { type: 'verifyAction'; actionId: string; outcome: 'Verified' | 'Failed'; note?: string }
  | { type: 'resolve'; note?: string }

const request = apiClient('/api/v1/admin/violations')

// GET một trang vi phạm của các CLB theo bộ lọc
export function fetchViolations(
  filter: ViolationFilter,
  page: number,
  pageSize: number,
  signal: AbortSignal,
): Promise<ViolationPage> {
  const params = new URLSearchParams({ filter, page: String(page), pageSize: String(pageSize) })
  return request(`?${params}`, { signal })
}

// GET chi tiết một vi phạm
export function fetchViolation(id: string, signal: AbortSignal): Promise<ViolationDetail> {
  return request(`/${encodeURIComponent(id)}`, { signal })
}

// GET /sources: nguồn dữ liệu để mở vi phạm cho một CLB
export function fetchViolationSources(
  clubId: string,
  signal: AbortSignal,
): Promise<ViolationSources> {
  return request(`/sources/${encodeURIComponent(clubId)}`, { signal })
}

// POST mở hồ sơ vi phạm mới
export function openViolation(
  input: OpenViolationInput,
  csrfToken: string,
): Promise<ViolationDetail> {
  return request('', { method: 'POST', csrfToken, body: input })
}

// POST /steps: thực hiện bước xử lý vi phạm
export function applyViolationStep(
  id: string,
  step: ViolationStep,
  csrfToken: string,
): Promise<ViolationDetail> {
  return request(`/${encodeURIComponent(id)}/steps`, { method: 'POST', csrfToken, body: step })
}
