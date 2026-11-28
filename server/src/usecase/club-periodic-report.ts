import type { ClubAccessRepository } from '../domain/access.js'
import {
  assertEvidenceOwnedByClub,
  normalizePeriodicDraft,
  type ClubPeriodicReportRepository,
  type PeriodicDraftInput,
} from '../domain/club-periodic-report.js'
import { fileSignatureMatches } from '../domain/file-signature.js'
import { DomainError } from '../domain/errors.js'
import {
  EVIDENCE_IMAGE_MAX_BYTES,
  EVIDENCE_IMAGE_MIME_TYPES,
  evidenceLinks,
  evidenceReference,
  parseEvidenceReference,
  periodicDueAt,
  periodicDueDays,
  type EvidenceImageMimeType,
  type PeriodicEvidenceStorage,
} from '../domain/periodic-report.js'
import type { PolicyRepository } from '../domain/policy.js'
import { assertClubAccess, isObjectId, type AccessActor } from './access.js'

export type WithEvidenceUrls<T> = T & { evidenceUrls: Record<string, string> }

// Gắn signed URL ngắn hạn cho các ảnh minh chứng đã upload của chính CLB trong báo cáo
/** Link http(s) và data: URL cũ giữ nguyên trong báo cáo; client dùng `evidenceUrls[reference]` để hiển thị ảnh. */
export async function withEvidenceUrls<
  T extends { clubId: string } & Parameters<typeof evidenceLinks>[0],
>(storage: PeriodicEvidenceStorage | null, report: T): Promise<WithEvidenceUrls<T>> {
  const evidenceUrls: Record<string, string> = {}
  if (storage) {
    const owner = report.clubId.toLowerCase()
    const references = [...new Set(evidenceLinks(report))].flatMap((link) => {
      const parsed = parseEvidenceReference(link)
      return parsed && parsed.clubId === owner ? [{ link, assetId: parsed.assetId }] : []
    })
    await Promise.all(
      references.map(async ({ link, assetId }) => {
        evidenceUrls[link] = await storage.accessUrl(assetId)
      }),
    )
  }
  return { ...report, evidenceUrls }
}

// CLB tải ảnh minh chứng cho báo cáo định kỳ, trả tham chiếu để lưu vào báo cáo
export async function uploadPeriodicEvidenceImage(
  storage: PeriodicEvidenceStorage | null,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  mimeType: string,
  bytes: Buffer,
  now: Date,
) {
  await assertClubAccess(access, actor, clubId, 'club.report.submit', now)
  if (
    !(EVIDENCE_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType) ||
    bytes.length === 0 ||
    bytes.length > EVIDENCE_IMAGE_MAX_BYTES ||
    !fileSignatureMatches(mimeType, bytes)
  ) {
    throw new DomainError('evidence must be a PNG, JPEG or WebP image up to 5 MB', 'validation')
  }
  if (!storage) {
    throw new DomainError('file storage is not configured', 'unavailable')
  }
  const owner = clubId.toLowerCase()
  const { assetId } = await storage.upload({
    clubId: owner,
    mimeType: mimeType as EvidenceImageMimeType,
    bytes,
  })
  const reference = evidenceReference(owner, assetId)
  if (!parseEvidenceReference(reference)) {
    throw new DomainError('file upload failed', 'unavailable')
  }
  return { reference, url: await storage.accessUrl(assetId), mimeType, bytes: bytes.length }
}

// CLB xem các kỳ báo cáo định kỳ (hạn, trạng thái mở) và báo cáo đã có
export async function listClubPeriodicReports(
  repo: ClubPeriodicReportRepository,
  policy: PolicyRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  now: Date,
  storage: PeriodicEvidenceStorage | null = null,
) {
  await assertClubAccess(access, actor, clubId, 'club.report.submit', now)
  const effective = await policy.findEffective(now)
  const calendar = (effective?.academicCalendar ?? []).filter((p) => p.startAt <= now)
  const periods = await Promise.all(
    calendar.map(async (p) => {
      const campaign = await repo.getCampaign?.(p.code)
      const dueAt = campaign?.dueAt ?? periodicDueAt(p, periodicDueDays(effective?.reportDeadlines))
      return {
        ...p,
        dueAt,
        isOpen: campaign ? campaign.isOpen : false,
        ...(campaign?.announcement ? { announcement: campaign.announcement } : {}),
        customFields: campaign?.customFields ?? [],
      }
    }),
  )
  const reports = await repo.list(clubId)
  return {
    periods,
    reports: await Promise.all(reports.map((report) => withEvidenceUrls(storage, report))),
  }
}

// CLB tạo báo cáo định kỳ cho một kỳ đang mở và còn hạn
export async function createClubPeriodicReport(
  repo: ClubPeriodicReportRepository,
  policy: PolicyRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  periodCode: string,
  now: Date,
) {
  await assertClubAccess(access, actor, clubId, 'club.report.submit', now)
  const effective = await policy.findEffective(now)
  const period = effective?.academicCalendar.find((p) => p.code === periodCode && p.startAt <= now)
  if (!period) {
    throw new DomainError('invalid reporting period', 'validation')
  }
  if (repo.getCampaign) {
    const campaign = await repo.getCampaign(period.code)
    if (!campaign || !campaign.isOpen) {
      throw new DomainError(
        'ICPDP has not opened periodic report submission for this period',
        'conflict',
      )
    }
    if (now > campaign.dueAt) {
      throw new DomainError('the periodic report submission deadline has passed', 'conflict')
    }
    // Báo cáo mới chưa có minh chứng nên không cần ký URL.
    return withEvidenceUrls(
      null,
      await repo.create(clubId, period.code, campaign.dueAt, actor!.id, now),
    )
  }
  return withEvidenceUrls(
    null,
    await repo.create(
      clubId,
      period.code,
      periodicDueAt(period, periodicDueDays(effective?.reportDeadlines)),
      actor!.id,
      now,
    ),
  )
}

// CLB lưu bản nháp hoặc nộp báo cáo định kỳ
export async function changeClubPeriodicReport(
  repo: ClubPeriodicReportRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  id: string,
  revision: number,
  input: PeriodicDraftInput | null,
  now: Date,
  storage: PeriodicEvidenceStorage | null = null,
) {
  await assertClubAccess(access, actor, clubId, 'club.report.submit', now)
  if (!isObjectId(id) || !Number.isInteger(revision) || revision < 0) {
    throw new DomainError('invalid report identifier or version', 'validation')
  }
  if (!input) {
    return withEvidenceUrls(storage, await repo.submit(clubId, id, revision, actor!.id, now))
  }
  const draft = normalizePeriodicDraft(input)
  assertEvidenceOwnedByClub(draft, clubId)
  return withEvidenceUrls(storage, await repo.save(clubId, id, revision, draft, actor!.id, now))
}
