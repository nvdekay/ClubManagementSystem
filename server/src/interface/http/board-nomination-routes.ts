import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import type { BoardNominationRepository } from "../../domain/board-nomination.js";
import type { ClubAccessRepository } from "../../domain/access.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  claimBoardNomination,
  decideBoardNomination,
  getBoardNomination,
  getBoardNominationContext,
  listBoardNominations,
  submitBoardNomination,
} from "../../usecase/board-nomination.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface BoardNominationRouteDeps {
  repo: BoardNominationRepository;
  accessRepo: ClubAccessRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
export const boardNominationBody = z.object({
  seats: z.array(z.object({ positionId: id, membershipId: id }).strict()).min(1).max(30),
}).strict();
export const boardNominationDecisionBody = z.object({
  confirmedSeatIds: z.array(id).max(30),
  returnedSeats: z.array(z.object({ seatId: id, reason: z.string().trim().min(1).max(5_000) }).strict()).max(30),
  reason: z.string().trim().max(5_000).optional(),
}).strict();

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid board nomination request", "validation",
    result.error.issues);
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

export function boardNominationRoutes(deps: BoardNominationRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };
  router.get("/clubs/:clubId/board-nomination-context", authGuard(guard, false), async (req, res) => {
    ok(res, await getBoardNominationContext(deps.repo, deps.accessRepo, actor(res),
      parsed(id, req.params.clubId), new Date()));
  });
  router.post("/clubs/:clubId/board-nominations", authGuard(guard), async (req, res) => {
    const body = parsed(boardNominationBody, req.body);
    ok(res, await submitBoardNomination(deps.repo, deps.accessRepo, actor(res),
      parsed(id, req.params.clubId), body.seats, new Date()), 201);
  });
  router.get("/admin/board-nominations", authGuard(guard, false), async (_req, res) => {
    ok(res, await listBoardNominations(deps.repo, deps.authRepo, actor(res)));
  });
  router.get("/admin/board-nominations/:id", authGuard(guard, false), async (req, res) => {
    ok(res, await getBoardNomination(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id)));
  });
  router.post("/admin/board-nominations/:id/claim", authGuard(guard), async (req, res) => {
    ok(res, await claimBoardNomination(deps.repo, deps.authRepo, actor(res),
      parsed(id, req.params.id), new Date()));
  });
  router.post("/admin/board-nominations/:id/decision", authGuard(guard), async (req, res) => {
    ok(res, await decideBoardNomination(deps.repo, deps.authRepo, actor(res),
      parsed(id, req.params.id), parsed(boardNominationDecisionBody, req.body), new Date()));
  });
  return router;
}
