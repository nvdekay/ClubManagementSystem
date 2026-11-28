import { Router } from 'express'
import { z } from 'zod'
import type {
  ApplicationReviewDetail,
  ApplicationReviewQueueItem,
  ClubApplicationReviewRepository,
} from '../../domain/club-application-review.js'
import type { ClubApplicationDraft } from '../../domain/club-application.js'
import type { ApplicationFileStorage } from '../../domain/club-application.js'
import {
  claimApplicationReview,
  applicationReviewDocumentAccess,
  decideApplicationReview,
  getApplicationReview,
  listApplicationReviews,
} from '../../usecase/club-application-review.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse, objectId as id } from './request.js'

export interface ClubApplicationReviewRouteDeps extends SessionDeps {
  repo: ClubApplicationReviewRepository
  files: ApplicationFileStorage | null
}

export const applicationReviewDecisionBody = z
  .object({
    outcome: z.enum(['Request revision', 'Approve', 'Reject']),
    reason: z.string().max(5_000).optional(),
    sections: z
      .array(z.enum(['club-information', 'founders', 'documents', 'role-structure', 'other']))
      .max(5)
      .optional(),
    reviewNote: z.string().max(10_000).optional(),
    revisionDeadlineAt: z.string().datetime().optional(),
  })
  .strict()

// Chuẩn hoá bản nháp đơn để trả về client
function publicDraft(draft: ClubApplicationDraft) {
  return {
    ...draft,
    documents: draft.documents.map(({ assetId: _assetId, ...document }) => document),
  }
}

// Chuẩn hoá mục hàng đợi duyệt đơn để trả về client
function publicQueueItem(item: ApplicationReviewQueueItem) {
  return {
    ...item,
    application: { ...item.application, draft: publicDraft(item.application.draft) },
  }
}

// Chuẩn hoá chi tiết duyệt đơn để trả về client
function publicDetail(detail: ApplicationReviewDetail) {
  return {
    ...publicQueueItem(detail),
    versions: detail.versions.map((version) => ({
      ...version,
      snapshot: publicDraft(version.snapshot),
    })),
    decisions: detail.decisions,
    founders: detail.founders,
  }
}

// Mount các route ICPDP duyệt đơn thành lập CLB
export function clubApplicationReviewRoutes(deps: ClubApplicationReviewRouteDeps): Router {
  const router = Router()
  const { read, write } = guards(deps)

  // ICPDP liệt kê hàng đợi duyệt đơn thành lập CLB
  router.get('/admin/application-reviews', read, async (_req, res) => {
    ok(
      res,
      (await listApplicationReviews(deps.repo, deps.authRepo, actor(res))).map(publicQueueItem),
    )
  })
  // ICPDP xem chi tiết một đơn cần duyệt
  router.get('/admin/application-reviews/:id', read, async (req, res) => {
    ok(
      res,
      publicDetail(
        await getApplicationReview(
          deps.repo,
          deps.authRepo,
          actor(res),
          parse(id, req.params.id, 'application review request'),
        ),
      ),
    )
  })
  // ICPDP nhận xử lý (claim) một đơn
  router.post('/admin/application-reviews/:id/claim', write, async (req, res) => {
    ok(
      res,
      publicDetail(
        await claimApplicationReview(
          deps.repo,
          deps.authRepo,
          actor(res),
          parse(id, req.params.id, 'application review request'),
          new Date(),
        ),
      ),
    )
  })
  // ICPDP ghi quyết định duyệt đơn
  router.post('/admin/application-reviews/:id/decision', write, async (req, res) => {
    const body = parse(applicationReviewDecisionBody, req.body, 'application review request')
    ok(
      res,
      publicDetail(
        await decideApplicationReview(
          deps.repo,
          deps.authRepo,
          actor(res),
          parse(id, req.params.id, 'application review request'),
          {
            ...body,
            revisionDeadlineAt: body.revisionDeadlineAt
              ? new Date(body.revisionDeadlineAt)
              : undefined,
          },
          new Date(),
        ),
      ),
    )
  })
  // Lấy quyền truy cập tạm thời để mở tài liệu của đơn đang duyệt
  router.get(
    '/admin/application-reviews/:id/documents/:documentId/access',
    read,
    async (req, res) => {
      ok(
        res,
        await applicationReviewDocumentAccess(
          deps.repo,
          deps.authRepo,
          deps.files,
          actor(res),
          parse(id, req.params.id, 'application review request'),
          parse(z.string().uuid(), req.params.documentId, 'application review request'),
        ),
      )
    },
  )

  return router
}
