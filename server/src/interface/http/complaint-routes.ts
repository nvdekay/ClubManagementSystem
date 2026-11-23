import { Router, type Response } from "express";
import { z } from "zod";
import type { ClubAccessRepository } from "../../domain/access.js";
import type { AuthRepository } from "../../domain/auth.js";
import {
  COMPLAINT_STATES, COMPLAINT_TYPES, MAX_COMPLAINT_EVIDENCE, MAX_COMPLAINT_TEXT, TRIAGE_OUTCOMES, TRIAGE_VALIDITIES,
  type ComplaintDecision, type ComplaintRepository,
} from "../../domain/complaint.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import { VIOLATION_SEVERITIES } from "../../domain/violation.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  decideComplaint, getComplaintForIcpdp, listClubComplaints, listComplaintQueue, listMyComplaints, respondToComplaint,
  submitComplaint, withdrawComplaint,
} from "../../usecase/complaint.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface ComplaintRouteDeps {
  repo: ComplaintRepository;
  accessRepo: ClubAccessRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
const evidence = z.array(z.object({ label: z.string().max(120), url: z.string().max(500) }).strict()).max(MAX_COMPLAINT_EVIDENCE);
export const complaintBody = z.object({
  clubId: id, eventId: id.optional(), type: z.enum(COMPLAINT_TYPES),
  description: z.string().max(MAX_COMPLAINT_TEXT * 2), evidence: evidence.optional(),
}).strict();
export const complaintQuery = z.object({ state: z.enum(COMPLAINT_STATES).optional() }).strict();
export const complaintTriageBody = z.object({
  outcome: z.enum(TRIAGE_OUTCOMES), severity: z.enum(VIOLATION_SEVERITIES), validity: z.enum(TRIAGE_VALIDITIES),
  reason: z.string().max(4_000), responseDueAt: z.string().datetime().optional(),
}).strict();
export const complaintCloseBody = z.object({ reason: z.string().max(4_000) }).strict();
export const complaintLinkBody = z.object({ targetId: id, reason: z.string().max(4_000) }).strict();
export const complaintEscalateBody = z.object({ reason: z.string().max(4_000), severity: z.enum(VIOLATION_SEVERITIES) }).strict();
export const complaintResponseBody = z.object({
  text: z.string().max(MAX_COMPLAINT_TEXT * 2), action: z.string().max(4_000), evidence: evidence.optional(),
}).strict();

// Kiểm tra dữ liệu vào bằng zod, sai thì ném DomainError validation
function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid complaint request", "validation", result.error.issues);
  return result.data;
}

// Lấy actor đã xác thực từ res.locals, thiếu thì báo unauthorized
function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

// Mount các route khiếu nại của sinh viên, ICPDP và CLB
export function complaintRoutes(deps: ComplaintRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };
  function decide(res: Response, complaintId: unknown, decision: ComplaintDecision) {
    return decideComplaint(deps.repo, deps.authRepo, actor(res), parsed(id, complaintId), decision, new Date());
  }

  // Sinh viên gửi khiếu nại
  // UC50 — Student
  router.post("/complaints", authGuard(guard), async (req, res) => {
    const body = parsed(complaintBody, req.body);
    ok(res, await submitComplaint(deps.repo, actor(res), { ...body, evidence: body.evidence ?? [] }, new Date()), 201);
  });
  // Liệt kê khiếu nại của tôi
  router.get("/complaints/mine", authGuard(guard, false), async (_req, res) => {
    ok(res, await listMyComplaints(deps.repo, actor(res)));
  });
  // Sinh viên rút khiếu nại
  router.post("/complaints/:id/withdraw", authGuard(guard), async (req, res) => {
    ok(res, await withdrawComplaint(deps.repo, actor(res), parsed(id, req.params.id), new Date()));
  });

  // ICPDP liệt kê hàng đợi khiếu nại
  // UC51 — ICPDP
  router.get("/admin/complaints", authGuard(guard, false), async (req, res) => {
    ok(res, await listComplaintQueue(deps.repo, deps.authRepo, actor(res), parsed(complaintQuery, req.query).state));
  });
  // ICPDP xem chi tiết khiếu nại
  router.get("/admin/complaints/:id", authGuard(guard, false), async (req, res) => {
    ok(res, await getComplaintForIcpdp(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id)));
  });
  // ICPDP mở xử lý khiếu nại
  router.post("/admin/complaints/:id/open", authGuard(guard), async (req, res) => {
    ok(res, await decide(res, req.params.id, { kind: "open" }));
  });
  // ICPDP phân loại (triage) khiếu nại
  router.post("/admin/complaints/:id/triage", authGuard(guard), async (req, res) => {
    const body = parsed(complaintTriageBody, req.body);
    ok(res, await decide(res, req.params.id, { kind: "triage", ...body,
      responseDueAt: body.responseDueAt ? new Date(body.responseDueAt) : undefined }));
  });
  // ICPDP liên kết khiếu nại với hồ sơ liên quan
  router.post("/admin/complaints/:id/link", authGuard(guard), async (req, res) => {
    ok(res, await decide(res, req.params.id, { kind: "link", ...parsed(complaintLinkBody, req.body) }));
  });
  // ICPDP đóng khiếu nại
  router.post("/admin/complaints/:id/close", authGuard(guard), async (req, res) => {
    ok(res, await decide(res, req.params.id, { kind: "close", ...parsed(complaintCloseBody, req.body) }));
  });
  // ICPDP chuyển khiếu nại lên cấp xử lý cao hơn
  router.post("/admin/complaints/:id/escalate", authGuard(guard), async (req, res) => {
    ok(res, await decide(res, req.params.id, { kind: "escalate", ...parsed(complaintEscalateBody, req.body) }));
  });

  // Liệt kê khiếu nại liên quan đến CLB
  // UC52 — Club
  router.get("/clubs/:clubId/complaints", authGuard(guard, false), async (req, res) => {
    ok(res, await listClubComplaints(deps.repo, deps.accessRepo, actor(res), parsed(id, req.params.clubId), new Date()));
  });
  // CLB phản hồi khiếu nại
  router.post("/clubs/:clubId/complaints/:id/response", authGuard(guard), async (req, res) => {
    const body = parsed(complaintResponseBody, req.body);
    ok(res, await respondToComplaint(deps.repo, deps.accessRepo, actor(res), parsed(id, req.params.clubId),
      parsed(id, req.params.id), { ...body, evidence: body.evidence ?? [] }, new Date()));
  });
  return router;
}
