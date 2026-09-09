import { z } from "zod";
import { createDocument } from "zod-openapi";
import { CreateUser, ListUsersQuery, type User as DomainUser } from "../../domain/user.js";

// Wire shape of a domain type: Dates serialize to ISO strings in JSON.
type Wire<T> = { [K in keyof T]: T[K] extends Date ? string : T[K] };

// `satisfies` links this schema to the domain entity — adding a field to User breaks the build here.
const User = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.string().datetime(),
}) satisfies z.ZodType<Wire<DomainUser>>;

const UserPage = z.object({ items: z.array(User), total: z.number().int() });

const ApiError = z.object({
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
  timestamp: z.string(),
  path: z.string(),
});
const Health = z.object({ ok: z.boolean() });

// Success envelope every 2xx response is wrapped in — see interface/http/response.ts.
function envelope<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    statusCode: z.number(),
    message: z.string(),
    data,
    timestamp: z.string(),
  });
}

export const openApiDocument = createDocument({
  openapi: "3.1.0",
  info: { title: "MERN Template API", version: "1.0.0" },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: {
          "200": {
            description: "OK",
            content: { "application/json": { schema: Health } },
          },
          "503": {
            description: "Database unreachable",
            content: { "application/json": { schema: Health } },
          },
        },
      },
    },
    "/users": {
      get: {
        summary: "List users",
        requestParams: { query: ListUsersQuery },
        responses: {
          "200": {
            description:
              "One page, newest first: `offset` rows skipped, at most `limit` (default 20, max 100) returned; `total` counts every match",
            content: { "application/json": { schema: envelope(UserPage) } },
          },
          "400": {
            description: "Invalid limit or offset",
            content: { "application/json": { schema: ApiError } },
          },
        },
      },
      post: {
        summary: "Register a user",
        requestBody: {
          content: { "application/json": { schema: CreateUser } },
        },
        responses: {
          "201": {
            description: "Created user",
            content: { "application/json": { schema: envelope(User) } },
          },
          "400": {
            description: "Validation error",
            content: { "application/json": { schema: ApiError } },
          },
          "409": {
            description: "Email already registered",
            content: { "application/json": { schema: ApiError } },
          },
        },
      },
    },
  },
});
