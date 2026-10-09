import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import { DomainError } from "../../domain/errors.js";
import { MAX_COMMENT_LENGTH, MAX_RATING, MIN_RATING, type EventFeedbackRepository } from "../../domain/event-feedback.js";
import type { PolicyRepository } from "../../domain/policy.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import { getEventFeedbackContext, listMyEventFeedback, submitEventFeedback } from "../../usecase/event-feedback.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface EventFeedbackRouteDeps {
  repo: EventFeedbackRepository;
  policy: PolicyRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
export const eventFeedbackBody = z.object({
  rating: z.number().int().min(MIN_RATING).max(MAX_RATING),
  comment: z.string().max(MAX_COMMENT_LENGTH * 2),
  isAnonymous: z.boolean().default(false),
}).strict();

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid feedback request", "validation", result.error.issues);
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

export function eventFeedbackRoutes(deps: EventFeedbackRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };
  router.get("/events/:id/feedback", authGuard(guard, false), async (req, res) => {
    ok(res, await getEventFeedbackContext(deps.repo, deps.policy, actor(res), parsed(id, req.params.id), new Date()));
  });
  router.post("/events/:id/feedback", authGuard(guard), async (req, res) => {
    const body = parsed(eventFeedbackBody, req.body);
    ok(res, await submitEventFeedback(deps.repo, deps.policy, actor(res), parsed(id, req.params.id),
      { ...body, isAnonymous: body.isAnonymous ?? false }, new Date()), 201);
  });
  router.get("/event-feedbacks/mine", authGuard(guard, false), async (_req, res) => {
    ok(res, await listMyEventFeedback(deps.repo, actor(res)));
  });
  return router;
}
