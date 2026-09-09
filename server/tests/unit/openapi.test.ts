import { describe, expect, it } from "vitest";
import type { UserRepository } from "../../src/domain/user.js";
import { openApiDocument } from "../../src/interface/http/openapi.js";
import { buildApp } from "../../src/interface/http/server.js";

const stubRepo: UserRepository = {
  findByEmail: async () => null,
  save: async () => undefined,
  list: async () => ({ items: [], total: 0 }),
};

// Minimal view of Express 5's router internals — enough to enumerate mounted routes.
interface Layer {
  name: string;
  route?: { path: string; methods: Record<string, boolean> };
  matchers?: Array<(path: string) => false | { path: string }>;
  handle?: { stack?: Layer[] };
}

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"];

describe("openapi document", () => {
  // Walks the real app's router, so adding a route without documenting it (or documenting
  // a route that doesn't exist) fails here. Field-level drift is caught at compile time:
  // openapi.ts's User schema `satisfies` the domain entity's wire shape.
  it("matches the routes the app actually serves", () => {
    const app = buildApp({ userRepo: stubRepo, dbReady: () => true });
    const base = openApiDocument.servers?.[0]?.url ?? "";
    expect(base).toBe("/api/v1");

    const served = new Set<string>();
    const stack = (app as unknown as { router: { stack: Layer[] } }).router.stack;
    for (const layer of stack) {
      if (layer.route) {
        if (layer.route.path.startsWith(`${base}/`)) {
          for (const method of Object.keys(layer.route.methods)) {
            served.add(`${method} ${layer.route.path.slice(base.length)}`);
          }
        }
      } else if (layer.name === "router") {
        // ponytail: handles one level of Router mounting — the app's actual shape
        const match = layer.matchers?.[0]?.(`${base}/probe`);
        if (match && match.path === base) {
          for (const sub of layer.handle?.stack ?? []) {
            if (!sub.route) continue;
            for (const method of Object.keys(sub.route.methods)) {
              served.add(`${method} ${sub.route.path}`);
            }
          }
        }
      }
    }

    const documented = new Set<string>();
    for (const [path, item] of Object.entries(openApiDocument.paths ?? {})) {
      for (const method of HTTP_METHODS) {
        if (item && method in item) documented.add(`${method} ${path}`);
      }
    }

    expect([...served].sort()).toEqual([...documented].sort());
  });
});
