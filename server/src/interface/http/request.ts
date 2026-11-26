import type { Response } from 'express'
import { DomainError } from '../../domain/errors.js'
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
