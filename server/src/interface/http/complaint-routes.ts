import { Router, type Response } from 'express'
import { z } from 'zod'
import type { ClubAccessRepository } from '../../domain/access.js'
import type { AuthRepository } from '../../domain/auth.js'
import {
  COMPLAINT_STATES,
  COMPLAINT_TYPES,
  MAX_COMPLAINT_EVIDENCE,
  MAX_COMPLAINT_TEXT,
  TRIAGE_OUTCOMES,
  TRIAGE_VALIDITIES,
  type ComplaintDecision,
  type ComplaintRepository,
} from '../../domain/complaint.js'
import type { SessionService } from '../../domain/session.js'
import { VIOLATION_SEVERITIES } from '../../domain/violation.js'
import {
  decideComplaint,
  getComplaintForIcpdp,
  listClubComplaints,
  listComplaintQueue,
  listMyComplaints,
  respondToComplaint,
  submitComplaint,
  withdrawComplaint,
} from '../../usecase/complaint.js'
import { authGuard } from './auth-routes.js'
import { ok } from './response.js'
import { actor, pageQuery, parse } from './request.js'

export interface ComplaintRouteDeps {
  repo: ComplaintRepository
  accessRepo: ClubAccessRepository
  authRepo: AuthRepository
  sessions: SessionService
}

const id = z.string().regex(/^[0-9a-f]{24}$/i)
const evidence = z
  .array(z.object({ label: z.string().max(120), url: z.string().max(500) }).strict())
  .max(MAX_COMPLAINT_EVIDENCE)
export const complaintBody = z
  .object({
    clubId: id,
    eventId: id.optional(),
    type: z.enum(COMPLAINT_TYPES),
    description: z.string().max(MAX_COMPLAINT_TEXT * 2),
    evidence: evidence.optional(),
  })
  .strict()
export const complaintQuery = pageQuery
  .extend({ state: z.enum(COMPLAINT_STATES).optional() })
  .strict()
export const complaintTriageBody = z
  .object({
    outcome: z.enum(TRIAGE_OUTCOMES),
    severity: z.enum(VIOLATION_SEVERITIES),
    validity: z.enum(TRIAGE_VALIDITIES),
    reason: z.string().max(4_000),
    responseDueAt: z.string().datetime().optional(),
  })
  .strict()
export const complaintCloseBody = z.object({ reason: z.string().max(4_000) }).strict()
export const complaintLinkBody = z.object({ targetId: id, reason: z.string().max(4_000) }).strict()
export const complaintEscalateBody = z
  .object({ reason: z.string().max(4_000), severity: z.enum(VIOLATION_SEVERITIES) })
  .strict()
export const complaintResponseBody = z
  .object({
    text: z.string().max(MAX_COMPLAINT_TEXT * 2),
    action: z.string().max(4_000),
    evidence: evidence.optional(),
  })
  .strict()

// Mount các route khiếu nại của sinh viên, ICPDP và CLB
export function complaintRoutes(deps: ComplaintRouteDeps): Router {
  const router = Router()
  const guard = { repo: deps.authRepo, sessions: deps.sessions }
  function decide(res: Response, complaintId: unknown, decision: ComplaintDecision) {
    return decideComplaint(
      deps.repo,
      deps.authRepo,
      actor(res),
      parse(id, complaintId, 'complaint request'),
      decision,
      new Date(),
    )
  }

  // Sinh viên gửi khiếu nại
  // UC50 — Student
  router.post('/complaints', authGuard(guard), async (req, res) => {
    const body = parse(complaintBody, req.body, 'complaint request')
    ok(
      res,
      await submitComplaint(
        deps.repo,
        actor(res),
        { ...body, evidence: body.evidence ?? [] },
        new Date(),
      ),
      201,
    )
  })
  // Liệt kê khiếu nại của tôi
  router.get('/complaints/mine', authGuard(guard, false), async (_req, res) => {
    ok(res, await listMyComplaints(deps.repo, actor(res)))
  })
  // Sinh viên rút khiếu nại
  router.post('/complaints/:id/withdraw', authGuard(guard), async (req, res) => {
    ok(
      res,
      await withdrawComplaint(
        deps.repo,
        actor(res),
        parse(id, req.params.id, 'complaint request'),
        new Date(),
      ),
    )
  })

  // ICPDP liệt kê hàng đợi khiếu nại
  // UC51 — ICPDP
  router.get('/admin/complaints', authGuard(guard, false), async (req, res) => {
    ok(
      res,
      await listComplaintQueue(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(complaintQuery, req.query, 'complaint request'),
      ),
    )
  })
  // ICPDP xem chi tiết khiếu nại
  router.get('/admin/complaints/:id', authGuard(guard, false), async (req, res) => {
    ok(
      res,
      await getComplaintForIcpdp(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'complaint request'),
      ),
    )
  })
  // ICPDP mở xử lý khiếu nại
  router.post('/admin/complaints/:id/open', authGuard(guard), async (req, res) => {
    ok(res, await decide(res, req.params.id, { kind: 'open' }))
  })
  // ICPDP phân loại (triage) khiếu nại
  router.post('/admin/complaints/:id/triage', authGuard(guard), async (req, res) => {
    const body = parse(complaintTriageBody, req.body, 'complaint request')
    ok(
      res,
      await decide(res, req.params.id, {
        kind: 'triage',
        ...body,
        responseDueAt: body.responseDueAt ? new Date(body.responseDueAt) : undefined,
      }),
    )
  })
  // ICPDP liên kết khiếu nại với hồ sơ liên quan
  router.post('/admin/complaints/:id/link', authGuard(guard), async (req, res) => {
    ok(
      res,
      await decide(res, req.params.id, {
        kind: 'link',
        ...parse(complaintLinkBody, req.body, 'complaint request'),
      }),
    )
  })
  // ICPDP đóng khiếu nại
  router.post('/admin/complaints/:id/close', authGuard(guard), async (req, res) => {
    ok(
      res,
      await decide(res, req.params.id, {
        kind: 'close',
        ...parse(complaintCloseBody, req.body, 'complaint request'),
      }),
    )
  })
  // ICPDP chuyển khiếu nại lên cấp xử lý cao hơn
  router.post('/admin/complaints/:id/escalate', authGuard(guard), async (req, res) => {
    ok(
      res,
      await decide(res, req.params.id, {
        kind: 'escalate',
        ...parse(complaintEscalateBody, req.body, 'complaint request'),
      }),
    )
  })

  // Liệt kê khiếu nại liên quan đến CLB
  // UC52 — Club
  router.get('/clubs/:clubId/complaints', authGuard(guard, false), async (req, res) => {
    ok(
      res,
      await listClubComplaints(
        deps.repo,
        deps.accessRepo,
        actor(res),
        parse(id, req.params.clubId, 'complaint request'),
        new Date(),
      ),
    )
  })
  // CLB phản hồi khiếu nại
  router.post('/clubs/:clubId/complaints/:id/response', authGuard(guard), async (req, res) => {
    const body = parse(complaintResponseBody, req.body, 'complaint request')
    ok(
      res,
      await respondToComplaint(
        deps.repo,
        deps.accessRepo,
        actor(res),
        parse(id, req.params.clubId, 'complaint request'),
        parse(id, req.params.id, 'complaint request'),
        { ...body, evidence: body.evidence ?? [] },
        new Date(),
      ),
    )
  })
  return router
}
