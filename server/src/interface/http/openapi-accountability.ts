import { z } from "zod";
import type { createDocument } from "zod-openapi";
import { financeActionBody, financePath } from "./event-finance-routes.js";
import { reportActionBody, reportPath } from "./post-event-report-routes.js";
const date = z.string().datetime();
const totals = z.object({
  approvedTotal: z.number(),
  advanceTotal: z.number(),
  recordedTotal: z.number(),
  supportedTotal: z.number(),
  unsupportedTotal: z.number(),
  remaining: z.number(),
});
const evidence = z.object({
  id: z.string(),
  type: z.string(),
  externalLink: z.string(),
  uploadedBy: z.string(),
  uploadedAt: date,
});
const finance = z.object({
  id: z.string(),
  clubId: z.string(),
  eventId: z.string(),
  eventTitle: z.string(),
  eventState: z.string(),
  state: z.string(),
  revision: z.number(),
  settlementDueAt: date.optional(),
  settlementSubmittedAt: date.optional(),
  isSettlementLate: z.boolean(),
  acceptedTotal: z.number().optional(),
  settlementBalance: z.number().optional(),
  recoveryAmount: z.number().optional(),
  recoveryDueAt: date.optional(),
  refundedTotal: z.number(),
  lines: z.array(
    z.object({ category: z.string(), approvedAmount: z.number() }),
  ),
  totals,
  expenses: z.array(
    z.object({
      id: z.string(),
      category: z.string(),
      amount: z.number(),
      spentAt: date,
      description: z.string().optional(),
      isOutOfCategory: z.boolean(),
      isOverRemaining: z.boolean(),
      hasEvidence: z.boolean(),
      reviewOutcome: z.string().optional(),
      reviewReason: z.string().optional(),
      evidences: z.array(evidence),
    }),
  ),
  task: z
    .object({ id: z.string(), assigneeId: z.string().optional() })
    .optional(),
  history: z.array(
    z.object({
      action: z.string(),
      at: date,
      snapshot: z.unknown(),
      reason: z.string().optional(),
    }),
  ),
});
const snapshot = z.object({
  proposal: z.unknown(),
  attendance: z.object({
    confirmed: z.number(),
    attended: z.number(),
    absent: z.number(),
    finalizedAt: date.optional(),
  }),
  budget: z.unknown(),
  expenses: z.unknown(),
  feedback: z.unknown(),
  policyVersionId: z.string(),
  dueAt: date,
});
const report = z.object({
  id: z.string(),
  eventId: z.string(),
  clubId: z.string(),
  eventTitle: z.string(),
  eventState: z.string(),
  state: z.string(),
  versionNo: z.number(),
  revision: z.number(),
  lateFlag: z.boolean(),
  actualResult: z.string(),
  incidents: z.string().optional(),
  lessonsLearned: z.string().optional(),
  evidence: z.array(z.object({ note: z.string(), url: z.string() })),
  submittedAt: date.optional(),
  decisionOutcome: z.string().optional(),
  decisionReason: z.string().optional(),
  findingViolationId: z.string().optional(),
  preloadedFigures: snapshot,
  task: z
    .object({ id: z.string(), assigneeId: z.string().optional() })
    .optional(),
});
const obligation = z.object({
  eventId: z.string(),
  eventTitle: z.string(),
  state: z.string(),
  revision: z.number(),
  dueAt: date,
  overdue: z.boolean(),
  report: report.optional(),
});
const detail = z.object({
  obligation,
  versions: z.array(report),
  preview: snapshot,
});
function responses(schema: z.ZodType) {
  return {
    "200": {
      description: "Success",
      content: {
        "application/json": {
          schema: z.object({
            statusCode: z.number(),
            message: z.string(),
            data: schema,
            timestamp: date,
          }),
        },
      },
    },
    "400": { description: "Invalid request" },
    "401": { description: "Authentication required" },
    "403": { description: "Permission required" },
    "404": { description: "Record not found" },
    "409": { description: "State or revision conflict" },
  };
}
export const accountabilityOpenApiPaths: NonNullable<
  Parameters<typeof createDocument>[0]["paths"]
> = {
  "/clubs/{clubId}/budgets": {
    get: {
      summary: "Club expense workspace",
      requestParams: { path: financePath.pick({ clubId: true }) },
      responses: responses(z.array(finance)),
    },
  },
};
for (const base of [
  "/clubs/{clubId}/budgets/{id}",
  "/admin/budgets/{id}/reconciliation",
]) {
  const path = base.startsWith("/clubs")
    ? financePath
    : financePath.pick({ id: true });
  accountabilityOpenApiPaths[base] = {
    get: {
      summary: "Budget expenses, evidence and settlement history",
      requestParams: { path },
      responses: responses(finance),
    },
  };
  accountabilityOpenApiPaths[`${base}/actions`] = {
    post: {
      summary: "Expense, evidence, submit or officer reconciliation action",
      requestParams: { path },
      requestBody: {
        content: { "application/json": { schema: financeActionBody } },
      },
      responses: responses(finance),
    },
  };
}
for (const base of ["/clubs/{clubId}/event-reports", "/admin/event-reports"]) {
  const club = base.startsWith("/clubs");
  accountabilityOpenApiPaths[base] = {
    get: {
      summary: "Post-event reporting obligations",
      ...(club
        ? { requestParams: { path: reportPath.pick({ clubId: true }) } }
        : {}),
      responses: responses(z.array(obligation)),
    },
  };
  const path = club ? reportPath : reportPath.pick({ id: true });
  accountabilityOpenApiPaths[`${base}/{id}`] = {
    get: {
      summary: "Report versions and live preview",
      requestParams: { path },
      responses: responses(detail),
    },
  };
  accountabilityOpenApiPaths[`${base}/{id}/actions`] = {
    post: {
      summary: "Save, submit, claim or decide a report",
      requestParams: { path },
      requestBody: {
        content: { "application/json": { schema: reportActionBody } },
      },
      responses: responses(detail),
    },
  };
}
