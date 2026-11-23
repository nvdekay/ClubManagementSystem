/**
 * SEC-08 / AC17: an authenticated caller who is refused an action leaves one append-only audit
 * row. Only normalized route data is kept — never a body, cookie, header or token.
 */
export interface AccessDenial {
  actorId: string;
  method: string;
  /** Route pattern such as `/api/v1/admin/bookings/:id/decision`, never the raw URL. */
  route: string;
  entityType: string;
  entityId: string;
  clubId?: string;
  requiredPermission?: string;
  reason: string;
  correlationId: string;
  at: Date;
}

export interface AccessDenialAuditRepository {
  record(denial: AccessDenial): Promise<void>;
}

const OBJECT_ID = /^[0-9a-f]{24}$/i;

export function isObjectId(value: unknown): value is string {
  return typeof value === "string" && OBJECT_ID.test(value);
}

/**
 * The entity the caller tried to reach: the last ObjectId parameter on the route pattern, typed by
 * the static segment just before it (`/admin/bookings/:id` → `BOOKINGS`). With no such parameter
 * the attempt is recorded against the caller.
 */
export function accessDenialTarget(route: string, params: Readonly<Record<string, string>>,
  actorId: string): { entityType: string; entityId: string; clubId?: string } {
  const segments = route.split("/").filter(Boolean);
  const clubId = isObjectId(params.clubId) ? params.clubId : undefined;
  for (let index = segments.length - 1; index > 0; index -= 1) {
    const segment = segments[index]!;
    if (!segment.startsWith(":")) continue;
    const value = params[segment.slice(1)];
    const label = segments[index - 1]!;
    if (!isObjectId(value) || label.startsWith(":")) continue;
    return { entityType: label.toUpperCase().replaceAll("-", "_"), entityId: value, ...(clubId ? { clubId } : {}) };
  }
  return { entityType: "USER", entityId: actorId, ...(clubId ? { clubId } : {}) };
}
