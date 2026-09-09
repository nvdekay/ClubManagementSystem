import type { Request, Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "../../src/domain/errors.js";
import { errorHandler } from "../../src/interface/http/middleware.js";

function run(err: unknown, path = "/api/v1/users") {
  const out = { status: 0, body: undefined as unknown };
  const res = {
    headersSent: false,
    status(code: number) {
      out.status = code;
      return this;
    },
    json(body: unknown) {
      out.body = body;
    },
  };
  errorHandler(err, { originalUrl: path } as Request, res as unknown as Response, () => undefined);
  return out;
}

describe("errorHandler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps DomainError kinds to statuses with the domain message", () => {
    expect(run(new DomainError("invalid email"))).toEqual({
      status: 400,
      body: {
        statusCode: 400,
        error: "validation",
        message: "invalid email",
        timestamp: expect.any(String),
        path: "/api/v1/users",
      },
    });
    expect(run(new DomainError("email already registered", "conflict")).status).toBe(409);
    expect(run(new DomainError("user not found", "not_found")).status).toBe(404);
  });

  it("includes structured details when the domain error carries them", () => {
    const issues = [{ path: ["email"], message: "invalid email" }];
    expect(run(new DomainError("invalid email", "validation", issues)).body).toMatchObject({
      details: issues,
    });
  });

  it("keeps framework 4xx statuses but never echoes err.message, and logs the cause", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const err = Object.assign(new Error('Unexpected token, "SECRET" is not valid JSON'), {
      status: 400,
    });
    expect(run(err)).toEqual({
      status: 400,
      body: {
        statusCode: 400,
        error: "bad request",
        message: "bad request",
        timestamp: expect.any(String),
        path: "/api/v1/users",
      },
    });
    expect(warn).toHaveBeenCalledOnce();
  });

  it("maps everything else to a generic 500 and logs it", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(run(new Error("db exploded"))).toEqual({
      status: 500,
      body: {
        statusCode: 500,
        error: "internal server error",
        message: "internal server error",
        timestamp: expect.any(String),
        path: "/api/v1/users",
      },
    });
    expect(error).toHaveBeenCalledOnce();
  });
});
