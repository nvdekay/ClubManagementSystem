import { Router, raw, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import type { ClubAccessRepository } from "../../domain/access.js";
import type { RecruitmentApplicationRepository, RecruitmentAttachment,
  RecruitmentAttachmentStorage } from "../../domain/recruitment-application.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import type { RecruitmentApplicationState, RecruitmentDecision } from "../../domain/recruitment-application.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  createRecruitmentApplicationDraft, getMyCampaignApplication, getMyRecruitmentApplication,
  listMyRecruitmentApplications, recruitmentAttachmentAccess, saveRecruitmentApplicationDraft,
  submitRecruitmentApplication, uploadRecruitmentAttachment, withdrawRecruitmentApplication,
} from "../../usecase/recruitment-application.js";
import { declineAcceptedRecruitmentApplication, listRecruitmentApplicationsForReview, reviewerAttachmentAccess,
  onboardAcceptedRecruitmentApplication, reviewRecruitmentApplications } from "../../usecase/recruitment-review.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface RecruitmentApplicationRouteDeps {
  repo: RecruitmentApplicationRepository;
  files: RecruitmentAttachmentStorage | null;
  authRepo: AuthRepository;
  sessions: SessionService;
  accessRepo: ClubAccessRepository;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
// Attachments are keyed by the UUID minted at upload, not by a Mongo ObjectId.
const attachmentId = z.string().uuid();
export const createRecruitmentApplicationBody = z.object({ campaignId: id, position: z.string().max(100) }).strict();
const answer = z.union([z.string().max(10_000), z.array(z.string().max(500)).max(30)]);
export const updateRecruitmentApplicationBody = z.object({
  position: z.string().max(100), answers: z.record(z.string().max(50), answer),
}).strict();
const reviewBody = z.object({ action: z.enum(["screen", "shortlist", "decide", "promote", "close-withdrawn"]),
  applicationIds: z.array(id).min(1).max(100),
  outcome: z.enum(["Shortlisted", "Accepted", "Rejected", "Waitlisted"]).optional(),
  reason: z.string().max(2000).optional() }).strict();

function parsed<T>(schema: { safeParse(input: unknown):
  | { success: true; data: T }
  | { success: false; error: { issues: unknown } } }, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid recruitment application request", "validation",
    result.error.issues);
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

function publicAttachment(attachment: RecruitmentAttachment) {
  const { assetId: _assetId, ...safe } = attachment;
  return safe;
}

function publicApplication<T extends { attachments: RecruitmentAttachment[] }>(application: T) {
  return { ...application, attachments: application.attachments.map(publicAttachment) };
}

function header(value: string | undefined, name: string): string {
  if (!value) throw new DomainError(`${name} is required`, "validation");
  try { return decodeURIComponent(value); }
  catch { throw new DomainError(`invalid ${name}`, "validation"); }
}

export function recruitmentApplicationRoutes(deps: RecruitmentApplicationRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };

  router.get("/clubs/:clubId/recruitment/campaigns/:campaignId/applications",
    authGuard(guard, false), async (req, res) => {
      const queryState = req.query.state;
      const state = typeof queryState === "string" ? parsed(z.enum([
        "Draft", "Submitted", "Screening", "Shortlisted", "Accepted", "Rejected",
        "Waitlisted", "Onboarded", "Withdrawn", "Declined",
      ]), queryState) as RecruitmentApplicationState : undefined;
      ok(res, (await listRecruitmentApplicationsForReview(deps.repo, deps.accessRepo, actor(res),
        parsed(id, req.params.clubId), parsed(id, req.params.campaignId), state))
        .map(publicApplication));
    });
  router.get("/clubs/:clubId/recruitment/campaigns/:campaignId/applications/:applicationId/attachments/:attachmentId/access",
    authGuard(guard, false), async (req, res) => {
      ok(res, await reviewerAttachmentAccess(deps.repo, deps.files, deps.accessRepo, actor(res), {
        clubId: parsed(id, req.params.clubId), campaignId: parsed(id, req.params.campaignId),
        applicationId: parsed(id, req.params.applicationId),
        attachmentId: parsed(attachmentId, req.params.attachmentId),
      }));
    });
  router.post("/clubs/:clubId/recruitment/campaigns/:campaignId/applications/review",
    authGuard(guard), async (req, res) => {
      const body = parsed(reviewBody, req.body);
      ok(res, (await reviewRecruitmentApplications(deps.repo, deps.accessRepo, actor(res), {
        clubId: parsed(id, req.params.clubId), campaignId: parsed(id, req.params.campaignId),
        applicationIds: body.applicationIds, action: body.action,
        ...(body.outcome ? { outcome: body.outcome as RecruitmentDecision } : {}),
        ...(body.reason ? { reason: body.reason } : {}),
      })).map(publicApplication));
    });
  router.post("/clubs/:clubId/recruitment/campaigns/:campaignId/applications/:applicationId/onboard",
    authGuard(guard), async (req, res) => {
      const body = parsed(z.object({ joinedAt: z.string().datetime().optional(), departmentId: id.optional() }).strict(), req.body);
      const now = new Date();
      ok(res, publicApplication(await onboardAcceptedRecruitmentApplication(deps.repo, deps.accessRepo,
        actor(res), { clubId: parsed(id, req.params.clubId), campaignId: parsed(id, req.params.campaignId),
          applicationId: parsed(id, req.params.applicationId), joinedAt: body.joinedAt ? new Date(body.joinedAt) : now,
          ...(body.departmentId ? { departmentId: body.departmentId } : {}) }, now)));
    });
  router.post("/clubs/:clubId/recruitment/campaigns/:campaignId/applications/:applicationId/decline",
    authGuard(guard), async (req, res) => {
      const body = parsed(z.object({ reason: z.string().max(2000).optional() }).strict(), req.body);
      ok(res, publicApplication(await declineAcceptedRecruitmentApplication(deps.repo, deps.accessRepo,
        actor(res), { clubId: parsed(id, req.params.clubId), campaignId: parsed(id, req.params.campaignId),
          applicationId: parsed(id, req.params.applicationId), ...(body.reason ? { reason: body.reason } : {}) })));
    });

  router.get("/applications/recruitment/mine", authGuard(guard, false), async (_req, res) => {
    ok(res, (await listMyRecruitmentApplications(deps.repo, actor(res))).map(publicApplication));
  });
  router.get("/applications/recruitment/by-campaign/:campaignId", authGuard(guard, false),
    async (req, res) => {
      const application = await getMyCampaignApplication(deps.repo, actor(res),
        parsed(id, req.params.campaignId));
      ok(res, application ? publicApplication(application) : null);
    });
  router.post("/applications/recruitment", authGuard(guard), async (req, res) => {
    const body = parsed(createRecruitmentApplicationBody, req.body);
    ok(res, publicApplication(await createRecruitmentApplicationDraft(deps.repo, actor(res),
      body.campaignId, body.position, new Date())), 201);
  });
  router.get("/applications/recruitment/:id", authGuard(guard, false), async (req, res) => {
    ok(res, publicApplication(await getMyRecruitmentApplication(deps.repo, actor(res),
      parsed(id, req.params.id))));
  });
  router.patch("/applications/recruitment/:id/draft", authGuard(guard), async (req, res) => {
    ok(res, publicApplication(await saveRecruitmentApplicationDraft(deps.repo, actor(res),
      parsed(id, req.params.id), parsed(updateRecruitmentApplicationBody, req.body), new Date())));
  });
  router.post("/applications/recruitment/:id/attachments", authGuard(guard),
    raw({ type: () => true, limit: "10mb" }), async (req, res) => {
      if (!Buffer.isBuffer(req.body)) throw new DomainError("file body is required", "validation");
      const mimeType = req.header("Content-Type") ?? "";
      const application = await uploadRecruitmentAttachment(deps.repo, deps.files, actor(res),
        parsed(id, req.params.id), header(req.header("X-Field-Key"), "field key"),
        header(req.header("X-Filename"), "file name"), mimeType, req.body, new Date());
      ok(res, publicApplication(application), 201);
    });
  router.get("/applications/recruitment/:id/attachments/:attachmentId/access",
    authGuard(guard, false), async (req, res) => {
      ok(res, await recruitmentAttachmentAccess(deps.repo, deps.files, actor(res),
        parsed(id, req.params.id), parsed(attachmentId, req.params.attachmentId)));
    });
  router.post("/applications/recruitment/:id/submit", authGuard(guard), async (req, res) => {
    ok(res, publicApplication(await submitRecruitmentApplication(deps.repo, actor(res),
      parsed(id, req.params.id), new Date())));
  });
  router.post("/applications/recruitment/:id/withdraw", authGuard(guard), async (req, res) => {
    ok(res, publicApplication(await withdrawRecruitmentApplication(deps.repo, actor(res),
      parsed(id, req.params.id), new Date())));
  });

  return router;
}
