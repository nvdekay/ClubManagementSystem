import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import type { ClubAccessRepository } from "../../domain/access.js";
import type { PostEventReportRepository } from "../../domain/post-event-report.js";
import type { SessionService } from "../../domain/session.js";
import { DomainError } from "../../domain/errors.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  actOnPostEventReport,
  getPostEventReport,
  listPostEventReports,
} from "../../usecase/post-event-report.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";
export const reportPath = z.object({
  clubId: z.string().regex(/^[0-9a-f]{24}$/i),
  id: z.string().regex(/^[0-9a-f]{24}$/i),
});
const revision = z.number().int().nonnegative();
export const reportActionBody = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("save"),
      revision,
      input: z
        .object({
          actualResult: z.string().min(1).max(10000),
          incidents: z.string().max(10000).optional(),
          lessonsLearned: z.string().max(10000).optional(),
          evidence: z
            .array(
              z
                .object({
                  note: z.string().max(1000),
                  url: z.string().url().max(2000),
                })
                .strict(),
            )
            .max(20),
        })
        .strict(),
    })
    .strict(),
  z.object({ kind: z.literal("submit"), revision }).strict(),
  z.object({ kind: z.literal("claim"), revision }).strict(),
  z
    .object({
      kind: z.literal("decision"),
      revision,
      outcome: z.enum(["accept", "return", "finding"]),
      reason: z.string().min(1).max(2000),
      violationId: z
        .string()
        .regex(/^[0-9a-f]{24}$/i)
        .optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("overdue"),
      revision,
      reason: z.string().min(1).max(2000),
    })
    .strict(),
]);
// Kiểm tra dữ liệu vào bằng zod, sai thì ném DomainError validation
function parsed<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new DomainError(
      "invalid report request",
      "validation",
      result.error.issues,
    );
  return result.data;
}
// Lấy actor đã xác thực từ res.locals
function actor(res: Response) {
  return res.locals.actor as AccessActor;
}
// Mount các route báo cáo sau sự kiện của CLB và ICPDP
export function postEventReportRoutes(deps: {
  repo: PostEventReportRepository;
  access: ClubAccessRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}) {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };
  const usecaseDeps = {
    repo: deps.repo,
    access: deps.access,
    auth: deps.authRepo,
  };
  for (const base of ["/clubs/:clubId/event-reports", "/admin/event-reports"]) {
    // Liệt kê báo cáo sau sự kiện
    router.get(base, authGuard(guard, false), async (req, res) => {
      ok(
        res,
        await listPostEventReports(
          usecaseDeps,
          actor(res),
          req.params.clubId
            ? parsed(reportPath.shape.clubId, req.params.clubId)
            : undefined,
          new Date(),
        ),
      );
    });
    // Xem chi tiết một báo cáo sau sự kiện
    router.get(`${base}/:id`, authGuard(guard, false), async (req, res) => {
      ok(
        res,
        await getPostEventReport(
          usecaseDeps,
          actor(res),
          parsed(reportPath.shape.id, req.params.id),
          req.params.clubId
            ? parsed(reportPath.shape.clubId, req.params.clubId)
            : undefined,
          new Date(),
        ),
      );
    });
    // Thực hiện hành động trên báo cáo sau sự kiện (lưu, nộp, duyệt...)
    router.post(`${base}/:id/actions`, authGuard(guard), async (req, res) => {
      ok(
        res,
        await actOnPostEventReport(
          usecaseDeps,
          actor(res),
          parsed(reportPath.shape.id, req.params.id),
          req.params.clubId
            ? parsed(reportPath.shape.clubId, req.params.clubId)
            : undefined,
          parsed(reportActionBody, req.body),
          new Date(),
        ),
      );
    });
  }
  return router;
}
