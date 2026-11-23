import { DomainError } from "./errors.js";
import type { EventInvitation } from "./school-event.js";

export interface ClubInvitation extends EventInvitation {
  event: { id: string; title: string; state: string; startAt: Date; endAt: Date;
    venue?: string; objective?: string; coordination?: string };
}

export interface InvitationResponse {
  outcome: "Accepted" | "Declined";
  responseNote?: string;
  responseDetails?: Record<string, string | number>;
}

export interface ClubInvitationRepository {
  list(clubId: string): Promise<ClubInvitation[]>;
  respond(clubId: string, invitationId: string, input: InvitationResponse, userId: string,
    now: Date): Promise<ClubInvitation>;
}

export function normalizeInvitationResponse(input: InvitationResponse): InvitationResponse {
  const responseNote = input.responseNote?.trim();
  if (!["Accepted", "Declined"].includes(input.outcome)) throw new DomainError("invalid response outcome", "validation");
  if (input.outcome === "Declined" && !responseNote) throw new DomainError("a reason is required to decline", "validation");
  if ((responseNote?.length ?? 0) > 5_000) throw new DomainError("response note is too long", "validation");
  if (input.responseDetails && (Object.keys(input.responseDetails).length > 20
    || Object.entries(input.responseDetails).some(([key, value]) => !key.trim() || key.length > 100
      || (typeof value !== "string" && typeof value !== "number")
      || (typeof value === "string" && value.length > 2_000)
      || (typeof value === "number" && !Number.isFinite(value))))) {
    throw new DomainError("invalid response details", "validation");
  }
  return { outcome: input.outcome, ...(responseNote ? { responseNote } : {}),
    ...(input.outcome === "Accepted" && input.responseDetails ? { responseDetails: input.responseDetails } : {}) };
}
