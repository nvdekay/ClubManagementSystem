import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import type { ExportFileWriter, ExportFilter, ExportRepository } from "../../domain/data-export.js";
import { DomainError } from "../../domain/errors.js";
import type { PolicyRepository } from "../../domain/policy.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import { exportData, exportOptions, previewExport } from "../../usecase/data-export.js";
import { authGuard } from "./auth-routes.js";
import { download, ok } from "./response.js";

export interface ExportRouteDeps {
  repo: ExportRepository;
  writer: ExportFileWriter;
  policy: PolicyRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const filterBody = z.object({
  periodCode: z.string().min(1).max(50).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  clubId: z.string().max(24).optional(),
  status: z.string().max(50).optional(),
}).strict();
export const exportPreviewBody = z.object({
  type: z.enum(["CLUBS", "MEMBERS", "EVENTS", "FINANCE", "COMPLIANCE", "EVALUATIONS"]), filter: filterBody,
}).strict();
export const exportBody = exportPreviewBody.extend({ format: z.enum(["xlsx", "csv", "pdf"]) }).strict();

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid export request", "validation", result.error.issues);
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

function filter(body: z.infer<typeof filterBody>): ExportFilter {
  const { from, to, ...rest } = body;
  return { ...rest, ...(from ? { from: new Date(from) } : {}), ...(to ? { to: new Date(to) } : {}) };
}

export function exportRoutes(deps: ExportRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };

  router.get("/admin/exports/options", authGuard(guard, false), async (_req, res) => {
    ok(res, await exportOptions(deps.repo, deps.policy, deps.authRepo, actor(res), new Date()));
  });
  router.post("/admin/exports/preview", authGuard(guard), async (req, res) => {
    const body = parsed(exportPreviewBody, req.body);
    ok(res, await previewExport(deps.repo, deps.policy, deps.authRepo, actor(res),
      { type: body.type, filter: filter(body.filter) }, new Date()));
  });
  router.post("/admin/exports", authGuard(guard), async (req, res) => {
    const body = parsed(exportBody, req.body);
    const result = await exportData(deps.repo, deps.writer, deps.policy, deps.authRepo, actor(res),
      { type: body.type, format: body.format, filter: filter(body.filter) }, new Date());
    download(res, result.file, result.fileName);
  });

  return router;
}
