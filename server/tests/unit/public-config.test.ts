import { describe, expect, it } from "vitest";
import type { Config } from "../../src/infra/config/index.js";
import { optionalAuthConfig } from "../../src/infra/config/index.js";

const config: Config = {
  NODE_ENV: "development",
  PORT: 3000,
  MONGO_URI: "mongodb://127.0.0.1:27017/ucms",
  APP_BASE_URL: "http://localhost:3000",
  CLIENT_BASE_URL: "http://localhost:5173",
};

describe("optional auth configuration", () => {
  it("allows the public application to start before OAuth credentials are configured", () => {
    expect(optionalAuthConfig(config)).toBeNull();
  });

  it("fails fast when OAuth configuration is only partly filled", () => {
    expect(() => optionalAuthConfig({ ...config, GOOGLE_CLIENT_ID: "configured" }))
      .toThrow(/Auth configuration missing or invalid/);
  });
});
