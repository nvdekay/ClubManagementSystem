import { describe, expect, it } from "vitest";
import { ucmsEnums, ucmsTables } from "../../src/infra/db/ucms-schema.generated.js";
import { ucmsCollectionNames, ucmsModels } from "../../src/infra/db/ucms-models.js";

describe("UCMS DBML model mapping", () => {
  it("maps all designed collections and enum values", () => {
    expect(ucmsCollectionNames()).toHaveLength(50);
    expect(Object.keys(ucmsEnums)).toHaveLength(26);
    expect(Object.keys(ucmsModels).sort()).toEqual(Object.keys(ucmsTables).sort());
    expect(ucmsModels.users.schema.path("_id").instance).toBe("ObjectId");
    expect(ucmsModels.users.schema.path("id")).toBeUndefined();
    expect(ucmsModels.users.schema.path("accountState").options.enum).toEqual(["Active", "Locked"]);
    expect(ucmsModels.eventBudgets.schema.path("approvedTotal").instance).toBe("Decimal128");
  });

  it("preserves named unique and query indexes", () => {
    const userIndexes = ucmsModels.users.schema.indexes();
    expect(userIndexes).toEqual(expect.arrayContaining([
      [{ email: 1 }, expect.objectContaining({ name: "uq_users_email", unique: true })],
      [{ googleSubject: 1 }, expect.objectContaining({ unique: true, sparse: true })],
    ]));
    expect(ucmsModels.eventRegistrations.schema.indexes()).toEqual(expect.arrayContaining([
      [{ eventId: 1, studentId: 1 }, expect.objectContaining({ name: "uq_registration", unique: true })],
    ]));
  });

  it("validates required fields, enums and integer fields before storage", async () => {
    const user = new ucmsModels.users({ displayName: "Missing email", accountState: "Unknown" });
    await expect(user.validate()).rejects.toThrow();
    const event = new ucmsModels.events({ capacity: 1.5 });
    const error = event.validateSync();
    expect(error?.errors.capacity).toBeDefined();
  });
});
