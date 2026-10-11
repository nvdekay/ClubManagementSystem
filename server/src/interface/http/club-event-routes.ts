import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import type { ClubAccessRepository } from "../../domain/access.js";
import type { ClubEventAction, ClubEventInput, ClubEventRepository } from "../../domain/club-event.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import { actOnClubEvent, clubEventOptions, clubEventFeedback, clubEventParticipants, createClubEvent, getClubEvent, listClubEvents } from "../../usecase/club-event.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export const eventObjectId = z.string().regex(/^[0-9a-f]{24}$/i);
const date = z.string().datetime();
const expectedVersion = z.number().int().nonnegative();
const reason = z.string().trim().min(1).max(2000);
const formField = z.object({ key: z.string().min(1).max(80), label: z.string().min(1).max(300),
  type: z.enum(["text", "textarea", "select", "radio", "checkbox"]), required: z.boolean(),
  options: z.array(z.string().min(1).max(300)).max(30).optional() }).strict();
export const clubEventBody = z.object({
  title: z.string().trim().min(1).max(200), objective: z.string().trim().min(1).max(5000), plan: z.string().trim().min(1).max(20000),
  startAt: date, endAt: date, venueText: z.string().trim().max(300).optional(), propertyId: eventObjectId.optional(),
  audienceScope: z.enum(["PUBLIC", "MEMBERS_ONLY"]), capacity: z.number().int().min(1).max(100000),
  riskCategory: z.enum(["LOW", "MEDIUM", "HIGH"]), riskNote: z.string().max(5000).optional(), facilityNeeds: z.string().max(5000).optional(),
  occurrences: z.array(z.object({ startAt: date, endAt: date }).strict()).max(50).optional(),
  budgetLines: z.array(z.object({ category: z.string().trim().min(1).max(200), amount: z.number().int().positive().max(1000000000000),
    purpose: z.string().trim().min(1).max(2000), plannedItems: z.string().max(5000).optional() }).strict()).max(50),
  bookingIds: z.array(eventObjectId).max(50), registrationForm: z.array(formField).max(30).optional(),
}).strict();
export const clubEventSaveBody = clubEventBody.extend({ expectedVersion }).strict();
export const clubEventVersionBody = z.object({ expectedVersion }).strict();
export const clubEventPublishBody = z.object({ expectedVersion, registrationOpenAt: date.optional(), registrationCloseAt: date.optional(),
  checkInOpenAt: date, checkInCloseAt: date, allowWalkIn: z.boolean(), waitlistEnabled: z.boolean() }).strict();
export const clubEventCancelBody = z.object({ expectedVersion, reason }).strict();
export const clubEventRescheduleBody = z.object({ expectedVersion, reason, startAt: date, endAt: date,
  venueText: z.string().max(300).optional(), propertyId: eventObjectId.optional() }).strict();
export const clubEventCapacityBody = z.object({ capacity: z.number().int().min(1).max(100000) }).strict();
export const clubEventPromoteBody = z.object({ registrationId: eventObjectId }).strict();
export const clubEventCheckInBody = z.object({ studentId: eventObjectId, reason: reason.optional() }).strict();
export const clubEventCorrectBody = z.object({ studentId: eventObjectId, reason, checkedInAt: date.optional(), absent: z.boolean() }).strict();
export const clubEventReasonBody = z.object({ reason }).strict();
export const clubEventFeedbackQuery = z.object({ eventIds: z.string().min(1).max(1000) }).strict();
const emptyBody = z.object({}).strict();
function parse<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) throw new DomainError("invalid event request", "validation", result.error.issues);
  return result.data;
}
function actor(res: Response): AccessActor { return res.locals.actor as AccessActor; }
function input(body: z.infer<typeof clubEventBody>): ClubEventInput {
  return { ...body, startAt: new Date(body.startAt), endAt: new Date(body.endAt),
    occurrences: body.occurrences?.map((o) => ({ startAt: new Date(o.startAt), endAt: new Date(o.endAt) })) };
}
export interface ClubEventRouteDeps {
  repo: ClubEventRepository; access: ClubAccessRepository; authRepo: AuthRepository; sessions: SessionService;
}
export function clubEventRoutes(deps: ClubEventRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };
  const usecases = { repo: deps.repo, access: deps.access, auth: deps.authRepo };
  const base = "/clubs/:clubId/events";
  router.get(base, authGuard(guard, false), async (req, res) => {
    ok(res, await listClubEvents(usecases, actor(res), parse(eventObjectId, req.params.clubId), new Date()));
  });
  router.get(`${base}/options`, authGuard(guard, false), async (req, res) => {
    ok(res, await clubEventOptions(usecases, actor(res), parse(eventObjectId, req.params.clubId), new Date()));
  });
  router.get(`${base}/feedback`, authGuard(guard, false), async (req, res) => {
    const query = parse(clubEventFeedbackQuery, req.query);
    ok(res, await clubEventFeedback(usecases, actor(res), parse(eventObjectId, req.params.clubId), query.eventIds.split(","), new Date()));
  });
  router.get(`${base}/:id`, authGuard(guard, false), async (req, res) => {
    ok(res, await getClubEvent(usecases, actor(res), parse(eventObjectId, req.params.clubId), parse(eventObjectId, req.params.id), new Date()));
  });
  router.get(`${base}/:id/participants`, authGuard(guard, false), async (req, res) => {
    ok(res, await clubEventParticipants(usecases, actor(res), parse(eventObjectId, req.params.clubId), parse(eventObjectId, req.params.id), new Date()));
  });
  router.post(base, authGuard(guard), async (req, res) => {
    ok(res, await createClubEvent(usecases, actor(res), parse(eventObjectId, req.params.clubId), input(parse(clubEventBody, req.body)), new Date()), 201);
  });
  const actions: { path: string; parse: (raw: unknown) => ClubEventAction }[] = [
    { path: "save", parse: (raw) => { const { expectedVersion, ...body } = parse(clubEventSaveBody, raw); return { kind: "save", input: input(body), expectedVersion }; } },
    { path: "submit", parse: (raw) => ({ kind: "submit", ...parse(clubEventVersionBody, raw) }) },
    { path: "publish", parse: (raw) => { const { expectedVersion, ...body } = parse(clubEventPublishBody, raw); return { kind: "publish", expectedVersion, input: { ...body,
      registrationOpenAt: body.registrationOpenAt ? new Date(body.registrationOpenAt) : undefined,
      registrationCloseAt: body.registrationCloseAt ? new Date(body.registrationCloseAt) : undefined,
      checkInOpenAt: new Date(body.checkInOpenAt), checkInCloseAt: new Date(body.checkInCloseAt) } }; } },
    { path: "cancel", parse: (raw) => ({ kind: "cancel", ...parse(clubEventCancelBody, raw) }) },
    { path: "reschedule", parse: (raw) => { const body = parse(clubEventRescheduleBody, raw); return { kind: "reschedule", ...body, startAt: new Date(body.startAt), endAt: new Date(body.endAt) }; } },
    { path: "capacity", parse: (raw) => ({ kind: "capacity", ...parse(clubEventCapacityBody, raw) }) },
    { path: "promote", parse: (raw) => ({ kind: "promote", ...parse(clubEventPromoteBody, raw) }) },
    { path: "check-ins", parse: (raw) => ({ kind: "check-in", ...parse(clubEventCheckInBody, raw) }) },
    { path: "attendance/correct", parse: (raw) => { const body = parse(clubEventCorrectBody, raw); return { kind: "correct", ...body, checkedInAt: body.checkedInAt ? new Date(body.checkedInAt) : undefined }; } },
    { path: "attendance/finalize", parse: (raw) => { parse(emptyBody, raw); return { kind: "finalize" }; } },
    { path: "attendance/unlock", parse: (raw) => ({ kind: "unlock", ...parse(clubEventReasonBody, raw) }) },
  ];
  for (const action of actions) router.post(`${base}/:id/${action.path}`, authGuard(guard), async (req, res) => {
    ok(res, await actOnClubEvent(usecases, actor(res), parse(eventObjectId, req.params.clubId), parse(eventObjectId, req.params.id), action.parse(req.body), new Date()));
  });
  return router;
}
