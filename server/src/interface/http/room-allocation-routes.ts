import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import { allocateRoom, clubRoomAllocations, listRoomAllocations, revokeRoomAllocation, roomAllocationOccupancy, roomAllocationOptions,
  type RoomAllocationDeps } from "../../usecase/room-allocation.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

const id = z.string().regex(/^[0-9a-f]{24}$/i);
export const roomAllocationBody = z.object({ semesterCode: z.string().trim().min(1).max(40), clubId: id, propertyId: id,
  weekday: z.number().int().min(1).max(7), slot: z.number().int().min(1).max(4),
  note: z.string().trim().max(500).optional() }).strict();
export const roomAllocationRevokeBody = z.object({ reason: z.string().trim().min(1).max(2000) }).strict();
export const roomAllocationQuery = z.object({ semesterCode: z.string().trim().min(1).max(40).optional() }).strict();
export const roomOccupancyQuery = z.object({ semesterCode: z.string().trim().min(1).max(40), propertyId: id }).strict();

// Kiểm tra dữ liệu vào bằng zod, sai thì ném DomainError validation
function parsed<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new DomainError("invalid room allocation request", "validation", result.error.issues);
  return result.data;
}
// Lấy actor đã xác thực từ res.locals
function actor(res: Response): AccessActor { return res.locals.actor as AccessActor; }

// Mount các route phân bổ phòng cho CLB của ICPDP
/** UC58: ICPDP allocates rooms per semester; clubs only read what they received. */
export function roomAllocationRoutes(deps: RoomAllocationDeps & { authRepo: AuthRepository; sessions: SessionService }): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };
  // Lấy các tuỳ chọn khi phân bổ phòng
  router.get("/admin/room-allocations/options", authGuard(guard, false), async (_req, res) => {
    ok(res, await roomAllocationOptions(deps, actor(res), new Date()));
  });
  // Xem tình trạng sử dụng phòng
  router.get("/admin/room-allocations/occupancy", authGuard(guard, false), async (req, res) => {
    const query = parsed(roomOccupancyQuery, req.query);
    ok(res, await roomAllocationOccupancy(deps, actor(res), query.semesterCode, query.propertyId, new Date()));
  });
  // Liệt kê các phân bổ phòng
  router.get("/admin/room-allocations", authGuard(guard, false), async (req, res) => {
    ok(res, await listRoomAllocations(deps, actor(res), parsed(roomAllocationQuery, req.query).semesterCode));
  });
  // Phân bổ phòng cho CLB
  router.post("/admin/room-allocations", authGuard(guard), async (req, res) => {
    ok(res, await allocateRoom(deps, actor(res), parsed(roomAllocationBody, req.body), new Date()), 201);
  });
  // Thu hồi một phân bổ phòng
  router.post("/admin/room-allocations/:id/revoke", authGuard(guard), async (req, res) => {
    ok(res, await revokeRoomAllocation(deps, actor(res), parsed(id, req.params.id),
      parsed(roomAllocationRevokeBody, req.body).reason, new Date()));
  });
  // CLB xem các phòng được phân bổ
  router.get("/clubs/:clubId/room-allocations", authGuard(guard, false), async (req, res) => {
    ok(res, await clubRoomAllocations(deps, actor(res), parsed(id, req.params.clubId), new Date()));
  });
  return router;
}
