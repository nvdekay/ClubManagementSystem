import { Types } from "mongoose";
import type { EventRegistrationState } from "../../domain/event-registration.js";
import type { MemberSpaceRepository } from "../../domain/member-space.js";
import type { MembershipState } from "../../domain/membership.js";
import { ucmsModels } from "./ucms-models.js";

function date(value: unknown): Date {
  if (!(value instanceof Date)) throw new Error("invalid member space date in database");
  return value;
}

const shownEventStates = ["Upcoming", "Ongoing"];

export function mongoMemberSpaceRepository(): MemberSpaceRepository {
  const clubs = ucmsModels.clubs!;
  const memberships = ucmsModels.clubMemberships!;
  const users = ucmsModels.users!;
  const terms = ucmsModels.clubTerms!;
  const positions = ucmsModels.clubPositions!;
  const assignments = ucmsModels.clubPositionAssignments!;
  const requests = ucmsModels.membershipWithdrawalRequests!;
  const events = ucmsModels.events!;
  const registrations = ucmsModels.eventRegistrations!;
  const attendances = ucmsModels.attendances!;
  const feedbacks = ucmsModels.eventFeedbacks!;

  return {
    async find(userId, clubId, now) {
      const clubObjectId = new Types.ObjectId(clubId);
      const userObjectId = new Types.ObjectId(userId);
      const [club, mine] = await Promise.all([
        clubs.findById(clubObjectId).select({ name: 1, logoUrl: 1, state: 1 }).lean(),
        memberships.findOne({ clubId: clubObjectId, userId: userObjectId }).sort({ joinedAt: -1 }).lean(),
      ]);
      if (!club || !mine) return null;

      // Current positions: confirmed, in effect, inside an Active term — the same rule as permissions.
      const activeTerms = await terms.find({ clubId: clubObjectId, state: "Active", startAt: { $lte: now },
        endAt: { $gt: now } }).select({ _id: 1 }).lean();
      const [assignmentDocs, positionDocs, memberDocs] = await Promise.all([
        activeTerms.length ? assignments.find({ clubId: clubObjectId, termId: { $in: activeTerms.map((term) => term._id) },
          effectiveFrom: { $lte: now }, confirmedBy: { $exists: true, $ne: null },
          $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gt: now } }] }).lean() : [],
        positions.find({ clubId: clubObjectId, isActive: true }).select({ name: 1, isBoardSeat: 1 }).lean(),
        memberships.find({ clubId: clubObjectId, state: { $in: ["Active", "Inactive"] } })
          .sort({ state: 1, joinedAt: 1 }).lean(),
      ]);
      const positionById = new Map(positionDocs.map((position) => [String(position._id), position]));
      function positionsOf(membershipId: unknown): string[] {
        return assignmentDocs
          .filter((assignment) => String(assignment.membershipId) === String(membershipId))
          .flatMap((assignment) => {
            const position = positionById.get(String(assignment.positionId));
            return position ? [String(position.name)] : [];
          });
      }
      const userDocs = await users.find({ _id: { $in: memberDocs.map((member) => member.userId) } })
        .select({ displayName: 1 }).lean();
      const nameById = new Map(userDocs.map((user) => [String(user._id), String(user.displayName)]));
      const members = memberDocs.map((member) => ({ displayName: nameById.get(String(member.userId)) ?? "",
        state: member.state as MembershipState, positions: positionsOf(member._id) }));
      const board = memberDocs.flatMap((member) => assignmentDocs
        .filter((assignment) => String(assignment.membershipId) === String(member._id)
          && positionById.get(String(assignment.positionId))?.isBoardSeat === true && member.state === "Active")
        .map((assignment) => ({ positionName: String(positionById.get(String(assignment.positionId))!.name),
          memberName: nameById.get(String(member.userId)) ?? "" })));

      const [pending, eventDocs, attendanceDocs, myMemberships] = await Promise.all([
        requests.findOne({ membershipId: mine._id, state: { $in: ["Pending", "Held"] } }).sort({ createdAt: -1 }).lean(),
        events.find({ clubId: clubObjectId, state: { $in: shownEventStates }, publishedAt: { $exists: true, $ne: null },
          endAt: { $gt: now } }).sort({ startAt: 1 }).limit(20).lean(),
        attendances.find({ clubId: clubObjectId, studentId: userObjectId }).sort({ checkedInAt: -1 }).limit(50).lean(),
        memberships.find({ userId: userObjectId, state: { $in: ["Active", "Inactive"] }, clubId: { $ne: clubObjectId } }).lean(),
      ]);
      const [registrationDocs, attendedEvents, feedbackDocs, otherClubDocs] = await Promise.all([
        registrations.find({ studentId: userObjectId, eventId: { $in: eventDocs.map((event) => event._id) } })
          .select({ eventId: 1, state: 1 }).lean(),
        events.find({ _id: { $in: attendanceDocs.map((item) => item.eventId) } }).select({ title: 1, endAt: 1 }).lean(),
        feedbacks.find({ studentId: userObjectId, eventId: { $in: attendanceDocs.map((item) => item.eventId) } })
          .select({ eventId: 1 }).lean(),
        clubs.find({ _id: { $in: myMemberships.map((item) => item.clubId) } }).select({ name: 1 }).lean(),
      ]);
      const registrationByEvent = new Map(registrationDocs.map((item) => [String(item.eventId), item.state as EventRegistrationState]));
      const eventById = new Map(attendedEvents.map((event) => [String(event._id), event]));
      const feedbackEvents = new Set(feedbackDocs.map((item) => String(item.eventId)));
      const clubName = new Map(otherClubDocs.map((item) => [String(item._id), String(item.name)]));

      return {
        club: { id: String(club._id), name: String(club.name), state: String(club.state),
          ...(typeof club.logoUrl === "string" ? { logoUrl: club.logoUrl } : {}) },
        membership: { id: String(mine._id), state: mine.state as MembershipState, joinedAt: date(mine.joinedAt),
          positions: positionsOf(mine._id),
          ...(pending ? { pendingWithdrawal: { id: String(pending._id), membershipId: String(pending.membershipId),
            clubId: String(pending.clubId), userId: String(pending.userId), reason: String(pending.reason),
            requestedEffectiveDate: date(pending.requestedEffectiveDate), state: pending.state as "Pending" | "Held",
            createdAt: date(pending.createdAt) } } : {}) },
        members,
        board,
        upcomingEvents: eventDocs.map((event) => ({ id: String(event._id), title: String(event.title),
          startAt: date(event.startAt), endAt: date(event.endAt),
          ...(typeof event.venueText === "string" ? { venueText: event.venueText } : {}),
          registrationState: registrationByEvent.get(String(event._id)) ?? null })),
        attendance: attendanceDocs.flatMap((item) => {
          const event = eventById.get(String(item.eventId));
          return event ? [{ eventId: String(item.eventId), eventTitle: String(event.title),
            checkedInAt: date(item.checkedInAt), eventEndAt: date(event.endAt),
            feedbackSubmitted: feedbackEvents.has(String(item.eventId)) }] : [];
        }),
        otherClubs: myMemberships.map((item) => ({ clubId: String(item.clubId),
          clubName: clubName.get(String(item.clubId)) ?? "", state: item.state as MembershipState })),
      };
    },
  };
}
