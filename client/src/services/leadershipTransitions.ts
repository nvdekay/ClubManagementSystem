export interface TransitionTerm {
  id: string; name: string; startAt: string; endAt: string; state: string;
}

export interface TransitionObligation {
  id: string; type: string; entityId?: string; description: string; assigneeMembershipId: string;
}

export interface LeadershipTransition {
  id: string;
  clubId: string;
  clubName: string;
  clubState: string;
  fromTerm: TransitionTerm;
  toTerm: TransitionTerm;
  candidates: Array<{ positionCode: string; positionName: string; membershipId: string;
    userId: string; displayName: string }>;
  outstandingObligations: TransitionObligation[];
  handover: { items: Array<{ id: string; description: string }>; proposedBoardRoles?: Array<{
    code: string; name: string; unit?: string; isLeaderRole: boolean;
    isSingleHolder: boolean; permissionCodes: string[];
  }> };
  state: string;
  submittedBy: string;
  submittedAt: string;
  followUpConditions: TransitionObligation[];
  task: { id: string; state: string; assigneeId?: string; openedAt: string };
  decisions: Array<{ id: string; outcome: "Approve" | "Request revision"; reason?: string;
    followUpObligationIds: string[]; actorId: string; at: string }>;
}

export interface TransitionDecisionInput {
  outcome: "Approve" | "Request revision";
  reason?: string;
  followUpObligationIds: string[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? `HTTP ${response.status}`);
  }
  const body = await response.json() as { data: T };
  return body.data;
}

function mutation(csrfToken: string, body?: object): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    ...(body ? { body: JSON.stringify(body) } : {}) };
}

export function fetchLeadershipTransitionQueue(signal: AbortSignal) {
  return request<LeadershipTransition[]>("/admin/leadership-transitions", { signal });
}

export function fetchLeadershipTransition(id: string, signal: AbortSignal) {
  return request<LeadershipTransition>(`/admin/leadership-transitions/${encodeURIComponent(id)}`, { signal });
}

export function claimLeadershipTransition(id: string, csrfToken: string) {
  return request<LeadershipTransition>(`/admin/leadership-transitions/${encodeURIComponent(id)}/claim`,
    mutation(csrfToken));
}

export function decideLeadershipTransition(id: string, input: TransitionDecisionInput, csrfToken: string) {
  return request<LeadershipTransition>(`/admin/leadership-transitions/${encodeURIComponent(id)}/decision`,
    mutation(csrfToken, input));
}
