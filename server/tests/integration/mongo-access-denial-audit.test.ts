import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoAccessDenialAuditRepository } from "../../src/infra/db/mongo-access-denial-audit-repository.js";
import { ensureUcmsDatabase, ucmsModels as m } from "../../src/infra/db/ucms-models.js";
import { recordAccessDenial } from "../../src/usecase/access-denial.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-denial-test-${process.pid}`;

describe.skipIf(!uri)("Mongo access denial audit (SEC-08, AC17)", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
  }, 30_000);
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("appends one ACCESS_DENIED row with only normalized request data", async () => {
    const actorId = new Types.ObjectId();
    const bookingId = new Types.ObjectId();
    await recordAccessDenial(mongoAccessDenialAuditRepository(), { actorId: String(actorId), method: "POST",
      route: "/api/v1/admin/bookings/:id/decision", params: { id: String(bookingId) }, reason: "ICPDP officer role required",
      correlationId: "corr-1", at: new Date("2026-11-07T00:00:00Z") });
    const rows = await m.auditLogs!.find({ action: "ACCESS_DENIED" }).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ entityType: "BOOKINGS", entityId: bookingId, actorId, reason: "ICPDP officer role required",
      correlationId: "corr-1", after: { method: "POST", route: "/api/v1/admin/bookings/:id/decision" } });
  });
});
