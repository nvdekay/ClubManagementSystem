import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { useAuth } from "@/hooks/useAuth";
import { useMyWithdrawals } from "@/hooks/useMemberSpace";
import type { Locale } from "@/i18n";
import type { WithdrawalState } from "@/services/memberSpace";
import { formatDay } from "@/utils/formatDate";

const tones: Record<WithdrawalState, AppBadgeTone> = {
  Pending: "info", Held: "warning", Executed: "success", Cancelled: "neutral",
};

/** UC22 FR-UC22-03: the student tracks every leave request they sent. Hidden until there is one. */
export function MyWithdrawalRequests() {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === "vi" ? "vi" : "en";
  const auth = useAuth();
  const requests = useMyWithdrawals(Boolean(auth.data));

  if (requests.isError) {
    return <AppNotice tone="danger" role="alert" className="mt-8" title={t("memberSpace.myWithdrawalsError")}>
      <AppButton variant="secondary" onClick={() => void requests.refetch()}>{t("memberSpace.retry")}</AppButton>
    </AppNotice>;
  }
  if (!requests.data?.length) return null;

  return (
    <section aria-labelledby="my-withdrawals-title" className="mt-10">
      <h2 id="my-withdrawals-title" className="font-heading text-xl font-bold text-text-app">{t("memberSpace.myWithdrawalsTitle")}</h2>
      <p className="mt-1 text-sm text-muted-app">{t("memberSpace.myWithdrawalsHint")}</p>
      <ul className="mt-4 divide-y divide-border-app border-y border-border-app">
        {requests.data.map((request) => (
          <li key={request.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-2 py-4">
            <div className="min-w-0 flex-1 basis-56">
              <Link to={`/workspace/clubs/${request.clubId}`} className="font-semibold break-words text-text-app hover:underline">
                {request.clubName ?? request.clubId}</Link>
              <p className="mt-0.5 text-sm break-words text-muted-app">{request.reason}</p>
              <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-app">
                <span>{t("memberSpace.withdrawalSent", { date: formatDay(request.createdAt, locale) })}</span>
                <span>{t("memberSpace.withdrawalRequestedFor", { date: formatDay(request.requestedEffectiveDate, locale) })}</span>
                {request.executedAt && <span>{t("memberSpace.withdrawalExecutedOn", { date: formatDay(request.executedAt, locale) })}</span>}
              </p>
            </div>
            <AppBadge tone={tones[request.state]}>{t(`memberSpace.withdrawalState_${request.state}`)}</AppBadge>
          </li>
        ))}
      </ul>
    </section>
  );
}
