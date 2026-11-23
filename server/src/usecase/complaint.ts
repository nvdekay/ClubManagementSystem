import type { ClubAccessRepository } from "../domain/access.js";
import type { AuthRepository } from "../domain/auth.js";
import {
  assertComplaintDecision,
  COMPLAINT_STATES,
  COMPLAINT_TYPES,
  complaintText,
  normalizeEvidence,
  type ComplaintClubResponse,
  type ComplaintDecision,
  type ComplaintInput,
  type ComplaintRepository,
  type ComplaintState,
} from "../domain/complaint.js";
import { DomainError } from "../domain/errors.js";
import { assertClubAccess, type AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;

// Kiểm người dùng đã đăng nhập, chưa bị khóa và trả id
function signedIn(actor: AccessActor | null): string {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") throw new DomainError(actor.lockReason || "account locked", "locked");
  if (!objectId.test(actor.id)) throw new DomainError("invalid actor", "validation");
  return actor.id;
}

// Kiểm định dạng ObjectId của một định danh
function id(value: string, label: string): string {
  if (!objectId.test(value)) throw new DomainError(`invalid ${label}`, "validation");
  return value;
}

// Kiểm actor là ICPDP officer và trả id
async function officer(auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null): Promise<string> {
  const actorId = signedIn(actor);
  if (!(await auth.systemRoleCodes(actorId)).includes("ICPDP_OFFICER")) {
    throw new DomainError("ICPDP officer role required", "forbidden");
  }
  return actorId;
}

// Sinh viên gửi khiếu nại về một CLB hoặc sự kiện
/** UC50: khiếu nại luôn đến ICPDP trước (BR38); CLB được chọn, sự kiện là tuỳ chọn. */
export async function submitComplaint(repo: ComplaintRepository, actor: AccessActor | null, input: ComplaintInput, now: Date) {
  const studentId = signedIn(actor);
  if (!COMPLAINT_TYPES.includes(input.type)) throw new DomainError("invalid complaint type", "validation", { field: "type" });
  const description = complaintText(input.description, "description");
  const evidence = normalizeEvidence(input.evidence);
  const club = await repo.club(id(input.clubId, "club id"));
  if (!club || club.state === "Dissolved") throw new DomainError("club not found", "not_found");
  if (input.eventId && !await repo.eventBelongsToClub(id(input.eventId, "event id"), input.clubId)) {
    throw new DomainError("the event does not belong to this club", "validation", { field: "eventId" });
  }
  return repo.submit({ ...input, description, evidence, studentId, now });
}

// Sinh viên xem các khiếu nại của mình
export async function listMyComplaints(repo: ComplaintRepository, actor: AccessActor | null) {
  return repo.listMine(signedIn(actor));
}

// Sinh viên rút khiếu nại chưa được ICPDP quyết định
/** UC50 A1: tác giả rút khiếu nại mà ICPDP chưa quyết định. */
export async function withdrawComplaint(repo: ComplaintRepository, actor: AccessActor | null, complaintId: string, now: Date) {
  const withdrawn = await repo.withdraw(signedIn(actor), id(complaintId, "complaint id"), now);
  if (!withdrawn) throw new DomainError("only your own complaint that ICPDP has not decided can be withdrawn", "conflict");
  return withdrawn;
}

// ICPDP xem hàng đợi khiếu nại, lọc theo trạng thái
export async function listComplaintQueue(repo: ComplaintRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, state?: string) {
  await officer(auth, actor);
  if (state && !COMPLAINT_STATES.includes(state as ComplaintState)) throw new DomainError("invalid state", "validation");
  return repo.queue(state ? { state: state as ComplaintState } : {});
}

// ICPDP xem chi tiết một khiếu nại
export async function getComplaintForIcpdp(repo: ComplaintRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, complaintId: string) {
  await officer(auth, actor);
  const found = await repo.findForIcpdp(id(complaintId, "complaint id"));
  if (!found) throw new DomainError("complaint not found", "not_found");
  return found;
}

// ICPDP quyết định khiếu nại (bác bỏ, chuyển CLB, leo thang, đóng)
/** UC51: mở, phân loại (Dismissed / Forwarded / Escalated), rồi đóng hoặc leo thang sau khi CLB trả lời. */
export async function decideComplaint(repo: ComplaintRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, complaintId: string, decision: ComplaintDecision, now: Date) {
  const officerId = await officer(auth, actor);
  const current = await repo.findForIcpdp(id(complaintId, "complaint id"));
  if (!current) throw new DomainError("complaint not found", "not_found");
  if (current.linkedComplaintId) {
    throw new DomainError("this complaint follows a linked complaint; decide the linked complaint instead", "conflict");
  }
  return repo.decide(current.id, officerId, assertComplaintDecision(current, decision, now), now);
}

// CLB xem các khiếu nại đã được chuyển tới mình, không lộ người gửi
/** UC52: chỉ các khiếu nại đã chuyển tiếp của CLB này, cho club.complaint.respond, không kèm người khiếu nại (D5). */
export async function listClubComplaints(repo: ComplaintRepository, access: ClubAccessRepository, actor: AccessActor | null,
  clubId: string, now: Date) {
  await assertClubAccess(access, actor, id(clubId, "club id"), "club.complaint.respond", now);
  return repo.clubInbox(clubId);
}

// CLB phản hồi khiếu nại kèm hành động và bằng chứng
export async function respondToComplaint(repo: ComplaintRepository, access: ClubAccessRepository, actor: AccessActor | null,
  clubId: string, complaintId: string, input: Omit<ComplaintClubResponse, "at">, now: Date) {
  await assertClubAccess(access, actor, id(clubId, "club id"), "club.complaint.respond", now);
  const response = { text: complaintText(input.text, "text"), action: complaintText(input.action, "action", 2_000),
    evidence: normalizeEvidence(input.evidence) };
  return repo.respond(clubId, id(complaintId, "complaint id"), actor!.id, response, now);
}

// Đánh dấu các khiếu nại đã chuyển CLB nhưng quá hạn phản hồi
/** Job UC52 E1: idempotent, đánh dấu mỗi khiếu nại chuyển tiếp quá hạn đúng một lần. */
export async function flagOverdueComplaintResponses(repo: ComplaintRepository, now: Date): Promise<number> {
  return repo.flagOverdueResponses(now);
}
