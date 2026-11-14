import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changeSponsoredItem, fetchInvoiceImageUrl, fetchSponsoredBudget, uploadInvoiceImage,
  type ItemAction, type SponsoredBudget } from "@/services/sponsoredItems";

const sponsoredKey = ["sponsored-items"] as const;
export function useSponsoredItems(id: string, clubId?: string) {
  return useQuery({ queryKey: [...sponsoredKey, id, clubId], queryFn: ({ signal }) => fetchSponsoredBudget(id, clubId, signal), retry: false });
}
export function useInvoiceImage(id: string, clubId: string | undefined, itemId: string, imageId: string) {
  return useQuery({ queryKey: [...sponsoredKey, id, clubId, itemId, imageId],
    queryFn: ({ signal }) => fetchInvoiceImageUrl(id, clubId, itemId, imageId, signal), staleTime: 30_000, refetchInterval: 45_000, retry: false });
}
export function useSponsoredItemAction(id: string, clubId: string | undefined, csrfToken: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: async (input: { itemId: string; revision: number; action: ItemAction }
    | { itemId: string; revision: number; files: File[]; onProgress: (done: number) => void }) => {
    if (!("files" in input)) return changeSponsoredItem(id, clubId, input.itemId, input.revision, input.action, csrfToken);
    let revision = input.revision;
    let result: SponsoredBudget | undefined;
    for (const [index, file] of input.files.entries()) {
      result = await uploadInvoiceImage(id, clubId!, input.itemId, revision, file, csrfToken);
      revision = result.revision;
      client.setQueryData([...sponsoredKey, id, clubId], result);
      input.onProgress(index + 1);
    }
    return result;
  }, onSuccess: (result) => { if (result) client.setQueryData([...sponsoredKey, id, clubId], result); },
  onSettled: async () => { await client.invalidateQueries({ queryKey: [...sponsoredKey, id, clubId] }); } });
}
