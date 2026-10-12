import { randomUUID } from "node:crypto";
import mongoose, { Types } from "mongoose";
import {
  CLUB_PROFILE_FORM_FIELDS, DEFAULT_FORM_REQUIREMENTS, FOUNDING_FORM_FIELDS,
  type AcademicSemester, type FormRequirements, type PolicyDecisionImpact, type PolicyImpactReason,
  type PolicyManagementRepository, type PolicySettings, type PolicyVersion, type ReportDeadline,
} from "../../domain/policy.js";
import { ucmsModels } from "./ucms-models.js";

function flags<K extends string>(raw: unknown, keys: readonly K[],
  fallback: Readonly<Record<K, boolean>>): Record<K, boolean> {
  const record = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  return Object.fromEntries(keys.map((key) => [key,
    typeof record[key] === "boolean" ? record[key] : fallback[key]])) as Record<K, boolean>;
}

/** Versions written before form requirements existed read as the defaults. */
function formRequirementsFrom(raw: unknown): FormRequirements {
  const record = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  return {
    clubFounding: flags(record.clubFounding, FOUNDING_FORM_FIELDS,
      DEFAULT_FORM_REQUIREMENTS.clubFounding),
    clubProfile: flags(record.clubProfile, CLUB_PROFILE_FORM_FIELDS,
      DEFAULT_FORM_REQUIREMENTS.clubProfile),
  };
}

function mapPolicy(doc: Record<string, unknown>): PolicyVersion {
  const rawCalendar = doc.academicCalendar as AcademicSemester[];
  return {
    id: String(doc._id),
    minFoundingMembers: Number(doc.minFoundingMembers),
    formRequirements: formRequirementsFrom(doc.formRequirements),
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
  const clubs = ucmsModels.clubs!;
  const events = ucmsModels.events!;
  const bookings = ucmsModels.propertyBookings!;
  const properties = ucmsModels.properties!;

  async function decisionImpacts(
    settings: PolicySettings, effectiveFrom: Date,
  ): Promise<PolicyDecisionImpact[]> {
    const [eventDocs, bookingDocs, clubDocs, previousDoc] = await Promise.all([
      events.find({ state: { $in: ["Approved", "Upcoming", "Ongoing"] },
        endAt: { $gt: effectiveFrom } })
        .select("_id semesterCode startAt endAt").lean(),
      bookings.find({ state: { $in: ["Approved", "In Use"] }, endAt: { $gt: effectiveFrom } })
        .select("_id propertyId semesterCode startAt endAt headcount").lean(),
      clubs.find({ state: { $in: ["Active", "Dissolving"] },
        "dissolution.effectiveSemester": { $exists: true } })
        .select("_id dissolution").lean(),
      policies.findOne({ effectiveFrom: { $lte: effectiveFrom } })
        .sort({ effectiveFrom: -1, createdAt: -1, _id: -1 }).lean(),
    ]);
    const semesterByCode = new Map(settings.academicCalendar.map((semester) => [
      semester.code.toLowerCase(), semester,
    ]));
    const previousCalendar = previousDoc
      ? new Map(mapPolicy(previousDoc).academicCalendar.map((semester) => [
        semester.code.toLowerCase(), semester,
      ])) : new Map<string, AcademicSemester>();
    const impacted = new Map<string, PolicyDecisionImpact>();

    function add(entityType: PolicyDecisionImpact["entityType"], entityId: string,
      reason: PolicyImpactReason): void {
      const key = `${entityType}:${entityId}`;
      const current = impacted.get(key);
      if (current) {
        if (!current.reasons.includes(reason)) current.reasons.push(reason);
      } else {
        impacted.set(key, { entityType, entityId, reasons: [reason] });
      }
    }

    function outsideCalendar(doc: Record<string, unknown>): boolean {
      const code = typeof doc.semesterCode === "string" ? doc.semesterCode.toLowerCase() : "";
      const semester = semesterByCode.get(code);
      const startAt = doc.startAt as Date | undefined;
      const endAt = doc.endAt as Date | undefined;
      return !semester || !startAt || !endAt || startAt < semester.startAt || endAt > semester.endAt;
    }

    for (const event of eventDocs) {
      if (outsideCalendar(event)) {
        add("Event", String(event._id), "EVENT_OUTSIDE_ACADEMIC_CALENDAR");
      }
    }
    for (const booking of bookingDocs) {
      if (outsideCalendar(booking)) {
        add("PropertyBooking", String(booking._id), "BOOKING_OUTSIDE_ACADEMIC_CALENDAR");
      }
    }
    for (const club of clubDocs) {
      const dissolution = club.dissolution as { effectiveSemester?: unknown } | undefined;
      const code = typeof dissolution?.effectiveSemester === "string"
        ? dissolution.effectiveSemester.toLowerCase() : "";
      const oldSemester = previousCalendar.get(code);
      if (!semesterByCode.has(code) && (!oldSemester || oldSemester.endAt > effectiveFrom)) {
        add("Club", String(club._id), "DISSOLUTION_SEMESTER_REMOVED");
      }
    }
    if (!settings.allowOverbooking) {
      const propertyIds = bookingDocs.flatMap((booking) => booking.propertyId ? [booking.propertyId] : []);
      const propertyDocs = await properties.find({ _id: { $in: propertyIds }, capacity: { $exists: true } })
        .select("_id capacity").lean();
      const capacityById = new Map(propertyDocs.map((property) => [
        String(property._id), Number(property.capacity),
      ]));
      for (const booking of bookingDocs) {
        const capacity = capacityById.get(String(booking.propertyId));
        if (capacity !== undefined && Number(booking.headcount) > capacity) {
          add("PropertyBooking", String(booking._id), "APPROVED_OVERBOOKING_DISALLOWED");
        }
      }
    }
    return [...impacted.values()];
  }

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
    findDecisionImpacts: decisionImpacts,
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
