import { Router, type Response } from "express";
import { z } from "zod";
import {
  MAX_ROUTING_RULES, RISK_CATEGORIES, ROUTED_PROPERTY_TYPES, ROUTED_REQUEST_TYPES, type ApprovalRoutingRepository,
  type RoutingRule,
} from "../../domain/approval-routing.js";
import type { AuthRepository } from "../../domain/auth.js";
import { DomainError } from "../../domain/errors.js";
import type { PropertyType } from "../../domain/property.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  activateRoutingRuleSet, createRoutingDraft, listRoutingRuleSets, saveRoutingDraft, simulateRoutingRuleSet,
} from "../../usecase/approval-routing.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface ApprovalRoutingRouteDeps {
  repo: ApprovalRoutingRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
const whole = z.number().int().min(0).max(1_000_000_000_000);
const routingRule = z.object({
  id: z.string().max(40), requestType: z.enum(ROUTED_REQUEST_TYPES),
  minAmount: whole.optional(), maxAmount: whole.optional(),
  riskCategories: z.array(z.enum(RISK_CATEGORIES)).max(3).optional(),
  propertyTypes: z.array(z.enum(ROUTED_PROPERTY_TYPES as [PropertyType, ...PropertyType[]])).max(4).optional(),
  minOpenViolations: z.number().int().min(0).max(1000).optional(), maxOpenViolations: z.number().int().min(0).max(1000).optional(),
  slaHours: z.number().int().min(1).max(1440),
}).strict();
export const routingRulesBody = z.object({ rules: z.array(routingRule).max(MAX_ROUTING_RULES) }).strict();
export const routingSimulationQuery = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) }).strict();

// Kiểm tra dữ liệu vào bằng zod, sai thì ném DomainError validation
function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid routing request", "validation", result.error.issues);
  return result.data;
}
// Lấy actor đã xác thực từ res.locals, thiếu thì báo unauthorized
function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}
// Parse body thành danh sách rule định tuyến phê duyệt
function rules(body: unknown): RoutingRule[] {
  return parsed(routingRulesBody, body).rules as RoutingRule[];
}

// Mount các route cấu hình định tuyến phê duyệt của ICPDP
export function approvalRoutingRoutes(deps: ApprovalRoutingRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };
  // Liệt kê các bộ rule định tuyến phê duyệt
  router.get("/admin/routing-rules", authGuard(guard, false), async (_req, res) => {
    ok(res, await listRoutingRuleSets(deps.repo, deps.authRepo, actor(res)));
  });
  // Tạo bản nháp bộ rule định tuyến mới
  router.post("/admin/routing-rules", authGuard(guard), async (req, res) => {
    ok(res, await createRoutingDraft(deps.repo, deps.authRepo, actor(res), rules(req.body), new Date()), 201);
  });
  // Lưu chỉnh sửa vào bản nháp bộ rule
  router.put("/admin/routing-rules/:id", authGuard(guard), async (req, res) => {
    ok(res, await saveRoutingDraft(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id), rules(req.body), new Date()));
  });
  // Kích hoạt bộ rule định tuyến
  router.post("/admin/routing-rules/:id/activate", authGuard(guard), async (req, res) => {
    ok(res, await activateRoutingRuleSet(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id), new Date()));
  });
  // Mô phỏng bộ rule trên dữ liệu hiện có trước khi kích hoạt
  router.get("/admin/routing-rules/:id/simulation", authGuard(guard, false), async (req, res) => {
    ok(res, await simulateRoutingRuleSet(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id),
      parsed(routingSimulationQuery, req.query).limit ?? 50));
  });
  return router;
}
