import { randomUUID } from "node:crypto";
import { Types, type ClientSession } from "mongoose";
import type { ViolationOrigin, ViolationSeverity } from "../../domain/violation.js";
import { ucmsModels } from "./ucms-models.js";

/**
 * Opens a UC40 case inside the caller's transaction, for flows that raise one themselves
 * (a report finding, a missing report, an overdue refund). The case then follows UC40 as usual.
 */
export async function insertViolationCase(session: ClientSession, input: { clubId: Types.ObjectId;
  originType: ViolationOrigin; originRefId?: Types.ObjectId; severity: ViolationSeverity; title: string;
  description?: string; evidenceNote?: string }, officerId: string, now: Date): Promise<Types.ObjectId> {
  const id = new Types.ObjectId();
  const actorId = new Types.ObjectId(officerId);
  await ucmsModels.violations!.create([{ _id: id, clubId: input.clubId, originType: input.originType,
    ...(input.originRefId ? { originRefId: input.originRefId } : {}), severity: input.severity, title: input.title,
    ...(input.description ? { description: input.description } : {}),
    evidence: input.evidenceNote ? [{ note: input.evidenceNote, addedBy: actorId, addedAt: now }] : [],
    state: "Open", openedBy: actorId, openedAt: now }], { session });
  await ucmsModels.auditLogs!.create([{ entityType: "Violation", entityId: id, action: "VIOLATION_OPENED", actorId,
    actorRole: "ICPDP_OFFICER", before: null,
    after: { state: "Open", severity: input.severity, originType: input.originType }, reason: input.title,
    correlationId: randomUUID(), at: now }], { session });
  return id;
}
