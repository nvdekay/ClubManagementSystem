import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import { DomainError } from "../../domain/errors.js";
import {
  EVENT_REVIEW_SECTIONS, MAX_APPROVAL_CONDITIONS, type EventProposalReviewRepository,
} from "../../domain/event-proposal-review.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  claimEventProposalReview, decideEventCancellationReview, decideEventProposalReview, getEventProposalReview, listEventProposalReviews,
} from "../../usecase/event-proposal-review.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface EventProposalReviewRouteDeps {
  repo: EventProposalReviewRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
export const eventReviewDecisionBody = z.object({
  outcome: z.enum(["Request revision", "Approve", "Reject", "Re-defense"]),
  reason: z.string().max(5_000).optional(),
  sections: z.array(z.enum(EVENT_REVIEW_SECTIONS)).max(EVENT_REVIEW_SECTIONS.length).optional(),
  reviewNote: z.string().max(10_000).optional(),
  revisionDeadlineAt: z.string().datetime().optional(),
  conditions: z.array(z.string().max(500)).max(MAX_APPROVAL_CONDITIONS).optional(),
  budgetLines: z.array(z.object({
    fundingDecision: z.enum(["NOT_SPONSORED", "BEFORE_EVENT", "AFTER_EVENT"]),
    approvedAmount: z.number().int().min(0),
    reason: z.string().max(500).optional(),
  }).strict()).max(50).optional(),
}).strict();

export const eventCancellationDecisionBody = z.object({
  approve: z.boolean(),
  reason: z.string().max(5_000).optional(),
}).strict();

// Kiểm tra dữ liệu vào bằng zod, sai thì ném DomainError validation
function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new DomainError("invalid event proposal review request", "validation", result.error.issues);
  }
  return result.data;
}

// Lấy actor đã xác thực từ res.locals, thiếu thì báo unauthorized
function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

// Mount các route ICPDP duyệt đề xuất sự kiện
export function eventProposalReviewRoutes(deps: EventProposalReviewRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };

  // ICPDP liệt kê hàng đợi duyệt đề xuất sự kiện
  router.get("/admin/event-proposals", authGuard(guard, false), async (_req, res) => {
    ok(res, await listEventProposalReviews(deps.repo, deps.authRepo, actor(res)));
  });
  // ICPDP xem chi tiết một đề xuất sự kiện
  router.get("/admin/event-proposals/:id", authGuard(guard, false), async (req, res) => {
    ok(res, await getEventProposalReview(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id), new Date()));
  });
  // ICPDP nhận xử lý (claim) một đề xuất
  router.post("/admin/event-proposals/:id/claim", authGuard(guard), async (req, res) => {
    ok(res, await claimEventProposalReview(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id), new Date()));
  });
  // ICPDP ghi quyết định duyệt đề xuất sự kiện
  router.post("/admin/event-proposals/:id/decision", authGuard(guard), async (req, res) => {
    const body = parsed(eventReviewDecisionBody, req.body);
    ok(res, await decideEventProposalReview(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id), {
      ...body, revisionDeadlineAt: body.revisionDeadlineAt ? new Date(body.revisionDeadlineAt) : undefined,
    }, new Date()));
  });
  // ICPDP quyết định yêu cầu huỷ sự kiện đã được duyệt
  router.post("/admin/event-proposals/:id/cancellation-decision", authGuard(guard), async (req, res) => {
    const body = parsed(eventCancellationDecisionBody, req.body);
    ok(res, await decideEventCancellationReview(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id), body, new Date()));
  });

  return router;
}
