import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ensureAuthSessionIndexes, mongoSessionRepository,
} from "../../src/infra/db/mongo-auth-session-repository.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-session-test-${process.pid}`;

describe.skipIf(!uri)("Mongo auth session repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureAuthSessionIndexes();
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("has TTL/unique indexes and applies revocation and expiry immediately", async () => {
    const indexes = await mongoose.connection.db!.collection("authSessions").indexes();
    expect(indexes).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "uq_auth_sessions_token", unique: true }),
      expect.objectContaining({ name: "ttl_auth_sessions_expiry", expireAfterSeconds: 0 }),
    ]));
    const repo = mongoSessionRepository();
    const userId = new Types.ObjectId().toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60_000);
    await repo.create({ userId, tokenHash: "hash-a", csrfHash: "csrf-a", expiresAt });
    await expect(repo.create({ userId, tokenHash: "hash-a", csrfHash: "csrf-b", expiresAt }))
      .rejects.toMatchObject({ code: 11000 });
    expect(await repo.findActive("hash-a", now)).toMatchObject({ userId });
    expect(await repo.findActive("hash-a", expiresAt)).toBeNull();
    await repo.revokeUser(userId, now);
    expect(await repo.findActive("hash-a", now)).toBeNull();
  });
});
