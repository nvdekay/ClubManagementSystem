import type { Response } from 'express'
import { z } from 'zod'
import { DomainError } from '../../domain/errors.js'
import { DEFAULT_PAGE_SIZE, MAX_PAGE, MAX_PAGE_SIZE } from '../../domain/paging.js'
import type { AccessActor } from '../../usecase/access.js'

/** The signed-in caller that authGuard stored; a route reached without it is a 401. */
export function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined
  if (!value) {
    throw new DomainError('authentication required', 'unauthorized')
  }
  return value
}

/**
 * Validates request input against a zod schema. `what` names the input in the error message,
 * e.g. parse(body, req.body, 'booking request') fails with "invalid booking request" and the
 * zod issues as details.
 */
export function parse<T>(
  schema: {
    safeParse(
      input: unknown,
    ): { success: true; data: T } | { success: false; error: { issues: unknown } }
  },
  value: unknown,
  what: string,
): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new DomainError(`invalid ${what}`, 'validation', result.error.issues)
  }
  return result.data
}

/**
 * The shared `page` / `pageSize` query of server-side paged lists. Extend it with the list's own
 * filters and keep the result `.strict()`, so an unknown query key is a validation error.
 */
export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})
