import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import { DomainError } from "../../domain/errors.js";
import type { PolicyRepository } from "../../domain/policy.js";
import { MAX_INVITED_CLUBS, type SchoolEventRepository } from "../../domain/school-event.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  checkSchoolEventConflicts, createSchoolEvent, getSchoolEvent, inviteClubs, listSchoolEvents, publishSchoolEvent,
  withdrawInvitation,
} from "../../usecase/school-event.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface SchoolEventRouteDeps {
  repo: SchoolEventRepository;
  policy: PolicyRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
const clubIds = z.array(id).max(MAX_INVITED_CLUBS);

export const schoolEventBody = z.object({
  title: z.string().min(1).max(200),
  objective: z.string().max(5_000).optional(),
  coordination: z.string().max(5_000).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  venueText: z.string().max(200).optional(),
  propertyId: id.optional(),
  capacity: z.number().int().min(1).max(100_000),
  invitationDeadline: z.string().datetime().optional(),
  clubIds: clubIds.optional(),
  allActiveClubs: z.boolean().optional(),
}).strict();

export const schoolEventInviteBody = z.object({
  clubIds: clubIds.optional(),
  allActiveClubs: z.boolean().optional(),
  deadline: z.string().datetime().optional(),
}).strict();

export const schoolEventConflictQuery = z.object({
  propertyId: id.optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
}).strict();

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid school event request", "validation", result.error.issues);
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

function date(value: string | undefined): Date | undefined {
  return value ? new Date(value) : undefined;
}

export function schoolEventRoutes(deps: SchoolEventRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };

  router.get("/admin/school-events", authGuard(guard, false), async (_req, res) => {
    ok(res, await listSchoolEvents(deps.repo, deps.authRepo, actor(res)));
  });
  router.get("/admin/school-events/conflicts", authGuard(guard, false), async (req, res) => {
    const query = parsed(schoolEventConflictQuery, req.query);
    ok(res, await checkSchoolEventConflicts(deps.repo, deps.authRepo, actor(res),
      { propertyId: query.propertyId, startAt: new Date(query.startAt), endAt: new Date(query.endAt) }));
  });
  router.get("/admin/school-events/:id", authGuard(guard, false), async (req, res) => {
    ok(res, await getSchoolEvent(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id)));
  });
  router.post("/admin/school-events", authGuard(guard), async (req, res) => {
    const body = parsed(schoolEventBody, req.body);
    ok(res, await createSchoolEvent(deps.repo, deps.policy, deps.authRepo, actor(res), { ...body,
      startAt: new Date(body.startAt), endAt: new Date(body.endAt), invitationDeadline: date(body.invitationDeadline) },
    new Date()), 201);
  });
  router.post("/admin/school-events/:id/invitations", authGuard(guard), async (req, res) => {
    const body = parsed(schoolEventInviteBody, req.body);
    ok(res, await inviteClubs(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id),
      { ...body, deadline: date(body.deadline) }, new Date()));
  });
  router.post("/admin/school-events/:id/invitations/:invitationId/withdraw", authGuard(guard), async (req, res) => {
    ok(res, await withdrawInvitation(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id),
      parsed(id, req.params.invitationId), new Date()));
  });
  router.post("/admin/school-events/:id/publish", authGuard(guard), async (req, res) => {
    ok(res, await publishSchoolEvent(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id), new Date()));
  });

  return router;
}
