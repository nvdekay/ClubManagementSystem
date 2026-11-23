import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { onboardMember,
  MemberSpaceError,
  changeMembershipState,
  executeWithdrawal,
  fetchClubMemberships,
  fetchClubWithdrawals,
  fetchMemberSpace,
  fetchMyMemberships,
  fetchMyWithdrawals,
  requestWithdrawal,
  type ManagedMembershipState,
  type Membership,
  type WithdrawalRequest,
} from "@/services/memberSpace";

const key = ["member-space"] as const;

/** True when the caller is not (or no longer) a member, so the page should point to the public club page. */
export function isNotAMember(error: unknown): boolean {
  return error instanceof MemberSpaceError && error.status === 403;
}

export function useMyMemberships(enabled: boolean) {
  return useQuery({ queryKey: [...key, "mine"], queryFn: ({ signal }) => fetchMyMemberships(signal), enabled, retry: false });
}

export function useMyWithdrawals(enabled: boolean) {
  return useQuery({ queryKey: [...key, "withdrawals", "mine"], queryFn: ({ signal }) => fetchMyWithdrawals(signal), enabled, retry: false });
}

export function useMemberSpace(clubId: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...key, "space", clubId], queryFn: ({ signal }) => fetchMemberSpace(clubId!, signal),
    enabled: enabled && Boolean(clubId), retry: false });
}

export function useClubMembers(clubId: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...key, "club", clubId, "members"],
    queryFn: ({ signal }) => fetchClubMemberships(clubId!, signal), enabled: enabled && Boolean(clubId), retry: false });
}

export function useClubWithdrawals(clubId: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...key, "club", clubId, "withdrawals"],
    queryFn: ({ signal }) => fetchClubWithdrawals(clubId!, signal), enabled: enabled && Boolean(clubId), retry: false });
}

export function useMembershipAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (action: { kind: "request"; membershipId: string; reason: string; requestedEffectiveDate: string;
      csrfToken: string } | { kind: "execute"; clubId: string; requestId: string; csrfToken: string }
      | { kind: "state"; clubId: string; membershipId: string; state: ManagedMembershipState; reason?: string;
        csrfToken: string } | { kind: "onboard"; clubId: string; email: string; reason: string; csrfToken: string },
    ): Promise<WithdrawalRequest | Membership> => {
      if (action.kind === "request") {
        return requestWithdrawal(action.membershipId, { reason: action.reason,
          requestedEffectiveDate: action.requestedEffectiveDate }, action.csrfToken);
      }
      if (action.kind === "execute") return executeWithdrawal(action.clubId, action.requestId, action.csrfToken);
      if (action.kind === "onboard") return onboardMember(action.clubId, { email: action.email, reason: action.reason }, action.csrfToken);
      return changeMembershipState(action.clubId, action.membershipId,
        { state: action.state, ...(action.reason ? { reason: action.reason } : {}) }, action.csrfToken);
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key });
      await client.invalidateQueries({ queryKey: ["dashboard"] });
      await client.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}
