import { settlementDueAt } from '../../domain/budget-disbursement.js'
import { randomUUID } from 'node:crypto'
import { Types, type ClientSession } from 'mongoose'
import { DomainError } from '../../domain/errors.js'
import { isInternalClubEventState } from '../../domain/club-event.js'
import { eventCancellationIsLate } from '../../domain/club-event-rules.js'
import { releaseFacilityBookingsInSession } from './mongo-facility-booking-repository.js'
import { closeOpenTasks, queueNotifications, writeAudit } from './repo-helpers.js'
import { ucmsModels as m } from './ucms-models.js'

type Doc = Record<string, unknown>
// Hủy sự kiện, hủy đăng ký và booking liên quan trong cùng transaction
/** Transaction dùng chung cho UC28 và UC15; quyết định gốc vẫn nằm trong audit bất biến của sự kiện. */
export async function cancelEventInSession(
  session: ClientSession,
  event: Doc,
  reason: string,
  now: Date,
  source: string,
  noticeHours: number,
  actorId?: Types.ObjectId,
  sourceRefId?: Types.ObjectId,
): Promise<number> {
  if (event.attendanceFinalized === true) {
    throw new DomainError('finalized attendance prevents cancellation', 'conflict')
  }
  const id = event._id as Types.ObjectId
  const state = isInternalClubEventState(String(event.state)) ? 'CANCELLED' : 'Cancelled'
  const changed = await m.events!.updateOne(
    { _id: id, state: event.state, attendanceFinalized: { $ne: true } },
    {
      $set: {
        state,
        cancelReason: reason,
        cancelSourceType: source,
        confirmedRegistrationCount: 0,
        isLateCancellation:
          source === 'CMB' && eventCancellationIsLate(event.startAt as Date, now, noticeHours),
        ...(actorId ? { cancelledBy: actorId } : {}),
      },
      $inc: { __v: 1 },
    },
    { session },
  )
  if (changed.modifiedCount !== 1) {
    throw new DomainError('event changed while cancelling', 'conflict')
  }
  const registrations = await m
    .eventRegistrations!.find({ eventId: id, state: { $in: ['Confirmed', 'Waitlisted'] } })
    .session(session)
    .lean()
  await m.eventRegistrations!.updateMany(
    { _id: { $in: registrations.map((r) => r._id) } },
    { $set: { state: 'Cancelled', cancelledAt: now }, $unset: { waitlistPosition: '' } },
    { session },
  )
  await closeOpenTasks(session, 'EVENT_PROPOSAL', id, now)
  await m.eventDefenseSessions!.updateMany(
    {
      eventId: id,
      state: { $in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULE_REQUESTED', 'IN_PROGRESS'] },
    },
    { $set: { state: 'CANCELLED', cancelReason: reason, updatedAt: now } },
    { session },
  )
  await releaseFacilityBookingsInSession(
    session,
    {
      eventId: id,
      state: { $in: ['Draft', 'Requested', 'Under Review', 'Revision Requested', 'Approved'] },
    },
    source,
    reason,
    now,
  )
  const budget = await m.eventBudgets!.findOne({ eventId: id }).session(session).lean()
  if (budget && !budget.sponsoredItems && !['Closed', 'Cancelled'].includes(String(budget.state))) {
    const disbursed = Number(String(budget.disbursedTotal ?? 0))
    if (disbursed === 0) {
      await m.eventBudgets!.updateOne(
        { _id: budget._id },
        { $set: { state: 'Cancelled' } },
        { session },
      )
    }
    // Số tiền phải thu hồi phải được quyết định từ chi phí thực tế ở UC37; đừng giả định mọi khoản tạm ứng đều chưa dùng.
    else {
      await m.eventBudgets!.updateOne(
        { _id: budget._id },
        { $set: { settlementDueAt: settlementDueAt(now) }, $inc: { __v: 1 } },
        { session },
      )
    }
  }
  const correlationId = randomUUID()
  await writeAudit(session, {
    entityType: 'Event',
    entityId: id,
    action: 'EVENT_CANCELLED',
    ...(actorId
      ? { actorId, actorRole: source.startsWith('PROPOSAL_') ? 'ICPDP_OFFICER' : 'Club Member' }
      : { actorRole: 'SYSTEM' }),
    before: { state: event.state },
    after: {
      state,
      source,
      sourceRefId,
      settlementRequired:
        budget && !budget.sponsoredItems ? Number(String(budget.disbursedTotal ?? 0)) > 0 : false,
      previousSettlementDueAt: budget?.settlementDueAt,
      ...(budget?.sponsoredItems ? { sponsoredFinancePaused: true } : {}),
      ...(budget && !budget.sponsoredItems && Number(String(budget.disbursedTotal ?? 0)) > 0
        ? { settlementDueAt: settlementDueAt(now) }
        : {}),
    },
    reason,
    correlationId,
    at: now,
  })
  await queueNotifications(
    session,
    registrations.map((r) => r.studentId),
    {
      eventCode: 'EVENT_CANCELLED',
      entityType: 'Event',
      entityId: id,
      payload: { title: event.title, reason, source },
      now,
    },
  )
  return registrations.length
}
