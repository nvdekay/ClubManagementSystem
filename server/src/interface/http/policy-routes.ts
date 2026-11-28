import { Router } from 'express'
import { z } from 'zod'
import type { PolicyManagementRepository, PolicySettings } from '../../domain/policy.js'
import { createPolicyVersion, listPolicyVersions } from '../../usecase/policy.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse } from './request.js'

export interface PolicyRouteDeps extends SessionDeps {
  repo: PolicyManagementRepository
}

const deadlineBody = z
  .object({
    reportType: z.string().min(1).max(100),
    dueDaysAfterPeriodEnd: z.number().int().nonnegative(),
    remindBeforeDays: z.number().int().nonnegative(),
    overdueAfterDays: z.number().int().nonnegative(),
    escalateAfterDays: z.number().int().nonnegative(),
  })
  .strict()
const semesterBody = z
  .object({
    code: z.string().min(1).max(50),
    startAt: z.string().datetime({ offset: true }),
    endAt: z.string().datetime({ offset: true }),
  })
  .strict()
const foundingRequirementsBody = z
  .object({
    summary: z.boolean(),
    objectives: z.boolean(),
    proposal: z.boolean(),
    logo: z.boolean(),
    fanpageUrl: z.boolean(),
    contactEmail: z.boolean(),
  })
  .strict()
const profileRequirementsBody = z
  .object({
    description: z.boolean(),
    contactEmail: z.boolean(),
    contactPhone: z.boolean(),
    charterUrl: z.boolean(),
    channels: z.boolean(),
    operatingScope: z.boolean(),
  })
  .strict()
const schoolRefundAccountBody = z
  .object({
    accountHolder: z.string().min(1).max(200),
    accountNumber: z.string().min(1).max(50),
    bankName: z.string().min(1).max(200),
    bankBranch: z.string().max(200).optional(),
    transferNote: z.string().max(500).optional(),
  })
  .strict()
export const policySettingsBody = z
  .object({
    minFoundingMembers: z.number().int().positive(),
    formRequirements: z
      .object({
        clubFounding: foundingRequirementsBody,
        clubProfile: profileRequirementsBody,
      })
      .strict(),
    reportDeadlines: z.array(deadlineBody).min(1),
    conflictThresholdMinutes: z.number().int().nonnegative(),
    feedbackWindowHours: z.number().int().positive(),
    feedbackMinRespondents: z.number().int().min(2),
    allowOverbooking: z.boolean(),
    enforceOverdueReportBlock: z.boolean(),
    academicCalendar: z.array(semesterBody).min(1),
    schoolRefundAccount: schoolRefundAccountBody.optional(),
  })
  .strict()
export const policyCreateBody = policySettingsBody
  .extend({
    effectiveFrom: z.string().datetime({ offset: true }).optional(),
    reason: z.string().max(1000).optional(),
  })
  .strict()

// Mount các route chính sách hệ thống của ICPDP
export function policyRoutes(deps: PolicyRouteDeps): Router {
  const router = Router()
  const { read, write } = guards(deps)

  // Liệt kê các phiên bản chính sách
  router.get('/admin/policies', read, async (_req, res) => {
    ok(res, await listPolicyVersions(deps.repo, deps.authRepo, actor(res), new Date()))
  })

  // Tạo phiên bản chính sách mới
  router.post('/admin/policies', write, async (req, res) => {
    const { effectiveFrom, reason, academicCalendar, ...fields } = parse(
      policyCreateBody,
      req.body,
      'policy request',
    )
    const settings: PolicySettings = {
      ...fields,
      academicCalendar: academicCalendar.map((semester) => ({
        ...semester,
        startAt: new Date(semester.startAt),
        endAt: new Date(semester.endAt),
      })),
    }
    ok(
      res,
      await createPolicyVersion(
        deps.repo,
        deps.authRepo,
        actor(res),
        settings,
        effectiveFrom ? new Date(effectiveFrom) : undefined,
        reason,
        new Date(),
      ),
      201,
    )
  })

  return router
}
