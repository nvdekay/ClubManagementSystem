import { Router } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import { DomainError } from "../../domain/errors.js";
import type { MembershipReconfirmationRepository } from "../../domain/membership-reconfirmation.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import { confirmMembership, myReconfirmations } from "../../usecase/membership-reconfirmation.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";
// Mount các route xác nhận lại tư cách thành viên
export function membershipReconfirmationRoutes(deps: { repo: MembershipReconfirmationRepository; authRepo: AuthRepository; sessions: SessionService }): Router {
  const r = Router(); const guard = { repo: deps.authRepo, sessions: deps.sessions };
  // Liệt kê yêu cầu xác nhận lại thành viên của tôi
  r.get("/memberships/reconfirmations/mine", authGuard(guard, false), async (_req, res) => { ok(res, await myReconfirmations(deps.repo, res.locals.actor as AccessActor)); });
  // Thành viên xác nhận lại tư cách của mình
  r.post("/memberships/reconfirmations/:id/confirm", authGuard(guard), async (req, res) => {
    const id = z.string().regex(/^[0-9a-f]{24}$/i).safeParse(req.params.id);
    if (!id.success) throw new DomainError("invalid reconfirmation id", "validation");
    ok(res, await confirmMembership(deps.repo, res.locals.actor as AccessActor, id.data, new Date()));
  });
  return r;
}
