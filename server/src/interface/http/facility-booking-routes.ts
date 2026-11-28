import { Router } from 'express'
import { z } from 'zod'
import type { BookingInput } from '../../domain/facility-booking.js'
import {
  bookingAvailability,
  cancelBooking,
  claimBooking,
  decideBooking,
  getBooking,
  listBookingSlots,
  listBookingEvents,
  listBookingProperties,
  listBookings,
  propertyBookingConflicts,
  saveBooking,
  submitBooking,
  type BookingDeps,
} from '../../usecase/facility-booking.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse, objectId as id } from './request.js'

const date = z.string().datetime({ offset: true })
export const bookingBody = z
  .object({
    propertyId: id,
    purpose: z.string().trim().min(1).max(2000),
    startAt: date,
    endAt: date,
    headcount: z.number().int().min(1).max(10000),
    equipment: z.array(z.string().trim().min(1).max(60)).max(30),
    eventId: id.optional(),
  })
  .strict()
export const bookingSaveBody = bookingBody.extend({ expectedVersion: z.number().int().min(0) })
export const bookingVersionBody = z.object({ expectedVersion: z.number().int().min(0) }).strict()
export const bookingReasonBody = z.object({ reason: z.string().trim().min(1).max(2000) }).strict()
export const bookingDecisionBody = bookingReasonBody
  .extend({
    outcome: z.enum(['Approve', 'Reject', 'Request revision']),
    reviewNote: z.string().max(2000).optional(),
    overbookingReason: bookingReasonBody.shape.reason.optional(),
    alternative: z.object({ propertyId: id, startAt: date, endAt: date }).strict().optional(),
  })
  .strict()
export const bookingAvailabilityQuery = z.object({ startAt: date, endAt: date }).strict()
// Chuyển body đặt phòng sang BookingInput
function input(body: z.infer<typeof bookingBody>): BookingInput {
  return { ...body, startAt: new Date(body.startAt), endAt: new Date(body.endAt) }
}
// Mount các route đặt phòng và cơ sở vật chất của CLB và ICPDP
export function facilityBookingRoutes(deps: BookingDeps & SessionDeps): Router {
  const router = Router()
  const { read, write } = guards(deps)
  // Lấy danh sách khung giờ đặt phòng
  router.get('/booking-slots', read, (_req, res) => {
    ok(res, listBookingSlots())
  })
  const clubBase = '/clubs/:clubId/bookings'
  // Liệt kê sự kiện có thể gắn với booking của CLB
  router.get('/clubs/:clubId/booking-events', read, async (req, res) => {
    ok(
      res,
      await listBookingEvents(
        deps,
        actor(res),
        parse(id, req.params.clubId, 'booking request'),
        new Date(),
      ),
    )
  })
  // Liệt kê phòng và tài sản có thể đặt cho CLB
  router.get('/clubs/:clubId/booking-properties', read, async (req, res) => {
    ok(
      res,
      await listBookingProperties(
        deps,
        actor(res),
        parse(id, req.params.clubId, 'booking request'),
        new Date(),
      ),
    )
  })
  // Xem lịch trống của một phòng
  router.get('/clubs/:clubId/booking-properties/:id/availability', read, async (req, res) => {
    const query = parse(bookingAvailabilityQuery, req.query, 'booking request')
    ok(
      res,
      await bookingAvailability(
        deps,
        actor(res),
        parse(id, req.params.clubId, 'booking request'),
        input({
          ...query,
          propertyId: parse(id, req.params.id, 'booking request'),
          purpose: 'Availability check',
          headcount: 1,
          equipment: [],
        }),
        new Date(),
      ),
    )
  })
  // Liệt kê booking của CLB
  router.get(clubBase, read, async (req, res) => {
    ok(
      res,
      await listBookings(
        deps,
        actor(res),
        parse(id, req.params.clubId, 'booking request'),
        new Date(),
      ),
    )
  })
  // Tạo hoặc lưu bản nháp booking
  router.post(clubBase, write, async (req, res) => {
    ok(
      res,
      await saveBooking(
        deps,
        actor(res),
        parse(id, req.params.clubId, 'booking request'),
        null,
        input(parse(bookingBody, req.body, 'booking request')),
        new Date(),
      ),
      201,
    )
  })
  // Xem chi tiết một booking của CLB
  router.get(`${clubBase}/:id`, read, async (req, res) => {
    ok(
      res,
      await getBooking(
        deps,
        actor(res),
        parse(id, req.params.clubId, 'booking request'),
        parse(id, req.params.id, 'booking request'),
        new Date(),
      ),
    )
  })
  // Cập nhật booking của CLB
  router.patch(`${clubBase}/:id`, write, async (req, res) => {
    const body = parse(bookingSaveBody, req.body, 'booking request')
    ok(
      res,
      await saveBooking(
        deps,
        actor(res),
        parse(id, req.params.clubId, 'booking request'),
        parse(id, req.params.id, 'booking request'),
        input(body),
        new Date(),
        body.expectedVersion,
      ),
    )
  })
  // Nộp booking cho ICPDP duyệt
  router.post(`${clubBase}/:id/submit`, write, async (req, res) => {
    ok(
      res,
      await submitBooking(
        deps,
        actor(res),
        parse(id, req.params.clubId, 'booking request'),
        parse(id, req.params.id, 'booking request'),
        parse(bookingVersionBody, req.body, 'booking request').expectedVersion,
        new Date(),
      ),
    )
  })
  // Huỷ booking của CLB
  router.post(`${clubBase}/:id/cancel`, write, async (req, res) => {
    ok(
      res,
      await cancelBooking(
        deps,
        actor(res),
        parse(id, req.params.clubId, 'booking request'),
        parse(id, req.params.id, 'booking request'),
        parse(bookingReasonBody, req.body, 'booking request').reason,
        new Date(),
      ),
    )
  })
  // ICPDP liệt kê các booking cần xử lý
  router.get('/admin/bookings', read, async (_req, res) => {
    ok(res, await listBookings(deps, actor(res), null, new Date()))
  })
  // ICPDP xem chi tiết một booking
  router.get('/admin/bookings/:id', read, async (req, res) => {
    ok(
      res,
      await getBooking(
        deps,
        actor(res),
        null,
        parse(id, req.params.id, 'booking request'),
        new Date(),
      ),
    )
  })
  // ICPDP nhận xử lý (claim) một booking
  router.post('/admin/bookings/:id/claim', write, async (req, res) => {
    parse(z.object({}).strict(), req.body ?? {}, 'booking request')
    ok(
      res,
      await claimBooking(deps, actor(res), parse(id, req.params.id, 'booking request'), new Date()),
    )
  })
  // ICPDP ghi quyết định cho booking
  router.post('/admin/bookings/:id/decision', write, async (req, res) => {
    const body = parse(bookingDecisionBody, req.body, 'booking request')
    ok(
      res,
      await decideBooking(
        deps,
        actor(res),
        parse(id, req.params.id, 'booking request'),
        {
          ...body,
          alternative: body.alternative
            ? {
                ...body.alternative,
                startAt: new Date(body.alternative.startAt),
                endAt: new Date(body.alternative.endAt),
              }
            : undefined,
        },
        new Date(),
      ),
    )
  })
  // ICPDP xem xung đột booking của một tài sản
  router.get('/admin/properties/:id/booking-conflicts', read, async (req, res) => {
    ok(
      res,
      await propertyBookingConflicts(
        deps,
        actor(res),
        parse(id, req.params.id, 'booking request'),
        new Date(),
      ),
    )
  })
  return router
}
