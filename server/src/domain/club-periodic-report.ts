import { DomainError } from "./errors.js";
import type { PeriodicReportDetail } from "./periodic-report.js";

export interface PeriodicDraftInput {
  narrative: string;
  nextPlan: string;
  evidence: { note?: string; url?: string }[];
}
export interface ClubPeriodicReportRepository {
  list(clubId: string): Promise<PeriodicReportDetail[]>;
  create(clubId: string, periodCode: string, dueAt: Date, userId: string, now: Date): Promise<PeriodicReportDetail>;
  save(clubId: string, id: string, revision: number, input: PeriodicDraftInput, userId: string, now: Date): Promise<PeriodicReportDetail>;
  submit(clubId: string, id: string, revision: number, userId: string, now: Date): Promise<PeriodicReportDetail>;
}
export function normalizePeriodicDraft(input: PeriodicDraftInput, submitting = false): PeriodicDraftInput {
  const narrative = input.narrative.trim();
  const nextPlan = input.nextPlan.trim();
  if (narrative.length > 20_000 || nextPlan.length > 20_000 || input.evidence.length > 50) {
    throw new DomainError("report content is too long", "validation");
  }
  const evidence = input.evidence.map((entry) => {
    const note = entry.note?.trim();
    const url = entry.url?.trim();
    if ((note?.length ?? 0) > 2_000 || (url?.length ?? 0) > 2_000) throw new DomainError("evidence is too long", "validation");
    if (url) {
      try { if (!["http:", "https:"].includes(new URL(url).protocol)) throw new Error("protocol"); }
      catch { throw new DomainError("invalid evidence URL", "validation"); }
    }
    if (!note && !url) throw new DomainError("evidence needs a note or URL", "validation");
    return { ...(note ? { note } : {}), ...(url ? { url } : {}) };
  });
  if (submitting && (!narrative || !nextPlan || !evidence.length)) {
    throw new DomainError("narrative, next plan and evidence are required", "validation");
  }
  return { narrative, nextPlan, evidence };
}
