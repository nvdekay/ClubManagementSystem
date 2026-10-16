import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useClubTransitionPlans } from "@/hooks/useClubTransitionPlans";
import { ClubTransitionPlanEditor } from "./ClubTransitionPlanEditor";
export function ClubTransitionPlansPage() {
  const { clubId = "" } = useParams(); const { t } = useTranslation(); const auth = useAuth();
  const allowed = Boolean(auth.data?.workspaces.some((w) => w.kind === "club" && w.clubId === clubId && w.permissions.includes("club.transition.plan")));
  const query = useClubTransitionPlans(clubId, allowed);
  if (auth.isPending) return <AppSkeleton className="h-64 w-full" />;
  if (!allowed) return <AppNotice tone="danger">{t("clubTransitionPlans.denied")}</AppNotice>;
  return <><PageHeader title={t("clubTransitionPlans.title")} description={t("clubTransitionPlans.description")} />
    {query.isPending && <AppSkeleton className="h-64 w-full" />}
    {query.isError && <AppNotice tone="danger" role="alert">{query.error.message}<AppButton onClick={() => void query.refetch()}>{t("clubTransitionPlans.retry")}</AppButton></AppNotice>}
    {query.data && <div className="space-y-6">{!query.data.term && <AppNotice>{t("clubTransitionPlans.noTerm")}</AppNotice>}
      {query.data.term && !query.data.plans.some((p) => ["Draft", "Returned", "Pending Confirmation"].includes(p.state)) && <ClubTransitionPlanEditor key="new" clubId={clubId} csrfToken={auth.data!.csrfToken} context={query.data} />}
      {query.data.plans.map((p) => <ClubTransitionPlanEditor key={`${p.id}:${p.revision}`} clubId={clubId} csrfToken={auth.data!.csrfToken} context={query.data!} plan={p} />)}
    </div>}</>;
}
