import type { ClubAccessRepository, ClubAccessSnapshot } from '../../src/domain/access.js'
import type { AccessActor } from '../../src/usecase/access.js'

/** Shared in-memory club access fixtures for unit tests of club-scoped usecases. */
export const CLUB_ID = 'c0000000000000000000c001'
export const OTHER_CLUB_ID = 'c0000000000000000000c002'
export const LEADER_ID = 'a00000000000000000000001'
export const MEMBER_ID = 'a00000000000000000000002'
export const OUTSIDER_ID = 'a00000000000000000000003'
export const OFFICER_ID = 'a00000000000000000000004'
export const NOW = new Date('2026-10-15T08:00:00Z')

export function actor(id: string, change: Partial<AccessActor> = {}): AccessActor {
  return { id, accountState: 'Active', ...change }
}

// Snapshot of an Active member; a leader also holds the confirmed Chủ nhiệm seat of the current term.
function snapshot(clubId: string, leader: boolean): ClubAccessSnapshot {
  return {
    clubId,
    clubName: 'HEBE',
    clubState: 'Active',
    membership: { id: 'm1', clubId, state: 'Active' },
    terms: [
      {
        id: 't1',
        clubId,
        state: 'Active',
        startAt: new Date('2026-01-01T00:00:00Z'),
        endAt: new Date('2027-01-01T00:00:00Z'),
      },
    ],
    positions: [{ id: 'p1', clubId, isActive: true, isLeaderRole: true }],
    assignments: leader
      ? [
          {
            clubId,
            termId: 't1',
            positionId: 'p1',
            membershipId: 'm1',
            effectiveFrom: new Date('2026-01-01T00:00:00Z'),
            confirmedBy: OFFICER_ID,
          },
        ]
      : [],
    isApprovedFounder: false,
  }
}

/** LEADER_ID leads CLUB_ID, MEMBER_ID is a plain Active member of it, everyone else has no access. */
export function clubAccess(): ClubAccessRepository {
  return {
    async findSnapshot(userId, clubId) {
      if (clubId !== CLUB_ID) {
        return null
      }
      if (userId === LEADER_ID) {
        return snapshot(clubId, true)
      }
      if (userId === MEMBER_ID) {
        return snapshot(clubId, false)
      }
      return null
    },
  }
}

/** Auth fake where only OFFICER_ID holds the ICPDP officer role. */
export const officerAuth = {
  async systemRoleCodes(userId: string): Promise<string[]> {
    return userId === OFFICER_ID ? ['ICPDP_OFFICER'] : ['STUDENT']
  },
}
