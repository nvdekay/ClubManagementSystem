import { Router } from "express";
import { z } from "zod";
import type { ClubAccessRepository } from "../../domain/access.js";
import type { AuthRepository } from "../../domain/auth.js";
import type { ClubEvaluationRepository } from "../../domain/club-evaluation.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import { publishedClubEvaluations } from "../../usecase/club-evaluation.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";
export function clubEvaluationRoutes(deps: { repo: ClubEvaluationRepository; access: ClubAccessRepository; authRepo: AuthRepository; sessions: SessionService }): Router {
  const r = Router(); const guard = { repo: deps.authRepo, sessions: deps.sessions };
  r.get("/clubs/:clubId/evaluations", authGuard(guard, false), async (req, res) => {
    const club = z.string().regex(/^[0-9a-f]{24}$/i).safeParse(req.params.clubId); if (!club.success) throw new DomainError("invalid club id", "validation");
    ok(res, await publishedClubEvaluations(deps.repo, deps.access, res.locals.actor as AccessActor, club.data, new Date()));
  });
  return r;
}
