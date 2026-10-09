import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MemberSpaceError,
  executeWithdrawal,
  fetchClubMemberships,
  fetchClubWithdrawals,
  fetchMemberSpace,
  fetchMyMemberships,
  requestWithdrawal,
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
      csrfToken: string } | { kind: "execute"; clubId: string; requestId: string; csrfToken: string },
    ): Promise<WithdrawalRequest | Membership> =>
      action.kind === "request"
        ? requestWithdrawal(action.membershipId, { reason: action.reason,
          requestedEffectiveDate: action.requestedEffectiveDate }, action.csrfToken)
        : executeWithdrawal(action.clubId, action.requestId, action.csrfToken),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key });
      await client.invalidateQueries({ queryKey: ["dashboard"] });
      await client.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}
