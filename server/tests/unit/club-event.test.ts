import { APPROVED_EVENT_CANCEL_NOTICE_HOURS, assertApprovedEventCancellationNotice, assertEventNotice, assertInternalEventEditable, assertInternalEventNotice, assertProposalAudience, assertProposalDocumentPresent,
  eventCancellationIsLate, eventConflictResult, PROPOSAL_DOCUMENT_MAX_BYTES, PROPOSAL_DOCUMENT_MIME_TYPES, PROPOSAL_TEMPLATE_MIME_TYPES,
  validateClubEventInput, validateEventProposalFile, validateEventPublication } from "../../src/domain/club-event-rules.js";
import { loadDefaultEventProposalTemplate } from "../../src/infra/files/event-proposal-files.js";
import { describe, expect, it, vi } from "vitest";
import type { ClubAccessSnapshot } from "../../src/domain/access.js";
import type { ClubEventRepository } from "../../src/domain/club-event.js";
import { eventActionPermission, publicEventPayload, type EventProposalDocument } from "../../src/domain/club-event.js";
import { actOnClubEvent, clubEventFeedback, clubEventParticipants, createClubEvent, createInternalClubEvent, listClubEvents,
  type ClubEventDeps, uploadEventProposalDocument, uploadEventProposalTemplate } from "../../src/usecase/club-event.js";
import { clubEventBody, clubEventPublishBody, internalClubEventCreateBody } from "../../src/interface/http/club-event-routes.js";

const clubId = "111111111111111111111111";
const id = "222222222222222222222222";
const actor = { id: "333333333333333333333333", accountState: "Active" as const };
const now = new Date("2026-10-11T00:00:00Z");
// A Club Leader holds a confirmed board seat; a plain member holds only the two default permissions.
function deps(role: "leader" | "member" | "left" = "leader"): ClubEventDeps {
  const snapshot: ClubAccessSnapshot = { clubId, clubName: "Test", clubState: "Active",
    membership: { id, clubId, state: role === "left" ? "Left" : "Active" }, isApprovedFounder: false,
    terms: [{ id, clubId, state: "Active", startAt: new Date("2026-01-01"), endAt: new Date("2027-01-01") }],
    assignments: role === "leader" ? [{ clubId, termId: id, positionId: id, membershipId: id,
      effectiveFrom: new Date("2026-01-01"), confirmedBy: actor.id }] : [],
    positions: [{ id, clubId, isActive: true, isLeaderRole: false, isBoardSeat: true, code: "VICE_LEADER" }] };
  return { access: { findSnapshot: async () => snapshot }, auth: { systemRoleCodes: async () => [] },
    repo: { options: vi.fn(), list: vi.fn(), find: vi.fn(), create: vi.fn(), createInternal: vi.fn(), act: vi.fn(), participants: vi.fn(), feedback: vi.fn(),
      proposalDocument: vi.fn(), proposalTemplate: vi.fn(), saveProposalTemplate: vi.fn() } as ClubEventRepository };
}
describe("club event access and HTTP validation", () => {
  it("lets a Club Leader read feedback and participants; a plain member reads participants only", async () => {
    const d = deps();
    await clubEventFeedback(d, actor, clubId, [id, id], now);
    expect(d.repo.feedback).toHaveBeenCalledWith(clubId, [id], now);
    await clubEventParticipants(d, actor, clubId, id, now);
    expect(d.repo.participants).toHaveBeenCalled();
    const member = deps("member");
    await expect(clubEventFeedback(member, actor, clubId, [id], now)).rejects.toMatchObject({ kind: "forbidden" });
    await clubEventParticipants(member, actor, clubId, id, now);
    expect(member.repo.participants).toHaveBeenCalled();
    const left = deps("left");
    await expect(clubEventParticipants(left, actor, clubId, id, now)).rejects.toMatchObject({ kind: "forbidden" });
    expect(left.repo.participants).not.toHaveBeenCalled();
    expect(eventActionPermission({ kind: "check-in", studentId: id })).toBe("club.attendance.manage");
    expect(eventActionPermission({ kind: "capacity", capacity: 10 })).toBe("club.event.manage");
    expect(eventActionPermission({ kind: "promote", registrationId: id })).toBe("club.event.manage");
    expect(eventActionPermission({ kind: "correct", studentId: id, reason: "Late", absent: false })).toBe("club.event.manage");
    expect(eventActionPermission({ kind: "finalize" })).toBe("club.event.manage");
  });
  it("lets a plain member run manual check-in without event management data and blocks leader-only attendance actions", async () => {
    const member = deps("member");
    vi.mocked(member.repo.list).mockResolvedValue([{ id, clubId, title: "Event", objective: "Secret goal", plan: "Plan",
      budgetLines: [{ category: "Room", purpose: "Rent", amount: 1 }], bookingIds: [id], registrationForm: [],
      checkInCode: "ABC123" } as unknown as Awaited<ReturnType<ClubEventRepository["list"]>>[number]]);
    const [listed] = await listClubEvents(member, actor, clubId, now);
    expect(listed).toMatchObject({ objective: "", plan: "", budgetLines: [], bookingIds: [], checkInCode: "ABC123" });
    vi.mocked(member.repo.act).mockResolvedValue({ event: { id, objective: "Secret goal", plan: "Plan" } as unknown as
      Awaited<ReturnType<ClubEventRepository["act"]>>["event"], versions: [{} as never], decisions: [{} as never], bookings: [] });
    const checkInResult = await actOnClubEvent(member, actor, clubId, id, { kind: "check-in", studentId: id }, now);
    expect(checkInResult.event).toMatchObject({ objective: "", plan: "" });
    expect(checkInResult.versions).toEqual([]);
    expect(checkInResult.decisions).toEqual([]);
    for (const action of [
      { kind: "capacity" as const, capacity: 10 },
      { kind: "promote" as const, registrationId: id },
      { kind: "correct" as const, studentId: id, reason: "Verified", absent: false },
      { kind: "finalize" as const },
    ]) {
      await expect(actOnClubEvent(member, actor, clubId, id, action, now)).rejects.toMatchObject({ kind: "forbidden" });
    }
    await expect(createClubEvent(member, actor, clubId, {} as Parameters<typeof createClubEvent>[3], now))
      .rejects.toMatchObject({ kind: "forbidden" });
    await expect(actOnClubEvent(deps("left"), actor, clubId, id, { kind: "check-in", studentId: id }, now)).rejects.toMatchObject({ kind: "forbidden" });
  });
  it("rejects missing, locked and invalid actors before accessing private feedback", async () => {
    const d = deps();
    await expect(clubEventFeedback(d, null, clubId, [id], now)).rejects.toMatchObject({ kind: "unauthorized" });
    await expect(clubEventFeedback(d, { ...actor, accountState: "Locked" }, clubId, [id], now)).rejects.toMatchObject({ kind: "locked" });
    await expect(clubEventFeedback(d, actor, clubId, ["invalid"], now)).rejects.toMatchObject({ kind: "validation" });
    expect(d.repo.feedback).not.toHaveBeenCalled();
  });
  it("requires the special system role to unlock attendance", async () => {
    const d = deps();
    await expect(actOnClubEvent(d, actor, clubId, id, { kind: "unlock", reason: "Correction" }, now)).rejects.toMatchObject({ kind: "forbidden" });
    d.auth.systemRoleCodes = async () => ["ATTENDANCE_UNLOCK"];
    vi.mocked(d.repo.act).mockResolvedValue({ event: {} as Awaited<ReturnType<ClubEventRepository["act"]>>["event"], versions: [], decisions: [], bookings: [] });
    await actOnClubEvent(d, actor, clubId, id, { kind: "unlock", reason: "Correction" }, now);
    expect(d.repo.act).toHaveBeenCalled();
  });
  it("validates proposal fields and forbids Mongo operators and undeclared fields", () => {
    const body = { title: "Event", objective: "Goal", plan: "Plan", startAt: "2026-10-30T00:00:00Z", endAt: "2026-10-30T02:00:00Z",
      venueText: "Campus", audienceScope: "PUBLIC", capacity: 20, riskCategory: "LOW", budgetLines: [], bookingIds: [] };
    expect(clubEventBody.safeParse(body).success).toBe(true);
    expect(clubEventBody.safeParse({
      ...body,
      occurrences: [{ startAt: body.startAt, endAt: body.endAt, propertyId: id, venueText: "Hall B" }],
    }).success).toBe(true);
    expect(clubEventBody.safeParse({ ...body, propertyId: { $ne: null } }).success).toBe(false);
    expect(clubEventBody.safeParse({ ...body, state: "Approved" }).success).toBe(false);
    expect(clubEventBody.safeParse({ ...body, budgetLines: [{ category: "Room", purpose: "Rental", amount: 1.5 }] }).success).toBe(false);
    expect(clubEventPublishBody.safeParse({ expectedVersion: 0, checkInOpenAt: body.startAt,
      checkInCloseAt: body.endAt, allowWalkIn: true, waitlistEnabled: true }).success).toBe(true);
    const semester = { code: "FA26", startAt: new Date("2026-09-01T00:00:00Z"), endAt: new Date("2026-12-31T23:59:59Z") };
    expect(validateClubEventInput({
      title: "Event", objective: "Goal", plan: "Plan",
      startAt: new Date("2026-10-30T00:00:00Z"), endAt: new Date("2026-10-31T02:00:00Z"),
      audienceScope: "PUBLIC", capacity: 20, riskCategory: "LOW", budgetLines: [], bookingIds: [],
      occurrences: [
        { startAt: new Date("2026-10-30T00:00:00Z"), endAt: new Date("2026-10-30T02:00:00Z"), propertyId: id },
        { startAt: new Date("2026-10-31T00:00:00Z"), endAt: new Date("2026-10-31T02:00:00Z"), venueText: "Outdoor yard" },
      ],
    }, [semester], now)).toBe("FA26");
  });
});

describe("event rules at exact policy boundaries", () => {
  it("accepts exact advance notice and flags only cancellations inside the notice", () => {
    const start = new Date(now.getTime() + 24 * 3600000);
    expect(() => assertEventNotice(start, now, 24)).not.toThrow();
    expect(() => assertEventNotice(start, new Date(now.getTime() + 1), 24)).toThrow();
    expect(eventCancellationIsLate(start, now, 24)).toBe(false);
    expect(eventCancellationIsLate(start, new Date(now.getTime() + 1), 24)).toBe(true);
    const cancelCutoffStart = new Date(now.getTime() + APPROVED_EVENT_CANCEL_NOTICE_HOURS * 3600000);
    expect(() => assertApprovedEventCancellationNotice(cancelCutoffStart, now)).not.toThrow();
    expect(() => assertApprovedEventCancellationNotice(cancelCutoffStart, new Date(now.getTime() + 1))).toThrow(
      expect.objectContaining({
        kind: "conflict",
        message: "cancellation request must be submitted at least 72 hours before the event starts",
      }),
    );
  });
  it("distinguishes blocking and warning conflicts using the effective policy", () => {
    expect(eventConflictResult([], 15, false)).toBe("No Conflict");
    expect(eventConflictResult([14], 15, false)).toBe("Warning");
    expect(eventConflictResult([15], 15, false)).toBe("Blocking Conflict");
    expect(eventConflictResult([60], 15, true)).toBe("Warning");
  });
  it("validates registration and free admission independently of event lifecycle state", () => {
    const startAt = new Date(now.getTime() + 3600000), endAt = new Date(now.getTime() + 7200000);
    const base = { checkInOpenAt: startAt, checkInCloseAt: endAt, allowWalkIn: true, waitlistEnabled: true };
    expect(() => validateEventPublication(base, startAt, endAt, now)).not.toThrow();
    expect(() => validateEventPublication({ ...base, allowWalkIn: false }, startAt, endAt, now)).toThrow();
    expect(() => validateEventPublication({ ...base, registrationOpenAt: now, registrationCloseAt: endAt }, startAt, endAt, now)).toThrow();
  });
});

describe("internal club events", () => {
  const input = { title: "Club night", objective: "Bond", plan: "Games", startAt: new Date(now.getTime() + 25 * 3600000),
    endAt: new Date(now.getTime() + 27 * 3600000), venueText: "Room A", capacity: 30, riskCategory: "LOW" as const, bookingIds: [] };
  const settings = { checkInOpenAt: input.startAt, checkInCloseAt: input.endAt, allowWalkIn: true, waitlistEnabled: false };
  it("requires exactly 24 hours of notice to become CREATED or move a CREATED schedule", () => {
    expect(() => assertInternalEventNotice(new Date(now.getTime() + 24 * 3600000), now)).not.toThrow();
    expect(() => assertInternalEventNotice(new Date(now.getTime() + 24 * 3600000 - 1), now)).toThrow(expect.objectContaining({ kind: "validation" }));
  });
  it("locks the schedule once published and allows edits only in DRAFT or CREATED", () => {
    expect(() => assertInternalEventEditable("DRAFT")).not.toThrow();
    expect(() => assertInternalEventEditable("CREATED")).not.toThrow();
    for (const state of ["PUBLIC", "ONGOING"]) {
      expect(() => assertInternalEventEditable(state)).toThrow(expect.objectContaining({ kind: "conflict",
        message: "published internal event schedule is locked; only cancellation is allowed" }));
    }
    for (const state of ["FINISH", "CANCELLED", "Draft"]) expect(() => assertInternalEventEditable(state)).toThrow(expect.objectContaining({ kind: "conflict" }));
  });
  it("sends unbudgeted members-only proposals to the internal flow (Plan B)", () => {
    expect(() => assertProposalAudience({ audienceScope: "MEMBERS_ONLY", budgetLines: [] })).toThrow(expect.objectContaining({ kind: "validation",
      message: "internal events without university budget must use the internal event flow" }));
    expect(() => assertProposalAudience({ audienceScope: "MEMBERS_ONLY", budgetLines: [{ category: "Food", purpose: "Snacks", amount: 1 }] })).not.toThrow();
    expect(() => assertProposalAudience({ audienceScope: "PUBLIC", budgetLines: [] })).not.toThrow();
  });
  it("requires publish settings exactly when the mode is publish", async () => {
    const d = deps();
    await expect(createInternalClubEvent(d, actor, clubId, input, "publish", undefined, now)).rejects.toMatchObject({ kind: "validation" });
    await expect(createInternalClubEvent(d, actor, clubId, input, "create", settings, now)).rejects.toMatchObject({ kind: "validation" });
    expect(d.repo.createInternal).not.toHaveBeenCalled();
    await createInternalClubEvent(d, actor, clubId, input, "publish", settings, now);
    expect(d.repo.createInternal).toHaveBeenCalledWith(clubId, input, "publish", settings, actor.id, now);
    await expect(createInternalClubEvent(deps("member"), actor, clubId, input, "draft", undefined, now)).rejects.toMatchObject({ kind: "forbidden" });
  });
  it("rejects audience and budget fields on the internal form", () => {
    const body = { ...input, startAt: input.startAt.toISOString(), endAt: input.endAt.toISOString(), mode: "create" };
    expect(internalClubEventCreateBody.safeParse(body).success).toBe(true);
    expect(internalClubEventCreateBody.safeParse({ ...body, audienceScope: "MEMBERS_ONLY" }).success).toBe(false);
    expect(internalClubEventCreateBody.safeParse({ ...body, budgetLines: [] }).success).toBe(false);
    expect(internalClubEventCreateBody.safeParse({ ...body, mode: "approve" }).success).toBe(false);
  });
});

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const docx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("[Content_Types].xml word/document.xml")]);
const xlsx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("[Content_Types].xml xl/workbook.xml")]);
const pdf = Buffer.from("%PDF-1.7\n%%EOF\n", "latin1");
describe("event proposal document (UC25/UC26)", () => {
  it("accepts DOCX and PDF up to 20MB with matching extension and magic bytes", () => {
    expect(validateEventProposalFile("  Đề án sự kiện.docx ", DOCX, docx, PROPOSAL_DOCUMENT_MIME_TYPES)).toBe("Đề án sự kiện.docx");
    expect(validateEventProposalFile("plan.PDF", "application/pdf", pdf, PROPOSAL_DOCUMENT_MIME_TYPES)).toBe("plan.PDF");
    const max = Buffer.concat([pdf, Buffer.alloc(PROPOSAL_DOCUMENT_MAX_BYTES - pdf.length)]);
    expect(() => validateEventProposalFile("big.pdf", "application/pdf", max, PROPOSAL_DOCUMENT_MIME_TYPES)).not.toThrow();
  });
  it("rejects empty, oversized, wrong-type, renamed and spoofed files", () => {
    const xlsxMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const cases: [string, string, Buffer, ReadonlySet<string>][] = [
      ["empty.pdf", "application/pdf", Buffer.alloc(0), PROPOSAL_DOCUMENT_MIME_TYPES],
      ["big.pdf", "application/pdf", Buffer.concat([pdf, Buffer.alloc(PROPOSAL_DOCUMENT_MAX_BYTES)]), PROPOSAL_DOCUMENT_MIME_TYPES],
      ["image.png", "image/png", Buffer.from([137, 80, 78, 71]), PROPOSAL_DOCUMENT_MIME_TYPES],
      ["sheet.xlsx", xlsxMime, xlsx, PROPOSAL_DOCUMENT_MIME_TYPES],
      ["plan.docx", "application/pdf", pdf, PROPOSAL_DOCUMENT_MIME_TYPES],
      ["fake.pdf", "application/pdf", docx, PROPOSAL_DOCUMENT_MIME_TYPES],
      ["fake.docx", DOCX, xlsx, PROPOSAL_DOCUMENT_MIME_TYPES],
      ["../plan.pdf", "application/pdf", pdf, PROPOSAL_DOCUMENT_MIME_TYPES],
      ["   ", "application/pdf", pdf, PROPOSAL_DOCUMENT_MIME_TYPES],
    ];
    for (const [name, mime, bytes, allowed] of cases) {
      expect(() => validateEventProposalFile(name, mime, bytes, allowed), name).toThrow(expect.objectContaining({ kind: "validation" }));
    }
    expect(validateEventProposalFile("budget.xlsx", xlsxMime, xlsx, PROPOSAL_TEMPLATE_MIME_TYPES)).toBe("budget.xlsx");
  });
  it("blocks submission without a document, never a draft save", () => {
    expect(() => assertProposalDocumentPresent(undefined)).toThrow(expect.objectContaining({ kind: "validation",
      message: "event proposal document is required before submission" }));
    expect(() => assertProposalDocumentPresent({ id: "d", fileName: "a.pdf", mimeType: "application/pdf", bytes: 1, assetId: "x",
      uploadedAt: now, uploadedBy: actor.id })).not.toThrow();
  });
  it("hides the storage asset id in event payloads", () => {
    const document: EventProposalDocument = { id: "d", fileName: "a.pdf", mimeType: "application/pdf", bytes: 1, assetId: "secret", uploadedAt: now, uploadedBy: actor.id };
    expect(publicEventPayload({ plan: "Plan", proposalDocument: document })).toEqual({ plan: "Plan",
      proposalDocument: { id: "d", fileName: "a.pdf", mimeType: "application/pdf", bytes: 1, uploadedAt: now, uploadedBy: actor.id } });
    expect(publicEventPayload({ plan: "Plan" })).toEqual({ plan: "Plan" });
  });
  it("always has the bundled default template to serve", async () => {
    const template = await loadDefaultEventProposalTemplate();
    expect(template.fileName).toBe("Template Đề án sự kiện.docx");
    expect(validateEventProposalFile(template.fileName, template.mimeType, template.content, PROPOSAL_TEMPLATE_MIME_TYPES)).toBe(template.fileName);
  });
  it("refuses uploads without storage, for internal events, and template uploads by non-officers", async () => {
    const d = deps();
    await expect(uploadEventProposalDocument(d, actor, clubId, id, "a.pdf", "application/pdf", pdf, now)).rejects.toMatchObject({ kind: "unavailable" });
    const files = { uploadProposalDocument: vi.fn(), uploadTemplateDocument: vi.fn(), accessUrl: vi.fn() };
    vi.mocked(d.repo.find).mockResolvedValue({ event: { state: "DRAFT" }, versions: [], decisions: [], bookings: [] } as unknown as
      Awaited<ReturnType<ClubEventRepository["find"]>>);
    await expect(uploadEventProposalDocument({ ...d, files }, actor, clubId, id, "a.pdf", "application/pdf", pdf, now)).rejects.toMatchObject({ kind: "validation" });
    await expect(uploadEventProposalDocument({ ...deps("member"), files }, actor, clubId, id, "a.pdf", "application/pdf", pdf, now)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(uploadEventProposalTemplate({ ...d, files }, actor, "t.docx", DOCX, docx, now)).rejects.toMatchObject({ kind: "forbidden" });
    expect(files.uploadProposalDocument).not.toHaveBeenCalled();
    expect(files.uploadTemplateDocument).not.toHaveBeenCalled();
  });
});
