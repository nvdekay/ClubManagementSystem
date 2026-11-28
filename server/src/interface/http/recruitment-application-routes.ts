import { Router, json, raw } from 'express'
import { z } from 'zod'
import type { ClubAccessRepository } from '../../domain/access.js'
import type {
  RecruitmentApplicationRepository,
  RecruitmentAttachment,
  RecruitmentAttachmentStorage,
} from '../../domain/recruitment-application.js'
import { DomainError } from '../../domain/errors.js'
import type {
  RecruitmentApplicationState,
  RecruitmentDecision,
} from '../../domain/recruitment-application.js'
import {
  createRecruitmentApplicationDraft,
  getMyCampaignApplication,
  getMyRecruitmentApplication,
  listMyRecruitmentApplications,
  recruitmentAttachmentAccess,
  saveRecruitmentApplicationDraft,
  submitRecruitmentApplication,
  uploadRecruitmentAttachment,
  withdrawRecruitmentApplication,
} from '../../usecase/recruitment-application.js'
import {
  declineAcceptedRecruitmentApplication,
  listRecruitmentApplicationsForReview,
  reviewerAttachmentAccess,
  onboardAcceptedRecruitmentApplication,
  reviewRecruitmentApplications,
} from '../../usecase/recruitment-review.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse, objectId as id } from './request.js'

export interface RecruitmentApplicationRouteDeps extends SessionDeps {
  repo: RecruitmentApplicationRepository
  files: RecruitmentAttachmentStorage | null
  accessRepo: ClubAccessRepository
}

// Tệp đính kèm được khoá theo UUID sinh lúc upload, không phải Mongo ObjectId.
const attachmentId = z.string().uuid()
export const createRecruitmentApplicationBody = z
  .object({ campaignId: id, position: z.string().max(100) })
  .strict()
const answer = z.union([z.string().max(10_000), z.array(z.string().max(500)).max(30)])
export const updateRecruitmentApplicationBody = z
  .object({
    position: z.string().max(100),
    answers: z.record(z.string().max(50), answer),
  })
  .strict()
const reviewBody = z
  .object({
    action: z.enum(['screen', 'shortlist', 'decide', 'promote', 'close-withdrawn']),
    applicationIds: z.array(id).min(1).max(100),
    outcome: z.enum(['Shortlisted', 'Accepted', 'Rejected', 'Waitlisted']).optional(),
    reason: z.string().max(2000).optional(),
  })
  .strict()

// Loại assetId nội bộ khỏi tệp đính kèm trước khi trả về client
function publicAttachment(attachment: RecruitmentAttachment) {
  const { assetId: _assetId, ...safe } = attachment
  return safe
}

// Chuẩn hoá đơn ứng tuyển, ẩn assetId của tệp đính kèm
function publicApplication<T extends { attachments: RecruitmentAttachment[] }>(application: T) {
  return { ...application, attachments: application.attachments.map(publicAttachment) }
}

// Giải mã tên file từ header, báo lỗi nếu thiếu hoặc sai mã hoá
function header(value: string | undefined, name: string): string {
  if (!value) {
    throw new DomainError(`${name} is required`, 'validation')
  }
  try {
    return decodeURIComponent(value)
  } catch {
    throw new DomainError(`invalid ${name}`, 'validation')
  }
}

// Mount các route đơn ứng tuyển thành viên của sinh viên và CLB
export function recruitmentApplicationRoutes(deps: RecruitmentApplicationRouteDeps): Router {
  const router = Router()
  const { read, write } = guards(deps)

  // CLB liệt kê đơn ứng tuyển của một đợt tuyển để xét duyệt
  router.get(
    '/clubs/:clubId/recruitment/campaigns/:campaignId/applications',
    read,
    async (req, res) => {
      const queryState = req.query.state
      const state =
        typeof queryState === 'string'
          ? (parse(
              z.enum([
                'Submitted',
                'Screening',
                'Shortlisted',
                'Accepted',
                'Rejected',
                'Waitlisted',
                'Onboarded',
                'Withdrawn',
                'Declined',
              ]),
              queryState,
              'recruitment application request',
            ) as RecruitmentApplicationState)
          : undefined
      ok(
        res,
        (
          await listRecruitmentApplicationsForReview(
            deps.repo,
            deps.accessRepo,
            actor(res),
            parse(id, req.params.clubId, 'recruitment application request'),
            parse(id, req.params.campaignId, 'recruitment application request'),
            state,
          )
        ).map(publicApplication),
      )
    },
  )
  // CLB lấy quyền truy cập tạm thời để mở tệp đính kèm của ứng viên
  router.get(
    '/clubs/:clubId/recruitment/campaigns/:campaignId/applications/:applicationId/attachments/:attachmentId/access',
    read,
    async (req, res) => {
      ok(
        res,
        await reviewerAttachmentAccess(deps.repo, deps.files, deps.accessRepo, actor(res), {
          clubId: parse(id, req.params.clubId, 'recruitment application request'),
          campaignId: parse(id, req.params.campaignId, 'recruitment application request'),
          applicationId: parse(id, req.params.applicationId, 'recruitment application request'),
          attachmentId: parse(
            attachmentId,
            req.params.attachmentId,
            'recruitment application request',
          ),
        }),
      )
    },
  )
  // CLB xét duyệt hàng loạt các đơn ứng tuyển
  router.post(
    '/clubs/:clubId/recruitment/campaigns/:campaignId/applications/review',
    write,
    async (req, res) => {
      const body = parse(reviewBody, req.body, 'recruitment application request')
      ok(
        res,
        (
          await reviewRecruitmentApplications(deps.repo, deps.accessRepo, actor(res), {
            clubId: parse(id, req.params.clubId, 'recruitment application request'),
            campaignId: parse(id, req.params.campaignId, 'recruitment application request'),
            applicationIds: body.applicationIds,
            action: body.action,
            ...(body.outcome ? { outcome: body.outcome as RecruitmentDecision } : {}),
            ...(body.reason ? { reason: body.reason } : {}),
          })
        ).map(publicApplication),
      )
    },
  )
  // CLB đưa ứng viên được nhận vào làm thành viên
  router.post(
    '/clubs/:clubId/recruitment/campaigns/:campaignId/applications/:applicationId/onboard',
    write,
    async (req, res) => {
      const body = parse(
        z
          .object({ joinedAt: z.string().datetime().optional(), departmentId: id.optional() })
          .strict(),
        req.body,
        'recruitment application request',
      )
      const now = new Date()
      ok(
        res,
        publicApplication(
          await onboardAcceptedRecruitmentApplication(
            deps.repo,
            deps.accessRepo,
            actor(res),
            {
              clubId: parse(id, req.params.clubId, 'recruitment application request'),
              campaignId: parse(id, req.params.campaignId, 'recruitment application request'),
              applicationId: parse(id, req.params.applicationId, 'recruitment application request'),
              joinedAt: body.joinedAt ? new Date(body.joinedAt) : now,
              ...(body.departmentId ? { departmentId: body.departmentId } : {}),
            },
            now,
          ),
        ),
      )
    },
  )
  // CLB ghi nhận ứng viên được nhận nhưng từ chối gia nhập
  router.post(
    '/clubs/:clubId/recruitment/campaigns/:campaignId/applications/:applicationId/decline',
    write,
    async (req, res) => {
      const body = parse(
        z.object({ reason: z.string().max(2000).optional() }).strict(),
        req.body,
        'recruitment application request',
      )
      ok(
        res,
        publicApplication(
          await declineAcceptedRecruitmentApplication(deps.repo, deps.accessRepo, actor(res), {
            clubId: parse(id, req.params.clubId, 'recruitment application request'),
            campaignId: parse(id, req.params.campaignId, 'recruitment application request'),
            applicationId: parse(id, req.params.applicationId, 'recruitment application request'),
            ...(body.reason ? { reason: body.reason } : {}),
          }),
        ),
      )
    },
  )

  // Liệt kê đơn ứng tuyển của tôi
  router.get('/applications/recruitment/mine', read, async (_req, res) => {
    ok(res, (await listMyRecruitmentApplications(deps.repo, actor(res))).map(publicApplication))
  })
  // Lấy đơn ứng tuyển của tôi theo đợt tuyển
  router.get('/applications/recruitment/by-campaign/:campaignId', read, async (req, res) => {
    const application = await getMyCampaignApplication(
      deps.repo,
      actor(res),
      parse(id, req.params.campaignId, 'recruitment application request'),
    )
    ok(res, application ? publicApplication(application) : null)
  })
  // Tạo bản nháp đơn ứng tuyển
  router.post('/applications/recruitment', write, async (req, res) => {
    const body = parse(
      createRecruitmentApplicationBody,
      req.body,
      'recruitment application request',
    )
    ok(
      res,
      publicApplication(
        await createRecruitmentApplicationDraft(
          deps.repo,
          actor(res),
          body.campaignId,
          body.position,
          new Date(),
        ),
      ),
      201,
    )
  })
  // Xem chi tiết đơn ứng tuyển của tôi
  router.get('/applications/recruitment/:id', read, async (req, res) => {
    ok(
      res,
      publicApplication(
        await getMyRecruitmentApplication(
          deps.repo,
          actor(res),
          parse(id, req.params.id, 'recruitment application request'),
        ),
      ),
    )
  })
  // Lưu chỉnh sửa bản nháp đơn ứng tuyển
  // Tới 30 câu trả lời x 10.000 ký tự nên vượt giới hạn JSON 100kb chung.
  router.patch(
    '/applications/recruitment/:id/draft',
    write,
    json({ limit: '1mb' }),
    async (req, res) => {
      ok(
        res,
        publicApplication(
          await saveRecruitmentApplicationDraft(
            deps.repo,
            actor(res),
            parse(id, req.params.id, 'recruitment application request'),
            parse(updateRecruitmentApplicationBody, req.body, 'recruitment application request'),
            new Date(),
          ),
        ),
      )
    },
  )
  // Tải tệp đính kèm lên đơn ứng tuyển
  router.post(
    '/applications/recruitment/:id/attachments',
    write,
    raw({ type: () => true, limit: '10mb' }),
    async (req, res) => {
      if (!Buffer.isBuffer(req.body)) {
        throw new DomainError('file body is required', 'validation')
      }
      const mimeType = req.header('Content-Type') ?? ''
      const application = await uploadRecruitmentAttachment(
        deps.repo,
        deps.files,
        actor(res),
        parse(id, req.params.id, 'recruitment application request'),
        header(req.header('X-Field-Key'), 'field key'),
        header(req.header('X-Filename'), 'file name'),
        mimeType,
        req.body,
        new Date(),
      )
      ok(res, publicApplication(application), 201)
    },
  )
  // Lấy quyền truy cập tạm thời để mở tệp đính kèm của đơn
  router.get(
    '/applications/recruitment/:id/attachments/:attachmentId/access',
    read,
    async (req, res) => {
      ok(
        res,
        await recruitmentAttachmentAccess(
          deps.repo,
          deps.files,
          actor(res),
          parse(id, req.params.id, 'recruitment application request'),
          parse(attachmentId, req.params.attachmentId, 'recruitment application request'),
        ),
      )
    },
  )
  // Nộp đơn ứng tuyển
  router.post('/applications/recruitment/:id/submit', write, async (req, res) => {
    ok(
      res,
      publicApplication(
        await submitRecruitmentApplication(
          deps.repo,
          actor(res),
          parse(id, req.params.id, 'recruitment application request'),
          new Date(),
        ),
      ),
    )
  })
  // Rút đơn ứng tuyển
  router.post('/applications/recruitment/:id/withdraw', write, async (req, res) => {
    ok(
      res,
      publicApplication(
        await withdrawRecruitmentApplication(
          deps.repo,
          actor(res),
          parse(id, req.params.id, 'recruitment application request'),
          new Date(),
        ),
      ),
    )
  })

  return router
}
