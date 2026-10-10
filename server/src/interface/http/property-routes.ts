import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import { DomainError } from "../../domain/errors.js";
import type { PropertyDetails, PropertyRepository } from "../../domain/property.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  createProperty, deleteProperty, listProperties, setPropertyActive, updateProperty,
} from "../../usecase/property.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface PropertyRouteDeps {
  repo: PropertyRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
const hoursBody = z.object({
  day: z.number().int(), open: z.string().max(5), close: z.string().max(5),
}).strict();
const blackoutBody = z.object({
  startAt: z.string().datetime({ offset: true }), endAt: z.string().datetime({ offset: true }),
  reason: z.string().max(200),
}).strict();
export const propertyDetailsBody = z.object({
  name: z.string().max(120), location: z.string().max(200),
  capacity: z.number().int().optional(),
  equipment: z.array(z.string().max(60)).max(30),
  bookableHours: z.array(hoursBody).max(7),
  blackouts: z.array(blackoutBody).max(50),
}).strict();
export const propertyCreateBody = propertyDetailsBody.extend({
  type: z.enum(["ROOM", "HALL", "EQUIPMENT"]),
}).strict();
export const propertyActivationBody = z.object({ isActive: z.boolean() }).strict();

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid property request", "validation", result.error.issues);
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

function details(body: z.infer<typeof propertyDetailsBody>): PropertyDetails {
  return { ...body, blackouts: body.blackouts.map((blackout) => ({ ...blackout,
    startAt: new Date(blackout.startAt), endAt: new Date(blackout.endAt) })) };
}

export function propertyRoutes(deps: PropertyRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };

  router.get("/admin/properties", authGuard(guard, false), async (_req, res) => {
    ok(res, await listProperties(deps.repo, deps.authRepo, actor(res)));
  });
  router.post("/admin/properties", authGuard(guard), async (req, res) => {
    const body = parsed(propertyCreateBody, req.body);
    ok(res, await createProperty(deps.repo, deps.authRepo, actor(res),
      { ...details(body), type: body.type }, new Date()), 201);
  });
  router.patch("/admin/properties/:id", authGuard(guard), async (req, res) => {
    ok(res, await updateProperty(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id),
      details(parsed(propertyDetailsBody, req.body)), new Date()));
  });
  router.post("/admin/properties/:id/activation", authGuard(guard), async (req, res) => {
    ok(res, await setPropertyActive(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id),
      parsed(propertyActivationBody, req.body).isActive, new Date()));
  });
  router.delete("/admin/properties/:id", authGuard(guard), async (req, res) => {
    ok(res, await deleteProperty(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id), new Date()));
  });

  return router;
}
