import { z } from "zod";
import type { createDocument } from "zod-openapi";
import { clubEventBody, clubEventCancelBody, clubEventCapacityBody, clubEventCheckInBody, clubEventCorrectBody,
  clubEventFeedbackQuery, clubEventPromoteBody, clubEventPublishBody, clubEventReasonBody, clubEventRescheduleBody,
  clubEventSaveBody, clubEventVersionBody, eventObjectId } from "./club-event-routes.js";
const date = z.string().datetime();
const Event = clubEventBody.extend({ id: eventObjectId, clubId: eventObjectId, clubName: z.string(), state: z.string(), semesterCode: z.string(),
  version: z.number(), currentRevisionNo: z.number(), confirmedRegistrationCount: z.number(), approvalConditions: z.array(z.string()), attendanceFinalized: z.boolean(),
  publishedAt: date.optional(), registrationOpenAt: date.optional(), registrationCloseAt: date.optional(), checkInCode: z.string().optional(),
  checkInOpenAt: date.optional(), checkInCloseAt: date.optional(), allowWalkIn: z.boolean(), waitlistEnabled: z.boolean(),
  conflictResult: z.string().optional(), conflictDetail: z.unknown().optional(), revisionDeadlineAt: date.optional() });
const Detail = z.object({ event: Event, versions: z.array(z.object({ revisionNo: z.number(), payload: z.unknown(), budgetLines: clubEventBody.shape.budgetLines, submittedAt: date })),
  decisions: z.array(z.object({ outcome: z.string(), reason: z.string().optional(), comments: z.unknown().optional(), at: date })),
  bookings: z.array(z.object({ id: eventObjectId, propertyId: eventObjectId, propertyName: z.string(), state: z.string(), startAt: date, endAt: date })),
  budget: z.object({ state: z.string(), approvedTotal: z.number(), disbursedTotal: z.number() }).optional() });
const Participant = z.object({ studentId: eventObjectId, name: z.string(), email: z.string(), registrationId: eventObjectId.optional(), state: z.string().optional(),
  waitlistPosition: z.number().optional(), attendanceId: eventObjectId.optional(), checkedInAt: date.optional(), method: z.string().optional(), abnormalFlags: z.array(z.string()), correctionReason: z.string().optional(), finalized: z.boolean() });
function response(schema: z.ZodType, status = "200") {
  return { [status]: { description: "Success", content: { "application/json": { schema: z.object({ statusCode: z.number(), message: z.string(), data: schema, timestamp: date }) } } },
    "400": { description: "Invalid request" }, "401": { description: "Authentication required" }, "403": { description: "Permission required" }, "409": { description: "State or version conflict" } };
}
const clubPath = z.object({ clubId: eventObjectId });
const eventPath = clubPath.extend({ id: eventObjectId });
const base = "/clubs/{clubId}/events";
export const clubEventOpenApiPaths: NonNullable<Parameters<typeof createDocument>[0]["paths"]> = {
  [base]: {
    get: { summary: "List club events by current permissions", requestParams: { path: clubPath }, responses: response(z.array(Event)) },
    post: { summary: "Create a club event draft", requestParams: { path: clubPath }, requestBody: { content: { "application/json": { schema: clubEventBody } } }, responses: response(Detail, "201") },
  },
  [`${base}/options`]: { get: { summary: "Event properties and club booking choices", requestParams: { path: clubPath }, responses: response(z.object({
    properties: z.array(z.object({ id: eventObjectId, name: z.string() })), bookings: z.array(z.object({ id: eventObjectId, propertyId: eventObjectId, title: z.string(), startAt: date, endAt: date })) })) } },
  [`${base}/feedback`]: { get: { summary: "Compare anonymized event feedback; hide content below policy threshold", requestParams: { path: clubPath, query: clubEventFeedbackQuery },
    responses: response(z.array(z.object({ eventId: eventObjectId, title: z.string(), respondents: z.number(), visible: z.boolean(), averageRating: z.number().optional(), distribution: z.record(z.number()).optional(), comments: z.array(z.string()).optional() }))) } },
  [`${base}/{id}`]: { get: { summary: "Read club event proposal and history", requestParams: { path: eventPath }, responses: response(Detail) } },
  [`${base}/{id}/participants`]: { get: { summary: "Read registrations and attendance review", requestParams: { path: eventPath }, responses: response(z.array(Participant)) } },
};
const operations: [string, z.ZodType, string][] = [
  ["save", clubEventSaveBody, "Save an editable draft using its expected version"],
  ["submit", clubEventVersionBody, "Submit a new immutable proposal revision"],
  ["publish", clubEventPublishBody, "Publish an approved event and configure admission"],
  ["cancel", clubEventCancelBody, "Cancel event, registrations, bookings and financial obligations"],
  ["reschedule", clubEventRescheduleBody, "Reschedule and request a new approval"],
  ["capacity", clubEventCapacityBody, "Change capacity and promote FIFO waitlist"],
  ["promote", clubEventPromoteBody, "Promote the first waitlisted registration"],
  ["check-ins", clubEventCheckInBody, "Check in a participant manually"],
  ["attendance/correct", clubEventCorrectBody, "Review abnormal attendance or confirm a no-show"],
  ["attendance/finalize", z.object({}).strict(), "Finalize attendance after completion"],
  ["attendance/unlock", clubEventReasonBody, "Unlock finalized attendance with ATTENDANCE_UNLOCK role"],
];
for (const [path, schema, summary] of operations) clubEventOpenApiPaths[`${base}/{id}/${path}`] = {
  post: { summary, requestParams: { path: eventPath }, requestBody: { content: { "application/json": { schema } } }, responses: response(Detail) },
};
