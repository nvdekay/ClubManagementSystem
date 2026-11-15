import { resolveClubPermissions } from "../domain/access.js";
import type { ClubAccessRepository } from "../domain/access.js";
import type { AuthRepository } from "../domain/auth.js";
import { eventActionPermission, isInternalClubEventState, type ClubEventAction, type ClubEventInput, type ClubEventRepository,
  type EventProposalDocument, type EventProposalFileStorage, type EventProposalTemplateInfo, type EventPublishInput,
  type InternalClubEventInput, type InternalClubEventMode } from "../domain/club-event.js";
import { PROPOSAL_DOCUMENT_MIME_TYPES, PROPOSAL_TEMPLATE_MIME_TYPES, validateEventProposalFile } from "../domain/club-event-rules.js";
import { DomainError } from "../domain/errors.js";
import { assertClubAccess, type AccessActor } from "./access.js";
import { officer } from "./event-proposal-review.js";

export interface ClubEventDeps {
  repo: ClubEventRepository; access: ClubAccessRepository; auth: Pick<AuthRepository, "systemRoleCodes">;
  /** Null khi chưa cấu hình lưu trữ file; template mặc định đi kèm vẫn tải được. */
  files?: EventProposalFileStorage | null;
}
// Kiểm định dạng id sự kiện hoặc CLB
export function clubEventId(value: string): string {
  if (!/^[0-9a-f]{24}$/i.test(value)) throw new DomainError("invalid event or club id", "validation");
  return value;
}
// Liệt kê sự kiện của CLB, ẩn chi tiết với người chỉ có quyền điểm danh hoặc xem feedback
export async function listClubEvents(deps: ClubEventDeps, actor: AccessActor | null, clubId: string, now: Date) {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") throw new DomainError("account locked", "locked");
  const snapshot = await deps.access.findSnapshot(clubEventId(actor.id), clubEventId(clubId));
  const permissions = snapshot ? resolveClubPermissions(snapshot, now) : [];
  if (!["club.event.manage", "club.attendance.manage", "club.feedback.view"].some((p) => permissions.includes(p as typeof permissions[number]))) {
    throw new DomainError("club access denied", "forbidden");
  }
  const events = await deps.repo.list(clubId);
  return permissions.includes("club.event.manage") ? events : events.map((event) => ({ ...event,
    objective: "", plan: "", budgetLines: [], bookingIds: [], registrationForm: [], riskNote: undefined,
    checkInCode: permissions.includes("club.attendance.manage") ? event.checkInCode : undefined }));
}
// Xem chi tiết một sự kiện của CLB
export async function getClubEvent(deps: ClubEventDeps, actor: AccessActor | null, clubId: string, id: string, now: Date) {
  await assertClubAccess(deps.access, actor, clubId, "club.event.manage", now);
  const found = await deps.repo.find(clubEventId(clubId), clubEventId(id));
  if (!found) throw new DomainError("event not found", "not_found");
  return found;
}
// Tạo sự kiện mới ở trạng thái nháp
export async function createClubEvent(deps: ClubEventDeps, actor: AccessActor | null, clubId: string, input: ClubEventInput, now: Date) {
  await assertClubAccess(deps.access, actor, clubId, "club.event.manage", now);
  return deps.repo.create(clubEventId(clubId), input, actor!.id, now);
}
// Tạo sự kiện nội bộ CLB, lưu nháp hoặc công bố ngay
export async function createInternalClubEvent(deps: ClubEventDeps, actor: AccessActor | null, clubId: string, input: InternalClubEventInput,
  mode: InternalClubEventMode, publishInput: EventPublishInput | undefined, now: Date) {
  if ((mode === "publish") !== Boolean(publishInput)) throw new DomainError("publish settings are required only when publishing", "validation");
  await assertClubAccess(deps.access, actor, clubId, "club.event.manage", now);
  return deps.repo.createInternal(clubEventId(clubId), input, mode, publishInput, actor!.id, now);
}
// Thực hiện thao tác vòng đời sự kiện (nộp, hủy, mở khóa điểm danh...) theo quyền tương ứng
export async function actOnClubEvent(deps: ClubEventDeps, actor: AccessActor | null, clubId: string,
  id: string, action: ClubEventAction, now: Date) {
  if (action.kind === "unlock") {
    if (!actor) throw new DomainError("authentication required", "unauthorized");
    if (actor.accountState === "Locked") throw new DomainError("account locked", "locked");
    if (!(await deps.auth.systemRoleCodes(clubEventId(actor.id))).includes("ATTENDANCE_UNLOCK")) {
      throw new DomainError("attendance unlock role required", "forbidden");
    }
  } else await assertClubAccess(deps.access, actor, clubId, eventActionPermission(action), now);
  const detail = await deps.repo.act(clubEventId(clubId), clubEventId(id), action, actor!.id, now);
  return eventActionPermission(action) === "club.event.manage" ? detail : { ...detail,
    event: { ...detail.event, objective: "", plan: "", budgetLines: [], bookingIds: [], registrationForm: [] },
    versions: [], decisions: [], bookings: [], budget: undefined };

}
// Xem danh sách người tham gia sự kiện để điểm danh
export async function clubEventParticipants(deps: ClubEventDeps, actor: AccessActor | null, clubId: string, id: string, now: Date) {
  await assertClubAccess(deps.access, actor, clubId, "club.attendance.manage", now);
  return deps.repo.participants(clubEventId(clubId), clubEventId(id));
}
// Xem feedback của một nhóm sự kiện (tối đa 20)
export async function clubEventFeedback(deps: ClubEventDeps, actor: AccessActor | null, clubId: string, ids: string[], now: Date) {
  await assertClubAccess(deps.access, actor, clubId, "club.feedback.view", now);
  if (!ids.length || ids.length > 20) throw new DomainError("choose between one and twenty events", "validation");
  return deps.repo.feedback(clubEventId(clubId), [...new Set(ids.map(clubEventId))], now);
}

// Lấy các lựa chọn dùng cho form sự kiện của CLB
export async function clubEventOptions(deps: ClubEventDeps, actor: AccessActor | null, clubId: string, now: Date) {
  await assertClubAccess(deps.access, actor, clubId, "club.event.manage", now);
  return deps.repo.options(clubEventId(clubId));
}

// Lấy kho file, báo lỗi nếu chưa cấu hình
function fileStorage(deps: ClubEventDeps): EventProposalFileStorage {
  if (!deps.files) throw new DomainError("file storage is not configured", "unavailable");
  return deps.files;
}
// Kiểm người dùng đã đăng nhập và chưa bị khóa
function signedIn(actor: AccessActor | null): AccessActor {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") throw new DomainError("account locked", "locked");
  return actor;
}
// Cấp URL tạm xem hoặc tải tài liệu đề án
async function documentAccess(deps: ClubEventDeps, document: EventProposalDocument | null | undefined, inline: boolean) {
  if (!document) throw new DomainError("event proposal document not found", "not_found");
  return { fileName: document.fileName, mimeType: document.mimeType, url: await fileStorage(deps).accessUrl(document.assetId, { inline }) };
}
// Xem thông tin template đề án sự kiện đang áp dụng
/** Mọi user đã đăng nhập đều được đọc và tải template đề xuất đang hoạt động của ICPDP. */
export async function eventProposalTemplateInfo(deps: ClubEventDeps, actor: AccessActor | null): Promise<EventProposalTemplateInfo> {
  signedIn(actor);
  const { fileName, mimeType, bytes, updatedAt, isSystemDefault } = await deps.repo.proposalTemplate();
  return { fileName, mimeType, bytes, updatedAt, isSystemDefault };
}
// Tải template đề án sự kiện (file mặc định hoặc URL tạm)
export async function downloadEventProposalTemplate(deps: ClubEventDeps, actor: AccessActor | null) {
  signedIn(actor);
  const template = await deps.repo.proposalTemplate();
  if (template.isSystemDefault) return { kind: "file" as const, fileName: template.fileName, mimeType: template.mimeType, content: template.content };
  return { kind: "redirect" as const, fileName: template.fileName, url: await fileStorage(deps).accessUrl(template.assetId, { inline: false }) };
}
// Tải lên hoặc thay tài liệu đề án của sự kiện đang sửa được
/** UC25: đính kèm hoặc thay tài liệu đề xuất của một đề xuất ICPDP còn sửa được; trả về chi tiết kèm version đã tăng. */
export async function uploadEventProposalDocument(deps: ClubEventDeps, actor: AccessActor | null, clubId: string, eventId: string,
  fileName: string, mimeType: string, bytes: Buffer, now: Date) {
  await assertClubAccess(deps.access, actor, clubId, "club.event.manage", now);
  const name = validateEventProposalFile(fileName, mimeType, bytes, PROPOSAL_DOCUMENT_MIME_TYPES);
  const storage = fileStorage(deps);
  const found = await deps.repo.find(clubEventId(clubId), clubEventId(eventId));
  if (!found) throw new DomainError("event not found", "not_found");
  if (isInternalClubEventState(found.event.state)) throw new DomainError("internal club events do not take a proposal document", "validation");
  // Kiểm tra trước khi upload để request bị từ chối không để lại file mồ côi; repository kiểm tra lại trong transaction.
  if (!["Draft", "Revision Requested"].includes(found.event.state)) throw new DomainError("event cannot be edited or submitted", "conflict");
  const document = await storage.uploadProposalDocument({ clubId, eventId, actorId: actor!.id, fileName: name, mimeType, bytes, now });
  return deps.repo.act(clubId, eventId, { kind: "attach-document", document }, actor!.id, now);
}
// CLB xem tài liệu đề án của bản nháp hoặc một phiên bản đã nộp
export async function clubEventProposalDocumentAccess(deps: ClubEventDeps, actor: AccessActor | null, clubId: string, eventId: string,
  revisionNo: number | undefined, inline: boolean, now: Date) {
  await assertClubAccess(deps.access, actor, clubId, "club.event.manage", now);
  const found = await deps.repo.proposalDocument(clubEventId(eventId), revisionNo ?? "draft");
  if (!found || found.clubId !== clubId) throw new DomainError("event not found", "not_found");
  return documentAccess(deps, found.document, inline);
}
// ICPDP đăng tải template đề án mới thay template hiện hành
/** UC26: ICPDP officer thay template đang hoạt động; template không bao giờ bị xoá. */
export async function uploadEventProposalTemplate(deps: ClubEventDeps, actor: AccessActor | null, fileName: string, mimeType: string,
  bytes: Buffer, now: Date): Promise<EventProposalTemplateInfo> {
  const officerId = await officer(deps.auth, actor);
  const name = validateEventProposalFile(fileName, mimeType, bytes, PROPOSAL_TEMPLATE_MIME_TYPES);
  const storage = fileStorage(deps);
  const document = await storage.uploadTemplateDocument({ actorId: officerId, fileName: name, mimeType, bytes, now });
  return deps.repo.saveProposalTemplate(document, officerId, now);
}
// ICPDP xem tài liệu đề án của phiên bản hiện tại hoặc cũ hơn
/** UC26: officer mở tài liệu của revision hiện tại hoặc bất kỳ revision trước đó. */
export async function reviewEventProposalDocumentAccess(deps: ClubEventDeps, actor: AccessActor | null, eventId: string,
  revisionNo: number | undefined, inline: boolean) {
  await officer(deps.auth, actor);
  const found = await deps.repo.proposalDocument(clubEventId(eventId), revisionNo ?? "latest");
  if (!found) throw new DomainError("event proposal not found", "not_found");
  return documentAccess(deps, found.document, inline);
}
