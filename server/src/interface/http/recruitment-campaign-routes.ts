import { Router, type Response } from "express";
import { z } from "zod";
import type { ClubAccessRepository } from "../../domain/access.js";
import type { AuthRepository } from "../../domain/auth.js";
import type { PolicyRepository } from "../../domain/policy.js";
import type { RecruitmentCampaignRepository } from "../../domain/recruitment-campaign.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  cancelRecruitmentCampaign, createRecruitmentCampaignDraft, getRecruitmentCampaign,
  listRecruitmentCampaigns, publishRecruitmentCampaign, updateRecruitmentCampaignDraft,
} from "../../usecase/recruitment-campaign.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface RecruitmentCampaignRouteDeps {
  repo: RecruitmentCampaignRepository;
  accessRepo: ClubAccessRepository;
  policy: PolicyRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
const selectionStep = z.object({
  name: z.string().max(100), description: z.string().max(2_000).optional(),
  startsAt: z.string().datetime().optional(), endsAt: z.string().datetime().optional(),
}).strict().transform((step) => {
  const { startsAt, endsAt, ...fields } = step;
  return { ...fields,
    ...(startsAt ? { startsAt: new Date(startsAt) } : {}),
    ...(endsAt ? { endsAt: new Date(endsAt) } : {}),
  };
});
const formField = z.object({
  key: z.string().max(50), label: z.string().max(150),
  type: z.enum(["text", "textarea", "url", "select", "multiselect", "file"]),
  required: z.boolean(), options: z.array(z.string().max(100)).max(30).optional(),
}).strict();
const rubricCriterion = z.object({
  key: z.string().max(50), label: z.string().max(150), maxScore: z.number().int().min(1).max(100),
}).strict();
export const recruitmentCampaignBody = z.object({
  title: z.string().max(150), positions: z.array(z.string().max(100)).max(30),
  criteria: z.string().max(10_000).optional(), windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(), capacity: z.number().int().min(1).max(10_000),
  selectionSteps: z.array(selectionStep).max(10), formSchema: z.array(formField).max(30),
  rubric: z.array(rubricCriterion).max(20),
}).strict().transform((input) => ({
  ...input, windowStart: new Date(input.windowStart), windowEnd: new Date(input.windowEnd),
}));
const confirmOverlapBody = z.object({ confirmOverlap: z.boolean().default(false) }).strict();

function parsed<T>(schema: { safeParse(input: unknown):
  | { success: true; data: T }
  | { success: false; error: { issues: unknown } } }, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid recruitment campaign request", "validation",
    result.error.issues);
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

export function recruitmentCampaignRoutes(deps: RecruitmentCampaignRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };

  router.get("/clubs/:clubId/recruitment/campaigns", authGuard(guard, false), async (req, res) => {
    ok(res, await listRecruitmentCampaigns(deps.repo, deps.accessRepo, actor(res),
      parsed(id, req.params.clubId)));
  });
  router.post("/clubs/:clubId/recruitment/campaigns", authGuard(guard), async (req, res) => {
    ok(res, await createRecruitmentCampaignDraft(deps.repo, deps.accessRepo, actor(res),
      parsed(id, req.params.clubId), parsed(recruitmentCampaignBody, req.body), new Date()), 201);
  });
  router.get("/clubs/:clubId/recruitment/campaigns/:campaignId", authGuard(guard, false),
    async (req, res) => {
      ok(res, await getRecruitmentCampaign(deps.repo, deps.accessRepo, actor(res),
        parsed(id, req.params.clubId), parsed(id, req.params.campaignId)));
    });
  router.patch("/clubs/:clubId/recruitment/campaigns/:campaignId", authGuard(guard),
    async (req, res) => {
      ok(res, await updateRecruitmentCampaignDraft(deps.repo, deps.accessRepo, actor(res),
        parsed(id, req.params.clubId), parsed(id, req.params.campaignId),
        parsed(recruitmentCampaignBody, req.body), new Date()));
    });
  router.post("/clubs/:clubId/recruitment/campaigns/:campaignId/publish", authGuard(guard),
    async (req, res) => {
      const confirmation = parsed(confirmOverlapBody, req.body ?? {});
      ok(res, await publishRecruitmentCampaign(deps.repo, deps.accessRepo, deps.policy,
        actor(res), parsed(id, req.params.clubId), parsed(id, req.params.campaignId),
        confirmation.confirmOverlap ?? false, new Date()));
    });
  router.post("/clubs/:clubId/recruitment/campaigns/:campaignId/cancel", authGuard(guard),
    async (req, res) => {
      ok(res, await cancelRecruitmentCampaign(deps.repo, deps.accessRepo, actor(res),
        parsed(id, req.params.clubId), parsed(id, req.params.campaignId), new Date()));
    });

  return router;
}
