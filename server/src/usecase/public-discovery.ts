import { z } from "zod";
import { DomainError } from "../domain/errors.js";
import {
  isDiscoverableClub, isHistoricalPublicEvent, isUpcomingPublicEvent,
  isVisibleCampaign, publicEventStatus, type ClubSearch, type EventSearch,
  type PublicDiscoveryRepository, type PublicEvent,
} from "../domain/public-discovery.js";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i);

function validId(id: string): string {
  if (!objectId.safeParse(id).success) throw new DomainError("invalid identifier", "validation");
  return id;
}

export async function listPublicClubs(repo: PublicDiscoveryRepository, input: ClubSearch) {
  const [page, fields] = await Promise.all([repo.listClubs(input), repo.fields()]);
  return { ...page, fields };
}

export async function publicClubDetail(
  repo: PublicDiscoveryRepository, id: string, now: Date,
) {
  const club = await repo.getClub(validId(id));
  if (!club || !isDiscoverableClub(club)) {
    throw new DomainError("club not found", "not_found");
  }
  const [board, rawCampaigns, rawUpcoming, rawHistory] = await Promise.all([
    repo.board(id, now),
    club.state === "Active" ? repo.campaigns(id, now) : Promise.resolve([]),
    club.state === "Active" ? repo.clubUpcomingEvents(id, now) : Promise.resolve([]),
    repo.clubHistory(id, now),
  ]);
  return {
    club, board,
    campaigns: rawCampaigns.filter((campaign) => isVisibleCampaign(campaign, now)),
    upcomingEvents: rawUpcoming.filter((event) => isUpcomingPublicEvent(event, now))
      .map((event) => ({ ...event, status: "upcoming" as const })),
    history: rawHistory.filter((event) => isHistoricalPublicEvent(event, now))
      .map((event) => ({ ...event, status: "ended" as const })),
  };
}

export async function publicCampaignDetail(
  repo: PublicDiscoveryRepository, id: string, now: Date,
) {
  const campaign = await repo.getCampaign(validId(id), now);
  if (!campaign || !isVisibleCampaign(campaign, now)) {
    throw new DomainError("recruitment campaign not found", "not_found");
  }
  return campaign;
}

function withStatus(event: PublicEvent, now: Date) {
  const status = publicEventStatus(event, now);
  return status ? { ...event, status } : null;
}

export async function listPublicEvents(
  repo: PublicDiscoveryRepository, input: EventSearch, now: Date,
) {
  const page = await repo.listEvents(input, now);
  return { ...page, items: page.items.flatMap((event) => withStatus(event, now) ?? []) };
}

export async function publicEventDetail(
  repo: PublicDiscoveryRepository, id: string, now: Date,
) {
  const found = await repo.getEvent(validId(id));
  const event = found && withStatus(found, now);
  if (!event) {
    throw new DomainError("event not found", "not_found");
  }
  const club = await repo.getClub(event.clubId);
  if (!club || club.state !== "Active") {
    throw new DomainError("event not found", "not_found");
  }
  return { event, club: { id: club.id, name: club.name } };
}
