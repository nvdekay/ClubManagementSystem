import { DomainError } from './errors.js'
import type { FoundingRequirements } from './policy.js'
import type { SimilarityCandidate } from './similar-club.js'

export const FOUNDER_ROLES = ['LEADER', 'VICE_LEADER', 'MEMBER'] as const
export type FounderRole = (typeof FOUNDER_ROLES)[number]
export const MAX_VICE_LEADERS = 2

export interface FoundingMember {
  userId: string
  role: FounderRole
}

export const APPLICATION_DOCUMENT_TYPES = ['PROPOSAL', 'LOGO'] as const
export type ApplicationDocumentType = (typeof APPLICATION_DOCUMENT_TYPES)[number]

export interface ApplicationDocument {
  id: string
  documentType: string
  fileName: string
  mimeType: string
  bytes: number
  assetId: string
  /** Chỉ logo được lưu công khai, để xem trước được và trở thành logo của CLB. */
  publicUrl?: string
  uploadedAt: Date
}

export interface ClubApplicationDraft {
  clubName: string
  /** Id trong danh mục của lĩnh vực CLB đã chọn; `field` giữ tên của nó cho danh sách và CLB được tạo. */
  fieldId: string
  field: string
  summary: string
  objectives: string
  fanpageUrl: string
  contactEmail: string
  founders: FoundingMember[]
  documents: ApplicationDocument[]
}

/** Một vị trí trong cơ cấu sáng lập cố định; sinh viên chỉ chọn ai giữ vị trí nào. */
export interface FoundingPosition {
  code: string
  name: string
  founderRole: FounderRole
  isBoardSeat: boolean
  isLeaderRole: boolean
  isDefaultMemberRole: boolean
  isSingleHolder: boolean
  permissionCodes: readonly string[]
}

export const FOUNDING_POSITIONS: readonly FoundingPosition[] = [
  {
    code: 'CLUB_LEADER',
    name: 'Chủ nhiệm',
    founderRole: 'LEADER',
    isBoardSeat: true,
    isLeaderRole: true,
    isDefaultMemberRole: false,
    isSingleHolder: true,
    permissionCodes: [],
  },
  {
    code: 'VICE_LEADER',
    name: 'Phó chủ nhiệm',
    founderRole: 'VICE_LEADER',
    isBoardSeat: true,
    isLeaderRole: false,
    isDefaultMemberRole: false,
    isSingleHolder: false,
    permissionCodes: [],
  },
  {
    code: 'MEMBERS',
    name: 'Thành viên',
    founderRole: 'MEMBER',
    isBoardSeat: false,
    isLeaderRole: false,
    isDefaultMemberRole: true,
    isSingleHolder: false,
    permissionCodes: [],
  },
]

export type ClubApplicationState =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Revision Requested'
  | 'Approved'
  | 'Rejected'
  | 'Withdrawn'
  | 'Expired'

export interface ClubApplicationRecord {
  id: string
  founderUserId: string
  state: ClubApplicationState
  currentVersionNo: number
  draftRevision: number
  draft: ClubApplicationDraft
  submittedAt?: Date
  /** Do yêu cầu chỉnh sửa của ICPDP đặt ra (UC08); người nộp phải nộp lại trước thời hạn này. */
  revisionDeadlineAt?: Date
  createdAt: Date
}

/** Thông tin hiển thị cho thành viên sáng lập thay cho user id thô. */
export interface FounderProfile {
  id: string
  displayName: string
  email: string
}

/** Phần quyết định của ICPDP mà người nộp được xem: không bao giờ gồm ghi chú duyệt nội bộ hay người duyệt. */
export interface ApplicantDecisionFeedback {
  outcome: 'Approve' | 'Request revision' | 'Reject'
  reason?: string
  sections: string[]
  decidedAt: Date
}

export interface ClubApplicationVersion {
  id: string
  applicationId: string
  versionNo: number
  policyVersionId: string
  snapshot: ClubApplicationDraft
  submittedAt: Date
}

export interface ClubApplicationRepository {
  createDraft(
    ownerId: string,
    draft: ClubApplicationDraft,
    now: Date,
  ): Promise<ClubApplicationRecord>
  listMine(ownerId: string): Promise<ClubApplicationRecord[]>
  findOwned(id: string, ownerId: string): Promise<ClubApplicationRecord | null>
  versions(id: string): Promise<ClubApplicationVersion[]>
  decisionFeedback(id: string): Promise<ApplicantDecisionFeedback[]>
  /** Khớp chính xác email (không phân biệt hoa thường) trong các tài khoản Active (không tìm một phần). */
  findActiveUserByEmail(email: string): Promise<FounderProfile | null>
  founderProfiles(ids: string[]): Promise<FounderProfile[]>
  saveDraft(
    id: string,
    ownerId: string,
    draft: ClubApplicationDraft,
    expectedDraftRevision: number,
  ): Promise<ClubApplicationRecord>
  addDocument(
    id: string,
    ownerId: string,
    document: ApplicationDocument,
  ): Promise<ClubApplicationRecord>
  removeDocument(id: string, ownerId: string, documentId: string): Promise<ClubApplicationRecord>
  usersExist(ids: readonly string[]): Promise<boolean>
  activeClubNameExists(name: string): Promise<boolean>
  /** CLB có thể đem ra so sánh với người nộp: chỉ các trạng thái công khai, không bao giờ gồm hồ sơ hay `Pending Setup`. */
  publicSimilarityCandidates(applicationId: string): Promise<SimilarityCandidate[]>
  /** Những user trong `userIds` đang giữ ghế club leader đã xác nhận trong nhiệm kỳ còn hiệu lực tại thời điểm `at`. */
  activeLeaderUserIds(userIds: readonly string[], at: Date): Promise<string[]>
  submit(input: {
    id: string
    ownerId: string
    snapshot: ClubApplicationDraft
    expectedDraftRevision: number
    policyVersionId: string
    now: Date
  }): Promise<ClubApplicationVersion>
  withdraw(id: string, ownerId: string, now: Date): Promise<ClubApplicationRecord>
}

export interface ApplicationFileStorage {
  /** `visibility: "public"` trả về `publicUrl` (chỉ dùng cho logo đề xuất). */
  upload(input: {
    ownerId: string
    applicationId: string
    documentType: string
    fileName: string
    mimeType: string
    bytes: Buffer
    visibility: 'private' | 'public'
    now: Date
  }): Promise<ApplicationDocument>
  accessUrl(assetId: string, options?: { inline: boolean }): Promise<string>
}

const objectId = /^[0-9a-f]{24}$/i

export type FoundingIssue =
  | 'clubName'
  | 'field'
  | 'summary'
  | 'objectives'
  | 'fanpageUrl'
  | 'contactEmail'
  | 'proposal'
  | 'logo'
  | 'foundersTooFew'
  | 'applicantNotFounder'
  | 'duplicateFounder'
  | 'leaderCount'
  | 'viceLeaderCount'

// Liệt kê các điểm còn thiếu của hồ sơ thành lập CLB trước khi nộp
/**
 * Mọi điều đang chặn việc nộp hồ sơ thành lập, để bước rà soát chỉ ra từng thiếu sót
 * thay vì báo lỗi ngay ở lỗi đầu tiên. Các kiểm tra danh mục và giữa nhiều CLB nằm ở usecase.
 */
export function foundingSubmissionIssues(
  draft: ClubApplicationDraft,
  applicantId: string,
  requirements: FoundingRequirements,
): FoundingIssue[] {
  const issues: FoundingIssue[] = []
  if (!draft.clubName.trim()) {
    issues.push('clubName')
  }
  if (!objectId.test(draft.fieldId)) {
    issues.push('field')
  }
  for (const field of ['summary', 'objectives', 'fanpageUrl', 'contactEmail'] as const) {
    if (requirements.required[field] && !draft[field].trim()) {
      issues.push(field)
    }
  }
  const documentTypes = new Set(draft.documents.map((document) => document.documentType))
  if (requirements.required.proposal && !documentTypes.has('PROPOSAL')) {
    issues.push('proposal')
  }
  if (requirements.required.logo && !documentTypes.has('LOGO')) {
    issues.push('logo')
  }

  const founderIds = draft.founders.map((founder) => founder.userId.toLowerCase())
  if (founderIds.length < requirements.minFoundingMembers) {
    issues.push('foundersTooFew')
  }
  if (!founderIds.includes(applicantId.toLowerCase())) {
    issues.push('applicantNotFounder')
  }
  if (new Set(founderIds).size !== founderIds.length) {
    issues.push('duplicateFounder')
  }
  const leaders = draft.founders.filter((founder) => founder.role === 'LEADER').length
  const viceLeaders = draft.founders.filter((founder) => founder.role === 'VICE_LEADER').length
  if (leaders !== 1) {
    issues.push('leaderCount')
  }
  if (viceLeaders < 1 || viceLeaders > MAX_VICE_LEADERS) {
    issues.push('viceLeaderCount')
  }
  return issues
}

// Ném lỗi validation nếu hồ sơ thành lập CLB chưa đủ điều kiện nộp
export function validateClubApplicationSubmission(
  draft: ClubApplicationDraft,
  applicantId: string,
  requirements: FoundingRequirements,
): void {
  const issues = foundingSubmissionIssues(draft, applicantId, requirements)
  if (issues.length) {
    throw new DomainError('club application is incomplete', 'validation', {
      issues,
      required: requirements.minFoundingMembers,
    })
  }
}
