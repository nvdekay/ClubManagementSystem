import { Router } from "express";
import { z } from "zod";
import { DomainError } from "../../domain/errors.js";
import type { PublicDiscoveryRepository } from "../../domain/public-discovery.js";
import {
  listPublicClubs, listPublicEvents, publicClubDetail, publicEventDetail,
} from "../../usecase/public-discovery.js";
import { ok } from "./response.js";

const clubQuery = z.object({
  search: z.string().trim().max(100).default(""),
  field: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
}).strict();
const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
}).strict();

function parse<T extends z.ZodTypeAny>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw new DomainError("invalid query", "validation", result.error.issues);
  return result.data as z.output<T>;
}

function id(value: unknown): string {
  const result = z.string().safeParse(value);
  if (!result.success) throw new DomainError("invalid identifier", "validation");
  return result.data;
}

export function publicDiscoveryRoutes(repo: PublicDiscoveryRepository): Router {
  const router = Router();
  router.get("/public/clubs", async (req, res) => {
    const query = parse(clubQuery, req.query);
    ok(res, await listPublicClubs(repo, { ...query, pageSize: 12 }));
  });
  router.get("/public/clubs/:id", async (req, res) => {
    ok(res, await publicClubDetail(repo, id(req.params.id), new Date()));
  });
  router.get("/public/events", async (req, res) => {
    const query = parse(pageQuery, req.query);
    ok(res, await listPublicEvents(repo, query.page, 12, new Date()));
  });
  router.get("/public/events/:id", async (req, res) => {
    ok(res, await publicEventDetail(repo, id(req.params.id), new Date()));
  });
  return router;
}
