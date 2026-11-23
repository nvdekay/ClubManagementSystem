import { z } from "zod";
import type { createDocument } from "zod-openapi";
import { DEFENSE_OUTCOMES, EVENT_DEFENSE_STATES } from "../../domain/event-defense.js";
import {
  defenseNoteBody,
  defenseOptionalReasonBody,
  defenseReasonBody,
  defenseRespondRescheduleBody,
  defenseRoomsQuery,
  defenseScheduleBody,
} from "./event-defense-routes.js";
import { eventReviewDecisionBody } from "./event-proposal-review-routes.js";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i);
const date = z.string().datetime();

export const DefenseOfficerNoteSchema = z.object({
  officerId: z.string(),
  officerName: z.string(),
  content: z.string(),
  updatedAt: date,
});

export const EventDefenseSessionSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  revisionNo: z.number(),
  title: z.string(),
  startAt: date,
  endAt: date,
  durationMinutes: z.number(),
  propertyId: z.string(),
  propertyName: z.string(),
  note: z.string().optional(),
  state: z.enum(EVENT_DEFENSE_STATES),
  rescheduleReason: z.string().optional(),
  confirmedAt: date.optional(),
  confirmedBy: z.string().optional(),
  startedAt: date.optional(),
  endedAt: date.optional(),
  leadOfficerId: z.string(),
  notes: z.array(DefenseOfficerNoteSchema),
  outcome: z.enum(DEFENSE_OUTCOMES).optional(),
  outcomeReason: z.string().optional(),
  cancelReason: z.string().optional(),
  createdAt: date,
  updatedAt: date,
});

const AvailableDefenseRoomSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  location: z.string(),
  capacity: z.number().optional(),
  available: z.boolean(),
  conflictReason: z.string().optional(),
});

const ClubEventDefenseViewSchema = z.object({
  eventId: z.string(),
  eventTitle: z.string(),
  eventState: z.string(),
  activeSession: EventDefenseSessionSchema.optional(),
  history: z.array(EventDefenseSessionSchema),
});

function response(schema: z.ZodType) {
  return {
    "200": {
      description: "Success",
      content: {
        "application/json": {
          schema: z.object({ statusCode: z.number(), message: z.string(), data: schema, timestamp: date }),
        },
      },
    },
    "400": { description: "Invalid request" },
    "401": { description: "Authentication required" },
    "403": { description: "Permission required" },
    "409": { description: "State or room conflict" },
  };
}

const idPath = z.object({ id: objectId });
const clubEventPath = z.object({ clubId: objectId, id: objectId });

export const eventDefenseOpenApiPaths: NonNullable<Parameters<typeof createDocument>[0]["paths"]> = {
  "/admin/event-defense/rooms": {
    get: {
      summary: "List ROOM properties and availability for an event defense time slot",
      requestParams: { query: defenseRoomsQuery },
      responses: response(z.array(AvailableDefenseRoomSchema)),
    },
  },
  "/admin/event-proposals/{id}/defense/schedule": {
    post: {
      summary: "Schedule an event defense session (requires CSRF token)",
      requestParams: { path: idPath },
      requestBody: { content: { "application/json": { schema: defenseScheduleBody } } },
      responses: response(EventDefenseSessionSchema),
    },
  },
  "/admin/event-proposals/{id}/defense/cancel": {
    post: {
      summary: "Cancel an active event defense session (requires CSRF token)",
      requestParams: { path: idPath },
      requestBody: { content: { "application/json": { schema: defenseReasonBody } } },
      responses: response(EventDefenseSessionSchema),
    },
  },
  "/admin/event-proposals/{id}/defense/respond-reschedule": {
    post: {
      summary: "Accept or reject a club reschedule request for event defense (requires CSRF token)",
      requestParams: { path: idPath },
      requestBody: { content: { "application/json": { schema: defenseRespondRescheduleBody } } },
      responses: response(EventDefenseSessionSchema),
    },
  },
  "/admin/event-proposals/{id}/defense/start": {
    post: {
      summary: "Start the live event defense session (requires CSRF token)",
      requestParams: { path: idPath },
      responses: response(EventDefenseSessionSchema),
    },
  },
  "/admin/event-proposals/{id}/defense/session": {
    get: {
      summary: "Poll live event defense session status and officer notes",
      requestParams: { path: idPath },
      responses: response(EventDefenseSessionSchema),
    },
  },
  "/admin/event-proposals/{id}/defense/notes": {
    put: {
      summary: "Auto-save officer personal markdown note during live defense (requires CSRF token)",
      requestParams: { path: idPath },
      requestBody: { content: { "application/json": { schema: defenseNoteBody } } },
      responses: response(EventDefenseSessionSchema),
    },
  },
  "/admin/event-proposals/{id}/defense/end": {
    post: {
      summary: "End the live event defense session (requires CSRF token)",
      requestParams: { path: idPath },
      responses: response(EventDefenseSessionSchema),
    },
  },
  "/admin/event-proposals/{id}/defense/no-show": {
    post: {
      summary: "Mark club as no-show and reject event proposal (requires CSRF token)",
      requestParams: { path: idPath },
      requestBody: { content: { "application/json": { schema: defenseOptionalReasonBody } } },
      responses: response(EventDefenseSessionSchema),
    },
  },
  "/admin/event-proposals/{id}/defense/decision": {
    post: {
      summary: "Submit one of 4 post-defense decisions: Approve, Reject, Request revision, or Re-defense (requires CSRF token)",
      requestParams: { path: idPath },
      requestBody: { content: { "application/json": { schema: eventReviewDecisionBody } } },
      responses: response(z.unknown()),
    },
  },
  "/clubs/{clubId}/events/{id}/defense": {
    get: {
      summary: "View active defense schedule and history for a club event proposal",
      requestParams: { path: clubEventPath },
      responses: response(ClubEventDefenseViewSchema),
    },
  },
  "/clubs/{clubId}/events/{id}/defense/confirm": {
    post: {
      summary: "Club Leader confirms attendance at scheduled defense >= 24h ahead (requires CSRF token)",
      requestParams: { path: clubEventPath },
      responses: response(EventDefenseSessionSchema),
    },
  },
  "/clubs/{clubId}/events/{id}/defense/reschedule-request": {
    post: {
      summary: "Club Leader requests reschedule of defense session with reason (requires CSRF token)",
      requestParams: { path: clubEventPath },
      requestBody: { content: { "application/json": { schema: defenseReasonBody } } },
      responses: response(EventDefenseSessionSchema),
    },
  },
};
