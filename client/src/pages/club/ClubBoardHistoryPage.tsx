import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import { ClubBoardHistory } from "@/components/custom/ClubBoardHistory";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";

/** FR-UC02-03, BR56: the Club Leader's view of their club's structure versions and board by term. */
export function ClubBoardHistoryPage() {
  const { clubId = "" } = useParams();
  const { t } = useTranslation();
  const auth = useAuth();
  const allowed = Boolean(auth.data?.workspaces.some((workspace) => workspace.kind === "club"
    && workspace.clubId === clubId && workspace.permissions.includes("club.board.nominate")));
  if (auth.isPending) return <AppSkeleton className="h-64 w-full" />;
  if (!allowed) return <AppNotice tone="danger" role="alert">{t("clubOversight.clubForbidden")}</AppNotice>;
  return <>
    <PageHeader title={t("clubOversight.clubHistoryTitle")} description={t("clubOversight.clubHistoryDescription")} />
    <ClubBoardHistory clubId={clubId} />
  </>;
}
