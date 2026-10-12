import { Router, type Response } from "express";
import { z } from "zod";
import type { ClubAccessRepository } from "../../domain/access.js";
import type { AuthRepository } from "../../domain/auth.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import { feedbackCategories, MAX_FEEDBACK_MESSAGE, type StudentFeedbackRepository } from "../../domain/student-feedback.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  listClubFeedbackInbox,
  listIcpdpFeedbackInbox,
  listMyStudentFeedback,
  sendStudentFeedback,
} from "../../usecase/student-feedback.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface StudentFeedbackRouteDeps {
  repo: StudentFeedbackRepository;
  accessRepo: ClubAccessRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
export const studentFeedbackBody = z.object({
  recipient: z.enum(["CLUB", "ICPDP"]),
  clubId: id.optional(),
  eventId: id.optional(),
  category: z.enum(feedbackCategories),
  message: z.string().max(MAX_FEEDBACK_MESSAGE * 2),
  isAnonymous: z.boolean().optional(),
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

export function studentFeedbackRoutes(deps: StudentFeedbackRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };
  router.post("/student-feedback", authGuard(guard), async (req, res) => {
    const body = parsed(studentFeedbackBody, req.body);
    ok(res, await sendStudentFeedback(deps.repo, actor(res), { ...body, isAnonymous: body.isAnonymous ?? false },
      new Date()), 201);
  });
  router.get("/student-feedback/mine", authGuard(guard, false), async (_req, res) => {
    ok(res, await listMyStudentFeedback(deps.repo, actor(res)));
  });
  router.get("/clubs/:clubId/student-feedback", authGuard(guard, false), async (req, res) => {
    ok(res, await listClubFeedbackInbox(deps.repo, deps.accessRepo, actor(res), parsed(id, req.params.clubId),
      new Date()));
  });
  router.get("/admin/student-feedback", authGuard(guard, false), async (_req, res) => {
    ok(res, await listIcpdpFeedbackInbox(deps.repo, deps.authRepo, actor(res)));
  });
  return router;
}
