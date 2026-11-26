import { describe, expect, it, vi } from 'vitest'
import type { ClubFieldRepository } from '../../src/domain/club-field.js'
import {
  createClubField,
  listClubFieldCatalog,
  removeClubField,
  updateClubField,
} from '../../src/usecase/club-field.js'
import { actor, LEADER_ID, NOW, OFFICER_ID, officerAuth } from './club-access-fixtures.js'

const FIELD_ID = 'f0000000000000000000f001'

function repo() {
  return {
    listActive: vi.fn(async () => []),
    listWithUsage: vi.fn(async () => []),
    find: vi.fn(async () => null),
    create: vi.fn(async (input: { name: string; sortOrder: number }) => ({
      id: FIELD_ID,
      ...input,
      isActive: true,
    })),
    update: vi.fn(async (id: string, input: { name: string; sortOrder: number }) => ({
      id,
      ...input,
      isActive: true,
    })),
    remove: vi.fn(async () => 'deactivated' as const),
  } satisfies ClubFieldRepository
}

describe('club field catalog (ICPDP)', () => {
  it.each([
    ['anonymous', null, 'unauthorized'],
    ['a locked officer', actor(OFFICER_ID, { accountState: 'Locked' }), 'locked'],
    ['a malformed actor id', actor('officer'), 'validation'],
    ['a club leader without the officer role', actor(LEADER_ID), 'forbidden'],
  ] as const)('denies %s every catalog action', async (_name, who, kind) => {
    const fields = repo()
    await expect(listClubFieldCatalog(fields, officerAuth, who)).rejects.toMatchObject({ kind })
    await expect(
      createClubField(fields, officerAuth, who, { name: 'Âm nhạc', sortOrder: 1 }, NOW),
    ).rejects.toMatchObject({ kind })
    await expect(
      updateClubField(fields, officerAuth, who, FIELD_ID, { name: 'Âm nhạc', sortOrder: 1 }, NOW),
    ).rejects.toMatchObject({ kind })
    await expect(removeClubField(fields, officerAuth, who, FIELD_ID, NOW)).rejects.toMatchObject({
      kind,
    })
    expect(fields.listWithUsage).not.toHaveBeenCalled()
    expect(fields.create).not.toHaveBeenCalled()
    expect(fields.update).not.toHaveBeenCalled()
    expect(fields.remove).not.toHaveBeenCalled()
  })

  it('lets an officer list, create, rename and remove a field', async () => {
    const fields = repo()
    const officer = actor(OFFICER_ID)
    await listClubFieldCatalog(fields, officerAuth, officer)
    expect(fields.listWithUsage).toHaveBeenCalledTimes(1)

    await createClubField(fields, officerAuth, officer, { name: '  Âm   nhạc ', sortOrder: 7 }, NOW)
    expect(fields.create).toHaveBeenCalledWith({ name: 'Âm nhạc', sortOrder: 7 }, OFFICER_ID, NOW)

    await updateClubField(
      fields,
      officerAuth,
      officer,
      FIELD_ID,
      { name: 'Âm nhạc', sortOrder: 0 },
      NOW,
    )
    expect(fields.update).toHaveBeenCalledWith(
      FIELD_ID,
      { name: 'Âm nhạc', sortOrder: 0 },
      OFFICER_ID,
      NOW,
    )

    await expect(removeClubField(fields, officerAuth, officer, FIELD_ID, NOW)).resolves.toEqual({
      result: 'deactivated',
    })
    expect(fields.remove).toHaveBeenCalledWith(FIELD_ID, OFFICER_ID, NOW)
  })

  it.each([
    ['a blank name', { name: '   ', sortOrder: 1 }],
    ['a name over 100 characters', { name: 'x'.repeat(101), sortOrder: 1 }],
    ['a negative order', { name: 'Âm nhạc', sortOrder: -1 }],
    ['a fractional order', { name: 'Âm nhạc', sortOrder: 1.5 }],
    ['an order over 10000', { name: 'Âm nhạc', sortOrder: 10_001 }],
  ])('rejects a field with %s', async (_name, input) => {
    const fields = repo()
    const officer = actor(OFFICER_ID)
    await expect(createClubField(fields, officerAuth, officer, input, NOW)).rejects.toMatchObject({
      kind: 'validation',
    })
    await expect(
      updateClubField(fields, officerAuth, officer, FIELD_ID, input, NOW),
    ).rejects.toMatchObject({ kind: 'validation' })
    expect(fields.create).not.toHaveBeenCalled()
    expect(fields.update).not.toHaveBeenCalled()
  })

  it('rejects a malformed field id before touching the repository', async () => {
    const fields = repo()
    const officer = actor(OFFICER_ID)
    await expect(
      updateClubField(fields, officerAuth, officer, '{"$gt":""}', { name: 'A', sortOrder: 1 }, NOW),
    ).rejects.toMatchObject({ kind: 'validation' })
    await expect(
      removeClubField(fields, officerAuth, officer, 'field-1', NOW),
    ).rejects.toMatchObject({ kind: 'validation' })
    expect(fields.update).not.toHaveBeenCalled()
    expect(fields.remove).not.toHaveBeenCalled()
  })
})
