import { Types } from 'mongoose'
import { type BoardSeatSource, type ClubBoardHistory } from '../../domain/dashboard.js'
import { ucmsModels as m } from './ucms-models.js'

type Doc = Record<string, unknown>

// Trả chuỗi không rỗng hoặc undefined
function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

// Lịch sử ban điều hành của CLB: các nhiệm kỳ và ghế đã xác nhận
export async function clubBoardHistory(clubId: string): Promise<ClubBoardHistory | null> {
  const id = new Types.ObjectId(clubId)
  const club = await m
    .clubs!.findById(id)
    .select({ code: 1, name: 1, state: 1, sourceApplicationId: 1 })
    .lean()
  if (!club) {
    return null
  }
  const [versions, terms, assignments, plans, nominations] = await Promise.all([
    m.clubRoleStructureVersions!.find({ clubId: id }).sort({ versionNo: -1 }).lean(),
    m.clubTerms!.find({ clubId: id }).sort({ startAt: -1, _id: -1 }).lean(),
    m.clubPositionAssignments!.find({ clubId: id }).sort({ effectiveFrom: 1, _id: 1 }).lean(),
    m
      .transitionPlans!.find({ clubId: id, state: 'Confirmed' })
      .select({ toTermId: 1, decidedAt: 1 })
      .lean(),
    m
      .boardNominations!.find({ clubId: id, state: { $in: ['Confirmed', 'Returned'] } })
      .select({ termId: 1, decidedAt: 1 })
      .lean(),
  ])
  const [positions, memberships, seats] = await Promise.all([
    m
      .clubPositions!.find({ _id: { $in: assignments.map((row) => row.positionId) } })
      .select({ name: 1 })
      .lean(),
    m
      .clubMemberships!.find({ _id: { $in: assignments.map((row) => row.membershipId) } })
      .select({ userId: 1 })
      .lean(),
    m
      .boardNominationSeats!.find({
        nominationId: { $in: nominations.map((row) => row._id) },
        state: 'Confirmed',
      })
      .select({ nominationId: 1, positionId: 1, membershipId: 1 })
      .lean(),
  ])
  const officerIds = assignments.map((row) => row.confirmedBy).filter(Boolean)
  const users = await m
    .users!.find({ _id: { $in: [...memberships.map((row) => row.userId), ...officerIds] } })
    .select({ displayName: 1 })
    .lean()
  const userName = new Map(users.map((user) => [String(user._id), String(user.displayName)]))
  const positionName = new Map(positions.map((row) => [String(row._id), String(row.name)]))
  const memberUser = new Map(memberships.map((row) => [String(row._id), String(row.userId)]))
  const planByTerm = new Map(plans.map((plan) => [String(plan.toTermId), plan]))
  const nominationById = new Map(nominations.map((row) => [String(row._id), row]))
  const nominatedSeat = new Map(
    seats.map((seat) => {
      const nomination = nominationById.get(String(seat.nominationId))
      return [
        `${String(nomination?.termId)}:${String(seat.positionId)}:${String(seat.membershipId)}`,
        nomination,
      ]
    }),
  )
  const foundingTermId =
    club.sourceApplicationId && terms.length ? String(terms.at(-1)!._id) : undefined

  function seatSource(row: Doc): { source?: BoardSeatSource; confirmedAt?: Date } {
    const nomination = nominatedSeat.get(
      `${String(row.termId)}:${String(row.positionId)}:${String(row.membershipId)}`,
    )
    if (nomination) {
      return {
        source: 'NOMINATION',
        ...(nomination.decidedAt ? { confirmedAt: nomination.decidedAt as Date } : {}),
      }
    }
    const plan = planByTerm.get(String(row.termId))
    if (plan) {
      return {
        source: 'TRANSITION',
        ...(plan.decidedAt ? { confirmedAt: plan.decidedAt as Date } : {}),
      }
    }
    if (String(row.termId) === foundingTermId) {
      return { source: 'APPLICATION', confirmedAt: row.effectiveFrom as Date }
    }
    return {}
  }

  return {
    club: {
      id: String(club._id),
      code: String(club.code),
      name: String(club.name),
      state: String(club.state),
    },
    structures: versions.map((version) => ({
      versionNo: Number(version.versionNo),
      effectiveFrom: version.effectiveFrom as Date,
      source: String(version.source),
      ...(optionalText(version.reason) ? { reason: String(version.reason) } : {}),
      roles: ((version.roles ?? []) as Doc[]).map((role) => ({
        code: String(role.code),
        name: String(role.name),
        ...(optionalText(role.unit) ? { unit: String(role.unit) } : {}),
        isBoardSeat: Boolean(role.isBoardSeat),
        isLeaderRole: Boolean(role.isLeaderRole),
      })),
    })),
    terms: terms.map((term) => ({
      id: String(term._id),
      name: String(term.name),
      state: String(term.state),
      startAt: term.startAt as Date,
      endAt: term.endAt as Date,
      seats: assignments
        .filter((row) => String(row.termId) === String(term._id))
        .map((row) => ({
          positionName: positionName.get(String(row.positionId)) ?? '',
          memberName: userName.get(memberUser.get(String(row.membershipId)) ?? '') ?? '',
          effectiveFrom: row.effectiveFrom as Date,
          ...(row.effectiveTo ? { effectiveTo: row.effectiveTo as Date } : {}),
          ...seatSource(row),
          ...(row.confirmedBy && userName.has(String(row.confirmedBy))
            ? { confirmedByName: userName.get(String(row.confirmedBy))! }
            : {}),
        })),
    })),
  }
}
