import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import { DomainError } from "../../domain/errors.js";
import type { EventRegistrationRepository } from "../../domain/event-registration.js";
import type { PolicyRepository } from "../../domain/policy.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  cancelEventRegistration,
  getEventRegistrationContext,
  listMyEventRegistrations,
  registerForEvent,
} from "../../usecase/event-registration.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface EventRegistrationRouteDeps {
  repo: EventRegistrationRepository;
  policy: PolicyRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
const answer = z.union([z.string().max(2_000), z.array(z.string().max(2_000)).max(30)]);
export const eventRegistrationBody = z.object({
  answers: z.record(z.string().regex(/^[a-z][a-z0-9_]{0,49}$/), answer).default({}),
}).strict();

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid event registration request", "validation",
    result.error.issues);
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

export function eventRegistrationRoutes(deps: EventRegistrationRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };
  router.get("/events/:id/registration", authGuard(guard, false), async (req, res) => {
    ok(res, await getEventRegistrationContext(deps.repo, actor(res),
      parsed(id, req.params.id), new Date()));
  });
  router.post("/events/:id/registrations", authGuard(guard), async (req, res) => {
    const body = parsed(eventRegistrationBody, req.body);
    ok(res, await registerForEvent(deps.repo, deps.policy, actor(res),
      parsed(id, req.params.id), body.answers ?? {}, new Date()), 201);
  });
  router.get("/event-registrations/mine", authGuard(guard, false), async (_req, res) => {
    ok(res, await listMyEventRegistrations(deps.repo, actor(res)));
  });
  router.post("/event-registrations/:id/cancel", authGuard(guard), async (req, res) => {
    ok(res, await cancelEventRegistration(deps.repo, actor(res),
      parsed(id, req.params.id), new Date()));
  });
  return router;
}
