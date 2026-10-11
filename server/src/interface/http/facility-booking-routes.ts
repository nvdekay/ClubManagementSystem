import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import type { BookingInput } from "../../domain/facility-booking.js";
import type { AccessActor } from "../../usecase/access.js";
import { bookingResponsible, overbookRoom, reserveRoom, bookingAvailability, cancelBooking, claimBooking, decideBooking, getBooking,
  listBookingSlots, listBookingEvents, listBookingProperties, listBookings, propertyBookingConflicts, saveBooking, submitBooking,
  type BookingDeps } from "../../usecase/facility-booking.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

const id = z.string().regex(/^[0-9a-f]{24}$/i);
const date = z.string().datetime({ offset: true });
export const bookingBody = z.object({ propertyId: id, purpose: z.string().trim().min(1).max(2000),
  startAt: date, endAt: date, headcount: z.number().int().min(1).max(10000),
  equipment: z.array(z.string().trim().min(1).max(60)).max(30), eventId: id.optional() }).strict();
export const roomReservationBody = bookingBody.pick({ propertyId: true, startAt: true, endAt: true }).strict();
export const bookingSaveBody = bookingBody.extend({ expectedVersion: z.number().int().min(0) });
export const bookingVersionBody = z.object({ expectedVersion: z.number().int().min(0) }).strict();
export const bookingReasonBody = z.object({ reason: z.string().trim().min(1).max(2000) }).strict();
export const roomOverbookingBody = roomReservationBody.extend({ reason: bookingReasonBody.shape.reason }).strict();
export const bookingDecisionBody = bookingReasonBody.extend({
  outcome: z.enum(["Approve", "Reject", "Request revision"]), reviewNote: z.string().max(2000).optional(),
  overbookingReason: bookingReasonBody.shape.reason.optional(),
  alternative: z.object({ propertyId: id, startAt: date, endAt: date }).strict().optional(),
}).strict();
export const bookingAvailabilityQuery = z.object({ startAt: date, endAt: date }).strict();
function parsed<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new DomainError("invalid booking request", "validation", result.error.issues);
  return result.data;
}
function actor(res: Response): AccessActor { return res.locals.actor as AccessActor; }
function input(body: z.infer<typeof bookingBody>): BookingInput {
  return { ...body, startAt: new Date(body.startAt), endAt: new Date(body.endAt) };
}
export function facilityBookingRoutes(deps: BookingDeps & { authRepo: AuthRepository; sessions: SessionService }): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };
  router.get("/booking-slots", authGuard(guard, false), (_req, res) => { ok(res, listBookingSlots()); });
  const clubBase = "/clubs/:clubId/bookings";
  router.get("/admin/clubs/:clubId/booking-responsible", authGuard(guard, false), async (req, res) => {
    ok(res, await bookingResponsible(deps, actor(res), parsed(id, req.params.clubId), new Date(), true));
  });
  router.get("/admin/clubs/:clubId/booking-properties/:id/availability", authGuard(guard, false), async (req, res) => {
    const query = parsed(bookingAvailabilityQuery, req.query);
    ok(res, await bookingAvailability(deps, actor(res), parsed(id, req.params.clubId),
      input({ ...query, propertyId: parsed(id, req.params.id), purpose: "Availability check", headcount: 1, equipment: [] }), new Date(), true));
  });
  router.post("/admin/clubs/:clubId/bookings/overbook", authGuard(guard), async (req, res) => {
    const body = parsed(roomOverbookingBody, req.body);
    ok(res, await overbookRoom(deps, actor(res), parsed(id, req.params.clubId),
      { ...body, startAt: new Date(body.startAt), endAt: new Date(body.endAt) }, new Date()), 201);
  });
  router.get("/clubs/:clubId/booking-events", authGuard(guard, false), async (req, res) => {
    ok(res, await listBookingEvents(deps, actor(res), parsed(id, req.params.clubId), new Date()));
  });
  router.get("/clubs/:clubId/booking-properties", authGuard(guard, false), async (req, res) => {
    ok(res, await listBookingProperties(deps, actor(res), parsed(id, req.params.clubId), new Date()));
  });
  router.get("/clubs/:clubId/booking-properties/:id/availability", authGuard(guard, false), async (req, res) => {
    const query = parsed(bookingAvailabilityQuery, req.query);
    ok(res, await bookingAvailability(deps, actor(res), parsed(id, req.params.clubId),
      input({ ...query, propertyId: parsed(id, req.params.id), purpose: "Availability check", headcount: 1, equipment: [] }), new Date()));
  });
  router.get("/clubs/:clubId/booking-responsible", authGuard(guard, false), async (req, res) => {
    ok(res, await bookingResponsible(deps, actor(res), parsed(id, req.params.clubId), new Date()));
  });
  router.post(`${clubBase}/reserve`, authGuard(guard), async (req, res) => {
    const body = parsed(roomReservationBody, req.body);
    ok(res, await reserveRoom(deps, actor(res), parsed(id, req.params.clubId),
      { ...body, startAt: new Date(body.startAt), endAt: new Date(body.endAt) }, new Date()), 201);
  });
  router.get(clubBase, authGuard(guard, false), async (req, res) => {
    ok(res, await listBookings(deps, actor(res), parsed(id, req.params.clubId), new Date()));
  });
  router.post(clubBase, authGuard(guard), async (req, res) => {
    ok(res, await saveBooking(deps, actor(res), parsed(id, req.params.clubId), null,
      input(parsed(bookingBody, req.body)), new Date()), 201);
  });
  router.get(`${clubBase}/:id`, authGuard(guard, false), async (req, res) => {
    ok(res, await getBooking(deps, actor(res), parsed(id, req.params.clubId), parsed(id, req.params.id), new Date()));
  });
  router.patch(`${clubBase}/:id`, authGuard(guard), async (req, res) => {
    const body = parsed(bookingSaveBody, req.body);
    ok(res, await saveBooking(deps, actor(res), parsed(id, req.params.clubId), parsed(id, req.params.id),
      input(body), new Date(), body.expectedVersion));
  });
  router.post(`${clubBase}/:id/submit`, authGuard(guard), async (req, res) => {
    ok(res, await submitBooking(deps, actor(res), parsed(id, req.params.clubId), parsed(id, req.params.id),
      parsed(bookingVersionBody, req.body).expectedVersion, new Date()));
  });
  router.post(`${clubBase}/:id/cancel`, authGuard(guard), async (req, res) => {
    ok(res, await cancelBooking(deps, actor(res), parsed(id, req.params.clubId), parsed(id, req.params.id),
      parsed(bookingReasonBody, req.body).reason, new Date()));
  });
  router.get("/admin/bookings", authGuard(guard, false), async (_req, res) => {
    ok(res, await listBookings(deps, actor(res), null, new Date()));
  });
  router.get("/admin/bookings/:id", authGuard(guard, false), async (req, res) => {
    ok(res, await getBooking(deps, actor(res), null, parsed(id, req.params.id), new Date()));
  });
  router.post("/admin/bookings/:id/claim", authGuard(guard), async (req, res) => {
    parsed(z.object({}).strict(), req.body ?? {});
    ok(res, await claimBooking(deps, actor(res), parsed(id, req.params.id), new Date()));
  });
  router.post("/admin/bookings/:id/decision", authGuard(guard), async (req, res) => {
    const body = parsed(bookingDecisionBody, req.body);
    ok(res, await decideBooking(deps, actor(res), parsed(id, req.params.id), { ...body,
      alternative: body.alternative ? { ...body.alternative, startAt: new Date(body.alternative.startAt),
        endAt: new Date(body.alternative.endAt) } : undefined }, new Date()));
  });
  router.get("/admin/properties/:id/booking-conflicts", authGuard(guard, false), async (req, res) => {
    ok(res, await propertyBookingConflicts(deps, actor(res), parsed(id, req.params.id)));
  });
  return router;
}
