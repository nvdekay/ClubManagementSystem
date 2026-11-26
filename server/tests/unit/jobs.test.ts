import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EventDefenseRepository } from '../../src/domain/event-defense.js'
import type { EventProposalReviewRepository } from '../../src/domain/event-proposal-review.js'
import type { SchoolEventRepository } from '../../src/domain/school-event.js'
import { startEventLifecycleJob } from '../../src/interface/jobs/event-lifecycle-job.js'
import { scheduleJob } from '../../src/interface/jobs/schedule.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('scheduleJob', () => {
  it('never overlaps ticks and stop() waits for the in-flight tick', async () => {
    const releases: Array<() => void> = []
    let finished = false
    const run = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          releases.push(() => {
            finished = true
            resolve()
          })
        }),
    )
    vi.useFakeTimers()
    const stop = scheduleJob('test', 1_000, run)
    vi.advanceTimersByTime(3_000) // still running: no second tick starts
    expect(run).toHaveBeenCalledTimes(1)
    vi.useRealTimers()

    const stopped = stop()
    let settled = false
    void stopped.then(() => {
      settled = true
    })
    await Promise.resolve()
    expect(settled).toBe(false)
    releases.forEach((release) => release())
    await stopped
    expect(finished).toBe(true)
  })

  it('logs a failed tick and hands it to onError', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onError = vi.fn(async () => undefined)
    const stop = scheduleJob(
      'failing',
      60_000,
      async () => {
        throw new Error('boom')
      },
      onError,
    )
    await stop()
    expect(error).toHaveBeenCalledWith(JSON.stringify({ job: 'failing', error: 'boom' }))
    expect(onError).toHaveBeenCalledWith('boom')
  })
})

describe('event lifecycle job', () => {
  it('runs every step even when an earlier one fails, logging the failed step', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const expireInvitations = vi.fn(async () => {
      throw new Error('invitations down')
    })
    const alertOverdueConfirmations = vi.fn(async () => 2)
    const stop = startEventLifecycleJob(
      {
        advanceLifecycle: async () => {
          throw new Error('lifecycle down')
        },
      } as unknown as EventProposalReviewRepository,
      { expireInvitations } as unknown as SchoolEventRepository,
      { alertOverdueConfirmations } as unknown as EventDefenseRepository,
    )
    await stop()
    expect(expireInvitations).toHaveBeenCalledOnce()
    expect(alertOverdueConfirmations).toHaveBeenCalledOnce()
    const steps = error.mock.calls.map(
      (call) => (JSON.parse(String(call[0])) as { step: string }).step,
    )
    expect(steps).toEqual(['event-lifecycle', 'invitation-expiry'])
  })
})
