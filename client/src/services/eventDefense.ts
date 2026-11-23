import i18next from "i18next";
import { eventDefense } from "@/i18n/eventDefense";
import { ApiError, apiFetch } from "@/services/apiError";
import type { EventProposalDetail, EventReviewDecisionInput } from "@/services/eventProposalReviews";

export type EventDefenseState =
  | "SCHEDULED"
  | "CONFIRMED"
  | "RESCHEDULE_REQUESTED"
  | "IN_PROGRESS"
  | "DEFENDED"
  | "CANCELLED"
  | "NO_SHOW";

export type DefenseOutcome = "PASSED" | "FAILED" | "REVISION_REQUIRED" | "RE_DEFENSE";

export interface DefenseOfficerNote {
  officerId: string;
  officerName: string;
  content: string;
  updatedAt: string;
}

export interface EventDefenseSession {
  id: string;
  eventId: string;
  revisionNo: number;
  title: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  propertyId: string;
  propertyName: string;
  note?: string;
  state: EventDefenseState;
  rescheduleReason?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  startedAt?: string;
  endedAt?: string;
  leadOfficerId: string;
  notes: DefenseOfficerNote[];
  outcome?: DefenseOutcome;
  outcomeReason?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableDefenseRoom {
  id: string;
  code: string;
  name: string;
  location: string;
  capacity?: number;
  available: boolean;
  conflictReason?: string;
}

export interface ClubEventDefenseView {
  eventId: string;
  eventTitle: string;
  eventState: string;
  activeSession?: EventDefenseSession;
  history: EventDefenseSession[];
}

export interface ScheduleDefenseInput {
  title: string;
  startAt: string;
  durationMinutes: number;
  propertyId: string;
  note?: string;
}

export interface RespondRescheduleInput {
  accept: boolean;
  startAt?: string;
  durationMinutes?: number;
  propertyId?: string;
  note?: string;
  reason?: string;
}

export type DefenseErrorKey = keyof typeof eventDefense.en.errors;

const DEFENSE_ERROR_KEYS: Readonly<Record<string, DefenseErrorKey>> = {
  "valid defense start time is required": "startAtRequired",
  "valid start time is required": "startAtRequired",
  "future defense start time is required": "futureStartRequired",
  "reschedule reason is required (max 2000 characters)": "rescheduleReasonInvalid",
  "reschedule reason is required": "rescheduleReasonInvalid",
  "reschedule reason cannot exceed 2000 characters": "rescheduleReasonInvalid",
  "only a scheduled defense session can be confirmed": "confirmState",
  "reschedule can only be requested for a scheduled or confirmed defense": "rescheduleState",
  "defense session cannot be started in its current state": "startState",
  "invalid defense outcome": "invalidOutcome",
  "defense session not found": "defenseNotFound",
  "event proposal not found": "proposalNotFound",
  "active room not found": "roomNotFound",
  "only the assigned ICPDP officer can manage this defense session": "officerOnlyManage",
  "only the assigned ICPDP officer can cancel this defense session": "officerOnlyCancel",
  "only the assigned ICPDP officer can respond to this reschedule request": "officerOnlyReschedule",
  "only the assigned ICPDP officer can start the defense session": "officerOnlyStart",
  "only the assigned ICPDP officer can end the defense session": "officerOnlyEnd",
  "only the assigned ICPDP officer can mark defense no-show": "officerOnlyNoShow",
  "defense session can only be scheduled for an event under review or pending re-defense": "scheduleState",
  "an active or undecided defense session already exists for this proposal": "activeExists",
  "Room is under maintenance / blackout": "roomBlackout",
  "Room has an approved booking or semester allocation": "roomBooked",
  "Room is reserved for an approved event": "roomEvent",
  "Room is booked for another event defense session": "roomDefense",
  "no cancellable defense session found": "noCancelTarget",
  "no reschedule request is pending for this event": "noReschedulePending",
  "no startable defense session found": "noStartTarget",
  "defense session is not currently in progress": "notInProgress",
  "no defense session in progress found": "noEndTarget",
  "no active defense session found to mark as no-show": "noShowTarget",
  "no pending defense schedule found to confirm": "noConfirmTarget",
  "no active defense schedule found to reschedule": "noRescheduleTarget",
  "defense title is required": "titleRequired",
  "defense title cannot exceed 200 characters": "titleRequired",
  "cancellation reason is required": "cancelReasonRequired",
  "cancellation reason cannot exceed 2000 characters": "cancelReasonRequired",
  "rejection reason is required": "rejectionReasonRequired",
  "rejection reason cannot exceed 2000 characters": "rejectionReasonRequired",
  "note cannot exceed 2000 characters": "noteTooLong",
  "defense note cannot exceed 50000 characters": "defenseNoteTooLong",
  "ICPDP officer role required": "officerRoleRequired",
  "invalid event defense request": "invalidRequest",
  "invalid property id": "roomNotFound",
  "invalid event id": "proposalNotFound",
  "invalid defense id": "defenseNotFound",
  "invalid club id": "invalidRequest",
  "decision reason is required": "decisionReasonRequired",
  "revision sections are required": "revisionSectionsRequired",
  "future revision deadline is required": "futureRevisionDeadline",
  "an approved amount is required for every budget line": "approvedAmountRequired",
  "approved amounts must be whole, non-negative numbers": "approvedAmountInvalid",
  "an approved amount cannot exceed the requested amount": "approvedAmountExceeded",
  "a reduced budget line needs a reason": "reductionReasonRequired",
  "authentication required": "unauthorized",
  "invalid csrf token": "csrf",
  "account locked": "accountLocked",
  "Network request failed": "network",
};

interface DefenseErrorDescriptor {
  key: DefenseErrorKey;
  params?: Record<string, string | number>;
}

function resolveDefenseErrorDescriptor(rawMessage: string, statusCode?: number): DefenseErrorDescriptor {
  const normalized = rawMessage.trim();
  const earlyStart = /^defense can only start at most (\d+) minutes before the scheduled start time$/i.exec(normalized);
  if (earlyStart?.[1]) return { key: "earlyStart", params: { minutes: earlyStart[1] } };

  const scheduleNotice = /^defense must be scheduled at least (\d+) hours in advance$/i.exec(normalized);
  if (scheduleNotice?.[1]) return { key: "scheduleNotice", params: { hours: scheduleNotice[1] } };

  const revisionGap = /^revision deadline must be at least (\d+) hours before the scheduled defense$/i.exec(normalized);
  if (revisionGap?.[1]) return { key: "revisionGap", params: { hours: revisionGap[1] } };

  const confirmDeadline = /^defense confirmation deadline \((\d+)h before start\) has passed$/i.exec(normalized);
  if (confirmDeadline?.[1]) return { key: "confirmDeadline", params: { hours: confirmDeadline[1] } };

  const rescheduleDeadline = /^reschedule requests must be submitted at least (\d+) hours before start$/i.exec(normalized);
  if (rescheduleDeadline?.[1]) return { key: "rescheduleDeadline", params: { hours: rescheduleDeadline[1] } };

  const duration = /^(?:defense )?duration must be an integer between (\d+) and (\d+) minutes$/i.exec(normalized);
  if (duration?.[1] && duration[2]) return { key: "durationInvalid", params: { min: duration[1], max: duration[2] } };

  if (Object.hasOwn(DEFENSE_ERROR_KEYS, normalized)) {
    return { key: DEFENSE_ERROR_KEYS[normalized]! };
  }
  const lower = normalized.toLowerCase();
  if (Object.hasOwn(DEFENSE_ERROR_KEYS, lower)) {
    return { key: DEFENSE_ERROR_KEYS[lower]! };
  }

  switch (statusCode) {
    case 400:
    case 422:
      return { key: "invalidRequest" };
    case 401:
      return { key: "unauthorized" };
    case 403:
      return { key: "forbidden" };
    case 404:
      return { key: "notFound" };
    case 409:
      return { key: "conflict" };
    case 429:
      return { key: "rateLimit" };
    case 502:
    case 503:
    case 504:
      return { key: "unavailable" };
    default:
      if (statusCode && statusCode >= 500) return { key: "server" };
      return statusCode ? { key: "actionFailed", params: { status: statusCode } } : { key: "actionFailedGeneric" };
  }
}

function interpolateTemplate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => (
    Object.hasOwn(params, name) ? String(params[name]) : ""
  ));
}

/** Non-2xx response from the defense API; displays purely i18n messages while logging raw diagnostics. */
export class EventDefenseError extends ApiError {
  readonly errorKey: DefenseErrorKey;
  readonly errorParams?: Record<string, string | number>;
  readonly statusCode?: number;

  constructor(rawMessage: string, statusCode?: number) {
    super(rawMessage);
    this.name = "EventDefenseError";
    this.statusCode = statusCode;
    const descriptor = resolveDefenseErrorDescriptor(rawMessage, statusCode);
    this.errorKey = descriptor.key;
    this.errorParams = descriptor.params;
    Object.defineProperty(this, "message", {
      configurable: true,
      get: () => {
        const lang = (i18next.resolvedLanguage ?? i18next.language)?.split("-")[0] === "vi" ? "vi" : "en";
        const fallback = interpolateTemplate(eventDefense[lang].errors[this.errorKey], this.errorParams);
        return String(i18next.t(`eventDefense.errors.${this.errorKey}`, {
          ...this.errorParams,
          defaultValue: fallback,
        }));
      },
    });
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await apiFetch(`/api/v1${url}`, { credentials: "same-origin", ...init });
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`[eventDefense] ${init?.method ?? "GET"} ${url} network error:`, error.rawMessage);
      throw new EventDefenseError(error.rawMessage);
    }
    throw error;
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
    const rawDiagnostic = (typeof body?.message === "string" && body.message.trim())
      || (typeof body?.error === "string" && body.error.trim())
      || `HTTP ${response.status}`;
    console.error(`[eventDefense] ${init?.method ?? "GET"} ${url} failed:`, response.status, body ?? rawDiagnostic);
    throw new EventDefenseError(rawDiagnostic, response.status);
  }
  const body: { data: T } = await response.json();
  return body.data;
}

function jsonMutation(method: "POST" | "PUT", csrfToken: string, body?: object): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
}

export function fetchAvailableDefenseRooms(
  startAt: string,
  durationMinutes: number,
  signal: AbortSignal,
  excludeDefenseId?: string,
): Promise<AvailableDefenseRoom[]> {
  const params = new URLSearchParams({
    startAt,
    durationMinutes: String(durationMinutes),
    ...(excludeDefenseId ? { excludeDefenseId } : {}),
  });
  return request(`/admin/event-defense/rooms?${params.toString()}`, { signal });
}

export function scheduleEventDefense(
  eventId: string,
  input: ScheduleDefenseInput,
  csrfToken: string,
): Promise<EventDefenseSession> {
  return request(`/admin/event-proposals/${encodeURIComponent(eventId)}/defense/schedule`, jsonMutation("POST", csrfToken, input));
}

export function cancelEventDefense(
  eventId: string,
  reason: string,
  csrfToken: string,
): Promise<EventDefenseSession> {
  return request(`/admin/event-proposals/${encodeURIComponent(eventId)}/defense/cancel`, jsonMutation("POST", csrfToken, { reason }));
}

export function respondDefenseReschedule(
  eventId: string,
  input: RespondRescheduleInput,
  csrfToken: string,
): Promise<EventDefenseSession> {
  return request(`/admin/event-proposals/${encodeURIComponent(eventId)}/defense/respond-reschedule`, jsonMutation("POST", csrfToken, input));
}

export function startEventDefense(eventId: string, csrfToken: string): Promise<EventDefenseSession> {
  return request(`/admin/event-proposals/${encodeURIComponent(eventId)}/defense/start`, jsonMutation("POST", csrfToken, {}));
}

export function fetchLiveDefenseSession(eventId: string, signal: AbortSignal): Promise<EventDefenseSession> {
  return request(`/admin/event-proposals/${encodeURIComponent(eventId)}/defense/session`, { signal });
}

export function saveDefenseNote(
  eventId: string,
  content: string,
  csrfToken: string,
): Promise<EventDefenseSession> {
  return request(`/admin/event-proposals/${encodeURIComponent(eventId)}/defense/notes`, jsonMutation("PUT", csrfToken, { content }));
}

export function endEventDefense(eventId: string, csrfToken: string): Promise<EventDefenseSession> {
  return request(`/admin/event-proposals/${encodeURIComponent(eventId)}/defense/end`, jsonMutation("POST", csrfToken, {}));
}

export function markDefenseNoShow(
  eventId: string,
  reason: string | undefined,
  csrfToken: string,
): Promise<EventDefenseSession> {
  return request(`/admin/event-proposals/${encodeURIComponent(eventId)}/defense/no-show`, jsonMutation("POST", csrfToken, reason ? { reason } : {}));
}

export function decideAfterDefense(
  eventId: string,
  input: EventReviewDecisionInput,
  csrfToken: string,
): Promise<EventProposalDetail> {
  return request(`/admin/event-proposals/${encodeURIComponent(eventId)}/defense/decision`, jsonMutation("POST", csrfToken, input));
}

export function fetchClubEventDefense(
  clubId: string,
  eventId: string,
  signal: AbortSignal,
): Promise<ClubEventDefenseView> {
  return request(`/clubs/${encodeURIComponent(clubId)}/events/${encodeURIComponent(eventId)}/defense`, { signal });
}

export function confirmClubEventDefense(
  clubId: string,
  eventId: string,
  csrfToken: string,
): Promise<EventDefenseSession> {
  return request(`/clubs/${encodeURIComponent(clubId)}/events/${encodeURIComponent(eventId)}/defense/confirm`, jsonMutation("POST", csrfToken, {}));
}

export function requestClubDefenseReschedule(
  clubId: string,
  eventId: string,
  reason: string,
  csrfToken: string,
): Promise<EventDefenseSession> {
  return request(
    `/clubs/${encodeURIComponent(clubId)}/events/${encodeURIComponent(eventId)}/defense/reschedule-request`,
    jsonMutation("POST", csrfToken, { reason }),
  );
}
