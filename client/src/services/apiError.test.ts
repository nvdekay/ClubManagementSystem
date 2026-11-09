import i18next from "i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiErrors } from "@/i18n/apiErrors";
import { ApiError, apiFetch } from "@/services/apiError";
import { actOnClubEvent, ClubEventError } from "@/services/clubEvents";

beforeEach(async () => {
  await i18next.init({
    lng: "vi", fallbackLng: "en",
    resources: { en: { translation: { apiErrors: apiErrors.en } }, vi: { translation: { apiErrors: apiErrors.vi } } },
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("localized API errors", () => {
  it.each([
    ["invalid check-in window", "checkInWindow"],
    ["registration must open before closing and close no later than the start", "registrationWindow"],
    ["policy is not configured", "policyMissing"],
    ["settlement requires an ended or cancelled event", "settlementEvent"],
    ["finalize the evaluation of every club before publishing", "finalizeAll"],
  ])("translates %s and retains its diagnostics", (message, key) => {
    const error = new ApiError(message);
    expect(error.message).toBe(apiErrors.vi[key]);
    expect(error.rawMessage).toBe(message);
  });

  it("updates an existing error when the language is switched", async () => {
    const error = new ApiError("invalid check-in window");
    expect(error.message).toBe(apiErrors.vi.checkInWindow);
    await i18next.changeLanguage("en");
    expect(error.message).toBe("invalid check-in window");
    await i18next.changeLanguage("vi");
    expect(error.message).toBe(apiErrors.vi.checkInWindow);
  });

  it.each([["HTTP 401", "unauthorized"], ["HTTP 403", "forbidden"], ["HTTP 503", "unavailable"], ["HTTP 500", "server"]])(
    "localizes non-JSON HTTP fallback %s", (message, key) => {
      expect(new ApiError(message).message).toBe(apiErrors.vi[key]);
    },
  );

  it("does not leak unknown English API messages into Vietnamese UI", async () => {
    const error = new ApiError("unmapped server diagnostic");
    expect(error.message).toBe(apiErrors.vi.unknown);
    await i18next.changeLanguage("en");
    expect(error.message).toBe("unmapped server diagnostic");
  });

  it("keeps dynamic notice periods in the translated error", () => {
    expect(new ApiError("submit at least 48 hours before the event starts").message)
      .toBe("Cần nộp đề xuất trước giờ bắt đầu sự kiện ít nhất 48 giờ.");
  });

  it("treats object property names as unknown diagnostics", () => {
    expect(new ApiError("toString").message).toBe(apiErrors.vi.unknown);
  });

  it("keeps specialized event errors and structured conflict details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: "event schedule has blocking conflicts", details: { conflicts: ["event-2"] },
    }), { status: 409 })));
    const error = await actOnClubEvent("club", "event", "publish", {}, "token").catch((failure: unknown) => failure);
    expect(error).toBeInstanceOf(ClubEventError);
    expect(error).toBeInstanceOf(Error);
    expect((error as ClubEventError).details.conflicts).toEqual(["event-2"]);
    expect((error as ClubEventError).message).toBe(apiErrors.vi.scheduleConflict);
  });

  it("translates browser network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(apiFetch("/api/v1/test")).rejects.toMatchObject({ message: apiErrors.vi.network });
  });

  it("preserves aborted requests", async () => {
    const error = new DOMException("Aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
    await expect(apiFetch("/api/v1/test")).rejects.toBe(error);
  });
});
