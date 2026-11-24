import { Router, type Response } from 'express'
import { z } from 'zod'
import type { AuthRepository } from '../../domain/auth.js'
import type {
  ApplicationReviewDetail,
  ApplicationReviewQueueItem,
  ClubApplicationReviewRepository,
} from '../../domain/club-application-review.js'
import type { ClubApplicationDraft } from '../../domain/club-application.js'
import type { ApplicationFileStorage } from '../../domain/club-application.js'
import { DomainError } from '../../domain/errors.js'
import type { SessionService } from '../../domain/session.js'
import type { AccessActor } from '../../usecase/access.js'
import {
  claimApplicationReview,
  applicationReviewDocumentAccess,
  decideApplicationReview,
  getApplicationReview,
  listApplicationReviews,
} from '../../usecase/club-application-review.js'
import { authGuard } from './auth-routes.js'
import { ok } from './response.js'

export interface ClubApplicationReviewRouteDeps {
  repo: ClubApplicationReviewRepository
  authRepo: AuthRepository
  sessions: SessionService
  files: ApplicationFileStorage | null
}

const id = z.string().regex(/^[0-9a-f]{24}$/i)
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

// Kiểm tra dữ liệu vào bằng zod, sai thì ném DomainError validation
function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new DomainError('invalid application review request', 'validation', result.error.issues)
  }
  return result.data
}

// Lấy actor đã xác thực từ res.locals, thiếu thì báo unauthorized
function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined
  if (!value) {
    throw new DomainError('authentication required', 'unauthorized')
  }
  return value
}

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
  const guard = { repo: deps.authRepo, sessions: deps.sessions }

  // ICPDP liệt kê hàng đợi duyệt đơn thành lập CLB
  router.get('/admin/application-reviews', authGuard(guard, false), async (_req, res) => {
    ok(
      res,
      (await listApplicationReviews(deps.repo, deps.authRepo, actor(res))).map(publicQueueItem),
    )
  })
  // ICPDP xem chi tiết một đơn cần duyệt
  router.get('/admin/application-reviews/:id', authGuard(guard, false), async (req, res) => {
    ok(
      res,
      publicDetail(
        await getApplicationReview(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id)),
      ),
    )
  })
  // ICPDP nhận xử lý (claim) một đơn
  router.post('/admin/application-reviews/:id/claim', authGuard(guard), async (req, res) => {
    ok(
      res,
      publicDetail(
        await claimApplicationReview(
          deps.repo,
          deps.authRepo,
          actor(res),
          parsed(id, req.params.id),
          new Date(),
        ),
      ),
    )
  })
  // ICPDP ghi quyết định duyệt đơn
  router.post('/admin/application-reviews/:id/decision', authGuard(guard), async (req, res) => {
    const body = parsed(applicationReviewDecisionBody, req.body)
    ok(
      res,
      publicDetail(
        await decideApplicationReview(
          deps.repo,
          deps.authRepo,
          actor(res),
          parsed(id, req.params.id),
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
    authGuard(guard, false),
    async (req, res) => {
      ok(
        res,
        await applicationReviewDocumentAccess(
          deps.repo,
          deps.authRepo,
          deps.files,
          actor(res),
          parsed(id, req.params.id),
          parsed(z.string().uuid(), req.params.documentId),
        ),
      )
    },
  )

  return router
}
