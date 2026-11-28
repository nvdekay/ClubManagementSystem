import { z } from 'zod'
import { commonErrors, jsonOk, type OpenApiPaths } from './openapi-shared.js'
import {
  clubEventBody,
  clubEventCancelBody,
  clubEventCapacityBody,
  clubEventCheckInBody,
  clubEventCorrectBody,
  clubEventFeedbackQuery,
  clubEventPromoteBody,
  clubEventPublishBody,
  clubEventReasonBody,
  clubEventRescheduleBody,
  clubEventSaveBody,
  clubEventVersionBody,
  proposalDocumentAccessQuery,
} from './club-event-routes.js'
import { objectId } from './request.js'
const date = z.string().datetime()
const ProposalDocument = z.object({
  id: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  bytes: z.number(),
  uploadedAt: date,
  uploadedBy: objectId,
})
const TemplateInfo = z.object({
  fileName: z.string(),
  mimeType: z.string(),
  bytes: z.number(),
  updatedAt: date,
  isSystemDefault: z.boolean(),
})
const DocumentAccess = z.object({
  fileName: z.string(),
  mimeType: z.string(),
  url: z.string().url(),
})
const rawFile = { content: { 'application/octet-stream': { schema: z.string() } } }
const Event = clubEventBody.extend({
  id: objectId,
  clubId: objectId,
  clubName: z.string(),
  state: z.string(),
  semesterCode: z.string(),
  version: z.number(),
  currentRevisionNo: z.number(),
  confirmedRegistrationCount: z.number(),
  approvalConditions: z.array(z.string()),
  attendanceFinalized: z.boolean(),
  publishedAt: date.optional(),
  registrationOpenAt: date.optional(),
  registrationCloseAt: date.optional(),
  checkInCode: z.string().optional(),
  checkInOpenAt: date.optional(),
  checkInCloseAt: date.optional(),
  allowWalkIn: z.boolean(),
  waitlistEnabled: z.boolean(),
  conflictResult: z.string().optional(),
  conflictDetail: z.unknown().optional(),
  revisionDeadlineAt: date.optional(),
  proposalDocument: ProposalDocument.optional(),
})
const Detail = z.object({
  event: Event,
  versions: z.array(
    z.object({
      revisionNo: z.number(),
      payload: z.unknown(),
      budgetLines: clubEventBody.shape.budgetLines,
      submittedAt: date,
    }),
  ),
  decisions: z.array(
    z.object({
      outcome: z.string(),
      reason: z.string().optional(),
      comments: z.unknown().optional(),
      at: date,
    }),
  ),
  bookings: z.array(
    z.object({
      id: objectId,
      propertyId: objectId,
      propertyName: z.string(),
      state: z.string(),
      startAt: date,
      endAt: date,
    }),
  ),
  budget: z
    .object({ state: z.string(), approvedTotal: z.number(), disbursedTotal: z.number() })
    .optional(),
})
const Participant = z.object({
  studentId: objectId,
  name: z.string(),
  email: z.string(),
  registrationId: objectId.optional(),
  state: z.string().optional(),
  waitlistPosition: z.number().optional(),
  attendanceId: objectId.optional(),
  checkedInAt: date.optional(),
  method: z.string().optional(),
  abnormalFlags: z.array(z.string()),
  correctionReason: z.string().optional(),
  finalized: z.boolean(),
})
// Tạo bộ response mẫu (200 kèm lỗi 400/401/403/409) cho endpoint sự kiện CLB
function response(schema: z.ZodType, status = '200') {
  return {
    [status]: jsonOk('Success', schema, date),
    ...commonErrors,
    '409': { description: 'State or version conflict' },
  }
}
const clubPath = z.object({ clubId: objectId })
const eventPath = clubPath.extend({ id: objectId })
const base = '/clubs/{clubId}/events'
export const clubEventOpenApiPaths: OpenApiPaths = {
  [base]: {
    get: {
      summary: 'List club events by current permissions',
      requestParams: { path: clubPath },
      responses: response(z.array(Event)),
    },
    post: {
      summary: 'Create a club event draft',
      requestParams: { path: clubPath },
      requestBody: { content: { 'application/json': { schema: clubEventBody } } },
      responses: response(Detail, '201'),
    },
  },
  [`${base}/options`]: {
    get: {
      summary: 'Event properties and club booking choices',
      requestParams: { path: clubPath },
      responses: response(
        z.object({
          properties: z.array(z.object({ id: objectId, name: z.string() })),
          bookings: z.array(
            z.object({
              id: objectId,
              propertyId: objectId,
              propertyType: z.string().optional(),
              title: z.string(),
              startAt: date,
              endAt: date,
            }),
          ),
        }),
      ),
    },
  },
  [`${base}/feedback`]: {
    get: {
      summary: 'Compare anonymized event feedback; hide content below policy threshold',
      requestParams: { path: clubPath, query: clubEventFeedbackQuery },
      responses: response(
        z.array(
          z.object({
            eventId: objectId,
            title: z.string(),
            respondents: z.number(),
            visible: z.boolean(),
            averageRating: z.number().optional(),
            distribution: z.record(z.string(), z.number()).optional(),
            comments: z.array(z.string()).optional(),
          }),
        ),
      ),
    },
  },
  [`${base}/{id}`]: {
    get: {
      summary: 'Read club event proposal and history',
      requestParams: { path: eventPath },
      responses: response(Detail),
    },
  },
  '/events/proposal-template': {
    get: {
      summary:
        'Read the active ICPDP event proposal template (system default until ICPDP uploads one)',
      responses: response(TemplateInfo),
    },
  },
  '/events/proposal-template/download': {
    get: {
      summary:
        'Download the active template: the system default as an attachment, or a redirect to a 60-second signed URL',
      responses: {
        '200': {
          description: 'Template file',
          content: { 'application/octet-stream': { schema: z.string() } },
        },
        '302': { description: 'Redirect to a signed URL' },
        '401': { description: 'Authentication required' },
      },
    },
  },
  [`${base}/{id}/proposal-document`]: {
    post: {
      summary:
        'Attach or replace the proposal document (PDF/DOCX <= 10MB, URI-encoded X-Filename) of a Draft or Revision Requested ICPDP proposal',
      requestParams: { path: eventPath },
      requestBody: rawFile,
      responses: response(Detail),
    },
  },
  [`${base}/{id}/proposal-document/access`]: {
    get: {
      summary: "60-second signed URL to the draft's proposal document or a submitted revision's",
      requestParams: { path: eventPath, query: proposalDocumentAccessQuery },
      responses: response(DocumentAccess),
    },
  },
  '/admin/event-proposals/template': {
    post: {
      summary:
        'ICPDP officer replaces the event proposal template (DOCX/PDF/XLSX <= 10MB, URI-encoded X-Filename)',
      requestBody: rawFile,
      responses: response(TemplateInfo, '201'),
    },
  },
  '/admin/event-proposals/{id}/document/access': {
    get: {
      summary:
        'ICPDP officer reads a 60-second signed URL to the proposal document of the latest or a given revision',
      requestParams: { path: z.object({ id: objectId }), query: proposalDocumentAccessQuery },
      responses: response(DocumentAccess),
    },
  },
  [`${base}/{id}/participants`]: {
    get: {
      summary: 'Read registrations and attendance review',
      requestParams: { path: eventPath },
      responses: response(z.array(Participant)),
    },
  },
}
const operations: [string, z.ZodType, string][] = [
  ['save', clubEventSaveBody, 'Save an editable draft using its expected version'],
  ['submit', clubEventVersionBody, 'Submit a new immutable proposal revision'],
  ['publish', clubEventPublishBody, 'Publish an approved event (Upcoming) and configure admission'],
  [
    'cancel',
    clubEventCancelBody,
    'Cancel event, registrations, bookings and financial obligations',
  ],
  ['reschedule', clubEventRescheduleBody, 'Reschedule a proposal and request a new approval'],
  ['capacity', clubEventCapacityBody, 'Change capacity and promote FIFO waitlist'],
  ['promote', clubEventPromoteBody, 'Promote the first waitlisted registration'],
  ['check-ins', clubEventCheckInBody, 'Check in a participant manually'],
  ['attendance/correct', clubEventCorrectBody, 'Review abnormal attendance or confirm a no-show'],
  ['attendance/finalize', z.object({}).strict(), 'Finalize attendance after completion'],
  [
    'attendance/unlock',
    clubEventReasonBody,
    'Unlock finalized attendance with the ICPDP officer role',
  ],
]
for (const [path, schema, summary] of operations) {
  clubEventOpenApiPaths[`${base}/{id}/${path}`] = {
    post: {
      summary,
      requestParams: { path: eventPath },
      requestBody: { content: { 'application/json': { schema } } },
      responses: response(Detail),
    },
  }
}
