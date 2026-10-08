import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ensureUcmsDatabase,
  inspectUcmsDatabase,
  ucmsCollectionNames,
  ucmsModels,
} from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-schema-test-${process.pid}`;

describe.skipIf(!uri)("UCMS Mongo database", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("creates all DBML collections and indexes idempotently", async () => {
    await ensureUcmsDatabase();
    await ucmsModels.permissions.create({ code: "test.permission", name: "Test", module: "M01", scope: "system" });
    await ensureUcmsDatabase();
    expect(await ucmsModels.permissions.countDocuments({ code: "test.permission" })).toBe(1);
    const actual = await mongoose.connection.db!.listCollections().toArray();
    expect(actual.map((collection) => collection.name).sort()).toEqual(ucmsCollectionNames().sort());

    const userIndexes = await ucmsModels.users.collection.indexes();
    expect(userIndexes).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "uq_users_email", unique: true }),
      expect.objectContaining({ name: "uq_users_googleSubject", unique: true, sparse: true }),
    ]));
    const registrationIndexes = await ucmsModels.eventRegistrations.collection.indexes();
    expect(registrationIndexes).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "uq_registration", unique: true }),
      expect.objectContaining({ name: "ix_registration_waitlist" }),
    ]));
    const inspection = await inspectUcmsDatabase();
    expect(inspection.missingCollections).toEqual([]);
    expect(inspection.missingIndexes).toEqual([]);
  }, 60_000);

  it("replaces an obsolete index that has the same declared name", async () => {
    const tasks = ucmsModels.approvalTasks.collection;
    await tasks.dropIndex("ix_task_inbox");
    await tasks.createIndex(
      { state: 1, assigneeRole: 1, slaDueAt: 1 },
      { name: "ix_task_inbox" },
    );

    await ensureUcmsDatabase();

    const inboxIndex = (await tasks.indexes()).find((index) => index.name === "ix_task_inbox");
    expect(inboxIndex?.key).toEqual({ state: 1, assigneeId: 1, slaDueAt: 1 });
  }, 60_000);

  it("enforces required fields, enums and unique email", async () => {
    const users = ucmsModels.users;
    await expect(users.create({ email: "bad@example.com", displayName: "Bad", accountState: "Unknown", createdAt: new Date() }))
      .rejects.toThrow();
    await expect(users.create({ displayName: "Missing email", createdAt: new Date() }))
      .rejects.toThrow();
    await users.create({ email: "one@example.com", displayName: "One", createdAt: new Date() });
    await users.create({ email: "two@example.com", displayName: "Two", createdAt: new Date() });
    await expect(users.create({ email: "one@example.com", displayName: "Duplicate", createdAt: new Date() }))
      .rejects.toMatchObject({ code: 11000 });
  });
});
