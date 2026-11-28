import { Router } from 'express'
import { z } from 'zod'
import {
  MAX_ROUTING_RULES,
  ROUTED_PROPERTY_TYPES,
  ROUTED_REQUEST_TYPES,
  type ApprovalRoutingRepository,
  type RoutingRule,
} from '../../domain/approval-routing.js'
import type { PropertyType } from '../../domain/property.js'
import {
  activateRoutingRuleSet,
  createRoutingDraft,
  listRoutingRuleSets,
  saveRoutingDraft,
  simulateRoutingRuleSet,
} from '../../usecase/approval-routing.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse, objectId as id } from './request.js'

export interface ApprovalRoutingRouteDeps extends SessionDeps {
  repo: ApprovalRoutingRepository
}

const whole = z.number().int().min(0).max(1_000_000_000_000)
const routingRule = z
  .object({
    id: z.string().max(40),
    requestType: z.enum(ROUTED_REQUEST_TYPES),
    minAmount: whole.optional(),
    maxAmount: whole.optional(),
    propertyTypes: z
      .array(z.enum(ROUTED_PROPERTY_TYPES as [PropertyType, ...PropertyType[]]))
      .max(4)
      .optional(),
    minOpenViolations: z.number().int().min(0).max(1000).optional(),
    maxOpenViolations: z.number().int().min(0).max(1000).optional(),
    slaHours: z.number().int().min(1).max(1440),
  })
  .strict()
export const routingRulesBody = z
  .object({ rules: z.array(routingRule).max(MAX_ROUTING_RULES) })
  .strict()
export const routingSimulationQuery = z
  .object({ limit: z.coerce.number().int().min(1).max(200).default(50) })
  .strict()

// Parse body thành danh sách rule định tuyến phê duyệt
function rules(body: unknown): RoutingRule[] {
  return parse(routingRulesBody, body, 'routing request').rules as RoutingRule[]
}

// Mount các route cấu hình định tuyến phê duyệt của ICPDP
export function approvalRoutingRoutes(deps: ApprovalRoutingRouteDeps): Router {
  const router = Router()
  const { read, write } = guards(deps)
  // Liệt kê các bộ rule định tuyến phê duyệt
  router.get('/admin/routing-rules', read, async (_req, res) => {
    ok(res, await listRoutingRuleSets(deps.repo, deps.authRepo, actor(res)))
  })
  // Tạo bản nháp bộ rule định tuyến mới
  router.post('/admin/routing-rules', write, async (req, res) => {
    ok(
      res,
      await createRoutingDraft(deps.repo, deps.authRepo, actor(res), rules(req.body), new Date()),
      201,
    )
  })
  // Lưu chỉnh sửa vào bản nháp bộ rule
  router.put('/admin/routing-rules/:id', write, async (req, res) => {
    ok(
      res,
      await saveRoutingDraft(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'routing request'),
        rules(req.body),
        new Date(),
      ),
    )
  })
  // Kích hoạt bộ rule định tuyến
  router.post('/admin/routing-rules/:id/activate', write, async (req, res) => {
    ok(
      res,
      await activateRoutingRuleSet(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'routing request'),
        new Date(),
      ),
    )
  })
  // Mô phỏng bộ rule trên dữ liệu hiện có trước khi kích hoạt
  router.get('/admin/routing-rules/:id/simulation', read, async (req, res) => {
    ok(
      res,
      await simulateRoutingRuleSet(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'routing request'),
        parse(routingSimulationQuery, req.query, 'routing request').limit ?? 50,
      ),
    )
  })
  return router
}
