import { Router } from 'express'
import { z } from 'zod'
import type { ClubAccessRepository } from '../../domain/access.js'
import type { PostEventReportRepository } from '../../domain/post-event-report.js'
import {
  actOnPostEventReport,
  getPostEventReport,
  listPostEventReports,
} from '../../usecase/post-event-report.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse, objectId } from './request.js'
export const reportPath = z.object({
  clubId: objectId,
  id: objectId,
})
const revision = z.number().int().nonnegative()
export const reportActionBody = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('save'),
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
  z.object({ kind: z.literal('submit'), revision }).strict(),
  z.object({ kind: z.literal('claim'), revision }).strict(),
  z
    .object({
      kind: z.literal('decision'),
      revision,
      outcome: z.enum(['accept', 'return', 'finding']),
      reason: z.string().min(1).max(2000),
      violationId: objectId.optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('overdue'),
      revision,
      reason: z.string().min(1).max(2000),
    })
    .strict(),
])
// Mount các route báo cáo sau sự kiện của CLB và ICPDP
export function postEventReportRoutes(
  deps: SessionDeps & {
    repo: PostEventReportRepository
    access: ClubAccessRepository
  },
) {
  const router = Router()
  const { read, write } = guards(deps)
  const usecaseDeps = {
    repo: deps.repo,
    access: deps.access,
    auth: deps.authRepo,
  }
  for (const base of ['/clubs/:clubId/event-reports', '/admin/event-reports']) {
    // Liệt kê báo cáo sau sự kiện
    router.get(base, read, async (req, res) => {
      ok(
        res,
        await listPostEventReports(
          usecaseDeps,
          actor(res),
          req.params.clubId
            ? parse(reportPath.shape.clubId, req.params.clubId, 'report request')
            : undefined,
          new Date(),
        ),
      )
    })
    // Xem chi tiết một báo cáo sau sự kiện
    router.get(`${base}/:id`, read, async (req, res) => {
      ok(
        res,
        await getPostEventReport(
          usecaseDeps,
          actor(res),
          parse(reportPath.shape.id, req.params.id, 'report request'),
          req.params.clubId
            ? parse(reportPath.shape.clubId, req.params.clubId, 'report request')
            : undefined,
          new Date(),
        ),
      )
    })
    // Thực hiện hành động trên báo cáo sau sự kiện (lưu, nộp, duyệt...)
    router.post(`${base}/:id/actions`, write, async (req, res) => {
      ok(
        res,
        await actOnPostEventReport(
          usecaseDeps,
          actor(res),
          parse(reportPath.shape.id, req.params.id, 'report request'),
          req.params.clubId
            ? parse(reportPath.shape.clubId, req.params.clubId, 'report request')
            : undefined,
          parse(reportActionBody, req.body, 'report request'),
          new Date(),
        ),
      )
    })
  }
  return router
}
