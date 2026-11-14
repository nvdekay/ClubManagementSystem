import { describe, expect, it } from "vitest";
import { notificationLink } from "./notificationLink";
import type { AppNotification } from "@/services/notifications";

const notice: AppNotification = { id: "notice", eventCode: "SPONSORED_ITEM_UPDATED", entityId: "event",
  clubId: "club", payload: { budgetId: "budget" }, createdAt: "2026-11-14T00:00:00Z" };
describe("sponsored finance notification destinations", () => {
  it("opens the club finance workspace with the notified budget selected", () => {
    expect(notificationLink(notice)).toBe("/club/club/budgets?budget=budget");
  });
  it("opens disbursement details for officer review", () => {
    expect(notificationLink({ ...notice, eventCode: "SPONSORED_ITEM_SUBMITTED" })).toBe("/workspace/budgets/budget");
  });
  it("resolves older club notices by event without using the event as a budget ID", () => {
    expect(notificationLink({ ...notice, payload: {} })).toBe("/club/club/budgets?event=event");
  });
  it("keeps event approval notices on event proposals", () => {
    expect(notificationLink({ ...notice, eventCode: "EVENT_PROPOSAL_APPROVED" })).toBe("/club/club/events?event=event");
  });
});
