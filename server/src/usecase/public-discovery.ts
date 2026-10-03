import { z } from "zod";
import { DomainError } from "../domain/errors.js";
import {
  isDiscoverableClub, isHistoricalPublicEvent, isUpcomingPublicEvent,
  isVisibleCampaign, type ClubSearch, type PublicDiscoveryRepository,
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
    upcomingEvents: rawUpcoming.filter((event) => isUpcomingPublicEvent(event, now)),
    history: rawHistory.filter((event) => isHistoricalPublicEvent(event, now)),
  };
}

export async function listPublicEvents(
  repo: PublicDiscoveryRepository, page: number, pageSize: number, now: Date,
) {
  return repo.listUpcomingEvents(page, pageSize, now);
}

export async function publicEventDetail(
  repo: PublicDiscoveryRepository, id: string, now: Date,
) {
  const event = await repo.getEvent(validId(id));
  if (!event || !isUpcomingPublicEvent(event, now)) {
    throw new DomainError("event not found", "not_found");
  }
  const club = await repo.getClub(event.clubId);
  if (!club || club.state !== "Active") {
    throw new DomainError("event not found", "not_found");
  }
  return { event, club: { id: club.id, name: club.name } };
}
