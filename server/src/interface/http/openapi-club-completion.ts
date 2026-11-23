import { clubViolationResponseBody, correctiveSubmissionBody } from "./club-violation-routes.js";
import { z } from "zod";
import type { createDocument } from "zod-openapi";
import { transitionPlanBody, transitionPlanSaveBody, transitionRevisionBody } from "./club-transition-plan-routes.js";
import { suspensionRequestBody, suspensionDecisionBody } from "./suspension-request-routes.js";
const clubPath = z.object({ clubId: z.string() });
const planPath = clubPath.extend({ id: z.string() });
const itemPath = z.object({ id: z.string() });
const responses = { "200": { description: "Operation completed" }, "400": { description: "Invalid request" }, "403": { description: "Permission required" }, "409": { description: "State or revision conflict" } };
function body(schema: z.ZodType) { return { required: true, content: { "application/json": { schema } } }; }
export const clubCompletionOpenApiPaths = {
  "/clubs/{clubId}/violations": { get: { summary: "UC40 cases already disclosed to this club", requestParams: { path: clubPath }, responses } },
  "/clubs/{clubId}/violations/{id}/response": { post: { summary: "UC40 submit club explanation once (CSRF required)", requestParams: { path: planPath }, requestBody: body(clubViolationResponseBody), responses } },
  "/clubs/{clubId}/violations/{id}/actions/{actionId}/submission": { post: { summary: "UC40 submit corrective evidence for ICPDP verification (CSRF required)", requestParams: { path: planPath.extend({ actionId: z.string() }) }, requestBody: body(correctiveSubmissionBody), responses } },
  "/clubs/{clubId}/evaluations": { get: { summary: "UC43 only Published evaluations and Published revisions for this club", requestParams: { path: clubPath }, responses } },
  "/clubs/{clubId}/transition-plans": {
    get: { summary: "UC12 current term, board, candidates, obligations and plans", requestParams: { path: clubPath }, responses },
    post: { summary: "UC12 create a draft and Planned target term (CSRF required)", requestParams: { path: clubPath }, requestBody: body(transitionPlanBody), responses: { ...responses, "201": { description: "Draft created" } } },
  },
  "/clubs/{clubId}/transition-plans/{id}": { put: { summary: "UC12 edit Draft/Returned using revision (CSRF required)", requestParams: { path: planPath }, requestBody: body(transitionPlanSaveBody), responses } },
  "/clubs/{clubId}/transition-plans/{id}/submit": { post: { summary: "UC12 freeze handover and open UC13 task (CSRF required)", requestParams: { path: planPath }, requestBody: body(transitionRevisionBody), responses } },
  "/clubs/{clubId}/suspension-requests": {
    get: { summary: "UC14 preview affected future events/bookings and own requests", requestParams: { path: clubPath }, responses },
    post: { summary: "UC14 submit with acknowledged cancellation impacts (CSRF required)", requestParams: { path: clubPath }, requestBody: body(suspensionRequestBody), responses: { ...responses, "201": { description: "Request submitted" } } },
  },
  "/admin/suspension-requests": { get: { summary: "UC15 ICPDP suspension request queue and history", responses } },
  "/admin/suspension-requests/{id}/decision": { post: { summary: "UC15 decide request and cascade suspension atomically (CSRF required)", requestParams: { path: itemPath }, requestBody: body(suspensionDecisionBody), responses } },
  "/memberships/reconfirmations/mine": { get: { summary: "UC21 A2 current user's semester membership reconfirmations", responses } },
  "/memberships/reconfirmations/{id}/confirm": { post: { summary: "UC21 A2 confirm own Active membership before deadline (CSRF required)", requestParams: { path: itemPath }, responses } },
} satisfies NonNullable<Parameters<typeof createDocument>[0]["paths"]>;
