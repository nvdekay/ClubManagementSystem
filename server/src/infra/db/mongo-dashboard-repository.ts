import { overduePostEventReports } from "./post-event-report-deadlines.js";
import { Types, type FilterQuery, type Model } from "mongoose";
import type {
  DashboardPanel, DashboardPanelKey, DashboardRepository, DashboardSnapshot,
} from "../../domain/dashboard.js";
import { ucmsModels } from "./ucms-models.js";
import { overduePeriodicReports } from "./periodic-report-obligations.js";
import { clubCharts, icpdpCharts } from "./dashboard-charts.js";

type UcmsDocument = Record<string, unknown>;

function model(name: string): Model<UcmsDocument> {
  const value = ucmsModels[name];
  if (!value) throw new Error(`UCMS model is unavailable: ${name}`);
  return value;
}

async function panel(
  key: DashboardPanelKey,
  collection: string,
  filter: FilterQuery<UcmsDocument>,
): Promise<DashboardPanel> {
  try {
    const count = await model(collection).countDocuments(filter);
    return { key, status: "ready", count };
  } catch {
    return { key, status: "error" };
  }
}

async function transitionFollowUps(clubId: Types.ObjectId): Promise<DashboardPanel> {
  try {
    const totals = await model("transitionPlans").aggregate<{ count: number }>([
      { $match: { clubId, state: "Confirmed" } },
      { $project: { count: { $size: { $ifNull: ["$followUpConditions", []] } } } },
      { $group: { _id: null, count: { $sum: "$count" } } },
    ]);
    return { key: "transitionFollowUps", status: "ready", count: totals[0]?.count ?? 0 };
  } catch {
    return { key: "transitionFollowUps", status: "error" };
  }
}

async function overdueReportsPanel(now: Date, clubId?: Types.ObjectId): Promise<DashboardPanel> {
  try {
    const [postEvents, periodic] = await Promise.all([overduePostEventReports(clubId, now), clubId
      ? overduePeriodicReports(clubId, now).then((codes) => codes.length)
      : model("periodicReports").countDocuments({ dueAt: { $lt: now }, state: { $in: ["Draft", "Returned for correction"] } })]);
    return { key: "overdueReports", status: "ready", count: postEvents.length + periodic };
  } catch { return { key: "overdueReports", status: "error" }; }
}

function buildSnapshot(
  kind: DashboardSnapshot["kind"],
  generatedAt: Date,
  panels: Promise<DashboardPanel>[],
  clubId?: string,
  charts?: Promise<Pick<DashboardSnapshot, "icpdpCharts" | "clubCharts">>,
): Promise<DashboardSnapshot> {
  // A failed chart query drops the charts only; the panels keep their own per-panel errors.
  const chartData = (charts ?? Promise.resolve({})).catch(() => ({}));
  return Promise.all([Promise.all(panels), chartData]).then(([resolved, extra]) => ({
    kind, generatedAt, panels: resolved, ...(clubId ? { clubId } : {}), ...extra,
  }));
}

export function mongoDashboardRepository(): DashboardRepository {
  return {
    student(userId, now) {
      const user = new Types.ObjectId(userId);
      return buildSnapshot("student", now, [
        panel("foundingApplications", "clubApplications", { founderUserId: user }),
        panel("recruitmentApplications", "recruitmentApplications", { userId: user }),
        panel("memberships", "clubMemberships", { userId: user, state: "Active" }),
        panel("registrations", "eventRegistrations", {
          studentId: user, state: { $in: ["Confirmed", "Waitlisted"] },
        }),
        panel("attendanceHistory", "attendances", { studentId: user }),
        panel("complaints", "complaints", {
          complainantId: user, state: { $nin: ["Withdrawn"] },
        }),
        panel("openRecruitment", "recruitmentCampaigns", {
          // Same visibility rule as the public directory: a published campaign accepts applications in its window.
          state: { $in: ["Published", "Accepting Applications"] }, windowStart: { $lte: now }, windowEnd: { $gt: now },
        }),
        panel("upcomingEvents", "events", { state: "Upcoming", startAt: { $gte: now } }),
      ]);
    },

    club(clubId, permissions, now) {
      const club = new Types.ObjectId(clubId);
      const allowed = new Set(permissions);
      const panels = [
        ...(allowed.has("club.member.manage")
          ? [panel("activeMembers", "clubMemberships", { clubId: club, state: "Active" })] : []),
        panel("openCampaigns", "recruitmentCampaigns", {
          clubId: club, state: { $in: ["Published", "Accepting Applications"] },
        }),
        panel("upcomingEvents", "events", {
          clubId: club, state: "Upcoming", startAt: { $gte: now },
        }),
        ...(allowed.has("club.event.manage") ? [panel("pendingEventProposals", "events", {
          clubId: club, state: { $in: ["Pending Approval", "Under Review", "Revision Requested"] },
        })] : []),
        ...(allowed.has("club.expense.record") ? [panel("activeBudgets", "eventBudgets", {
          clubId: club, state: { $nin: ["Cancelled", "Closed"] },
        }),
        panel("missingEvidence", "expenses", { clubId: club, hasEvidence: false }),
        ] : []),
        ...(allowed.has("club.report.submit") ? [overdueReportsPanel(now, club)] : []),
        ...(allowed.has("club.booking.manage") ? [panel("upcomingBookings", "propertyBookings", {
          clubId: club, state: { $in: ["Approved", "In Use"] }, endAt: { $gte: now },
        })] : []),
        ...(allowed.has("club.feedback.view")
          ? [panel("feedback", "eventFeedbacks", { clubId: club })] : []),
        ...(allowed.has("club.complaint.respond") ? [panel("openViolations", "violations", {
          clubId: club, state: { $nin: ["Resolved", "Closed"] },
        })] : []),
        ...(allowed.has("club.board.nominate") ? [panel("currentTerms", "clubTerms", {
          clubId: club, state: "Active", startAt: { $lte: now }, endAt: { $gt: now },
        }),
        panel("structureHistory", "clubRoleStructureVersions", { clubId: club }),
        ] : []),
        ...(allowed.has("club.transition.plan") ? [transitionFollowUps(club)] : []),
      ];
      // Charts read member, event and recruitment data, which only a Club Leader manages.
      return buildSnapshot("club", now, panels, clubId, allowed.has("club.member.manage")
        ? clubCharts(clubId, now).then((clubCharts) => ({ clubCharts })) : undefined);
    },

    icpdp(now) {
      const openTasks = ["Open", "Escalated"];
      return buildSnapshot("icpdp", now, [
        panel("pendingClubApplications", "clubApplications", {
          state: { $in: ["Submitted", "Under Review", "Revision Requested"] },
        }),
        panel("pendingEventProposals", "events", {
          state: { $in: ["Pending Approval", "Under Review", "Revision Requested"] },
        }),
        panel("pendingReports", "periodicReports", { state: "Submitted" }),
        panel("approvalTasks", "approvalTasks", { state: { $in: openTasks } }),
        panel("overdueApprovals", "approvalTasks", {
          state: { $in: openTasks }, slaDueAt: { $lt: now },
        }),
        panel("activeClubs", "clubs", { state: "Active" }),
        panel("suspendedClubs", "clubs", { state: "Suspended" }),
        overdueReportsPanel(now),
        panel("unreconciledBudgets", "eventBudgets", {
          state: { $in: ["Settlement Submitted", "Reconciliation Pending"] },
        }),
        panel("overdueSettlements", "eventBudgets", {
          settlementDueAt: { $lt: now }, settlementSubmittedAt: { $exists: false },
          state: { $nin: ["Cancelled", "Closed"] },
        }),
        panel("overdueRefunds", "eventBudgets", {
          recoveryDueAt: { $lt: now }, state: "Recovery Pending",
        }),
        panel("openViolations", "violations", { state: { $nin: ["Resolved", "Closed"] } }),
        panel("upcomingBookings", "propertyBookings", {
          state: { $in: ["Requested", "Under Review"] }, startAt: { $gte: now },
        }),
        panel("internalEvents", "events", {
          audienceScope: "MEMBERS_ONLY", state: { $in: ["Upcoming", "Ongoing"] },
        }),
        panel("roleStructures", "clubRoleStructureVersions", {}),
        panel("boardHistory", "clubPositionAssignments", { confirmedBy: { $exists: true } }),
      ], undefined, icpdpCharts(now).then((icpdpCharts) => ({ icpdpCharts })));
    },
  };
}
