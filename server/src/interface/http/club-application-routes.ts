import { Router, raw } from 'express'
import { z } from 'zod'
import type { AuthRepository } from '../../domain/auth.js'
import type {
  ClubApplicationRepository,
  ApplicationFileStorage,
} from '../../domain/club-application.js'
import type { ClubFieldRepository } from '../../domain/club-field.js'
import { DomainError } from '../../domain/errors.js'
import type { PolicyRepository } from '../../domain/policy.js'
import type { SessionService } from '../../domain/session.js'
import type {
  ApplicationDocument,
  ClubApplicationDraft,
  ClubApplicationRecord,
  ClubApplicationVersion,
} from '../../domain/club-application.js'
import {
  applicationConfiguration,
  applicationDocumentAccess,
  createApplicationDraft,
  getMyApplication,
  listMyApplications,
  removeApplicationDocument,
  saveApplicationDraft,
  previewApplication,
  submitApplication,
  uploadApplicationDocument,
  withdrawApplication,
  lookupFounder,
} from '../../usecase/club-application.js'
import { authGuard } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse } from './request.js'

export interface ClubApplicationRouteDeps {
  repo: ClubApplicationRepository
  policy: PolicyRepository
  fields: ClubFieldRepository
  files: ApplicationFileStorage | null
  authRepo: AuthRepository
  sessions: SessionService
}

const id = z.string().regex(/^[0-9a-f]{24}$/i)
const founderBody = z
  .object({
    userId: id,
    role: z.enum(['LEADER', 'VICE_LEADER', 'MEMBER']),
  })
  .strict()
export const applicationDraftBody = z
  .object({
    clubName: z.string().max(200),
    fieldId: z.string().max(24),
    summary: z.string().max(1000),
    objectives: z.string().max(5000),
    fanpageUrl: z.string().max(2000),
    contactEmail: z.string().max(320),
    founders: z.array(founderBody).max(100),
  })
  .strict()
const applicationUpdateBody = applicationDraftBody
  .extend({
    draftRevision: z.number().int().nonnegative(),
  })
  .strict()

// Giải mã tên file từ header, báo lỗi nếu thiếu hoặc sai mã hoá
function headerName(value: string | undefined): string {
  if (!value) {
    throw new DomainError('file name is required', 'validation')
  }
  try {
    return decodeURIComponent(value)
  } catch {
    throw new DomainError('invalid file name', 'validation')
  }
}

// Loại assetId nội bộ khỏi tài liệu đơn trước khi trả về client
function publicDocument(document: ApplicationDocument) {
  const { assetId: _assetId, ...safe } = document
  return safe
}

// Chuẩn hoá bản nháp đơn thành lập CLB để trả về client
function publicDraft(draft: ClubApplicationDraft) {
  return { ...draft, documents: draft.documents.map(publicDocument) }
}

// Chuẩn hoá bản ghi đơn thành lập CLB để trả về client
function publicRecord(record: ClubApplicationRecord) {
  return { ...record, draft: publicDraft(record.draft) }
}

// Chuẩn hoá phiên bản đơn đã nộp để trả về client
function publicVersion(version: ClubApplicationVersion) {
  return { ...version, snapshot: publicDraft(version.snapshot) }
}

// Mount các route đơn đăng ký thành lập CLB của sinh viên
export function clubApplicationRoutes(deps: ClubApplicationRouteDeps): Router {
  const router = Router()
  const guard = { repo: deps.authRepo, sessions: deps.sessions }

  // Lấy cấu hình biểu mẫu đơn thành lập CLB
  router.get('/applications/config', authGuard(guard, false), async (_req, res) => {
    ok(res, await applicationConfiguration(deps.policy, deps.fields, actor(res), new Date()))
  })
  // Tra cứu người sáng lập theo email
  // Đặt trước "/applications/:id" để "founder-lookup" không bao giờ bị parse thành id của đơn.
  router.get('/applications/founder-lookup', authGuard(guard, false), async (req, res) => {
    ok(
      res,
      await lookupFounder(
        deps.repo,
        actor(res),
        parse(z.string().max(254), req.query.email, 'application request'),
      ),
    )
  })
  // Liệt kê đơn thành lập CLB của tôi
  router.get('/applications/mine', authGuard(guard, false), async (_req, res) => {
    ok(res, (await listMyApplications(deps.repo, actor(res))).map(publicRecord))
  })
  // Tạo bản nháp đơn thành lập CLB
  router.post('/applications', authGuard(guard), async (req, res) => {
    ok(
      res,
      publicRecord(
        await createApplicationDraft(
          deps.repo,
          deps.fields,
          actor(res),
          parse(applicationDraftBody, req.body, 'application request'),
          new Date(),
        ),
      ),
      201,
    )
  })
  // Xem chi tiết đơn của tôi cùng phiên bản, quyết định và founders
  router.get('/applications/:id', authGuard(guard, false), async (req, res) => {
    const detail = await getMyApplication(
      deps.repo,
      actor(res),
      parse(id, req.params.id, 'application request'),
    )
    ok(res, {
      application: publicRecord(detail.application),
      versions: detail.versions.map(publicVersion),
      decisions: detail.decisions,
      founders: detail.founders,
    })
  })
  // Xem trước đơn để kiểm tra trước khi nộp
  router.get('/applications/:id/preview', authGuard(guard, false), async (req, res) => {
    ok(
      res,
      await previewApplication(
        deps.repo,
        deps.policy,
        deps.fields,
        actor(res),
        parse(id, req.params.id, 'application request'),
        new Date(),
      ),
    )
  })
  // Lưu chỉnh sửa bản nháp đơn
  router.patch('/applications/:id/draft', authGuard(guard), async (req, res) => {
    const body = parse(applicationUpdateBody, req.body, 'application request')
    const { draftRevision, ...draft } = body
    ok(
      res,
      publicRecord(
        await saveApplicationDraft(
          deps.repo,
          deps.fields,
          actor(res),
          parse(id, req.params.id, 'application request'),
          draft,
          draftRevision,
        ),
      ),
    )
  })
  // Nộp đơn thành lập CLB, tạo phiên bản đã nộp
  router.post('/applications/:id/submit', authGuard(guard), async (req, res) => {
    const result = await submitApplication(
      deps.repo,
      deps.policy,
      deps.fields,
      actor(res),
      parse(id, req.params.id, 'application request'),
      new Date(),
    )
    ok(res, { ...result, version: publicVersion(result.version) }, 201)
  })
  // Rút đơn thành lập CLB
  router.post('/applications/:id/withdraw', authGuard(guard), async (req, res) => {
    ok(
      res,
      publicRecord(
        await withdrawApplication(
          deps.repo,
          actor(res),
          parse(id, req.params.id, 'application request'),
          new Date(),
        ),
      ),
    )
  })
  // Tải tài liệu đính kèm lên đơn
  router.post(
    '/applications/:id/documents',
    authGuard(guard),
    raw({ type: () => true, limit: '10mb' }),
    async (req, res) => {
      if (!Buffer.isBuffer(req.body)) {
        throw new DomainError('file body is required', 'validation')
      }
      ok(
        res,
        publicDocument(
          await uploadApplicationDocument(
            deps.repo,
            deps.files,
            actor(res),
            parse(id, req.params.id, 'application request'),
            headerName(req.header('X-Document-Type')),
            headerName(req.header('X-Filename')),
            req.header('Content-Type') ?? '',
            req.body,
            new Date(),
          ),
        ),
        201,
      )
    },
  )
  // Xoá tài liệu đính kèm khỏi đơn
  router.delete('/applications/:id/documents/:documentId', authGuard(guard), async (req, res) => {
    ok(
      res,
      publicRecord(
        await removeApplicationDocument(
          deps.repo,
          actor(res),
          parse(id, req.params.id, 'application request'),
          parse(z.string().uuid(), req.params.documentId, 'application request'),
        ),
      ),
    )
  })
  // Lấy quyền truy cập tạm thời để mở tài liệu của đơn
  router.get(
    '/applications/:id/documents/:documentId/access',
    authGuard(guard, false),
    async (req, res) => {
      ok(
        res,
        await applicationDocumentAccess(
          deps.repo,
          deps.files,
          actor(res),
          parse(id, req.params.id, 'application request'),
          parse(z.string().uuid(), req.params.documentId, 'application request'),
        ),
      )
    },
  )

  return router
}
