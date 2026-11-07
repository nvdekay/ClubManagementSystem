import { Types } from "mongoose";
import {
  RECORDED_EVENT_STATES, type BoardSeatSource, type ClubBoardHistory, type InternalEventDetail,
  type InternalEventFilter, type InternalEventList, type InternalEventSummary,
} from "../../domain/dashboard.js";
import { ucmsModels as m } from "./ucms-models.js";

type Doc = Record<string, unknown>;
const LIST_LIMIT = 200;

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function recordedInternal(): Doc {
  return { organizerType: { $ne: "ICPDP" }, audienceScope: "MEMBERS_ONLY", state: { $in: [...RECORDED_EVENT_STATES] } };
}

async function summaries(docs: Doc[]): Promise<InternalEventSummary[]> {
  const ids = docs.map((doc) => doc._id as Types.ObjectId);
  const clubIds = [...new Set(docs.map((doc) => String(doc.clubId)))].map((id) => new Types.ObjectId(id));
  const [registrations, attendances, clubs] = await Promise.all([
    m.eventRegistrations!.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { eventId: { $in: ids }, state: "Confirmed" } }, { $group: { _id: "$eventId", count: { $sum: 1 } } }]),
    m.attendances!.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { eventId: { $in: ids } } }, { $group: { _id: "$eventId", count: { $sum: 1 } } }]),
    m.clubs!.find({ _id: { $in: clubIds } }).select({ name: 1 }).lean(),
  ]);
  const registered = new Map(registrations.map((row) => [String(row._id), row.count]));
  const attended = new Map(attendances.map((row) => [String(row._id), row.count]));
  const names = new Map(clubs.map((club) => [String(club._id), String(club.name)]));
  return docs.map((doc) => ({
    id: String(doc._id), clubId: String(doc.clubId),
    clubName: names.get(String(doc.clubId)) ?? optionalText(doc.clubName) ?? "",
    title: String(doc.title), startAt: doc.startAt as Date, endAt: doc.endAt as Date,
    semesterCode: String(doc.semesterCode), state: String(doc.state),
    ...(optionalText(doc.venueText) ? { venueText: String(doc.venueText) } : {}),
    capacity: Number(doc.capacity ?? 0),
    registrations: registered.get(String(doc._id)) ?? 0, attendances: attended.get(String(doc._id)) ?? 0,
  }));
}

/** FR-UC02-02, BR53: recorded internal events of every club, newest first, filtered by club and semester. */
export async function internalEvents(filter: InternalEventFilter): Promise<InternalEventList> {
  const base = recordedInternal();
  const query: Doc = { ...base,
    ...(filter.clubId ? { clubId: new Types.ObjectId(filter.clubId) } : {}),
    ...(filter.semesterCode ? { semesterCode: filter.semesterCode } : {}) };
  const [docs, clubIds, semesters] = await Promise.all([
    m.events!.find(query).sort({ startAt: -1, _id: -1 }).limit(LIST_LIMIT).lean(),
    m.events!.distinct("clubId", base),
    m.events!.distinct("semesterCode", base),
  ]);
  const clubs = await m.clubs!.find({ _id: { $in: clubIds } }).select({ name: 1 }).lean();
  return {
    items: await summaries(docs),
    clubs: clubs.map((club) => ({ id: String(club._id), name: String(club.name) }))
      .sort((left, right) => left.name.localeCompare(right.name, "vi")),
    semesters: (semesters as unknown[]).map(String).sort().reverse(),
  };
}

/** The event and its attendance, read-only: ICPDP inspects, the club still owns every change. */
export async function internalEvent(eventId: string): Promise<InternalEventDetail | null> {
  const doc = await m.events!.findOne({ _id: new Types.ObjectId(eventId), ...recordedInternal() }).lean();
  if (!doc) return null;
  const [summary] = await summaries([doc]);
  const rows = await m.attendances!.find({ eventId: doc._id }).sort({ checkedInAt: 1 }).lean();
  const users = await m.users!.find({ _id: { $in: rows.map((row) => row.studentId) } })
    .select({ displayName: 1, email: 1 }).lean();
  const byId = new Map(users.map((user) => [String(user._id), user]));
  return {
    ...summary!,
    ...(optionalText(doc.objective) ? { objective: String(doc.objective) } : {}),
    attendance: rows.map((row) => {
      const user = byId.get(String(row.studentId));
      return { studentName: String(user?.displayName ?? ""), email: String(user?.email ?? ""),
        checkedInAt: row.checkedInAt as Date, method: String(row.method), finalized: Boolean(row.finalized) };
    }),
  };
}

/**
 * BR56: every role-structure version and the board seats of every term. A seat names the step
 * that confirmed it — a confirmed UC11 nomination seat, a confirmed UC13 plan for that term, or
 * otherwise the founding term approved with the UC08 application.
 */
export async function clubBoardHistory(clubId: string): Promise<ClubBoardHistory | null> {
  const id = new Types.ObjectId(clubId);
  const club = await m.clubs!.findById(id).select({ code: 1, name: 1, state: 1, sourceApplicationId: 1 }).lean();
  if (!club) return null;
  const [versions, terms, assignments, plans, nominations] = await Promise.all([
    m.clubRoleStructureVersions!.find({ clubId: id }).sort({ versionNo: -1 }).lean(),
    m.clubTerms!.find({ clubId: id }).sort({ startAt: -1, _id: -1 }).lean(),
    m.clubPositionAssignments!.find({ clubId: id }).sort({ effectiveFrom: 1, _id: 1 }).lean(),
    m.transitionPlans!.find({ clubId: id, state: "Confirmed" }).select({ toTermId: 1, decidedAt: 1 }).lean(),
    m.boardNominations!.find({ clubId: id, state: { $in: ["Confirmed", "Returned"] } })
      .select({ termId: 1, decidedAt: 1 }).lean(),
  ]);
  const [positions, memberships, seats] = await Promise.all([
    m.clubPositions!.find({ _id: { $in: assignments.map((row) => row.positionId) } }).select({ name: 1 }).lean(),
    m.clubMemberships!.find({ _id: { $in: assignments.map((row) => row.membershipId) } }).select({ userId: 1 }).lean(),
    m.boardNominationSeats!.find({ nominationId: { $in: nominations.map((row) => row._id) }, state: "Confirmed" })
      .select({ nominationId: 1, positionId: 1, membershipId: 1 }).lean(),
  ]);
  const officerIds = assignments.map((row) => row.confirmedBy).filter(Boolean);
  const users = await m.users!.find({ _id: { $in: [...memberships.map((row) => row.userId), ...officerIds] } })
    .select({ displayName: 1 }).lean();
  const userName = new Map(users.map((user) => [String(user._id), String(user.displayName)]));
  const positionName = new Map(positions.map((row) => [String(row._id), String(row.name)]));
  const memberUser = new Map(memberships.map((row) => [String(row._id), String(row.userId)]));
  const planByTerm = new Map(plans.map((plan) => [String(plan.toTermId), plan]));
  const nominationById = new Map(nominations.map((row) => [String(row._id), row]));
  const nominatedSeat = new Map(seats.map((seat) => {
    const nomination = nominationById.get(String(seat.nominationId));
    return [`${String(nomination?.termId)}:${String(seat.positionId)}:${String(seat.membershipId)}`, nomination];
  }));
  const foundingTermId = club.sourceApplicationId && terms.length ? String(terms.at(-1)!._id) : undefined;

  function seatSource(row: Doc): { source?: BoardSeatSource; confirmedAt?: Date } {
    const nomination = nominatedSeat.get(`${String(row.termId)}:${String(row.positionId)}:${String(row.membershipId)}`);
    if (nomination) return { source: "NOMINATION", ...(nomination.decidedAt ? { confirmedAt: nomination.decidedAt as Date } : {}) };
    const plan = planByTerm.get(String(row.termId));
    if (plan) return { source: "TRANSITION", ...(plan.decidedAt ? { confirmedAt: plan.decidedAt as Date } : {}) };
    if (String(row.termId) === foundingTermId) return { source: "APPLICATION", confirmedAt: row.effectiveFrom as Date };
    return {};
  }

  return {
    club: { id: String(club._id), code: String(club.code), name: String(club.name), state: String(club.state) },
    structures: versions.map((version) => ({
      versionNo: Number(version.versionNo), effectiveFrom: version.effectiveFrom as Date, source: String(version.source),
      ...(optionalText(version.reason) ? { reason: String(version.reason) } : {}),
      roles: ((version.roles ?? []) as Doc[]).map((role) => ({ code: String(role.code), name: String(role.name),
        ...(optionalText(role.unit) ? { unit: String(role.unit) } : {}),
        isBoardSeat: Boolean(role.isBoardSeat), isLeaderRole: Boolean(role.isLeaderRole) })),
    })),
    terms: terms.map((term) => ({
      id: String(term._id), name: String(term.name), state: String(term.state),
      startAt: term.startAt as Date, endAt: term.endAt as Date,
      seats: assignments.filter((row) => String(row.termId) === String(term._id)).map((row) => ({
        positionName: positionName.get(String(row.positionId)) ?? "",
        memberName: userName.get(memberUser.get(String(row.membershipId)) ?? "") ?? "",
        effectiveFrom: row.effectiveFrom as Date,
        ...(row.effectiveTo ? { effectiveTo: row.effectiveTo as Date } : {}),
        ...seatSource(row),
        ...(row.confirmedBy && userName.has(String(row.confirmedBy))
          ? { confirmedByName: userName.get(String(row.confirmedBy))! } : {}),
      })),
    })),
  };
}
