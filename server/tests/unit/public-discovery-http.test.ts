import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import type { PublicDiscoveryRepository } from "../../src/domain/public-discovery.js";
import { publicDiscoveryRoutes } from "../../src/interface/http/public-discovery-routes.js";

interface RouteLayer {
  route?: { path: string; stack: Array<{
    handle: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  }> };
}

function route(path: string, repo: PublicDiscoveryRepository) {
  const router = publicDiscoveryRoutes(repo) as unknown as { stack: RouteLayer[] };
  const handler = router.stack.find((layer) => layer.route?.path === path)?.route?.stack[0]?.handle;
  if (!handler) throw new Error("route missing");
  return handler;
}

function repository(): PublicDiscoveryRepository {
  return {
    listClubs: async (input) => ({ items: [], total: 0, page: input.page, pageSize: input.pageSize }),
    fields: async () => ["Academic"],
    getClub: async () => null,
    board: async () => [],
    campaigns: async () => [],
    clubUpcomingEvents: async () => [],
    clubHistory: async () => [],
    listUpcomingEvents: async (page, pageSize) => ({ items: [], total: 0, page, pageSize }),
    getEvent: async () => null,
  };
}

describe("public discovery HTTP boundary", () => {
  it("rejects operator objects and unknown query keys before searching", async () => {
    const handler = route("/public/clubs", repository());
    for (const query of [{ search: { $ne: "" } }, { unlisted: "value" }, { page: "-1" }]) {
      await expect(handler({ query } as unknown as Request, {} as Response, vi.fn()))
        .rejects.toMatchObject({ kind: "validation" });
    }
  });

  it("wraps an empty directory response using the standard envelope", async () => {
    const handler = route("/public/clubs", repository());
    const json = vi.fn();
    const res = { status: vi.fn().mockReturnThis(), json } as unknown as Response;
    await handler({ query: {} } as Request, res, vi.fn());
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 200,
      data: { items: [], total: 0, page: 1, pageSize: 12, fields: ["Academic"] },
    }));
  });
});
