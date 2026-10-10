import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import {
  LIFECYCLE_LINKS, MAX_CORRECTIVE_ACTIONS, VIOLATION_ORIGINS, VIOLATION_SEVERITIES,
  type ViolationRepository, type ViolationStep,
} from "../../domain/violation.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  applyViolationCaseStep, getViolation, getViolationSources, listViolations, openViolation,
} from "../../usecase/violation.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface ViolationRouteDeps {
  repo: ViolationRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
const evidence = z.object({ note: z.string().max(1_000), url: z.string().max(500).optional() }).strict();
const future = z.string().datetime();

export const violationOpenBody = z.object({
  clubId: id,
  originType: z.enum(VIOLATION_ORIGINS),
  originRefId: id.optional(),
  severity: z.enum(VIOLATION_SEVERITIES),
  title: z.string().min(1).max(200),
  description: z.string().max(5_000).optional(),
  evidence: z.array(evidence).max(20).optional(),
}).strict();

export const violationStepBody = z.discriminatedUnion("type", [
  z.object({ type: z.literal("investigate") }).strict(),
  z.object({ type: z.literal("addEvidence"), evidence }).strict(),
  z.object({ type: z.literal("requestResponse"), message: z.string().max(2_000), dueAt: future.optional() }).strict(),
  z.object({ type: z.literal("recordResponse"), text: z.string().max(5_000).optional(),
    noResponse: z.boolean().optional() }).strict(),
  z.object({ type: z.literal("decide"), finding: z.enum(["VIOLATION", "NO_VIOLATION"]), reason: z.string().max(5_000),
    evidence: z.array(evidence).max(20).optional() }).strict(),
  z.object({ type: z.literal("addActions"), actions: z.array(z.object({
    description: z.string().max(1_000), dueAt: future, linkedLifecycleAction: z.enum(LIFECYCLE_LINKS).optional(),
  }).strict()).min(1).max(MAX_CORRECTIVE_ACTIONS) }).strict(),
  z.object({ type: z.literal("verifyAction"), actionId: id, outcome: z.enum(["Verified", "Failed"]),
    note: z.string().max(1_000).optional() }).strict(),
  z.object({ type: z.literal("resolve"), note: z.string().max(1_000).optional() }).strict(),
]);

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid violation request", "validation", result.error.issues);
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

function step(body: z.infer<typeof violationStepBody>): ViolationStep {
  switch (body.type) {
    case "requestResponse": return { ...body, dueAt: body.dueAt ? new Date(body.dueAt) : undefined };
    case "addActions": return { ...body, actions: body.actions.map((item) => ({ ...item, dueAt: new Date(item.dueAt) })) };
    default: return body;
  }
}

export function violationRoutes(deps: ViolationRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };

  router.get("/admin/violations", authGuard(guard, false), async (_req, res) => {
    ok(res, await listViolations(deps.repo, deps.authRepo, actor(res)));
  });
  router.get("/admin/violations/sources/:clubId", authGuard(guard, false), async (req, res) => {
    ok(res, await getViolationSources(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.clubId)));
  });
  router.get("/admin/violations/:id", authGuard(guard, false), async (req, res) => {
    ok(res, await getViolation(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id), new Date()));
  });
  router.post("/admin/violations", authGuard(guard), async (req, res) => {
    ok(res, await openViolation(deps.repo, deps.authRepo, actor(res), parsed(violationOpenBody, req.body), new Date()), 201);
  });
  router.post("/admin/violations/:id/steps", authGuard(guard), async (req, res) => {
    ok(res, await applyViolationCaseStep(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id),
      step(parsed(violationStepBody, req.body)), new Date()));
  });

  return router;
}
