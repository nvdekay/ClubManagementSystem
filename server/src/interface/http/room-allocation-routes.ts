import { Router } from 'express'
import { z } from 'zod'
import type { AuthRepository } from '../../domain/auth.js'
import type { SessionService } from '../../domain/session.js'
import {
  allocateRoom,
  clubRoomAllocations,
  listRoomAllocations,
  revokeRoomAllocation,
  roomAllocationOccupancy,
  roomAllocationOptions,
  type RoomAllocationDeps,
} from '../../usecase/room-allocation.js'
import { authGuard } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse } from './request.js'

const id = z.string().regex(/^[0-9a-f]{24}$/i)
export const roomAllocationBody = z
  .object({
    semesterCode: z.string().trim().min(1).max(40),
    clubId: id,
    propertyId: id,
    weekday: z.number().int().min(1).max(7),
    slot: z.number().int().min(1).max(4),
    note: z.string().trim().max(500).optional(),
  })
  .strict()
export const roomAllocationRevokeBody = z
  .object({ reason: z.string().trim().min(1).max(2000) })
  .strict()
export const roomAllocationQuery = z
  .object({ semesterCode: z.string().trim().min(1).max(40).optional() })
  .strict()
export const roomOccupancyQuery = z
  .object({ semesterCode: z.string().trim().min(1).max(40), propertyId: id })
  .strict()

// Mount các route phân bổ phòng cho CLB của ICPDP
/** UC58: ICPDP phân bổ phòng theo học kỳ; CLB chỉ đọc những gì mình nhận được. */
export function roomAllocationRoutes(
  deps: RoomAllocationDeps & { authRepo: AuthRepository; sessions: SessionService },
): Router {
  const router = Router()
  const guard = { repo: deps.authRepo, sessions: deps.sessions }
  // Lấy các tuỳ chọn khi phân bổ phòng
  router.get('/admin/room-allocations/options', authGuard(guard, false), async (_req, res) => {
    ok(res, await roomAllocationOptions(deps, actor(res), new Date()))
  })
  // Xem tình trạng sử dụng phòng
  router.get('/admin/room-allocations/occupancy', authGuard(guard, false), async (req, res) => {
    const query = parse(roomOccupancyQuery, req.query, 'room allocation request')
    ok(
      res,
      await roomAllocationOccupancy(
        deps,
        actor(res),
        query.semesterCode,
        query.propertyId,
        new Date(),
      ),
    )
  })
  // Liệt kê các phân bổ phòng
  router.get('/admin/room-allocations', authGuard(guard, false), async (req, res) => {
    ok(
      res,
      await listRoomAllocations(
        deps,
        actor(res),
        parse(roomAllocationQuery, req.query, 'room allocation request').semesterCode,
      ),
    )
  })
  // Phân bổ phòng cho CLB
  router.post('/admin/room-allocations', authGuard(guard), async (req, res) => {
    ok(
      res,
      await allocateRoom(
        deps,
        actor(res),
        parse(roomAllocationBody, req.body, 'room allocation request'),
        new Date(),
      ),
      201,
    )
  })
  // Thu hồi một phân bổ phòng
  router.post('/admin/room-allocations/:id/revoke', authGuard(guard), async (req, res) => {
    ok(
      res,
      await revokeRoomAllocation(
        deps,
        actor(res),
        parse(id, req.params.id, 'room allocation request'),
        parse(roomAllocationRevokeBody, req.body, 'room allocation request').reason,
        new Date(),
      ),
    )
  })
  // CLB xem các phòng được phân bổ
  router.get('/clubs/:clubId/room-allocations', authGuard(guard, false), async (req, res) => {
    ok(
      res,
      await clubRoomAllocations(
        deps,
        actor(res),
        parse(id, req.params.clubId, 'room allocation request'),
        new Date(),
      ),
    )
  })
  return router
}
