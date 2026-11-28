import { Router } from 'express'
import { z } from 'zod'
import type { PropertyDetails, PropertyRepository } from '../../domain/property.js'
import {
  createProperty,
  deleteProperty,
  listProperties,
  setPropertyActive,
  updateProperty,
} from '../../usecase/property.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse, objectId as id } from './request.js'

export interface PropertyRouteDeps extends SessionDeps {
  repo: PropertyRepository
}

const hoursBody = z
  .object({
    day: z.number().int(),
    open: z.string().max(5),
    close: z.string().max(5),
  })
  .strict()
const blackoutBody = z
  .object({
    startAt: z.string().datetime({ offset: true }),
    endAt: z.string().datetime({ offset: true }),
    reason: z.string().max(200),
  })
  .strict()
export const propertyDetailsBody = z
  .object({
    name: z.string().max(120),
    location: z.string().max(200),
    capacity: z.number().int().optional(),
    equipment: z.array(z.string().max(60)).max(30),
    bookableHours: z.array(hoursBody).max(7),
    blackouts: z.array(blackoutBody).max(50),
  })
  .strict()
export const propertyCreateBody = propertyDetailsBody
  .extend({
    type: z.enum(['ROOM', 'HALL', 'OUTDOOR', 'STAGE', 'EQUIPMENT']),
  })
  .strict()
export const propertyActivationBody = z.object({ isActive: z.boolean() }).strict()

// Chuyển body chi tiết tài sản sang PropertyDetails
function details(body: z.infer<typeof propertyDetailsBody>): PropertyDetails {
  return {
    ...body,
    blackouts: body.blackouts.map((blackout) => ({
      ...blackout,
      startAt: new Date(blackout.startAt),
      endAt: new Date(blackout.endAt),
    })),
  }
}

// Mount các route quản lý tài sản và phòng của ICPDP
export function propertyRoutes(deps: PropertyRouteDeps): Router {
  const router = Router()
  const { read, write } = guards(deps)

  // Liệt kê tài sản
  router.get('/admin/properties', read, async (_req, res) => {
    ok(res, await listProperties(deps.repo, deps.authRepo, actor(res)))
  })
  // Tạo tài sản mới
  router.post('/admin/properties', write, async (req, res) => {
    const body = parse(propertyCreateBody, req.body, 'property request')
    ok(
      res,
      await createProperty(
        deps.repo,
        deps.authRepo,
        actor(res),
        { ...details(body), type: body.type },
        new Date(),
      ),
      201,
    )
  })
  // Cập nhật tài sản
  router.patch('/admin/properties/:id', write, async (req, res) => {
    ok(
      res,
      await updateProperty(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'property request'),
        details(parse(propertyDetailsBody, req.body, 'property request')),
        new Date(),
      ),
    )
  })
  // Bật hoặc tắt hoạt động của tài sản
  router.post('/admin/properties/:id/activation', write, async (req, res) => {
    ok(
      res,
      await setPropertyActive(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'property request'),
        parse(propertyActivationBody, req.body, 'property request').isActive,
        new Date(),
      ),
    )
  })
  // Xoá tài sản
  router.delete('/admin/properties/:id', write, async (req, res) => {
    ok(
      res,
      await deleteProperty(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'property request'),
        new Date(),
      ),
    )
  })

  return router
}
