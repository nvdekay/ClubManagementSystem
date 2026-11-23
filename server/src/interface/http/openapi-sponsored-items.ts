import { z } from "zod";
import type { createDocument } from "zod-openapi";
import { sponsoredActionBody } from "./sponsored-item-routes.js";

type Paths = NonNullable<Parameters<typeof createDocument>[0]["paths"]>;
const response = { "200": { description: "Sponsored item result",
  content: { "application/json": { schema: z.object({ statusCode: z.number(), message: z.string(), data: z.unknown(), timestamp: z.string() }) } } } };
export const sponsoredItemOpenApiPaths: Paths = {};
for (const base of ["/clubs/{clubId}/budgets/{id}/items", "/admin/budgets/{id}/items"]) {
  sponsoredItemOpenApiPaths[base] = { get: { summary: "Read sponsored item disbursement and invoice packs", responses: response } };
  sponsoredItemOpenApiPaths[`${base}/{itemId}/actions`] = { post: {
    summary: "Record advance, confirm receipt, save vendor bank info, submit/review invoices, or confirm payment", responses: response,
    requestBody: { content: { "application/json": { schema: sponsoredActionBody } } },
  } };
  sponsoredItemOpenApiPaths[`${base}/{itemId}/images/{imageId}`] = { get: {
    summary: "Get a short-lived private attachment URL for preview or download (download=1)",
    requestParams: { query: z.object({ download: z.enum(["1", "true", "0", "false"]).optional() }) },
    responses: response,
  } };
}
sponsoredItemOpenApiPaths["/clubs/{clubId}/budgets/{id}/items/{itemId}/refund-account"] = { get: {
  summary: "Fetch school refund bank account details when a BEFORE_EVENT item requires refunding surplus advance",
  responses: response,
} };
sponsoredItemOpenApiPaths["/clubs/{clubId}/budgets/{id}/items/{itemId}/images"] = { post: {
  summary: "Upload a JPG/PNG (max 5 MiB) or PDF (max 10 MiB) invoice or refund receipt attachment, at most five files per target",
  requestParams: { query: z.object({
    revision: z.coerce.number().int().nonnegative(),
    fileName: z.string().min(1).max(200),
    target: z.enum(["invoice", "refund"]).optional(),
  }) },
  requestBody: { content: {
    "image/jpeg": { schema: z.string() },
    "image/png": { schema: z.string() },
    "application/pdf": { schema: z.string() },
  } },
  responses: response,
} };
