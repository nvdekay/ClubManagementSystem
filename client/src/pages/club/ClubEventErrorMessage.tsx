import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import type { clubEvents } from "@/i18n/clubEvents";
import { ApiError } from "@/services/apiError";
import { ClubEventError, type ClubEventErrorDetails } from "@/services/clubEvents";

interface ClubEventErrorMessageProps {
  error: unknown;
}

export type ClubEventErrorKey = keyof typeof clubEvents.en.errors;

interface ClubEventErrorDescriptor {
  key: ClubEventErrorKey;
  params?: Record<string, string | number>;
}

const BOOKING_ERROR_KEYS: Readonly<Record<string, ClubEventErrorKey>> = {
  room_allocation: "bookingRoomAllocation",
  not_available: "bookingNotAvailable",
  already_linked: "bookingAlreadyLinked",
  property_mismatch: "bookingPropertyMismatch",
  schedule_not_covered: "bookingScheduleNotCovered",
};

const CLUB_EVENT_ERROR_KEYS: Readonly<Record<string, ClubEventErrorKey>> = {
  "room allocations cannot be attached to an event proposal": "bookingRoomAllocation",
  "booking does not belong to the club or is no longer available": "bookingNotAvailable",
  "booking is already attached to another event": "bookingAlreadyLinked",
  "booking facility does not match the selected event facility": "bookingPropertyMismatch",
  "booking time slot does not cover the event schedule": "bookingScheduleNotCovered",
  "booking must belong to the club, be available and cover the event schedule": "bookingInvalid",
  "booking ids must be unique": "bookingDuplicate",
  "event dates must be in the future and end after the start": "eventDates",
  "the event must start and end within one semester of the academic calendar": "eventSemester",
  "all occurrences must be inside the event dates and the same semester": "occurrencesRange",
  "occurrences must not overlap": "occurrencesOverlap",
  "active property not found": "propertyNotFound",
  "property is blacked out during the event": "propertyBlackout",
  "event schedule has blocking conflicts": "scheduleConflict",
  "club is not active for event proposals": "clubInactive",
  "event ends after the dissolution semester": "dissolutionSemester",
  "internal events without university budget must use the internal event flow": "internalFlowRequired",
  "title, objective and plan are required": "requiredFields",
  "choose a property or enter a venue": "venueRequired",
  "invalid capacity": "capacityInvalid",
  "invalid requested budget": "budgetInvalid",
  "an event with an approved budget must keep its budget lines when resubmitting": "budgetRetainRequired",
  "invalid registration form fields": "registrationFormInvalid",
  "invalid event proposal file": "proposalFileInvalid",
  "event proposal document is required before submission": "proposalDocumentRequired",
  "published internal event schedule is locked; only cancellation is allowed": "internalScheduleLocked",
  "internal event cannot be edited in its current state": "internalNotEditable",
  "only an internal draft can be created": "internalDraftOnly",
  "only a created internal event can be rescheduled": "internalRescheduleCreatedOnly",
  "event not found": "eventNotFound",
  "proposal document not found": "eventNotFound",
  "event changed or is not available in this club; reload and retry": "eventChanged",
  "event cannot be edited or submitted": "proposalNotEditable",
  "revision deadline has passed": "revisionDeadlinePassed",
  "only approved events can be published": "publishApprovedOnly",
  "event cannot be cancelled in its current state": "cancelStateInvalid",
  "finalized attendance prevents cancellation": "cancelFinalized",
  "event changed while cancelling": "cancelConcurrent",
  "only an unstarted approved event can be rescheduled": "rescheduleApprovedOnly",
  "an event with check-ins cannot be rescheduled": "rescheduleHasCheckIns",
  "event has already started": "eventStarted",
  "registration must open before closing and close no later than the start": "registrationWindow",
  "an event without registration must allow walk-ins": "walkInRequired",
  "invalid check-in window": "checkInWindow",
  "registration is not open": "registrationNotOpen",
  "capacity cannot be below confirmed registrations": "capacityBelowConfirmedGeneric",
  "there is no available seat in the registration window": "noAvailableSeat",
  "only the first waitlisted registration can be promoted": "promoteFirstWaitlistedOnly",
  "event capacity changed": "capacityChanged",
  "submitted report history prevents attendance unlocking": "unlockBlockedByReport",
  "attendance is not finalized": "attendanceNotFinalized",
  "attendance is finalized": "attendanceFinalized",
  "only completed events can finalize attendance": "finalizeCompletedOnly",
  "resolve every abnormal attendance and no-show before finalizing": "finalizeUnresolved",
  "event is not open for check-in": "checkInNotOpen",
  "manual check-in outside the window requires a reason": "manualCheckInReasonRequired",
  "student not found": "participantNotFound",
  "participant not found": "participantNotFound",
  "event is limited to active club members": "membersOnlyEvent",
  "confirmed registration is required": "confirmedRegistrationRequired",
  "event capacity is full": "capacityFull",
  "attendance can only be corrected after completion": "correctAfterCompletionOnly",
  "an existing check-in cannot be converted to a no-show": "existingCheckInNoShow",
  "invalid corrected check-in time": "correctedTimeInvalid",
  "corrected check-in time is required": "correctedTimeRequired",
  "a corrected check-in time is required": "correctedTimeRequired",
  "a check-in time with submitted feedback is immutable": "checkInImmutableWithFeedback",
  "policy is not configured": "policyMissing",
  "policy is not configured for this date": "policyMissing",
  "account is not active": "accountLocked",
  "account locked": "accountLocked",
  "club not found": "clubNotFound",
  "attendance unlock role required": "unlockRoleRequired",
  "active club membership required": "membershipRequired",
  "overdue club obligations prevent proposal submission": "obligationsGeneric",
  "file storage is not configured": "storageUnavailable",
  "file storage unavailable": "storageUnavailable",
  "file upload failed": "uploadFailed",
  "invalid club event request": "validation",
  "invalid internal club event request": "validation",
  "invalid event id": "eventNotFound",
  "invalid club id": "clubNotFound",
  "authentication required": "unauthorized",
  "invalid csrf token": "unauthorized",
  "forbidden": "forbidden",
  "not found": "notFound",
  "conflict": "conflict",
  "network request failed": "network",
};

function statusErrorKey(statusCode?: number): ClubEventErrorKey {
  switch (statusCode) {
    case 400:
    case 422:
      return "validation";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "notFound";
    case 409:
      return "conflict";
    case 429:
      return "rateLimit";
    case 502:
    case 503:
    case 504:
      return "unavailable";
    default:
      return statusCode && statusCode >= 500 ? "server" : "unknown";
  }
}

export function resolveClubEventErrorDescriptor(
  rawMessage: string,
  statusCode?: number,
  details?: ClubEventErrorDetails,
): ClubEventErrorDescriptor {
  if (details?.bookingError && Object.hasOwn(BOOKING_ERROR_KEYS, details.bookingError)) {
    return { key: BOOKING_ERROR_KEYS[details.bookingError]! };
  }
  const normalized = rawMessage.trim();
  const proposalNotice = /^submit at least (\d+(?:\.\d+)?) hours before the event starts$/i.exec(normalized);
  if (proposalNotice?.[1]) {
    return { key: "proposalNotice", params: { hours: proposalNotice[1] } };
  }
  const internalNotice = /^internal event must start at least (\d+(?:\.\d+)?) hours from now$/i.exec(normalized);
  if (internalNotice?.[1]) {
    return { key: "internalNoticeHours", params: { hours: internalNotice[1] } };
  }
  if (typeof details?.noticeHours === "number" && details.noticeHours > 0) {
    return {
      key: details.noticeHours === 24 ? "internalNoticeHours" : "proposalNotice",
      params: { hours: details.noticeHours },
    };
  }
  const lower = normalized.toLowerCase();
  if (Object.hasOwn(CLUB_EVENT_ERROR_KEYS, lower)) {
    return { key: CLUB_EVENT_ERROR_KEYS[lower]! };
  }
  const httpStatus = /^http (\d{3})$/i.exec(normalized)?.[1];
  if (httpStatus) {
    return { key: statusErrorKey(Number(httpStatus)) };
  }
  return { key: statusErrorKey(statusCode) };
}

function obligationLabel(t: TFunction, item: string) {
  const [key, value] = item.split(":", 2);
  switch (key) {
    case "overdueSettlement": return t("clubEvents.overdueSettlement");
    case "overdueRefund": return t("clubEvents.overdueRefund");
    case "overduePeriodicReport": return t("clubEvents.overduePeriodicReport", { period: value ?? "" });
    case "overduePostEventReport": return t("clubEvents.overduePostEventReport");
    default: return t("clubEvents.errors.obligationsGeneric");
  }
}

/** Spells out what the server named (UC25 E2 obligations, UC30 E1 affected registrations, booking & schedule rules) via i18n instead of raw messages. */
export function ClubEventErrorMessage({ error }: ClubEventErrorMessageProps) {
  const { t } = useTranslation();
  if (!error) return null;
  const details = error instanceof ClubEventError
    ? error.details
    : error instanceof Error && "details" in error
      ? (error as ClubEventError).details
      : undefined;
  const className = "break-words text-sm text-danger-app";
  if (details?.obligations?.length) {
    return (
      <div role="alert" className={className}>
        <p>{t("clubEvents.blockedByObligations")}</p>
        <ul className="mt-1 list-disc pl-5">
          {details.obligations.map((item) => <li key={item}>{obligationLabel(t, item)}</li>)}
        </ul>
      </div>
    );
  }
  if (details?.registrationIds?.length) {
    return <p role="alert" className={className}>{t("clubEvents.capacityBelowConfirmed", { count: details.registrationIds.length })}</p>;
  }
  if (details?.conflicts?.length) {
    return <p role="alert" className={className}>{t("clubEvents.blockingConflicts", { count: details.conflicts.length })}</p>;
  }
  const rawMessage = error instanceof ApiError ? error.rawMessage : error instanceof Error ? error.message : "";
  const statusCode = error instanceof ClubEventError ? error.statusCode : undefined;
  const descriptor = resolveClubEventErrorDescriptor(rawMessage, statusCode, details);
  return <p role="alert" className={className}>{t(`clubEvents.errors.${descriptor.key}`, descriptor.params)}</p>;
}
