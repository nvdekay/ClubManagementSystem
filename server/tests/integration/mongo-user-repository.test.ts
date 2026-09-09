// Needs a real Mongo (docker compose up -d). Skipped when MONGO_URI is not set.
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { newUser } from "../../src/domain/user.js";
import {
  ensureUserIndexes,
  mongoUserRepository,
} from "../../src/infra/db/mongo-user-repository.js";

const uri = process.env.MONGO_URI;

describe.skipIf(!uri)("mongoUserRepository", () => {
  beforeAll(async () => {
    // dbName override — never derive the test db by string-mangling the URI
    await mongoose.connect(uri ?? "", { dbName: "mern-template-test" });
  });
  beforeEach(async () => {
    // Fresh DB per test — no test may depend on what another one inserted
    await mongoose.connection.dropDatabase();
    await ensureUserIndexes(); // dropDatabase dropped the unique index too
  });
  afterAll(async () => {
    await mongoose.disconnect();
  });

  it("saves and finds a user", async () => {
    const repo = mongoUserRepository();
    const user = newUser({ email: "it@example.com", name: "IT" });
    await repo.save(user);
    const found = await repo.findByEmail("it@example.com");
    expect(found?.id).toBe(user.id);
    const page = await repo.list(20, 0);
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(1);
  });

  it("maps the unique-index violation to DomainError", async () => {
    const repo = mongoUserRepository();
    await repo.save(newUser({ email: "dup@example.com", name: "First" }));
    await expect(repo.save(newUser({ email: "dup@example.com", name: "Dup" }))).rejects.toMatchObject({
      message: "email already registered",
      kind: "conflict",
    });
  });
});
