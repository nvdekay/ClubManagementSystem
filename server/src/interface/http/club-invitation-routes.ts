import { Router } from "express";
import { z } from "zod";
import type { ClubAccessRepository } from "../../domain/access.js";
import type { AuthRepository } from "../../domain/auth.js";
import type { ClubInvitationRepository } from "../../domain/club-invitation.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import { listClubInvitations, respondToClubInvitation } from "../../usecase/club-invitation.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export const invitationResponseBody = z.object({
  outcome: z.enum(["Accepted", "Declined"]), responseNote: z.string().max(5_000).optional(),
  responseDetails: z.record(z.string().min(1).max(100), z.union([z.string().max(2_000), z.number().finite()])).optional(),
}).strict();
const path = z.object({ clubId: z.string().regex(/^[0-9a-f]{24}$/i), id: z.string().regex(/^[0-9a-f]{24}$/i).optional() });
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new DomainError("invalid invitation request", "validation", parsed.error.issues);
  return parsed.data;
}
export function clubInvitationRoutes(deps: { repo: ClubInvitationRepository; access: ClubAccessRepository;
  authRepo: AuthRepository; sessions: SessionService }): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };
  router.get("/clubs/:clubId/invitations", authGuard(guard, false), async (req, res) => {
    const { clubId } = parse(path, req.params);
    ok(res, await listClubInvitations(deps.repo, deps.access, res.locals.actor as AccessActor, clubId, new Date()));
  });
  router.post("/clubs/:clubId/invitations/:id/response", authGuard(guard), async (req, res) => {
    const { clubId, id } = parse(path, req.params);
    ok(res, await respondToClubInvitation(deps.repo, deps.access, res.locals.actor as AccessActor, clubId, id!,
      parse(invitationResponseBody, req.body), new Date()));
  });
  return router;
}
