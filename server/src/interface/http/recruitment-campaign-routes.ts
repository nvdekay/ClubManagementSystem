import { Router } from 'express'
import { z } from 'zod'
import type { ClubAccessRepository } from '../../domain/access.js'
import type { PolicyRepository } from '../../domain/policy.js'
import type { RecruitmentCampaignRepository } from '../../domain/recruitment-campaign.js'
import {
  cancelRecruitmentCampaign,
  createRecruitmentCampaignDraft,
  getRecruitmentCampaign,
  listRecruitmentCampaigns,
  publishRecruitmentCampaign,
  updateRecruitmentCampaignDraft,
} from '../../usecase/recruitment-campaign.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse, objectId as id } from './request.js'

export interface RecruitmentCampaignRouteDeps extends SessionDeps {
  repo: RecruitmentCampaignRepository
  accessRepo: ClubAccessRepository
  policy: PolicyRepository
}

const selectionStep = z
  .object({
    name: z.string().max(100),
    description: z.string().max(2_000).optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
  })
  .strict()
  .transform((step) => {
    const { startsAt, endsAt, ...fields } = step
    return {
      ...fields,
      ...(startsAt ? { startsAt: new Date(startsAt) } : {}),
      ...(endsAt ? { endsAt: new Date(endsAt) } : {}),
    }
  })
const formField = z
  .object({
    key: z.string().max(50),
    label: z.string().max(150),
    type: z.enum(['text', 'textarea', 'url', 'select', 'multiselect', 'file']),
    required: z.boolean(),
    options: z.array(z.string().max(100)).max(30).optional(),
  })
  .strict()
const rubricCriterion = z
  .object({
    key: z.string().max(50),
    label: z.string().max(150),
    maxScore: z.number().int().min(1).max(100),
  })
  .strict()
export const recruitmentCampaignBody = z
  .object({
    title: z.string().max(150),
    positions: z.array(z.string().max(100)).max(30),
    criteria: z.string().max(10_000).optional(),
    windowStart: z.string().datetime(),
    windowEnd: z.string().datetime(),
    capacity: z.number().int().min(1).max(10_000),
    selectionSteps: z.array(selectionStep).max(10),
    formSchema: z.array(formField).max(30),
    rubric: z.array(rubricCriterion).max(20),
  })
  .strict()
  .transform((input) => ({
    ...input,
    windowStart: new Date(input.windowStart),
    windowEnd: new Date(input.windowEnd),
  }))
const confirmOverlapBody = z.object({ confirmOverlap: z.boolean().default(false) }).strict()

// Mount các route đợt tuyển thành viên của CLB
export function recruitmentCampaignRoutes(deps: RecruitmentCampaignRouteDeps): Router {
  const router = Router()
  const { read, write } = guards(deps)

  // Liệt kê đợt tuyển thành viên của CLB
  router.get('/clubs/:clubId/recruitment/campaigns', read, async (req, res) => {
    ok(
      res,
      await listRecruitmentCampaigns(
        deps.repo,
        deps.accessRepo,
        actor(res),
        parse(id, req.params.clubId, 'recruitment campaign request'),
      ),
    )
  })
  // Tạo bản nháp đợt tuyển thành viên
  router.post('/clubs/:clubId/recruitment/campaigns', write, async (req, res) => {
    ok(
      res,
      await createRecruitmentCampaignDraft(
        deps.repo,
        deps.accessRepo,
        actor(res),
        parse(id, req.params.clubId, 'recruitment campaign request'),
        parse(recruitmentCampaignBody, req.body, 'recruitment campaign request'),
        new Date(),
      ),
      201,
    )
  })
  // Xem chi tiết một đợt tuyển
  router.get('/clubs/:clubId/recruitment/campaigns/:campaignId', read, async (req, res) => {
    ok(
      res,
      await getRecruitmentCampaign(
        deps.repo,
        deps.accessRepo,
        actor(res),
        parse(id, req.params.clubId, 'recruitment campaign request'),
        parse(id, req.params.campaignId, 'recruitment campaign request'),
      ),
    )
  })
  // Cập nhật bản nháp đợt tuyển
  router.patch('/clubs/:clubId/recruitment/campaigns/:campaignId', write, async (req, res) => {
    ok(
      res,
      await updateRecruitmentCampaignDraft(
        deps.repo,
        deps.accessRepo,
        actor(res),
        parse(id, req.params.clubId, 'recruitment campaign request'),
        parse(id, req.params.campaignId, 'recruitment campaign request'),
        parse(recruitmentCampaignBody, req.body, 'recruitment campaign request'),
        new Date(),
      ),
    )
  })
  // Công bố đợt tuyển
  router.post(
    '/clubs/:clubId/recruitment/campaigns/:campaignId/publish',
    write,
    async (req, res) => {
      const confirmation = parse(confirmOverlapBody, req.body ?? {}, 'recruitment campaign request')
      ok(
        res,
        await publishRecruitmentCampaign(
          deps.repo,
          deps.accessRepo,
          deps.policy,
          actor(res),
          parse(id, req.params.clubId, 'recruitment campaign request'),
          parse(id, req.params.campaignId, 'recruitment campaign request'),
          confirmation.confirmOverlap ?? false,
          new Date(),
        ),
      )
    },
  )
  // Huỷ đợt tuyển
  router.post(
    '/clubs/:clubId/recruitment/campaigns/:campaignId/cancel',
    write,
    async (req, res) => {
      ok(
        res,
        await cancelRecruitmentCampaign(
          deps.repo,
          deps.accessRepo,
          actor(res),
          parse(id, req.params.clubId, 'recruitment campaign request'),
          parse(id, req.params.campaignId, 'recruitment campaign request'),
          new Date(),
        ),
      )
    },
  )

  return router
}
