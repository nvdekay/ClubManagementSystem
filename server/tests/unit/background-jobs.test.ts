import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { AccountabilityReminderRepository } from '../../src/domain/accountability-reminder.js'
import type { ApplicationExpiryRepository } from '../../src/domain/application-expiry.js'
import type { ClubLifecycleRepository } from '../../src/domain/club-lifecycle.js'
import type { ComplaintRepository } from '../../src/domain/complaint.js'
import type { EventDefenseRepository } from '../../src/domain/event-defense.js'
import type { EventProposalReviewRepository } from '../../src/domain/event-proposal-review.js'
import type { FacilityBookingRepository } from '../../src/domain/facility-booking.js'
import type { MembershipReconfirmationRepository } from '../../src/domain/membership-reconfirmation.js'
import type { MailOutboxRepository, MailTransport } from '../../src/domain/notification.js'
import type { PolicyRepository } from '../../src/domain/policy.js'
import type { SchoolEventRepository } from '../../src/domain/school-event.js'
import { startAccountabilityReminderJob } from '../../src/interface/jobs/accountability-reminder-job.js'
import { startApplicationExpiryJob } from '../../src/interface/jobs/application-expiry-job.js'
import { startClubLifecycleJob } from '../../src/interface/jobs/club-lifecycle-job.js'
import { startComplaintResponseJob } from '../../src/interface/jobs/complaint-response-job.js'
import { startEventLifecycleJob } from '../../src/interface/jobs/event-lifecycle-job.js'
import { startFacilityBookingJob } from '../../src/interface/jobs/facility-booking-job.js'
import { startMembershipReconfirmationJob } from '../../src/interface/jobs/membership-reconfirmation-job.js'
import { startNotificationDeliveryJob } from '../../src/interface/jobs/notification-delivery-job.js'

const INTERVAL = 1000

type AsyncMock = Mock<(...args: unknown[]) => Promise<unknown>>

function asyncMock(): AsyncMock {
  return vi.fn<(...args: unknown[]) => Promise<unknown>>()
}

function emptyStep() {
  return Promise.resolve({ done: [], failed: [] })
}

interface JobCase {
  name: string
  /** Value of the `job` field in the JSON log lines. */
  logName: string
  /** What the first repository call made by a tick returns when there is nothing to do. */
  idle: unknown
  /** Starts the job with `first` as the first repository method its usecase calls on each tick. */
  start(first: AsyncMock): () => void
}

const jobs: JobCase[] = [
  {
    name: 'accountability reminders',
    logName: 'accountability-reminders',
    idle: 0,
    start: (first) =>
      startAccountabilityReminderJob(
        { remind: first } as unknown as AccountabilityReminderRepository,
        INTERVAL,
      ),
  },
  {
    name: 'application expiry',
    logName: 'application-expiry',
    idle: 0,
    start: (first) =>
      startApplicationExpiryJob(
        { expire: first } as unknown as ApplicationExpiryRepository,
        INTERVAL,
      ),
  },
  {
    name: 'club lifecycle',
    logName: 'club-lifecycle',
    idle: [],
    start: (first) =>
      startClubLifecycleJob(
        {
          // A failed run re-reads officerIds() to alert ICPDP, so drive the next call instead.
          officerIds: () => Promise.resolve([]),
          suspensionsDueForReminder: first,
          expiredSuspensions: () => Promise.resolve([]),
          startDissolving: emptyStep,
          completeDissolutions: emptyStep,
          alertOfficers: () => Promise.resolve(),
        } as unknown as ClubLifecycleRepository,
        INTERVAL,
      ),
  },
  {
    name: 'complaint response',
    logName: 'complaint-response',
    idle: 0,
    start: (first) =>
      startComplaintResponseJob(
        { flagOverdueResponses: first } as unknown as ComplaintRepository,
        INTERVAL,
      ),
  },
  {
    name: 'event lifecycle',
    logName: 'event-lifecycle',
    idle: { expired: 0, started: 0, completed: 0 },
    start: (first) =>
      startEventLifecycleJob(
        { advanceLifecycle: first } as unknown as EventProposalReviewRepository,
        undefined,
        undefined,
        INTERVAL,
      ),
  },
  {
    name: 'facility booking',
    logName: 'facility-booking',
    idle: { started: 0, completed: 0 },
    start: (first) =>
      startFacilityBookingJob(
        { advanceLifecycle: first } as unknown as FacilityBookingRepository,
        INTERVAL,
      ),
  },
  {
    name: 'membership reconfirmation',
    logName: 'membership-reconfirmation',
    idle: null,
    start: (first) =>
      startMembershipReconfirmationJob(
        {
          run: () => Promise.resolve({ opened: 0, expired: 0, exempt: 0 }),
          expireOverdue: () => Promise.resolve({ expired: 0, exempt: 0 }),
        } as unknown as MembershipReconfirmationRepository,
        { findEffective: first } as unknown as PolicyRepository,
        INTERVAL,
      ),
  },
  {
    name: 'notification delivery',
    logName: 'notification-delivery',
    idle: 0,
    start: (first) =>
      startNotificationDeliveryJob(
        {
          drainInApp: first,
          claimNextEmail: () => Promise.resolve(null),
        } as unknown as MailOutboxRepository,
        { name: 'test', send: () => Promise.resolve({}) },
        { intervalMs: INTERVAL },
      ),
  },
]

let errors: Mock
let logs: Mock
const stops: Array<() => void> = []

function track(stop: () => void): () => void {
  stops.push(stop)
  return stop
}

function loggedJson(spy: Mock): Array<Record<string, unknown>> {
  return spy.mock.calls.map((call) => JSON.parse(String(call[0])) as Record<string, unknown>)
}

beforeEach(() => {
  vi.useFakeTimers()
  errors = vi.spyOn(console, 'error').mockImplementation(() => undefined) as unknown as Mock
  logs = vi.spyOn(console, 'log').mockImplementation(() => undefined) as unknown as Mock
})

afterEach(() => {
  for (const stop of stops.splice(0)) {
    stop()
  }
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe.each(jobs)('$name job', (job) => {
  it('runs once on start, then once per interval with the current time', async () => {
    const first = asyncMock().mockResolvedValue(job.idle)
    track(job.start(first))
    await vi.advanceTimersByTimeAsync(0)
    expect(first).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(INTERVAL * 3)
    expect(first).toHaveBeenCalledTimes(4)
    expect(first.mock.calls[0]?.[0]).toBeInstanceOf(Date)
    expect(errors).not.toHaveBeenCalled()
  })

  it('logs a failing tick as JSON and keeps the interval alive', async () => {
    const first = asyncMock()
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockRejectedValueOnce('plain string failure')
      .mockResolvedValue(job.idle)
    track(job.start(first))
    await vi.advanceTimersByTimeAsync(0)
    expect(loggedJson(errors)[0]).toMatchObject({ job: job.logName, error: 'database unavailable' })
    await vi.advanceTimersByTimeAsync(INTERVAL)
    expect(loggedJson(errors)[1]).toMatchObject({ job: job.logName, error: 'plain string failure' })
    await vi.advanceTimersByTimeAsync(INTERVAL)
    expect(first).toHaveBeenCalledTimes(3)
    expect(errors).toHaveBeenCalledTimes(2)
  })

  it('skips ticks while a slow run is still in flight', async () => {
    const pending: Array<(value: unknown) => void> = []
    const first = asyncMock()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            pending.push(resolve)
          }),
      )
      .mockResolvedValue(job.idle)
    track(job.start(first))
    await vi.advanceTimersByTimeAsync(INTERVAL * 5)
    expect(first).toHaveBeenCalledTimes(1)
    pending[0]?.(job.idle)
    await vi.advanceTimersByTimeAsync(INTERVAL)
    expect(first).toHaveBeenCalledTimes(2)
  })

  it('stops scheduling after the returned stop function is called', async () => {
    const first = asyncMock().mockResolvedValue(job.idle)
    const stop = track(job.start(first))
    await vi.advanceTimersByTimeAsync(INTERVAL)
    expect(first).toHaveBeenCalledTimes(2)
    stop()
    await vi.advanceTimersByTimeAsync(INTERVAL * 10)
    expect(first).toHaveBeenCalledTimes(2)
  })

  it('stays silent on stdout when a tick has nothing to report', async () => {
    track(job.start(asyncMock().mockResolvedValue(job.idle)))
    await vi.advanceTimersByTimeAsync(INTERVAL)
    expect(logs).not.toHaveBeenCalled()
  })
})

describe('job result logging', () => {
  it('application expiry logs how many applications expired', async () => {
    track(
      startApplicationExpiryJob(
        { expire: () => Promise.resolve(3) } as unknown as ApplicationExpiryRepository,
        INTERVAL,
      ),
    )
    await vi.advanceTimersByTimeAsync(0)
    expect(loggedJson(logs)).toEqual([{ job: 'application-expiry', expired: 3 }])
  })

  it('complaint response logs how many complaints were flagged', async () => {
    track(
      startComplaintResponseJob(
        { flagOverdueResponses: () => Promise.resolve(2) } as unknown as ComplaintRepository,
        INTERVAL,
      ),
    )
    await vi.advanceTimersByTimeAsync(0)
    expect(loggedJson(logs)).toEqual([{ job: 'complaint-response', flagged: 2 }])
  })

  it('accountability reminders and facility booking never log on success', async () => {
    track(
      startAccountabilityReminderJob(
        { remind: () => Promise.resolve(5) } as unknown as AccountabilityReminderRepository,
        INTERVAL,
      ),
    )
    track(
      startFacilityBookingJob(
        {
          advanceLifecycle: () => Promise.resolve({ started: 1, completed: 1 }),
        } as unknown as FacilityBookingRepository,
        INTERVAL,
      ),
    )
    await vi.advanceTimersByTimeAsync(0)
    expect(logs).not.toHaveBeenCalled()
  })

  it('membership reconfirmation sums the open academic periods', async () => {
    const now = new Date()
    const run = vi.fn(() => Promise.resolve({ opened: 4, expired: 1, exempt: 0 }))
    track(
      startMembershipReconfirmationJob(
        {
          run,
          expireOverdue: () => Promise.resolve({ expired: 2, exempt: 1 }),
        } as unknown as MembershipReconfirmationRepository,
        {
          findEffective: () =>
            Promise.resolve({
              academicCalendar: [
                {
                  startAt: new Date(now.getTime() - 86400000),
                  endAt: new Date(now.getTime() + 86400000),
                },
                // A period that has not started yet is ignored.
                {
                  startAt: new Date(now.getTime() + 2 * 86400000),
                  endAt: new Date(now.getTime() + 9 * 86400000),
                },
              ],
            }),
        } as unknown as PolicyRepository,
        INTERVAL,
      ),
    )
    await vi.advanceTimersByTimeAsync(0)
    expect(run).toHaveBeenCalledTimes(1)
    expect(loggedJson(logs)).toEqual([
      { job: 'membership-reconfirmation', opened: 4, expired: 3, exempt: 1 },
    ])
  })

  it('notification delivery logs the transport name with the counts', async () => {
    let claims = 0
    track(
      startNotificationDeliveryJob(
        {
          drainInApp: () => Promise.resolve(0),
          claimNextEmail: () =>
            Promise.resolve(
              claims++ === 0
                ? {
                    id: 'n1',
                    toEmail: 'a@fpt.edu.vn',
                    eventCode: 'CLUB_APPROVED',
                    payload: { title: 'Hello' },
                    attempts: 0,
                  }
                : null,
            ),
          recordSent: () => Promise.resolve(),
        } as unknown as MailOutboxRepository,
        { name: 'fake-smtp', send: () => Promise.resolve({ providerResponse: '250 OK' }) },
        { intervalMs: INTERVAL, appUrl: 'https://ucms.test' },
      ),
    )
    await vi.advanceTimersByTimeAsync(0)
    expect(loggedJson(logs)).toEqual([
      expect.objectContaining({ job: 'notification-delivery', transport: 'fake-smtp', sent: 1 }),
    ])
  })
})

describe('club lifecycle job', () => {
  function lifecycleRepo(change: Partial<Record<keyof ClubLifecycleRepository, unknown>>) {
    return {
      officerIds: () => Promise.resolve(['officer-1']),
      suspensionsDueForReminder: () => Promise.resolve([]),
      expiredSuspensions: () => Promise.resolve([]),
      startDissolving: emptyStep,
      completeDissolutions: emptyStep,
      alertOfficers: vi.fn(() => Promise.resolve()),
      ...change,
    } as unknown as ClubLifecycleRepository & { alertOfficers: Mock }
  }

  it('alerts ICPDP officers when a whole run fails', async () => {
    const repo = lifecycleRepo({
      suspensionsDueForReminder: () => Promise.reject(new Error('boom')),
    })
    track(startClubLifecycleJob(repo, INTERVAL))
    await vi.advanceTimersByTimeAsync(0)
    expect(repo.alertOfficers).toHaveBeenCalledWith(
      { clubId: null, step: 'job', message: 'boom' },
      ['officer-1'],
      expect.any(Date),
    )
  })

  it('swallows a failing failure alert so the interval survives', async () => {
    const reminders = vi.fn(() => Promise.reject(new Error('boom')))
    const repo = lifecycleRepo({
      suspensionsDueForReminder: reminders,
      alertOfficers: vi.fn(() => Promise.reject(new Error('alert failed too'))),
    })
    track(startClubLifecycleJob(repo, INTERVAL))
    await vi.advanceTimersByTimeAsync(INTERVAL)
    expect(reminders).toHaveBeenCalledTimes(2)
    expect(loggedJson(errors).every((line) => line.error === 'boom')).toBe(true)
  })

  it('logs the counts when a run changed something', async () => {
    const repo = lifecycleRepo({
      expiredSuspensions: () => Promise.resolve([{ id: 's1' }]),
      reactivate: () => Promise.resolve(),
    })
    track(startClubLifecycleJob(repo, INTERVAL))
    await vi.advanceTimersByTimeAsync(0)
    expect(loggedJson(logs)).toEqual([
      expect.objectContaining({ job: 'club-lifecycle', reactivated: 1 }),
    ])
  })
})

describe('event lifecycle job', () => {
  function idle() {
    return Promise.resolve({ expired: 0, started: 0, completed: 0 })
  }

  it('also expires school-event invitations and alerts overdue defense confirmations', async () => {
    const expireInvitations = vi.fn(() => Promise.resolve(2))
    const alertOverdueConfirmations = vi.fn(() => Promise.resolve(1))
    track(
      startEventLifecycleJob(
        { advanceLifecycle: idle } as unknown as EventProposalReviewRepository,
        { expireInvitations } as unknown as SchoolEventRepository,
        { alertOverdueConfirmations } as unknown as EventDefenseRepository,
        INTERVAL,
      ),
    )
    await vi.advanceTimersByTimeAsync(INTERVAL)
    expect(expireInvitations).toHaveBeenCalledTimes(2)
    expect(alertOverdueConfirmations).toHaveBeenCalledTimes(2)
    expect(loggedJson(logs)[0]).toEqual({
      job: 'event-lifecycle',
      expired: 0,
      started: 0,
      completed: 0,
      expiredInvitations: 2,
      overdueDefenseAlerts: 1,
    })
  })

  it('reports zero for the optional steps when their repositories are not wired', async () => {
    track(
      startEventLifecycleJob(
        {
          advanceLifecycle: () => Promise.resolve({ expired: 1, started: 0, completed: 0 }),
        } as unknown as EventProposalReviewRepository,
        undefined,
        undefined,
        INTERVAL,
      ),
    )
    await vi.advanceTimersByTimeAsync(0)
    expect(loggedJson(logs)[0]).toMatchObject({ expiredInvitations: 0, overdueDefenseAlerts: 0 })
  })

  it('logs a failing optional step and runs it again on the next tick', async () => {
    const expireInvitations = vi
      .fn()
      .mockRejectedValueOnce(new Error('invitations down'))
      .mockResolvedValue(0)
    track(
      startEventLifecycleJob(
        { advanceLifecycle: idle } as unknown as EventProposalReviewRepository,
        { expireInvitations } as unknown as SchoolEventRepository,
        undefined,
        INTERVAL,
      ),
    )
    await vi.advanceTimersByTimeAsync(INTERVAL)
    expect(loggedJson(errors)).toContainEqual(
      expect.objectContaining({ job: 'event-lifecycle', error: 'invitations down' }),
    )
    expect(expireInvitations).toHaveBeenCalledTimes(2)
  })
})

describe('notification delivery job', () => {
  it('defaults to a one-minute interval', async () => {
    const transport: MailTransport = { name: 'log', send: vi.fn(() => Promise.resolve({})) }
    const drainInApp = vi.fn(() => Promise.resolve(0))
    track(
      startNotificationDeliveryJob(
        {
          drainInApp,
          claimNextEmail: () => Promise.resolve(null),
        } as unknown as MailOutboxRepository,
        transport,
      ),
    )
    await vi.advanceTimersByTimeAsync(0)
    expect(drainInApp).toHaveBeenCalledTimes(1)
    // Default interval is one minute.
    await vi.advanceTimersByTimeAsync(59_999)
    expect(drainInApp).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(drainInApp).toHaveBeenCalledTimes(2)
  })
})
