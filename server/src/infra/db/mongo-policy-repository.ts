import { randomUUID } from "node:crypto";
import mongoose, { Types } from "mongoose";
import type {
  AcademicSemester, PolicyManagementRepository, PolicyVersion, ReportDeadline,
} from "../../domain/policy.js";
import { ucmsModels } from "./ucms-models.js";

function mapPolicy(doc: Record<string, unknown>): PolicyVersion {
  const rawCalendar = doc.academicCalendar as AcademicSemester[];
  return {
    id: String(doc._id),
    allowedEmailDomains: doc.allowedEmailDomains as string[],
    minFoundingMembers: Number(doc.minFoundingMembers),
    mandatoryApplicationDocuments: doc.mandatoryApplicationDocuments as string[],
    reportDeadlines: doc.reportDeadlines as ReportDeadline[],
    conflictThresholdMinutes: Number(doc.conflictThresholdMinutes),
    feedbackWindowHours: Number(doc.feedbackWindowHours),
    feedbackMinRespondents: Number(doc.feedbackMinRespondents),
    allowOverbooking: doc.allowOverbooking === true,
    enforceOverdueReportBlock: doc.enforceOverdueReportBlock === true,
    academicCalendar: rawCalendar.map((semester) => ({
      ...semester, startAt: new Date(semester.startAt), endAt: new Date(semester.endAt),
    })),
    effectiveFrom: doc.effectiveFrom as Date,
    createdBy: String(doc.createdBy),
    createdAt: doc.createdAt as Date,
  };
}

export function mongoPolicyRepository(): PolicyManagementRepository {
  const policies = ucmsModels.policyVersions!;
  const audits = ucmsModels.auditLogs!;
  return {
    async findEffective(at) {
      const doc = await policies.findOne({ effectiveFrom: { $lte: at } })
        .sort({ effectiveFrom: -1, createdAt: -1, _id: -1 }).lean();
      return doc ? mapPolicy(doc) : null;
    },
    async listRecent(limit) {
      const docs = await policies.find().sort({ createdAt: -1, _id: -1 }).limit(limit).lean();
      return docs.map(mapPolicy);
    },
    async append(input) {
      return mongoose.connection.transaction(async (session) => {
        const previous = await policies.findOne({ effectiveFrom: { $lte: input.effectiveFrom } })
          .sort({ effectiveFrom: -1, createdAt: -1, _id: -1 }).session(session).lean();
        const created = await policies.create([{
          ...input.settings, effectiveFrom: input.effectiveFrom,
          createdBy: new Types.ObjectId(input.createdBy), createdAt: input.createdAt,
        }], { session });
        const version = created[0]!;
        await audits.create([{
          entityType: "PolicyVersion", entityId: version._id,
          action: "POLICY_VERSION_CREATED", actorId: new Types.ObjectId(input.createdBy),
          before: previous ? { policyVersionId: String(previous._id) } : null,
          after: { ...input.settings, effectiveFrom: input.effectiveFrom },
          reason: input.reason, correlationId: randomUUID(), at: input.createdAt,
        }], { session });
        return mapPolicy(version.toObject());
      });
    },
  };
}
