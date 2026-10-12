import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelRecruitmentCampaign,
  createRecruitmentCampaign,
  fetchPublicRecruitmentCampaign,
  fetchRecruitmentCampaigns,
  publishRecruitmentCampaign,
  updateRecruitmentCampaign,
  type RecruitmentCampaignInput,
} from "@/services/recruitmentCampaigns";

const campaignKeyRoot = ["recruitment-campaigns"] as const;
const publicCampaignKeyRoot = ["public-recruitment-campaigns"] as const;

function campaignListKey(clubId: string | undefined) {
  return [...campaignKeyRoot, clubId] as const;
}

export function useRecruitmentCampaigns(clubId: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: campaignListKey(clubId),
    queryFn: ({ signal }) => fetchRecruitmentCampaigns(clubId!, signal),
    enabled: enabled && Boolean(clubId), retry: false });
}

export function usePublicRecruitmentCampaign(campaignId: string | undefined) {
  return useQuery({ queryKey: [...publicCampaignKeyRoot, campaignId],
    queryFn: ({ signal }) => fetchPublicRecruitmentCampaign(campaignId!, signal),
    enabled: Boolean(campaignId), retry: false });
}

export function useRecruitmentCampaignAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action:
      | { kind: "create"; clubId: string; input: RecruitmentCampaignInput; csrfToken: string }
      | { kind: "update"; clubId: string; campaignId: string; input: RecruitmentCampaignInput; csrfToken: string }
      | { kind: "publish"; clubId: string; campaignId: string; confirmOverlap: boolean; csrfToken: string }
      | { kind: "cancel"; clubId: string; campaignId: string; csrfToken: string }) => {
      switch (action.kind) {
        case "create": return createRecruitmentCampaign(action.clubId, action.input, action.csrfToken);
        case "update": return updateRecruitmentCampaign(action.clubId, action.campaignId,
          action.input, action.csrfToken);
        case "publish": return publishRecruitmentCampaign(action.clubId, action.campaignId,
          action.confirmOverlap, action.csrfToken);
        case "cancel": return cancelRecruitmentCampaign(action.clubId, action.campaignId, action.csrfToken)
          .then((campaign) => ({ campaign, overlaps: [] }));
      }
    },
    onSuccess: async (_result, action) => {
      await queryClient.invalidateQueries({ queryKey: campaignListKey(action.clubId) });
    },
  });
}
