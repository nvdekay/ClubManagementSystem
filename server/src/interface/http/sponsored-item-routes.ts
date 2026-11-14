import { Router, raw } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import type { SessionService } from "../../domain/session.js";
import { DomainError } from "../../domain/errors.js";
import type { AccessActor } from "../../usecase/access.js";
import { actOnSponsoredItem, getSponsoredBudget, invoiceImageUrl, uploadInvoiceImage,
  type SponsoredItemDeps } from "../../usecase/sponsored-item.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export const sponsoredActionBody = z.object({
  revision: z.number().int().nonnegative(),
  action: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("save"), amount: z.number().int().positive(), description: z.string().max(2000) }).strict(),
    z.object({ kind: z.literal("removeImage"), imageId: z.string().uuid() }).strict(),
    z.object({ kind: z.literal("submit") }).strict(),
    z.object({ kind: z.literal("return"), reason: z.string().min(1).max(2000) }).strict(),
    z.object({ kind: z.literal("review"), validAmount: z.number().int().nonnegative(), reason: z.string().min(1).max(2000) }).strict(),
    z.object({ kind: z.literal("pay"), amount: z.number().int().positive(), paidAt: z.string().datetime(), paymentReference: z.string().min(1).max(200) }).strict(),
  ]),
}).strict();

export function sponsoredItemRoutes(deps: SponsoredItemDeps & { authRepo: AuthRepository; sessions: SessionService }) {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };
  for (const base of ["/clubs/:clubId/budgets/:id/items", "/admin/budgets/:id/items"]) {
    router.get(base, authGuard(guard, false), async (req, res) => {
      ok(res, await getSponsoredBudget(deps, res.locals.actor as AccessActor, String(req.params.id), req.params.clubId as string | undefined, new Date()));
    });
    router.post(`${base}/:itemId/actions`, authGuard(guard), async (req, res) => {
      const body = sponsoredActionBody.safeParse(req.body);
      if (!body.success) throw new DomainError("invalid sponsored item action", "validation", body.error.issues);
      ok(res, await actOnSponsoredItem(deps, res.locals.actor as AccessActor, String(req.params.id),
        req.params.clubId as string | undefined, String(req.params.itemId), body.data.revision, body.data.action, new Date()));
    });
    router.get(`${base}/:itemId/images/:imageId`, authGuard(guard, false), async (req, res) => {
      ok(res, await invoiceImageUrl(deps, res.locals.actor as AccessActor, String(req.params.id),
        req.params.clubId as string | undefined, String(req.params.itemId), String(req.params.imageId), new Date()));
    });
  }
  router.post("/clubs/:clubId/budgets/:id/items/:itemId/images", authGuard(guard),
    raw({ type: () => true, limit: "5mb" }), async (req, res) => {
      const revision = Number(req.query.revision);
      if (!Number.isInteger(revision) || revision < 0 || !Buffer.isBuffer(req.body)) throw new DomainError("invalid image upload", "validation");
      ok(res, await uploadInvoiceImage(deps, res.locals.actor as AccessActor, String(req.params.id),
        String(req.params.clubId), String(req.params.itemId), revision,
        { fileName: String(req.query.fileName ?? ""), mimeType: req.header("content-type") ?? "", bytes: req.body }, new Date()));
    });
  return router;
}
