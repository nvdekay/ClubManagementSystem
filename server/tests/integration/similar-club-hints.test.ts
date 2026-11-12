import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoClubApplicationRepository } from "../../src/infra/db/mongo-club-application-repository.js";
import { mongoClubApplicationReviewRepository } from "../../src/infra/db/mongo-club-application-review-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-similar-clubs-test-${process.pid}`;

describe.skipIf(!uri)("Similar club hint candidates by role", () => {
  const now = new Date("2026-11-12T08:00:00Z");
  const self = new Types.ObjectId();
  const createdClub = new Types.ObjectId();
  const clubIds: Record<string, string> = {};
  const applicationIds: Record<string, string> = {};

  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
    const states = ["Pending Setup", "Active", "Suspended", "Dissolving", "Dissolved"];
    for (const state of states) {
      const doc = await ucmsModels.clubs!.create({ code: `C-${state}`, name: `Robotics ${state}`,
        field: "Công nghệ", state, description: "Build robots", createdAt: now });
      clubIds[state] = String(doc._id);
    }
    await ucmsModels.clubs!.create({ _id: createdClub, code: "C-SELF", name: "Robotics Self",
      field: "Công nghệ", state: "Active", sourceApplicationId: self, createdAt: now });
    const founder = new Types.ObjectId();
    const draftPayload = { clubName: "Robotics", field: "Công nghệ", summary: "Robots",
      objectives: "Build robots", founders: [], documents: [] };
    await ucmsModels.clubApplications!.create({ _id: self, clubName: "Robotics", field: "Công nghệ",
      founderUserId: founder, draftPayload, state: "Approved", currentVersionNo: 1,
      createdClubId: createdClub, createdAt: now });
    for (const state of ["Draft", "Submitted", "Under Review", "Revision Requested", "Rejected"]) {
      const doc = await ucmsModels.clubApplications!.create({ clubName: `Robotics ${state}`,
        field: "Công nghệ", founderUserId: new Types.ObjectId(), state, currentVersionNo: 1,
        draftPayload: { ...draftPayload, clubName: `Robotics ${state}` }, createdAt: now });
      applicationIds[state] = String(doc._id);
    }
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("gives ICPDP clubs in every state and other pending applications", async () => {
    const candidates = await mongoClubApplicationReviewRepository().similarityCandidates(String(self));
    const ids = candidates.map((candidate) => candidate.id).sort();
    expect(ids).toEqual([
      ...Object.values(clubIds),
      applicationIds.Submitted!, applicationIds["Under Review"]!, applicationIds["Revision Requested"]!,
    ].sort());
    expect(candidates.find((candidate) => candidate.id === applicationIds.Submitted))
      .toEqual({ kind: "APPLICATION", id: applicationIds.Submitted, name: "Robotics Submitted",
        field: "Công nghệ", state: "Submitted", text: "Robots Build robots" });
    expect(candidates.find((candidate) => candidate.id === clubIds.Dissolved))
      .toMatchObject({ kind: "CLUB", state: "Dissolved", text: "Build robots" });
  });

  it("never gives the applicant other applications or Pending Setup clubs", async () => {
    const candidates = await mongoClubApplicationRepository()
      .publicSimilarityCandidates(applicationIds.Draft!);
    expect(candidates.every((candidate) => candidate.kind === "CLUB")).toBe(true);
    expect(candidates.map((candidate) => candidate.state)).not.toContain("Pending Setup");
    expect(candidates.map((candidate) => candidate.id).sort()).toEqual([
      clubIds.Active!, clubIds.Suspended!, clubIds.Dissolving!, clubIds.Dissolved!, String(createdClub),
    ].sort());
  });

  it("never compares an application with itself or the club created from it", async () => {
    const officerView = await mongoClubApplicationReviewRepository().similarityCandidates(String(self));
    const applicantView = await mongoClubApplicationRepository().publicSimilarityCandidates(String(self));
    for (const candidates of [officerView, applicantView]) {
      expect(candidates.map((candidate) => candidate.id)).not.toContain(String(self));
      expect(candidates.map((candidate) => candidate.id)).not.toContain(String(createdClub));
    }
  });
});
