import { z } from "zod";
import type { createDocument } from "zod-openapi";
import { sponsoredActionBody } from "./sponsored-item-routes.js";

type Paths = NonNullable<Parameters<typeof createDocument>[0]["paths"]>;
const response = { "200": { description: "Sponsored item result",
  content: { "application/json": { schema: z.object({ statusCode: z.number(), message: z.string(), data: z.unknown(), timestamp: z.string() }) } } } };
export const sponsoredItemOpenApiPaths: Paths = {};
for (const base of ["/clubs/{clubId}/budgets/{id}/items", "/admin/budgets/{id}/items"]) {
  sponsoredItemOpenApiPaths[base] = { get: { summary: "Read sponsored item invoice packs", responses: response } };
  sponsoredItemOpenApiPaths[`${base}/{itemId}/actions`] = { post: {
    summary: "Save, submit, review or pay a sponsored item", responses: response,
    requestBody: { content: { "application/json": { schema: sponsoredActionBody } } },
  } };
  sponsoredItemOpenApiPaths[`${base}/{itemId}/images/{imageId}`] = { get: {
    summary: "Get a short-lived private invoice image URL after authorization", responses: response,
  } };
}
sponsoredItemOpenApiPaths["/clubs/{clubId}/budgets/{id}/items/{itemId}/images"] = { post: {
  summary: "Upload a JPG/PNG invoice image, at most five images per item and 5 MiB each",
  requestParams: { query: z.object({ revision: z.coerce.number().int().nonnegative(), fileName: z.string().min(1).max(200) }) },
  requestBody: { content: { "image/jpeg": { schema: z.string() }, "image/png": { schema: z.string() } } }, responses: response,
} };
