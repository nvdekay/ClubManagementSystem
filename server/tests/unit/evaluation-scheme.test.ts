import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SCHEME_SETTINGS, schemeActivationIssues, validateSchemeSettings,
  type EvaluationScheme, type EvaluationSchemeRepository, type SchemeSettings,
} from "../../src/domain/evaluation-scheme.js";
import type { PolicyRepository, PolicyVersion } from "../../src/domain/policy.js";
import {
  activateEvaluationScheme, createEvaluationScheme, deleteEvaluationScheme, listEvaluationSchemes,
  updateEvaluationScheme,
} from "../../src/usecase/evaluation-scheme.js";

const now = new Date("2026-10-10T08:00:00Z");
const actor = { id: "000000000000000000000001", accountState: "Active" as const };
const officer = { systemRoleCodes: async () => ["ICPDP_OFFICER"] };
const student = { systemRoleCodes: async () => [] };
const id = "000000000000000000000002";
const policy: PolicyRepository = { findEffective: async () => ({ academicCalendar: [
  { code: "FA26", startAt: new Date("2026-09-01"), endAt: new Date("2026-12-31") },
] }) as unknown as PolicyVersion };

function settings(overrides: Partial<SchemeSettings> = {}): SchemeSettings {
  return { ...DEFAULT_SCHEME_SETTINGS, ...overrides };
}

function scheme(state: EvaluationScheme["state"] = "Draft", value = settings()): EvaluationScheme {
  return { id, periodCode: "FA26", version: 1, state, totalWeight: 100, createdAt: now, ...value };
}

function repository(current: EvaluationScheme | null = scheme()) {
  const repo: EvaluationSchemeRepository = {
    list: async () => (current ? [current] : []), find: async () => current,
    createDraft: vi.fn(async (periodCode, value) => ({ ...scheme("Draft", value), periodCode })),
    updateDraft: vi.fn(async (_id, value) => scheme("Draft", value)),
    activate: vi.fn(async () => scheme("Active")), deleteDraft: vi.fn(async () => undefined),
  };
  return repo;
}

describe("UC41 scheme rules", () => {
  it("defaults to all eight dimensions totalling 100, manual scoring on D4–D8", () => {
    expect(DEFAULT_SCHEME_SETTINGS.dimensions.map((dimension) => dimension.code))
      .toEqual(["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"]);
    expect(schemeActivationIssues(DEFAULT_SCHEME_SETTINGS)).toEqual([]);
    expect(DEFAULT_SCHEME_SETTINGS.dimensions.filter((dimension) => dimension.allowsManual)
      .map((dimension) => dimension.code)).toEqual(["D4", "D5", "D6", "D7", "D8"]);
  });

  it("keeps D1–D3, sorts dimensions and rejects malformed weights or thresholds", () => {
    const shuffled = settings({ dimensions: [{ code: "D3", weight: 30, allowsManual: false },
      { code: "D1", weight: 40, allowsManual: false }, { code: "D2", weight: 30, allowsManual: false }] });
    expect(validateSchemeSettings(shuffled).dimensions.map((dimension) => dimension.code)).toEqual(["D1", "D2", "D3"]);
    for (const [bad, field] of [
      [{ dimensions: [{ code: "D1", weight: 50, allowsManual: false }, { code: "D2", weight: 50, allowsManual: false }] }, "dimensions"],
      [{ dimensions: [...DEFAULT_SCHEME_SETTINGS.dimensions, { code: "D1", weight: 0, allowsManual: false }] }, "dimensions"],
      [{ dimensions: [...DEFAULT_SCHEME_SETTINGS.dimensions.slice(0, 3), { code: "D9", weight: 0, allowsManual: false }] }, "dimensions"],
      [{ dimensions: [{ ...DEFAULT_SCHEME_SETTINGS.dimensions[0]!, weight: -1 }, ...DEFAULT_SCHEME_SETTINGS.dimensions.slice(1)] }, "weights"],
      [{ dimensions: [{ ...DEFAULT_SCHEME_SETTINGS.dimensions[0]!, weight: 12.5 }, ...DEFAULT_SCHEME_SETTINGS.dimensions.slice(1)] }, "weights"],
      [{ thresholds: { excellent: 70, good: 70, fair: 50 } }, "thresholds"],
      [{ thresholds: { excellent: 101, good: 70, fair: 50 } }, "thresholds"],
      [{ thresholds: { excellent: 85, good: 70, fair: 0 } }, "thresholds"],
    ] as const) {
      expect(() => validateSchemeSettings(settings(bad as Partial<SchemeSettings>))).toThrow(field);
    }
  });

  it("blocks activation when weights do not total 100 or a core dimension weighs 0 (BR29, BR60)", () => {
    const unbalanced = settings({ dimensions: [{ code: "D1", weight: 0, allowsManual: false },
      { code: "D2", weight: 30, allowsManual: false }, { code: "D3", weight: 30, allowsManual: false }] });
    expect(schemeActivationIssues(unbalanced)).toEqual(["totalWeight", "coreWeight"]);
  });
});

describe("UC41 scheme use cases", () => {
  it("lists schemes with the policy's semesters and the catalogue, for officers only", async () => {
    await expect(listEvaluationSchemes(repository(), policy, student, actor, now)).rejects.toMatchObject({ kind: "forbidden" });
    const listed = await listEvaluationSchemes(repository(), policy, officer, actor, now);
    expect(listed.periods.map((period) => period.code)).toEqual(["FA26"]);
    expect(listed.dimensions).toHaveLength(8);
  });

  it("creates drafts for calendar semesters, from defaults or a copy", async () => {
    const repo = repository(scheme("Active", settings({ thresholds: { excellent: 90, good: 75, fair: 55 } })));
    await expect(createEvaluationScheme(repo, policy, officer, actor, { periodCode: "SP27" }, now))
      .rejects.toMatchObject({ kind: "validation" });
    await createEvaluationScheme(repo, policy, officer, actor, { periodCode: "FA26" }, now);
    expect(repo.createDraft).toHaveBeenLastCalledWith("FA26", DEFAULT_SCHEME_SETTINGS, actor.id, now);
    await createEvaluationScheme(repo, policy, officer, actor, { periodCode: "FA26", copyFromId: id }, now);
    expect(repo.createDraft).toHaveBeenLastCalledWith("FA26",
      expect.objectContaining({ thresholds: { excellent: 90, good: 75, fair: 55 } }), actor.id, now);
  });

  it("edits, deletes and activates drafts only; activation reports what is missing", async () => {
    for (const state of ["Active", "Superseded"] as const) {
      const locked = repository(scheme(state));
      await expect(updateEvaluationScheme(locked, officer, actor, id, settings(), now)).rejects.toMatchObject({ kind: "conflict" });
      await expect(deleteEvaluationScheme(locked, officer, actor, id, now)).rejects.toMatchObject({ kind: "conflict" });
      await expect(activateEvaluationScheme(locked, officer, actor, id, now)).rejects.toMatchObject({ kind: "conflict" });
    }
    const unbalanced = repository(scheme("Draft", settings({ dimensions: DEFAULT_SCHEME_SETTINGS.dimensions.slice(0, 3) })));
    await expect(activateEvaluationScheme(unbalanced, officer, actor, id, now))
      .rejects.toMatchObject({ kind: "validation", details: { issues: ["totalWeight"] } });
    expect(unbalanced.activate).not.toHaveBeenCalled();
    const ready = repository();
    await expect(activateEvaluationScheme(ready, officer, actor, id, now)).resolves.toMatchObject({ state: "Active" });
    await expect(deleteEvaluationScheme(ready, officer, actor, id, now)).resolves.toEqual({ deleted: true });
    await expect(updateEvaluationScheme(repository(null), officer, actor, id, settings(), now))
      .rejects.toMatchObject({ kind: "not_found" });
  });
});
