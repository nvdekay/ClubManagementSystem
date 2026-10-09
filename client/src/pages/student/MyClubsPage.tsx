import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { ClubLogo } from "@/components/custom/ClubLogo";
import { MembershipStateBadge } from "@/components/custom/MembershipStateBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useMyMemberships } from "@/hooks/useMemberSpace";
import type { Locale } from "@/i18n";
import { formatDay } from "@/utils/formatDate";

/** Entry to UC24: the clubs the student belongs to (Active or Inactive). */
export function MyClubsPage() {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === "vi" ? "vi" : "en";
  const auth = useAuth();
  const memberships = useMyMemberships(Boolean(auth.data));
  return (
    <>
      <PageHeader title={t("memberSpace.myClubsTitle")} description={t("memberSpace.myClubsDescription")} />
      {memberships.isPending ? <div className="space-y-2">{[0, 1].map((item) => <AppSkeleton key={item} className="h-20 w-full" />)}</div>
        : memberships.isError ? <AppNotice tone="danger" role="alert" title={t("memberSpace.loadError")}>
          <AppButton variant="secondary" onClick={() => void memberships.refetch()}>{t("memberSpace.retry")}</AppButton></AppNotice>
          : memberships.data.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted-app">{t("memberSpace.myClubsEmpty")}</p>
              <Link to="/clubs" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary-app px-5 text-sm font-semibold text-on-primary-app hover:opacity-90">
                {t("memberSpace.browseClubs")}</Link>
            </div>
          ) : (
            <ul className="divide-y divide-border-app border-y border-border-app">
              {memberships.data.map((membership) => (
                <li key={membership.id}>
                  <Link to={`/workspace/clubs/${membership.clubId}`} className="group flex flex-wrap items-center gap-4 px-2 py-4 hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-ring-app">
                    <ClubLogo name={membership.clubName ?? ""} size={48} />
                    <span className="min-w-0 flex-1 basis-48">
                      <span className="block font-semibold break-words text-text-app">{membership.clubName}</span>
                      <span className="block text-sm text-muted-app">{t("memberSpace.joinedOn", { date: formatDay(membership.joinedAt, locale) })}</span>
                    </span>
                    <MembershipStateBadge state={membership.state} />
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-app">
                      {t("memberSpace.open")}<AppIcon name="chevronRight" className="size-4" /></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
    </>
  );
}
