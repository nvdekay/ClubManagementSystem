/** HTTP adapter for ICPDP reviews; business authorization/validation lives in the use case. */
import { Router, type Response } from 'express'
import { z } from 'zod'
import type { AuthRepository } from '../../domain/auth.js'
import { DomainError } from '../../domain/errors.js'
import {
  EVENT_REVIEW_SECTIONS,
  MAX_APPROVAL_CONDITIONS,
  type EventProposalReviewRepository,
} from '../../domain/event-proposal-review.js'
import type { SessionService } from '../../domain/session.js'
import type { AccessActor } from '../../usecase/access.js'
import {
  claimEventProposalReview,
  decideEventCancellationReview,
  decideEventProposalReview,
  getEventProposalReview,
  listEventProposalReviews,
} from '../../usecase/event-proposal-review.js'
import { authGuard } from './auth-routes.js'
import { ok } from './response.js'

export interface EventProposalReviewRouteDeps {
  repo: EventProposalReviewRepository
  authRepo: AuthRepository
  sessions: SessionService
}

const id = z.string().regex(/^[0-9a-f]{24}$/i)
export const eventProposalListQuery = z
  .object({ view: z.enum(['pending', 'approved']).default('pending') })
  .strict()
// Validate transport types and limits here; outcome-specific rules belong to the use case.
export const eventReviewDecisionBody = z
  .object({
    outcome: z.enum(['Request revision', 'Approve', 'Reject', 'Re-defense']),
    reason: z.string().max(5_000).optional(),
    sections: z.array(z.enum(EVENT_REVIEW_SECTIONS)).max(EVENT_REVIEW_SECTIONS.length).optional(),
    reviewNote: z.string().max(10_000).optional(),
    revisionDeadlineAt: z.string().datetime().optional(),
    conditions: z.array(z.string().max(500)).max(MAX_APPROVAL_CONDITIONS).optional(),
    budgetLines: z
      .array(
        z
          .object({
            fundingDecision: z.enum(['NOT_SPONSORED', 'BEFORE_EVENT', 'AFTER_EVENT']),
            approvedAmount: z.number().int().min(0),
            reason: z.string().max(500).optional(),
          })
          .strict(),
      )
      .max(50)
      .optional(),
  })
  .strict()

export const eventCancellationDecisionBody = z
  .object({
    approve: z.boolean(),
    reason: z.string().max(5_000).optional(),
  })
  .strict()

// Convert schema failures to the application's standard validation error response.
function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new DomainError(
      'invalid event proposal review request',
      'validation',
      result.error.issues,
    )
  }
  return result.data
}

// authGuard supplies the authenticated actor; never accept actor identity from the body.
function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined
  if (!value) {
    throw new DomainError('authentication required', 'unauthorized')
  }
  return value
}

/** Register authenticated reads and CSRF-protected review writes. */
export function eventProposalReviewRoutes(deps: EventProposalReviewRouteDeps): Router {
  const router = Router()
  const guard = { repo: deps.authRepo, sessions: deps.sessions }

  // Read-only requests authenticate the session without requiring a CSRF token.
  router.get('/admin/event-proposals', authGuard(guard, false), async (req, res) => {
    const { view } = parsed(eventProposalListQuery, req.query)
    ok(res, await listEventProposalReviews(deps.repo, deps.authRepo, actor(res), view))
  })
  // Load the complete review dossier for one proposal.
  router.get('/admin/event-proposals/:id', authGuard(guard, false), async (req, res) => {
    ok(
      res,
      await getEventProposalReview(
        deps.repo,
        deps.authRepo,
        actor(res),
        parsed(id, req.params.id),
        new Date(),
      ),
    )
  })
  // Claim requires CSRF protection; the repository resolves concurrent assignments.
  router.post('/admin/event-proposals/:id/claim', authGuard(guard), async (req, res) => {
    ok(
      res,
      await claimEventProposalReview(
        deps.repo,
        deps.authRepo,
        actor(res),
        parsed(id, req.params.id),
        new Date(),
      ),
    )
  })
  // Convert the validated ISO deadline into a Date before calling the review use case.
  router.post('/admin/event-proposals/:id/decision', authGuard(guard), async (req, res) => {
    const body = parsed(eventReviewDecisionBody, req.body)
    ok(
      res,
      await decideEventProposalReview(
        deps.repo,
        deps.authRepo,
        actor(res),
        parsed(id, req.params.id),
        {
          ...body,
          revisionDeadlineAt: body.revisionDeadlineAt
            ? new Date(body.revisionDeadlineAt)
            : undefined,
        },
        new Date(),
      ),
    )
  })
  // ICPDP quyết định yêu cầu huỷ sự kiện đã được duyệt
  router.post(
    '/admin/event-proposals/:id/cancellation-decision',
    authGuard(guard),
    async (req, res) => {
      const body = parsed(eventCancellationDecisionBody, req.body)
      ok(
        res,
        await decideEventCancellationReview(
          deps.repo,
          deps.authRepo,
          actor(res),
          parsed(id, req.params.id),
          body,
          new Date(),
        ),
      )
    },
  )

  return router
}
