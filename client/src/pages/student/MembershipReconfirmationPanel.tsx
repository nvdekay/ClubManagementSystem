import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useConfirmMembership, useMembershipReconfirmations } from "@/hooks/useMembershipReconfirmations";
export function MembershipReconfirmationPanel() {
  const { t, i18n } = useTranslation(); const auth = useAuth(); const query = useMembershipReconfirmations(auth.data?.user.id); const mutation = useConfirmMembership();
  async function confirm(id: string) { if (!auth.data) return; try { await mutation.mutateAsync({ id, csrfToken: auth.data.csrfToken }); } catch { /* The mutation error is displayed below. */ } }
  if (!auth.data) return null;
  if (query.isPending) return <AppSkeleton className="mb-6 h-24 w-full" />;
  return <section className="mb-6 space-y-3">
    {query.isError && <AppNotice tone="danger" role="alert">{query.error.message}<AppButton onClick={() => void query.refetch()}>{t("membershipReconfirmations.retry")}</AppButton></AppNotice>}
    {Boolean(query.data?.length) && <><h2 className="text-xl font-bold">{t("membershipReconfirmations.title")}</h2><p>{t("membershipReconfirmations.description")}</p></>}
    {query.data?.map((r) => <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-app bg-surface-app p-4">
      <div><p className="font-semibold">{r.clubName} · {r.periodCode}</p><p>{t(`membershipReconfirmations.${r.state}`)}</p><p>{t("membershipReconfirmations.deadline")}: {new Date(r.dueAt).toLocaleString(i18n.language)}</p></div>
      {r.state === "Pending" && new Date(r.dueAt) > new Date() && <AppButton disabled={mutation.isPending} onClick={() => void confirm(r.id)}>{t("membershipReconfirmations.confirm")}</AppButton>}
    </div>)}
    {mutation.isError && <AppNotice tone="danger" role="alert">{mutation.error.message}</AppNotice>}
  </section>;
}
