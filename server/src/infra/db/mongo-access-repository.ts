import { Types } from "mongoose";
import type {
  ClubAccessRepository,
  ClubAccessSnapshot,
  ClubAssignmentAccess,
  ClubPositionAccess,
  ClubTermAccess,
} from "../../domain/access.js";
import { ucmsModels } from "./ucms-models.js";

function id(value: unknown): string {
  return String(value);
}

function date(value: unknown): Date {
  if (!(value instanceof Date)) throw new Error("invalid access date in database");
  return value;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function mongoAccessRepository(): ClubAccessRepository {
  const clubs = ucmsModels.clubs!;
  const memberships = ucmsModels.clubMemberships!;
  const terms = ucmsModels.clubTerms!;
  const positions = ucmsModels.clubPositions!;
  const assignments = ucmsModels.clubPositionAssignments!;
  const applications = ucmsModels.clubApplications!;

  return {
    async findSnapshot(userId, clubId): Promise<ClubAccessSnapshot | null> {
      const userObjectId = new Types.ObjectId(userId);
      const clubObjectId = new Types.ObjectId(clubId);
      const [club, membership, termDocs, positionDocs, application] = await Promise.all([
        clubs.findById(clubObjectId).lean(),
        memberships.findOne({ clubId: clubObjectId, userId: userObjectId }).lean(),
        terms.find({ clubId: clubObjectId, state: "Active" }).lean(),
        positions.find({ clubId: clubObjectId, isActive: true }).lean(),
        applications.findOne({
          createdClubId: clubObjectId, founderUserId: userObjectId, state: "Approved",
        }).lean(),
      ]);
      if (!club) return null;
      const assignmentDocs = membership ? await assignments.find({
        clubId: clubObjectId, membershipId: membership._id,
      }).lean() : [];

      const mappedTerms: ClubTermAccess[] = termDocs.map((term) => ({
        id: id(term._id), clubId: id(term.clubId), state: String(term.state),
        startAt: date(term.startAt), endAt: date(term.endAt),
      }));
      const mappedPositions: ClubPositionAccess[] = positionDocs.map((position) => ({
        id: id(position._id), clubId: id(position.clubId),
        isActive: position.isActive === true, isLeaderRole: position.isLeaderRole === true,
        permissionCodes: stringArray(position.permissionCodes),
      }));
      const mappedAssignments: ClubAssignmentAccess[] = assignmentDocs.map((assignment) => ({
        clubId: id(assignment.clubId), termId: id(assignment.termId),
        positionId: id(assignment.positionId), membershipId: id(assignment.membershipId),
        effectiveFrom: date(assignment.effectiveFrom),
        effectiveTo: assignment.effectiveTo ? date(assignment.effectiveTo) : null,
        confirmedBy: assignment.confirmedBy ? id(assignment.confirmedBy) : null,
      }));
      return {
        clubId,
        clubName: String(club.name),
        clubState: String(club.state),
        membership: membership ? {
          id: id(membership._id), clubId: id(membership.clubId), state: String(membership.state),
        } : null,
        terms: mappedTerms,
        positions: mappedPositions,
        assignments: mappedAssignments,
        isApprovedFounder: Boolean(application),
      };
    },
  };
}
