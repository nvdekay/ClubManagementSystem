/**
 * Club event application actions. Proposal creation starts at createClubEvent;
 * actOnClubEvent handles save/submit, and uploadEventProposalDocument attaches evidence.
 * Access checks belong here; repositories enforce and persist workflow transitions.
 */
import { resolveClubPermissions } from '../domain/access.js'
import type { ClubAccessRepository } from '../domain/access.js'
import type { AuthRepository } from '../domain/auth.js'
import {
  eventActionPermission,
  isInternalClubEventState,
  type ClubEventAction,
  type ClubEventInput,
  type ClubEventRepository,
  type EventProposalDocument,
  type EventProposalFileStorage,
  type EventProposalTemplateInfo,
} from '../domain/club-event.js'
import {
  PROPOSAL_DOCUMENT_MIME_TYPES,
  PROPOSAL_TEMPLATE_MIME_TYPES,
  validateEventProposalFile,
} from '../domain/club-event-rules.js'
import { DomainError, orNotFound } from '../domain/errors.js'
import { assertClubAccess, parseObjectId, requireIcpdpOfficer, type AccessActor } from './access.js'
import { removeOnFailure } from './upload-rollback.js'

export interface ClubEventDeps {
  repo: ClubEventRepository
  access: ClubAccessRepository
  auth: Pick<AuthRepository, 'systemRoleCodes'>
  /** Optional storage; the bundled default template remains downloadable without it. */
  files?: EventProposalFileStorage | null
}
// Kiểm định dạng id sự kiện hoặc CLB
export function clubEventId(value: string): string {
  return parseObjectId(value, 'event or club id')
}
// Liệt kê sự kiện của CLB, ẩn chi tiết với người chỉ có quyền điểm danh hoặc xem feedback
export async function listClubEvents(
  deps: ClubEventDeps,
  actor: AccessActor | null,
  clubId: string,
  now: Date,
) {
  const signedActor = signedIn(actor)
  const snapshot = await deps.access.findSnapshot(clubEventId(signedActor.id), clubEventId(clubId))
  const permissions = snapshot ? resolveClubPermissions(snapshot, now) : []
  if (
    !['club.event.manage', 'club.attendance.manage', 'club.feedback.view'].some((p) =>
      permissions.includes(p as (typeof permissions)[number]),
    )
  ) {
    throw new DomainError('club access denied', 'forbidden')
  }
  const events = await deps.repo.list(clubId)
  return permissions.includes('club.event.manage')
    ? events
    : events.map((event) => ({
        ...event,
        objective: '',
        plan: '',
        budgetLines: [],
        bookingIds: [],
        registrationForm: [],
        riskNote: undefined,
        checkInCode: permissions.includes('club.attendance.manage') ? event.checkInCode : undefined,
      }))
}
/** Read an event dossier only for a user with this club's event management permission. */
export async function getClubEvent(
  deps: ClubEventDeps,
  actor: AccessActor | null,
  clubId: string,
  id: string,
  now: Date,
) {
  await assertClubAccess(deps.access, actor, clubId, 'club.event.manage', now)
  const found = orNotFound(await deps.repo.find(clubEventId(clubId), clubEventId(id)), 'event')
  return found
}
/** Create a proposal draft; attachment and submission are separate subsequent actions. */
export async function createClubEvent(
  deps: ClubEventDeps,
  actor: AccessActor | null,
  clubId: string,
  input: ClubEventInput,
  now: Date,
) {
  await assertClubAccess(deps.access, actor, clubId, 'club.event.manage', now)
  return deps.repo.create(clubEventId(clubId), input, actor!.id, now)
}
// Tạo sự kiện nội bộ CLB, lưu nháp hoặc công bố ngay

/** Authorize each action before persistence; proposal save/submit require club.event.manage. */
export async function actOnClubEvent(
  deps: ClubEventDeps,
  actor: AccessActor | null,
  clubId: string,
  id: string,
  action: ClubEventAction,
  now: Date,
) {
  if (action.kind === 'unlock') {
    const officerId = clubEventId(signedIn(actor).id)
    if (!(await deps.auth.systemRoleCodes(officerId)).includes('ICPDP_OFFICER')) {
      throw new DomainError('ICPDP officer role required', 'forbidden')
    }
  } else {
    await assertClubAccess(deps.access, actor, clubId, eventActionPermission(action), now)
  }
  const detail = await deps.repo.act(clubEventId(clubId), clubEventId(id), action, actor!.id, now)
  return eventActionPermission(action) === 'club.event.manage'
    ? detail
    : {
        ...detail,
        event: {
          ...detail.event,
          objective: '',
          plan: '',
          budgetLines: [],
          bookingIds: [],
          registrationForm: [],
        },
        versions: [],
        decisions: [],
        bookings: [],
        budget: undefined,
      }
}
// Xem danh sách người tham gia sự kiện để điểm danh
export async function clubEventParticipants(
  deps: ClubEventDeps,
  actor: AccessActor | null,
  clubId: string,
  id: string,
  now: Date,
) {
  await assertClubAccess(deps.access, actor, clubId, 'club.attendance.manage', now)
  return deps.repo.participants(clubEventId(clubId), clubEventId(id))
}
// Xem feedback của một nhóm sự kiện (tối đa 20)
export async function clubEventFeedback(
  deps: ClubEventDeps,
  actor: AccessActor | null,
  clubId: string,
  ids: string[],
  now: Date,
) {
  await assertClubAccess(deps.access, actor, clubId, 'club.feedback.view', now)
  if (!ids.length || ids.length > 20) {
    throw new DomainError('choose between one and twenty events', 'validation')
  }
  return deps.repo.feedback(clubEventId(clubId), [...new Set(ids.map(clubEventId))], now)
}

/** Load the club's available bookings and other event input choices. */
export async function clubEventOptions(
  deps: ClubEventDeps,
  actor: AccessActor | null,
  clubId: string,
  now: Date,
) {
  await assertClubAccess(deps.access, actor, clubId, 'club.event.manage', now)
  return deps.repo.options(clubEventId(clubId))
}

// Fail explicitly when an operation requires unconfigured file storage.
function fileStorage(deps: ClubEventDeps): EventProposalFileStorage {
  if (!deps.files) {
    throw new DomainError('file storage is not configured', 'unavailable')
  }
  return deps.files
}
// Shared authentication gate for proposal template reads.
function signedIn(actor: AccessActor | null): AccessActor {
  if (!actor) {
    throw new DomainError('authentication required', 'unauthorized')
  }
  if (actor.accountState === 'Locked') {
    throw new DomainError('account locked', 'locked')
  }
  return actor
}
/** Issue a temporary preview/download URL without exposing the storage asset directly. */
async function documentAccess(
  deps: ClubEventDeps,
  document: EventProposalDocument | null | undefined,
  inline: boolean,
) {
  if (!document) {
    throw new DomainError('event proposal document not found', 'not_found')
  }
  return {
    fileName: document.fileName,
    mimeType: document.mimeType,
    url: await fileStorage(deps).accessUrl(document.assetId, { inline }),
  }
}
/** Allow any signed-in user to inspect the active ICPDP proposal template metadata. */
export async function eventProposalTemplateInfo(
  deps: ClubEventDeps,
  actor: AccessActor | null,
): Promise<EventProposalTemplateInfo> {
  signedIn(actor)
  const { fileName, mimeType, bytes, updatedAt, isSystemDefault } =
    await deps.repo.proposalTemplate()
  return { fileName, mimeType, bytes, updatedAt, isSystemDefault }
}
/** Stream the bundled template or redirect to temporary access for an uploaded template. */
export async function downloadEventProposalTemplate(
  deps: ClubEventDeps,
  actor: AccessActor | null,
) {
  signedIn(actor)
  const template = await deps.repo.proposalTemplate()
  if (template.isSystemDefault) {
    return {
      kind: 'file' as const,
      fileName: template.fileName,
      mimeType: template.mimeType,
      content: template.content,
    }
  }
  return {
    kind: 'redirect' as const,
    fileName: template.fileName,
    url: await fileStorage(deps).accessUrl(template.assetId, { inline: false }),
  }
}
/** UC25: attach evidence to an editable proposal and return its incremented event version. */
export async function uploadEventProposalDocument(
  deps: ClubEventDeps,
  actor: AccessActor | null,
  clubId: string,
  eventId: string,
  fileName: string,
  mimeType: string,
  bytes: Buffer,
  now: Date,
) {
  await assertClubAccess(deps.access, actor, clubId, 'club.event.manage', now)
  const name = validateEventProposalFile(fileName, mimeType, bytes, PROPOSAL_DOCUMENT_MIME_TYPES)
  const storage = fileStorage(deps)
  const found = orNotFound(await deps.repo.find(clubEventId(clubId), clubEventId(eventId)), 'event')
  if (isInternalClubEventState(found.event.state)) {
    throw new DomainError('internal club events do not take a proposal document', 'validation')
  }
  // Reject non-editable proposals before uploading; the repository rechecks transactionally.
  if (!['Draft', 'Revision Requested'].includes(found.event.state)) {
    throw new DomainError('event cannot be edited or submitted', 'conflict')
  }
  const document = await storage.uploadProposalDocument({
    clubId,
    eventId,
    actorId: actor!.id,
    fileName: name,
    mimeType,
    bytes,
    now,
  })
  return removeOnFailure(storage, document.assetId, () =>
    deps.repo.act(clubId, eventId, { kind: 'attach-document', document }, actor!.id, now),
  )
}
/** Resolve a draft/submitted document and verify club ownership before issuing access. */
export async function clubEventProposalDocumentAccess(
  deps: ClubEventDeps,
  actor: AccessActor | null,
  clubId: string,
  eventId: string,
  revisionNo: number | undefined,
  inline: boolean,
  now: Date,
) {
  await assertClubAccess(deps.access, actor, clubId, 'club.event.manage', now)
  const found = await deps.repo.proposalDocument(clubEventId(eventId), revisionNo ?? 'draft')
  if (!found || found.clubId !== clubId) {
    throw new DomainError('event not found', 'not_found')
  }
  return documentAccess(deps, found.document, inline)
}
/** UC26: authorize an officer, validate the upload, and make it the active template. */
export async function uploadEventProposalTemplate(
  deps: ClubEventDeps,
  actor: AccessActor | null,
  fileName: string,
  mimeType: string,
  bytes: Buffer,
  now: Date,
): Promise<EventProposalTemplateInfo> {
  const officerId = await requireIcpdpOfficer(deps.auth, actor)
  const name = validateEventProposalFile(
    fileName,
    mimeType,
    bytes,
    PROPOSAL_TEMPLATE_MIME_TYPES,
    10 * 1024 * 1024,
  )
  const storage = fileStorage(deps)
  const document = await storage.uploadTemplateDocument({
    actorId: officerId,
    fileName: name,
    mimeType,
    bytes,
    now,
  })
  return removeOnFailure(storage, document.assetId, () =>
    deps.repo.saveProposalTemplate(document, officerId, now),
  )
}
/** UC26: let an officer read evidence frozen into the latest or a specified revision. */
export async function reviewEventProposalDocumentAccess(
  deps: ClubEventDeps,
  actor: AccessActor | null,
  eventId: string,
  revisionNo: number | undefined,
  inline: boolean,
) {
  await requireIcpdpOfficer(deps.auth, actor)
  const found = await deps.repo.proposalDocument(clubEventId(eventId), revisionNo ?? 'latest')
  if (!found) {
    throw new DomainError('event proposal not found', 'not_found')
  }
  return documentAccess(deps, found.document, inline)
}
