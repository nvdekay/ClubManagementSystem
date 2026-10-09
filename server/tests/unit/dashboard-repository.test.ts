import { afterEach, describe, expect, it, vi } from "vitest";
import { mongoDashboardRepository } from "../../src/infra/db/mongo-dashboard-repository.js";
import { ucmsModels } from "../../src/infra/db/ucms-models.js";

const studentCollections = [
  "clubApplications", "recruitmentApplications", "clubMemberships", "eventRegistrations",
  "attendances", "complaints", "recruitmentCampaigns", "events",
] as const;
const clubCollections = [
  "clubMemberships", "recruitmentCampaigns", "events", "eventBudgets", "expenses",
  "periodicReports", "propertyBookings", "eventFeedbacks", "violations", "clubTerms",
  "clubRoleStructureVersions", "transitionPlans",
] as const;

afterEach(() => vi.restoreAllMocks());

describe("Mongo dashboard read model", () => {
  it("isolates a failed panel while preserving all other totals", async () => {
    for (const collection of studentCollections) {
      vi.spyOn(ucmsModels[collection]!, "countDocuments").mockResolvedValue(2 as never);
    }
    vi.spyOn(ucmsModels.complaints!, "countDocuments").mockRejectedValueOnce(new Error("offline"));

    const result = await mongoDashboardRepository().student(
      "0123456789abcdef01234567", new Date("2026-10-09T08:00:00Z"),
    );

    expect(result.panels).toHaveLength(8);
    expect(result.panels.find((item) => item.key === "complaints"))
      .toEqual({ key: "complaints", status: "error" });
    expect(result.panels.filter((item) => item.status === "ready"))
      .toHaveLength(7);
  });

  it("does not query or expose restricted club panels without permission", async () => {
    for (const collection of clubCollections) {
      vi.spyOn(ucmsModels[collection]!, "countDocuments").mockResolvedValue(1 as never);
    }
    const campaigns = vi.mocked(ucmsModels.recruitmentCampaigns!.countDocuments);
    const events = vi.mocked(ucmsModels.events!.countDocuments);
    const budgets = vi.mocked(ucmsModels.eventBudgets!.countDocuments);
    const memberships = vi.mocked(ucmsModels.clubMemberships!.countDocuments);

    const result = await mongoDashboardRepository().club(
      "abcdefabcdefabcdefabcdef", [], new Date("2026-10-09T08:00:00Z"),
    );

    expect(result.panels.map((item) => item.key)).toEqual(["openCampaigns", "upcomingEvents"]);
    expect(campaigns).toHaveBeenCalledOnce();
    expect(events).toHaveBeenCalledOnce();
    expect(budgets).not.toHaveBeenCalled();
    expect(memberships).not.toHaveBeenCalled();
  });

  it("sums individual conditional transition obligations for the incoming leader", async () => {
    vi.spyOn(ucmsModels.recruitmentCampaigns!, "countDocuments").mockResolvedValue(0 as never);
    vi.spyOn(ucmsModels.events!, "countDocuments").mockResolvedValue(0 as never);
    vi.spyOn(ucmsModels.transitionPlans!, "aggregate").mockResolvedValue([{ count: 3 }] as never);

    const result = await mongoDashboardRepository().club(
      "abcdefabcdefabcdefabcdef", ["club.transition.plan"], new Date("2026-10-09T08:00:00Z"),
    );

    expect(result.panels.find((item) => item.key === "transitionFollowUps"))
      .toEqual({ key: "transitionFollowUps", status: "ready", count: 3 });
  });
});
