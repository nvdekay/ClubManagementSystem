import { Router, raw, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import type { ClubApplicationRepository, ApplicationFileStorage } from "../../domain/club-application.js";
import { DomainError } from "../../domain/errors.js";
import type { PolicyRepository } from "../../domain/policy.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import type { ApplicationDocument, ClubApplicationDraft, ClubApplicationRecord,
  ClubApplicationVersion } from "../../domain/club-application.js";
import {
  applicationConfiguration, applicationDocumentAccess, createApplicationDraft, getMyApplication,
  listMyApplications, removeApplicationDocument, saveApplicationDraft,
  previewApplication, submitApplication, uploadApplicationDocument, withdrawApplication, lookupFounder,
} from "../../usecase/club-application.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface ClubApplicationRouteDeps {
  repo: ClubApplicationRepository;
  policy: PolicyRepository;
  files: ApplicationFileStorage | null;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
const roleBody = z.object({
  code: z.string().max(50), name: z.string().max(100), unit: z.string().max(100).optional(),
  isBoardSeat: z.boolean(), isLeaderRole: z.boolean(),
  isDefaultMemberRole: z.boolean(), isSingleHolder: z.boolean(),
  permissionCodes: z.array(z.string().max(100)).max(100),
}).strict();
export const applicationDraftBody = z.object({
  clubName: z.string().max(200), field: z.string().max(100),
  objectives: z.string().max(5000),
  foundingUserIds: z.array(id).max(100),
  proposedRoles: z.array(roleBody).max(100),
}).strict();
const applicationUpdateBody = applicationDraftBody.extend({
  draftRevision: z.number().int().nonnegative(),
}).strict();

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid application request", "validation", result.error.issues);
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

function headerName(value: string | undefined): string {
  if (!value) throw new DomainError("file name is required", "validation");
  try { return decodeURIComponent(value); }
  catch { throw new DomainError("invalid file name", "validation"); }
}

function publicDocument(document: ApplicationDocument) {
  const { assetId: _assetId, ...safe } = document;
  return safe;
}

function publicDraft(draft: ClubApplicationDraft) {
  return { ...draft, documents: draft.documents.map(publicDocument) };
}

function publicRecord(record: ClubApplicationRecord) {
  return { ...record, draft: publicDraft(record.draft) };
}

function publicVersion(version: ClubApplicationVersion) {
  return { ...version, snapshot: publicDraft(version.snapshot) };
}

export function clubApplicationRoutes(deps: ClubApplicationRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };

  router.get("/applications/config", authGuard(guard, false), async (_req, res) => {
    ok(res, await applicationConfiguration(deps.policy, actor(res), new Date()));
  });
  // Before "/applications/:id" so "founder-lookup" is never parsed as an application id.
  router.get("/applications/founder-lookup", authGuard(guard, false), async (req, res) => {
    ok(res, await lookupFounder(deps.repo, actor(res), parsed(z.string().max(254), req.query.email)));
  });
  router.get("/applications/mine", authGuard(guard, false), async (_req, res) => {
    ok(res, (await listMyApplications(deps.repo, actor(res))).map(publicRecord));
  });
  router.post("/applications", authGuard(guard), async (req, res) => {
    ok(res, publicRecord(await createApplicationDraft(deps.repo, actor(res),
      parsed(applicationDraftBody, req.body), new Date())), 201);
  });
  router.get("/applications/:id", authGuard(guard, false), async (req, res) => {
    const detail = await getMyApplication(deps.repo, actor(res), parsed(id, req.params.id));
    ok(res, { application: publicRecord(detail.application), versions: detail.versions.map(publicVersion),
      decisions: detail.decisions, founders: detail.founders });
  });
  router.get("/applications/:id/preview", authGuard(guard, false), async (req, res) => {
    ok(res, await previewApplication(deps.repo, deps.policy, actor(res),
      parsed(id, req.params.id), new Date()));
  });
  router.patch("/applications/:id/draft", authGuard(guard), async (req, res) => {
    const body = parsed(applicationUpdateBody, req.body);
    const { draftRevision, ...draft } = body;
    ok(res, publicRecord(await saveApplicationDraft(deps.repo, actor(res), parsed(id, req.params.id),
      draft, draftRevision)));
  });
  router.post("/applications/:id/submit", authGuard(guard), async (req, res) => {
    const result = await submitApplication(deps.repo, deps.policy, actor(res),
      parsed(id, req.params.id), new Date());
    ok(res, { ...result, version: publicVersion(result.version) }, 201);
  });
  router.post("/applications/:id/withdraw", authGuard(guard), async (req, res) => {
    ok(res, publicRecord(await withdrawApplication(deps.repo, actor(res),
      parsed(id, req.params.id), new Date())));
  });
  router.post("/applications/:id/documents", authGuard(guard),
    raw({ type: () => true, limit: "10mb" }), async (req, res) => {
      if (!Buffer.isBuffer(req.body)) {
        throw new DomainError("file body is required", "validation");
      }
      ok(res, publicDocument(await uploadApplicationDocument(deps.repo, deps.files, actor(res),
        parsed(id, req.params.id), headerName(req.header("X-Document-Type")),
        headerName(req.header("X-Filename")), req.header("Content-Type") ?? "",
        req.body, new Date())), 201);
    });
  router.delete("/applications/:id/documents/:documentId", authGuard(guard), async (req, res) => {
    ok(res, publicRecord(await removeApplicationDocument(deps.repo, actor(res),
      parsed(id, req.params.id), parsed(z.string().uuid(), req.params.documentId))));
  });
  router.get("/applications/:id/documents/:documentId/access", authGuard(guard, false),
    async (req, res) => {
      ok(res, await applicationDocumentAccess(deps.repo, deps.files, actor(res),
        parsed(id, req.params.id), parsed(z.string().uuid(), req.params.documentId)));
    });

  return router;
}
