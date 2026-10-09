export interface PublicClub {
  id: string;
  code: string;
  name: string;
  field: string;
  state: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  operatingScope?: string;
  logoUrl?: string;
}

export interface PublicCampaign {
  id: string;
  title: string;
  state: string;
  windowStart: Date;
  windowEnd: Date;
  capacity: number;
  clubId?: string;
  positions?: string[];
  criteria?: string;
  selectionSteps?: Array<{ name: string; description?: string; startsAt?: Date; endsAt?: Date }>;
  formSchema?: Array<{ key: string; label: string; type: string; required: boolean; options?: string[] }>;
  rubric?: Array<{ key: string; label: string; maxScore: number }>;
}

export interface PublicEvent {
  id: string;
  clubId: string;
  clubName: string;
  title: string;
  startAt: Date;
  endAt: Date;
  venueText?: string;
  capacity: number;
  state: string;
  audienceScope: string;
  publishedAt?: Date;
}

export interface PublicBoardSeat {
  memberName: string;
  positionName: string;
  termName: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ClubSearch {
  search: string;
  field: string;
  page: number;
  pageSize: number;
}

export interface PublicDiscoveryRepository {
  listClubs(input: ClubSearch): Promise<Page<PublicClub>>;
  fields(): Promise<string[]>;
  getClub(id: string): Promise<PublicClub | null>;
  board(clubId: string, now: Date): Promise<PublicBoardSeat[]>;
  campaigns(clubId: string, now: Date): Promise<PublicCampaign[]>;
  getCampaign(id: string, now: Date): Promise<PublicCampaign | null>;
  clubUpcomingEvents(clubId: string, now: Date): Promise<PublicEvent[]>;
  clubHistory(clubId: string, now: Date): Promise<PublicEvent[]>;
  listUpcomingEvents(page: number, pageSize: number, now: Date): Promise<Page<PublicEvent>>;
  getEvent(id: string): Promise<PublicEvent | null>;
}

export function isDiscoverableClub(club: PublicClub): boolean {
  return club.state === "Active" || club.state === "Suspended";
}

export function isVisibleCampaign(campaign: PublicCampaign, now: Date): boolean {
  return (campaign.state === "Published" || campaign.state === "Accepting Applications")
    && campaign.windowStart <= now && campaign.windowEnd > now;
}

export function isUpcomingPublicEvent(event: PublicEvent, now: Date): boolean {
  return event.state === "Upcoming" && event.audienceScope === "PUBLIC"
    && event.publishedAt !== undefined && event.startAt > now;
}

export function isHistoricalPublicEvent(event: PublicEvent, now: Date): boolean {
  return ["Completed", "Report Submitted", "Closed"].includes(event.state)
    && event.audienceScope === "PUBLIC" && event.publishedAt !== undefined
    && event.endAt <= now;
}
