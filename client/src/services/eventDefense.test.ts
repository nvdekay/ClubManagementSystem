import i18next from "i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiErrors } from "@/i18n/apiErrors";
import { eventDefense } from "@/i18n/eventDefense";
import { ApiError } from "@/services/apiError";
import { EventDefenseError, startEventDefense } from "@/services/eventDefense";

beforeEach(async () => {
  await i18next.init({
    lng: "vi",
    fallbackLng: "en",
    resources: {
      en: { translation: { apiErrors: apiErrors.en, eventDefense: eventDefense.en } },
      vi: { translation: { apiErrors: apiErrors.vi, eventDefense: eventDefense.vi } },
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("EventDefenseError i18n localization", () => {
  it("translates early start window message in both vi and en without leaking raw text", async () => {
    const raw = "defense can only start at most 30 minutes before the scheduled start time";
    const error = new EventDefenseError(raw, 400);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(EventDefenseError);
    expect(error.rawMessage).toBe(raw);
    expect(error.message).toBe("Chỉ được bắt đầu buổi bảo vệ sớm tối đa 30 phút trước giờ hẹn.");

    await i18next.changeLanguage("en");
    expect(error.message).toBe("Defense can only start within 30 minutes before the scheduled start time.");
    expect(error.message).not.toBe(raw);
  });

  it.each([
    [
      "defense must be scheduled at least 48 hours in advance",
      "Lịch bảo vệ phải được tạo trước thời gian diễn ra ít nhất 48 giờ.",
      "Defense must be scheduled at least 48 hours in advance.",
    ],
    [
      "revision deadline must be at least 12 hours before the scheduled defense",
      "Hạn nộp bản sửa phải trước giờ bảo vệ đã lên lịch ít nhất 12 giờ.",
      "Revision deadline must be at least 12 hours before the scheduled defense.",
    ],
    [
      "defense confirmation deadline (24h before start) has passed",
      "Đã quá hạn xác nhận tham gia (trước giờ bắt đầu 24 giờ).",
      "The confirmation deadline (24 hours before start) has passed.",
    ],
    [
      "reschedule requests must be submitted at least 24 hours before start",
      "Yêu cầu dời lịch phải được gửi trước giờ bắt đầu ít nhất 24 giờ.",
      "Reschedule requests must be submitted at least 24 hours before start.",
    ],
    [
      "duration must be an integer between 15 and 240 minutes",
      "Thời lượng buổi bảo vệ phải là số nguyên từ 15 đến 240 phút.",
      "Defense duration must be a whole number between 15 and 240 minutes.",
    ],
    [
      "Room is booked for another event defense session",
      eventDefense.vi.errors.roomDefense,
      eventDefense.en.errors.roomDefense,
    ],
    [
      "invalid event defense request",
      eventDefense.vi.errors.invalidRequest,
      eventDefense.en.errors.invalidRequest,
    ],
  ])("translates %s into vi and en", async (raw, expectedVi, expectedEn) => {
    const error = new EventDefenseError(raw, 400);
    expect(error.message).toBe(expectedVi);

    await i18next.changeLanguage("en");
    expect(error.message).toBe(expectedEn);
  });

  it("maps unmapped backend diagnostics to HTTP status i18n keys instead of leaking raw response text", async () => {
    const raw = "unexpected internal defense diagnostic";
    const conflictError = new EventDefenseError(raw, 409);
    expect(conflictError.message).toBe(eventDefense.vi.errors.conflict);

    await i18next.changeLanguage("en");
    expect(conflictError.message).toBe(eventDefense.en.errors.conflict);
    expect(conflictError.message).not.toBe(raw);

    const customStatusError = new EventDefenseError(raw, 418);
    expect(customStatusError.message).toBe("Unable to complete the defense action (HTTP 418). Please check the session state and try again.");
    await i18next.changeLanguage("vi");
    expect(customStatusError.message).toBe("Không thể thực hiện thao tác bảo vệ (HTTP 418). Vui lòng kiểm tra lại trạng thái buổi bảo vệ và thử lại.");
  });

  it("wraps startEventDefense HTTP failures into EventDefenseError and logs diagnostics", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: "defense can only start at most 30 minutes before the scheduled start time",
    }), { status: 400, headers: { "Content-Type": "application/json" } })));

    const failure = await startEventDefense("event-1", "csrf-token").catch((err: unknown) => err);
    expect(failure).toBeInstanceOf(EventDefenseError);
    expect((failure as EventDefenseError).message).toBe(
      "Chỉ được bắt đầu buổi bảo vệ sớm tối đa 30 phút trước giờ hẹn.",
    );
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("wraps network errors into EventDefenseError with pure i18n copy in both vi and en", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const failure = await startEventDefense("event-1", "csrf-token").catch((err: unknown) => err);
    expect(failure).toBeInstanceOf(EventDefenseError);
    expect((failure as EventDefenseError).message).toBe(eventDefense.vi.errors.network);

    await i18next.changeLanguage("en");
    expect((failure as EventDefenseError).message).toBe(eventDefense.en.errors.network);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
