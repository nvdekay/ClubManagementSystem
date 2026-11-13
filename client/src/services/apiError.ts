import i18next from "i18next";
import { apiErrorKeys, apiErrors, type ApiErrorKey } from "@/i18n/apiErrors";

/** Keep diagnostics intact and resolve display text using the current language. */
export class ApiError extends Error {
  readonly rawMessage: string;

  constructor(message: string) {
    super(message);
    this.rawMessage = message;
    Object.defineProperty(this, "message", {
      configurable: true,
      get: () => localizedApiMessage(this.rawMessage),
    });
  }
}

function localizedApiMessage(message: string): string {
  const vietnamese = (i18next.resolvedLanguage ?? i18next.language)?.split("-")[0] === "vi";
  if (!vietnamese) return message || apiErrors.en.unknown!;
  const notice = /^submit at least (\d+(?:\.\d+)?) hours before the event starts$/.exec(message);
  if (notice) return String(i18next.t("apiErrors.eventNotice", { hours: notice[1], defaultValue: apiErrors.vi.eventNotice }));
  const earlyStart = /^defense can only start at most (\d+) minutes before the scheduled start time$/.exec(message);
  if (earlyStart) {
    return String(i18next.t("apiErrors.defenseEarlyStart", {
      minutes: earlyStart[1],
      defaultValue: apiErrors.vi.defenseEarlyStart,
    }));
  }
  const key = Object.hasOwn(apiErrorKeys, message) ? apiErrorKeys[message]! : httpErrorKey(message);
  return String(i18next.t(`apiErrors.${key}`, { defaultValue: apiErrors.vi[key] }));
}

function httpErrorKey(message: string): ApiErrorKey {
  const status = /^HTTP (\d{3})$/.exec(message)?.[1];
  switch (status) {
    case "400": case "422": return "validation";
    case "401": return "unauthorized";
    case "403": return "forbidden";
    case "404": return "notFound";
    case "409": return "conflict";
    case "429": return "rateLimit";
    case "502": case "503": case "504": return "unavailable";
    default: return status && Number(status) >= 500 ? "server" : "unknown";
  }
}

/** Preserve cancellation while translating browser network errors. */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof TypeError) throw new ApiError("Network request failed");
    throw error;
  }
}
