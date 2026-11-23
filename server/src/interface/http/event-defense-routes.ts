import { Router, type Response } from "express";
import { z } from "zod";
import type { ClubAccessRepository } from "../../domain/access.js";
import type { AuthRepository } from "../../domain/auth.js";
import { DomainError } from "../../domain/errors.js";
import {
  MAX_DEFENSE_DURATION_MINUTES,
  MIN_DEFENSE_DURATION_MINUTES,
  type EventDefenseRepository,
} from "../../domain/event-defense.js";
import type { EventProposalReviewRepository } from "../../domain/event-proposal-review.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  cancelEventDefense,
  confirmClubEventDefense,
  decideAfterDefense,
  endEventDefense,
  getClubEventDefense,
  getLiveDefenseSession,
  listAvailableDefenseRooms,
  markDefenseNoShow,
  requestClubDefenseReschedule,
  respondDefenseReschedule,
  saveDefenseNote,
  scheduleEventDefense,
  startEventDefense,
} from "../../usecase/event-defense.js";
import { authGuard } from "./auth-routes.js";
import { eventReviewDecisionBody } from "./event-proposal-review-routes.js";
import { ok } from "./response.js";

export interface EventDefenseRouteDeps {
  repo: EventDefenseRepository;
  reviewRepo: EventProposalReviewRepository;
  accessRepo: ClubAccessRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);

export const defenseRoomsQuery = z.object({
  startAt: z.string().datetime(),
  durationMinutes: z.coerce.number().int().min(MIN_DEFENSE_DURATION_MINUTES).max(MAX_DEFENSE_DURATION_MINUTES),
  excludeDefenseId: id.optional(),
}).strict();

export const defenseScheduleBody = z.object({
  title: z.string().min(1).max(200),
  startAt: z.string().datetime(),
  durationMinutes: z.number().int().min(MIN_DEFENSE_DURATION_MINUTES).max(MAX_DEFENSE_DURATION_MINUTES),
  propertyId: id,
  note: z.string().max(2_000).optional(),
}).strict();

export const defenseReasonBody = z.object({
  reason: z.string().min(1).max(2_000),
}).strict();

export const defenseOptionalReasonBody = z.object({
  reason: z.string().max(2_000).optional(),
}).strict();

export const defenseRespondRescheduleBody = z.object({
  accept: z.boolean(),
  startAt: z.string().datetime().optional(),
  durationMinutes: z.number().int().min(MIN_DEFENSE_DURATION_MINUTES).max(MAX_DEFENSE_DURATION_MINUTES).optional(),
  propertyId: id.optional(),
  note: z.string().max(2_000).optional(),
  reason: z.string().max(2_000).optional(),
}).strict();

export const defenseNoteBody = z.object({
  content: z.string().max(50_000),
}).strict();

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new DomainError("invalid event defense request", "validation", result.error.issues);
  }
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

export function eventDefenseRoutes(deps: EventDefenseRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };

  router.get("/admin/event-defense/rooms", authGuard(guard, false), async (req, res) => {
    const query = parsed(defenseRoomsQuery, req.query);
    ok(
      res,
      await listAvailableDefenseRooms(
        deps.repo,
        deps.authRepo,
        actor(res),
        new Date(query.startAt),
        query.durationMinutes,
        query.excludeDefenseId,
      ),
    );
  });

  router.post("/admin/event-proposals/:id/defense/schedule", authGuard(guard), async (req, res) => {
    const body = parsed(defenseScheduleBody, req.body);
    ok(
      res,
      await scheduleEventDefense(
        deps.repo,
        deps.authRepo,
        actor(res),
        parsed(id, req.params.id),
        {
          title: body.title,
          startAt: new Date(body.startAt),
          durationMinutes: body.durationMinutes,
          propertyId: body.propertyId,
          ...(body.note !== undefined ? { note: body.note } : {}),
        },
        new Date(),
      ),
    );
  });

  router.post("/admin/event-proposals/:id/defense/cancel", authGuard(guard), async (req, res) => {
    const body = parsed(defenseReasonBody, req.body);
    ok(
      res,
      await cancelEventDefense(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id), body.reason, new Date()),
    );
  });

  router.post("/admin/event-proposals/:id/defense/respond-reschedule", authGuard(guard), async (req, res) => {
    const body = parsed(defenseRespondRescheduleBody, req.body);
    ok(
      res,
      await respondDefenseReschedule(
        deps.repo,
        deps.authRepo,
        actor(res),
        parsed(id, req.params.id),
        {
          accept: body.accept,
          ...(body.startAt ? { startAt: new Date(body.startAt) } : {}),
          ...(body.durationMinutes !== undefined ? { durationMinutes: body.durationMinutes } : {}),
          ...(body.propertyId ? { propertyId: body.propertyId } : {}),
          ...(body.note !== undefined ? { note: body.note } : {}),
          ...(body.reason !== undefined ? { reason: body.reason } : {}),
        },
        new Date(),
      ),
    );
  });

  router.post("/admin/event-proposals/:id/defense/start", authGuard(guard), async (req, res) => {
    ok(
      res,
      await startEventDefense(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id), new Date()),
    );
  });

  router.get("/admin/event-proposals/:id/defense/session", authGuard(guard, false), async (req, res) => {
    ok(
      res,
      await getLiveDefenseSession(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id)),
    );
  });

  router.put("/admin/event-proposals/:id/defense/notes", authGuard(guard), async (req, res) => {
    const body = parsed(defenseNoteBody, req.body);
    ok(
      res,
      await saveDefenseNote(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id), body.content, new Date()),
    );
  });

  router.post("/admin/event-proposals/:id/defense/end", authGuard(guard), async (req, res) => {
    ok(
      res,
      await endEventDefense(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id), new Date()),
    );
  });

  router.post("/admin/event-proposals/:id/defense/no-show", authGuard(guard), async (req, res) => {
    const body = parsed(defenseOptionalReasonBody, req.body);
    ok(
      res,
      await markDefenseNoShow(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id), body.reason, new Date()),
    );
  });

  router.post("/admin/event-proposals/:id/defense/decision", authGuard(guard), async (req, res) => {
    const body = parsed(eventReviewDecisionBody, req.body);
    ok(
      res,
      await decideAfterDefense(
        deps.repo,
        deps.reviewRepo,
        deps.authRepo,
        actor(res),
        parsed(id, req.params.id),
        {
          ...body,
          revisionDeadlineAt: body.revisionDeadlineAt ? new Date(body.revisionDeadlineAt) : undefined,
        },
        new Date(),
      ),
    );
  });

  router.get("/clubs/:clubId/events/:id/defense", authGuard(guard, false), async (req, res) => {
    ok(
      res,
      await getClubEventDefense(
        deps.repo,
        deps.accessRepo,
        actor(res),
        parsed(id, req.params.clubId),
        parsed(id, req.params.id),
        new Date(),
      ),
    );
  });

  router.post("/clubs/:clubId/events/:id/defense/confirm", authGuard(guard), async (req, res) => {
    ok(
      res,
      await confirmClubEventDefense(
        deps.repo,
        deps.accessRepo,
        actor(res),
        parsed(id, req.params.clubId),
        parsed(id, req.params.id),
        new Date(),
      ),
    );
  });

  router.post("/clubs/:clubId/events/:id/defense/reschedule-request", authGuard(guard), async (req, res) => {
    const body = parsed(defenseReasonBody, req.body);
    ok(
      res,
      await requestClubDefenseReschedule(
        deps.repo,
        deps.accessRepo,
        actor(res),
        parsed(id, req.params.clubId),
        parsed(id, req.params.id),
        body.reason,
        new Date(),
      ),
    );
  });

  return router;
}
