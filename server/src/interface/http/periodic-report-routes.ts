import { Router } from 'express'
import { z } from 'zod'
import type { AuthRepository } from '../../domain/auth.js'
import type { EvaluationRepository } from '../../domain/evaluation.js'
import type { EvaluationSchemeRepository } from '../../domain/evaluation-scheme.js'
import {
  CUSTOM_FIELD_TYPES,
  RETURN_SECTIONS,
  type PeriodicEvidenceStorage,
  type PeriodicReportRepository,
} from '../../domain/periodic-report.js'
import type { PolicyRepository } from '../../domain/policy.js'
import type { SessionService } from '../../domain/session.js'
import { VIOLATION_SEVERITIES } from '../../domain/violation.js'
import {
  decidePeriodicReport,
  getPeriodicReport,
  periodicReportOverview,
  recordMissingPeriodicReport,
  savePeriodicCampaign,
  type PeriodicReportDeps,
} from '../../usecase/periodic-report.js'
import { authGuard } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse } from './request.js'

export interface PeriodicReportRouteDeps {
  repo: PeriodicReportRepository
  policy: PolicyRepository
  authRepo: AuthRepository
  sessions: SessionService
  evaluationRepo?: EvaluationRepository
  evaluationSchemeRepo?: EvaluationSchemeRepository
  files?: PeriodicEvidenceStorage | null
}

const id = z.string().regex(/^[0-9a-f]{24}$/i)
export const periodicOverviewQuery = z.object({ period: z.string().max(50).optional() }).strict()
export const periodicCustomFieldBody = z
  .object({
    id: z.string().min(1).max(100),
    label: z.string().min(1).max(200),
    description: z.string().max(1_000).optional(),
    type: z.enum(CUSTOM_FIELD_TYPES),
    required: z.boolean(),
  })
  .strict()
export const periodicCampaignBody = z
  .object({
    periodCode: z.string().min(1).max(100),
    isOpen: z.boolean(),
    dueAt: z.coerce.date(),
    announcement: z.string().max(5_000).optional(),
    customFields: z.array(periodicCustomFieldBody).max(30).optional(),
  })
  .strict()
export const periodicDecisionBody = z
  .object({
    outcome: z.enum(['Accept', 'Return']),
    observation: z.string().max(2_000).optional(),
    reason: z.string().max(5_000).optional(),
    sections: z.array(z.enum(RETURN_SECTIONS)).max(RETURN_SECTIONS.length).optional(),
    resubmitDueAt: z.coerce.date().optional(),
  })
  .strict()
export const periodicMissingBody = z
  .object({
    clubId: id,
    periodCode: z.string().min(1).max(50),
    severity: z.enum(VIOLATION_SEVERITIES),
    note: z.string().max(2_000).optional(),
  })
  .strict()

// Mount các route ICPDP quản lý báo cáo định kỳ
export function periodicReportRoutes(deps: PeriodicReportRouteDeps): Router {
  const router = Router()
  const guard = { repo: deps.authRepo, sessions: deps.sessions }
  const usecase: PeriodicReportDeps = {
    repo: deps.repo,
    policy: deps.policy,
    auth: deps.authRepo,
    files: deps.files ?? null,
    ...(deps.evaluationRepo && deps.evaluationSchemeRepo
      ? {
          evaluation: {
            repo: deps.evaluationRepo,
            schemes: deps.evaluationSchemeRepo,
            policy: deps.policy,
            auth: deps.authRepo,
          },
        }
      : {}),
  }

  // Xem tổng quan đợt báo cáo định kỳ
  router.get('/admin/periodic-reports', authGuard(guard, false), async (req, res) => {
    ok(
      res,
      await periodicReportOverview(
        usecase,
        actor(res),
        parse(periodicOverviewQuery, req.query, 'periodic report request').period,
        new Date(),
      ),
    )
  })
  // Lưu cấu hình đợt báo cáo định kỳ
  router.put('/admin/periodic-reports/campaign', authGuard(guard), async (req, res) => {
    ok(
      res,
      await savePeriodicCampaign(
        usecase,
        actor(res),
        parse(periodicCampaignBody, req.body, 'periodic report request'),
        new Date(),
      ),
    )
  })
  // Ghi nhận CLB không nộp báo cáo định kỳ
  router.post('/admin/periodic-reports/missing', authGuard(guard), async (req, res) => {
    ok(
      res,
      await recordMissingPeriodicReport(
        usecase,
        actor(res),
        parse(periodicMissingBody, req.body, 'periodic report request'),
        new Date(),
      ),
      201,
    )
  })
  // Xem chi tiết một báo cáo định kỳ
  router.get('/admin/periodic-reports/:id', authGuard(guard, false), async (req, res) => {
    ok(
      res,
      await getPeriodicReport(
        usecase,
        actor(res),
        parse(id, req.params.id, 'periodic report request'),
      ),
    )
  })
  // ICPDP ghi quyết định cho báo cáo định kỳ
  router.post('/admin/periodic-reports/:id/decision', authGuard(guard), async (req, res) => {
    ok(
      res,
      await decidePeriodicReport(
        usecase,
        actor(res),
        parse(id, req.params.id, 'periodic report request'),
        parse(periodicDecisionBody, req.body, 'periodic report request'),
        new Date(),
      ),
    )
  })

  return router
}
