import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import type { ClubAccessRepository } from "../../domain/access.js";
import type { MembershipRepository } from "../../domain/membership.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import { changeMembershipState, executeMembershipWithdrawal, listClubMemberships, onboardMemberManually,
  listClubMembershipWithdrawalRequests, listMyMemberships,
  listMyMembershipWithdrawalRequests, requestMembershipWithdrawal } from "../../usecase/membership.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface MembershipRouteDeps {
  repo: MembershipRepository;
  accessRepo: ClubAccessRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);

// Kiểm tra dữ liệu vào bằng zod, sai thì ném DomainError validation
function parsed<T>(schema: { safeParse(input: unknown):
  | { success: true; data: T }
  | { success: false; error: { issues: unknown } } }, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid membership request", "validation", result.error.issues);
  return result.data;
}

// Lấy actor đã xác thực từ res.locals, thiếu thì báo unauthorized
function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

// Mount các route thành viên CLB và yêu cầu rút khỏi CLB
export function membershipRoutes(deps: MembershipRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };

  // Liệt kê các tư cách thành viên của tôi
  router.get("/memberships/mine", authGuard(guard, false), async (_req, res) => {
    ok(res, await listMyMemberships(deps.repo, actor(res)));
  });
  // Liệt kê yêu cầu rút khỏi CLB của tôi
  router.get("/memberships/withdrawal-requests/mine", authGuard(guard, false), async (_req, res) => {
    ok(res, await listMyMembershipWithdrawalRequests(deps.repo, actor(res)));
  });
  // Thành viên gửi yêu cầu rút khỏi CLB
  router.post("/memberships/:membershipId/withdrawal-requests", authGuard(guard), async (req, res) => {
    const body = parsed(z.object({ reason: z.string().min(1).max(2000),
      requestedEffectiveDate: z.string().datetime() }).strict(), req.body);
    ok(res, await requestMembershipWithdrawal(deps.repo, actor(res), {
      membershipId: parsed(id, req.params.membershipId), reason: body.reason,
      requestedEffectiveDate: new Date(body.requestedEffectiveDate),
    }), 201);
  });
  // Liệt kê thành viên của CLB
  router.get("/clubs/:clubId/memberships", authGuard(guard, false), async (req, res) => {
    ok(res, await listClubMemberships(deps.repo, deps.accessRepo, actor(res), parsed(id, req.params.clubId)));
  });
  // Thêm thành viên thủ công vào CLB
  router.post("/clubs/:clubId/memberships", authGuard(guard), async (req, res) => {
    const body = parsed(z.object({ email: z.string().min(3).max(320), reason: z.string().min(1).max(2000) }).strict(), req.body);
    ok(res, await onboardMemberManually(deps.repo, deps.accessRepo, actor(res), {
      clubId: parsed(id, req.params.clubId), email: body.email, reason: body.reason,
    }), 201);
  });
  // Đổi trạng thái thành viên của CLB
  router.patch("/clubs/:clubId/memberships/:membershipId/state", authGuard(guard), async (req, res) => {
    const body = parsed(z.object({ state: z.enum(["Active", "Inactive", "Banned"]),
      effectiveDate: z.string().datetime(), reason: z.string().max(2000).optional() }).strict(), req.body);
    ok(res, await changeMembershipState(deps.repo, deps.accessRepo, actor(res), {
      clubId: parsed(id, req.params.clubId), membershipId: parsed(id, req.params.membershipId),
      state: body.state, effectiveDate: new Date(body.effectiveDate),
      ...(body.reason ? { reason: body.reason } : {}),
    }));
  });
  // Liệt kê yêu cầu rút khỏi CLB của các thành viên
  router.get("/clubs/:clubId/membership-withdrawals", authGuard(guard, false), async (req, res) => {
    ok(res, await listClubMembershipWithdrawalRequests(deps.repo, deps.accessRepo, actor(res),
      parsed(id, req.params.clubId)));
  });
  // Thực hiện yêu cầu rút khỏi CLB của thành viên
  router.post("/clubs/:clubId/membership-withdrawals/:requestId/execute", authGuard(guard), async (req, res) => {
    ok(res, await executeMembershipWithdrawal(deps.repo, deps.accessRepo, actor(res), {
      clubId: parsed(id, req.params.clubId), requestId: parsed(id, req.params.requestId),
    }));
  });
  return router;
}
