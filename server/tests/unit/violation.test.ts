import { describe, expect, it } from "vitest";
import { applyViolationStep, normalizedEvidence, normalizedOpenInput, type ViolationCase } from "../../src/domain/violation.js";
import { openViolation } from "../../src/usecase/violation.js";

const now = new Date("2026-10-10T08:00:00Z");
const later = new Date("2026-10-20T08:00:00Z");
const officer = "000000000000000000000001";

function base(change: Partial<ViolationCase> = {}): ViolationCase {
  return { id: "c1", clubId: "000000000000000000000002", clubName: "HEBE", originType: "OTHER", severity: "MODERATE",
    title: "Tổ chức sự kiện chưa được duyệt", evidence: [], decisionEvidence: [], state: "Open", openedBy: officer,
    openedAt: now, actions: [], ...change };
}

describe("violation case steps", () => {
  it("walks a case from opening to resolution", () => {
    let current = applyViolationStep(base(), { type: "investigate" }, officer, now).next;
    expect(current.state).toBe("Under Investigation");
    current = applyViolationStep(current, { type: "addEvidence", evidence: { note: "Ảnh poster", url: "https://x.vn/a.jpg" } },
      officer, now).next;
    expect(current.evidence).toHaveLength(1);
    const asked = applyViolationStep(current, { type: "requestResponse", message: "Giải trình việc tổ chức" }, officer, now);
    expect(asked).toMatchObject({ notifyClub: true, next: { state: "Awaiting Club Response",
      responseDueAt: new Date("2026-10-17T08:00:00Z") } });
    current = asked.next;
    expect(() => applyViolationStep(current, { type: "decide", finding: "VIOLATION", reason: "x",
      evidence: [{ note: "y" }] }, officer, now)).toThrow(/club's response/);
    expect(() => applyViolationStep(current, { type: "recordResponse", noResponse: true }, officer, now)).toThrow(/not passed/);
    current = applyViolationStep(current, { type: "recordResponse", noResponse: true }, officer, later).next;
    expect(current.clubResponse?.source).toBe("NO_RESPONSE");
    expect(() => applyViolationStep(current, { type: "decide", finding: "VIOLATION", reason: "Vi phạm quy chế" },
      officer, later)).toThrow(/evidence/);
    current = applyViolationStep(current, { type: "decide", finding: "VIOLATION", reason: "Vi phạm quy chế",
      evidence: [{ note: "Biên bản" }] }, officer, later).next;
    expect(current.state).toBe("Decision Issued");
    current = applyViolationStep(current, { type: "addActions", actions: [
      { description: "Nộp bản kiểm điểm", dueAt: new Date("2026-11-01"), linkedLifecycleAction: "SUSPEND" }] }, officer, later).next;
    expect(current.state).toBe("Corrective Action");
    current = { ...current, actions: current.actions.map((item) => ({ ...item, id: "a1" })) };
    const verified = applyViolationStep(current, { type: "verifyAction", actionId: "a1", outcome: "Verified" }, officer, later);
    expect(verified).toMatchObject({ action: "VIOLATION_RESOLVED", next: { state: "Resolved", resolvedAt: later } });
    expect(() => applyViolationStep(verified.next, { type: "investigate" }, officer, later)).toThrow(/closed/);
  });

  it("closes without a violation from any undecided state, with a reason", () => {
    expect(() => applyViolationStep(base(), { type: "decide", finding: "NO_VIOLATION", reason: " " }, officer, now))
      .toThrow(/reason/);
    expect(applyViolationStep(base({ state: "Under Investigation" }), { type: "decide", finding: "NO_VIOLATION",
      reason: "Đã có giấy phép" }, officer, now).next).toMatchObject({ state: "Closed", decisionReason: "Đã có giấy phép" });
    expect(() => applyViolationStep(base({ state: "Decision Issued" }), { type: "decide", finding: "NO_VIOLATION",
      reason: "x" }, officer, now)).toThrow(/already/);
  });

  it("keeps the case open when an action fails and lets the officer resolve once nothing is pending", () => {
    const current = base({ state: "Corrective Action", actions: [
      { id: "a1", description: "A", dueAt: later, state: "Pending" }, { id: "a2", description: "B", dueAt: later, state: "Verified" }] });
    const failed = applyViolationStep(current, { type: "verifyAction", actionId: "a1", outcome: "Failed" }, officer, now);
    expect(failed).toMatchObject({ action: "VIOLATION_ACTION_FAILED", next: { state: "Corrective Action" } });
    expect(() => applyViolationStep(current, { type: "resolve" }, officer, now)).toThrow(/not checked/);
    expect(applyViolationStep(failed.next, { type: "resolve", note: "Đã nhắc nhở" }, officer, now).next.state).toBe("Resolved");
    expect(applyViolationStep(base({ state: "Decision Issued" }), { type: "resolve" }, officer, now).next.state).toBe("Resolved");
  });

  it("validates input", () => {
    expect(() => normalizedEvidence([{ note: "x", url: "javascript:alert(1)" }], officer, now)).toThrow(/http/);
    expect(normalizedEvidence([{ note: " ", url: "https://a.vn" }], officer, now)[0]).toMatchObject({ note: "https://a.vn" });
    expect(() => normalizedOpenInput({ clubId: "x", originType: "OTHER", severity: "MINOR", title: "  " })).toThrow(/title/);
    expect(() => applyViolationStep(base({ state: "Decision Issued" }), { type: "addActions",
      actions: [{ description: "x", dueAt: now }] }, officer, now)).toThrow(/future/);
    expect(() => applyViolationStep(base(), { type: "requestResponse", message: "x", dueAt: now }, officer, now)).toThrow(/future/);
  });

  it("only lets an ICPDP officer open a case", async () => {
    const repo = { list: async () => [], find: async () => null, sources: async () => null,
      open: async () => { throw new Error("unused"); }, apply: async () => { throw new Error("unused"); } };
    await expect(openViolation(repo, { systemRoleCodes: async () => [] }, { id: officer, accountState: "Active" },
      { clubId: "000000000000000000000002", originType: "OTHER", severity: "MINOR", title: "x" }, now))
      .rejects.toMatchObject({ kind: "forbidden" });
  });
});
