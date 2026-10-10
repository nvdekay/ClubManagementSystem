import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import type { BookingReviewRepository } from "../../domain/booking-review.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  claimBookingReview, decideBookingReview, getBookingReview, listBookingReviews,
} from "../../usecase/booking-review.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface BookingReviewRouteDeps {
  repo: BookingReviewRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
export const bookingDecisionBody = z.object({
  outcome: z.enum(["Request revision", "Approve", "Reject"]),
  reason: z.string().max(5_000).optional(),
  reviewNote: z.string().max(5_000).optional(),
  alternative: z.object({
    propertyId: id.optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
  }).strict().optional(),
}).strict();

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid booking review request", "validation", result.error.issues);
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

export function bookingReviewRoutes(deps: BookingReviewRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };

  router.get("/admin/bookings", authGuard(guard, false), async (_req, res) => {
    ok(res, await listBookingReviews(deps.repo, deps.authRepo, actor(res)));
  });
  router.get("/admin/bookings/:id", authGuard(guard, false), async (req, res) => {
    ok(res, await getBookingReview(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id), new Date()));
  });
  router.post("/admin/bookings/:id/claim", authGuard(guard), async (req, res) => {
    ok(res, await claimBookingReview(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id), new Date()));
  });
  router.post("/admin/bookings/:id/decision", authGuard(guard), async (req, res) => {
    const body = parsed(bookingDecisionBody, req.body);
    const alternative = body.alternative && { propertyId: body.alternative.propertyId,
      startAt: body.alternative.startAt ? new Date(body.alternative.startAt) : undefined,
      endAt: body.alternative.endAt ? new Date(body.alternative.endAt) : undefined };
    ok(res, await decideBookingReview(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id),
      { ...body, alternative }, new Date()));
  });

  return router;
}
