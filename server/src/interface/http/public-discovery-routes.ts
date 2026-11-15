import { Router } from "express";
import { z } from "zod";
import { DomainError } from "../../domain/errors.js";
import type { PublicDiscoveryRepository } from "../../domain/public-discovery.js";
import {
  listPublicClubs, listPublicEvents, publicCampaignDetail, publicClubDetail, publicEventDetail,
} from "../../usecase/public-discovery.js";
import { ok } from "./response.js";

const clubQuery = z.object({
  search: z.string().trim().max(100).default(""),
  field: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
}).strict();
const eventQuery = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  // Defaults to upcoming so existing "upcoming events" consumers keep their behaviour.
  status: z.enum(["all", "ongoing", "upcoming", "ended"]).default("upcoming"),
  search: z.string().trim().max(100).default(""),
}).strict();

// Kiểm tra query/tham số công khai bằng zod, sai thì ném DomainError validation
function parse<T extends z.ZodTypeAny>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw new DomainError("invalid query", "validation", result.error.issues);
  return result.data as z.output<T>;
}

// Ép tham số id thành chuỗi hợp lệ
function id(value: unknown): string {
  const result = z.string().safeParse(value);
  if (!result.success) throw new DomainError("invalid identifier", "validation");
  return result.data;
}

// Mount các route công khai cho khách xem CLB, đợt tuyển và sự kiện
export function publicDiscoveryRoutes(repo: PublicDiscoveryRepository): Router {
  const router = Router();
  // Liệt kê CLB công khai
  router.get("/public/clubs", async (req, res) => {
    const query = parse(clubQuery, req.query);
    ok(res, await listPublicClubs(repo, { ...query, pageSize: 12 }, new Date()));
  });
  // Xem chi tiết CLB công khai
  router.get("/public/clubs/:id", async (req, res) => {
    ok(res, await publicClubDetail(repo, id(req.params.id), new Date()));
  });
  // Xem chi tiết đợt tuyển thành viên công khai
  router.get("/public/campaigns/:id", async (req, res) => {
    ok(res, await publicCampaignDetail(repo, id(req.params.id), new Date()));
  });
  // Liệt kê sự kiện công khai
  router.get("/public/events", async (req, res) => {
    const query = parse(eventQuery, req.query);
    ok(res, await listPublicEvents(repo, { ...query, pageSize: 8 }, new Date()));
  });
  // Xem chi tiết sự kiện công khai
  router.get("/public/events/:id", async (req, res) => {
    ok(res, await publicEventDetail(repo, id(req.params.id), new Date()));
  });
  return router;
}
