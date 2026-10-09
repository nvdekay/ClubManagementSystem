import { describe, expect, it } from "vitest";
import type {
  PublicCampaign, PublicClub, PublicDiscoveryRepository, PublicEvent,
} from "../../src/domain/public-discovery.js";
import { isHistoricalPublicEvent, isUpcomingPublicEvent, isVisibleCampaign } from "../../src/domain/public-discovery.js";
import {
  listPublicClubs, publicCampaignDetail, publicClubDetail, publicEventDetail,
} from "../../src/usecase/public-discovery.js";

const now = new Date("2026-10-03T12:00:00Z");
const id = "0123456789abcdef01234567";
const club: PublicClub = {
  id, code: "FPTC", name: "FPT Club", field: "Academic",
  state: "Active", description: "Club description",
};
const campaign: PublicCampaign = {
  id, title: "Join us", state: "Published",
  windowStart: new Date("2026-10-01"), windowEnd: new Date("2026-10-10"), capacity: 20,
};
const event: PublicEvent = {
  id, clubId: id, clubName: "FPT Club", title: "Open day",
  startAt: new Date("2026-10-10"), endAt: new Date("2026-10-10T03:00:00Z"),
  capacity: 100, state: "Upcoming", audienceScope: "PUBLIC", publishedAt: new Date("2026-10-01"),
};

function fixture(clubState = "Active") {
  const calls: string[] = [];
  const repo: PublicDiscoveryRepository = {
    async listClubs(input) {
      calls.push("list");
      return { items: [club], total: 1, page: input.page, pageSize: input.pageSize };
    },
    async fields() { return ["Academic"]; },
    async getClub() { calls.push("club"); return { ...club, state: clubState }; },
    async board() { calls.push("board"); return []; },
    async campaigns() {
      calls.push("campaigns");
      return [
        campaign,
        { ...campaign, id: "draft", state: "Draft" },
        { ...campaign, id: "closed", windowEnd: now },
        { ...campaign, id: "upcoming", windowStart: new Date("2026-10-04T00:00:00Z") },
      ];
    },
    async getCampaign(campaignId) {
      calls.push("campaignDetail");
      return campaignId === campaign.id ? campaign : { ...campaign,
        windowStart: new Date("2026-10-04T00:00:00Z") };
    },
    async clubUpcomingEvents() {
      calls.push("upcoming");
      return [event, { ...event, id: "internal", audienceScope: "MEMBERS_ONLY" }];
    },
    async clubHistory() {
      calls.push("history");
      return [{ ...event, state: "Completed", endAt: new Date("2026-09-01") }];
    },
    async listUpcomingEvents() {
      return { items: [event], total: 1, page: 1, pageSize: 12 };
    },
    async getEvent() { calls.push("event"); return event; },
  };
  return { repo, calls };
}

describe("public discovery", () => {
  it("only shows campaigns inside their published application window", () => {
    expect(isVisibleCampaign(campaign, now)).toBe(true);
    expect(isVisibleCampaign({ ...campaign, windowStart: new Date("2026-10-04") }, now)).toBe(false);
    expect(isVisibleCampaign({ ...campaign, windowEnd: now }, now)).toBe(false);
  });

  it("only exposes the public form for an open campaign", async () => {
    const { repo } = fixture();
    expect(await publicCampaignDetail(repo, id, now)).toEqual(campaign);
    await expect(publicCampaignDetail(repo, "abcdefabcdefabcdefabcdef", now))
      .rejects.toMatchObject({ kind: "not_found" });
  });

  it("returns directory fields and filters private detail data", async () => {
    const { repo } = fixture();
    expect(await listPublicClubs(repo, { search: "", field: "", page: 1, pageSize: 12 }))
      .toMatchObject({ items: [club], fields: ["Academic"], total: 1 });
    const detail = await publicClubDetail(repo, id, now);
    expect(detail.campaigns).toEqual([campaign]);
    expect(detail.upcomingEvents).toEqual([event]);
    expect(detail.history).toHaveLength(1);
  });

  it("labels suspended clubs but never loads recruitment or upcoming events", async () => {
    const { repo, calls } = fixture("Suspended");
    const detail = await publicClubDetail(repo, id, now);
    expect(detail.club.state).toBe("Suspended");
    expect(detail.campaigns).toEqual([]);
    expect(detail.upcomingEvents).toEqual([]);
    expect(calls).not.toContain("campaigns");
    expect(calls).not.toContain("upcoming");
  });

  it("hides dissolved clubs and validates IDs before any repository call", async () => {
    const dissolved = fixture("Dissolved");
    await expect(publicClubDetail(dissolved.repo, id, now))
      .rejects.toMatchObject({ kind: "not_found" });
    expect(dissolved.calls).toEqual(["club"]);
    const invalid = fixture();
    await expect(publicClubDetail(invalid.repo, "{ $ne: null }", now))
      .rejects.toMatchObject({ kind: "validation" });
    expect(invalid.calls).toEqual([]);
  });

  it("shows only published upcoming public events in an active club", async () => {
    const variants = [
      { ...event, state: "Approved" },
      { ...event, audienceScope: "MEMBERS_ONLY" },
      { ...event, publishedAt: undefined },
      { ...event, startAt: now },
    ];
    for (const hidden of variants) {
      expect(isUpcomingPublicEvent(hidden, now)).toBe(false);
    }
    expect(isUpcomingPublicEvent(event, now)).toBe(true);
    expect(isHistoricalPublicEvent({ ...event, state: "Completed", endAt: now }, now)).toBe(true);
    expect(isHistoricalPublicEvent({
      ...event, state: "Completed", endAt: now, audienceScope: "MEMBERS_ONLY",
    }, now)).toBe(false);
    expect(await publicEventDetail(fixture().repo, id, now))
      .toMatchObject({ event, club: { id, name: club.name } });
    await expect(publicEventDetail(fixture("Suspended").repo, id, now))
      .rejects.toMatchObject({ kind: "not_found" });
  });
});
