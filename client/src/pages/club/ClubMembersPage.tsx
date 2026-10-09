import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import { MembershipStateBadge } from "@/components/custom/MembershipStateBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useClubMembers, useClubWithdrawals, useMembershipAction } from "@/hooks/useMemberSpace";
import type { Locale } from "@/i18n";
import type { WithdrawalRequest } from "@/services/memberSpace";
import { formatDay } from "@/utils/formatDate";

/** UC21 A1 for members with club.member.manage: roster and leave requests (UC22) to execute. */
export function ClubMembersPage() {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === "vi" ? "vi" : "en";
  const { clubId } = useParams();
  const auth = useAuth();
  const signedIn = Boolean(auth.data);
  const members = useClubMembers(clubId, signedIn);
  const withdrawals = useClubWithdrawals(clubId, signedIn);
  const action = useMembershipAction();
  const inFlight = useRef(false);
  const [doneId, setDoneId] = useState<string | null>(null);
  const roster = members.data ?? [];
  const waiting = (withdrawals.data ?? []).filter((item) => item.state === "Pending" || item.state === "Held");

  async function execute(request: WithdrawalRequest) {
    if (!auth.data || !clubId || inFlight.current || !window.confirm(t("memberSpace.executeConfirm"))) return;
    inFlight.current = true;
    setDoneId(null);
    try {
      await action.mutateAsync({ kind: "execute", clubId, requestId: request.id, csrfToken: auth.data.csrfToken });
      setDoneId(request.id);
    } catch {
      // action.isError renders below.
    } finally {
      inFlight.current = false;
    }
  }

  const error = members.error ?? withdrawals.error;
  return (
    <>
      <PageHeader title={t("memberSpace.membersPageTitle")} description={t("memberSpace.membersPageDescription")} />
      {members.isPending || withdrawals.isPending ? <AppSkeleton className="h-64 w-full" />
        : error ? <AppNotice tone="danger" role="alert" title={t("memberSpace.loadError")}><p>{error.message}</p></AppNotice> : (
          <div className="space-y-10">
            <section>
              <h2 className="mb-3 font-heading text-lg font-bold">{t("memberSpace.withdrawals")}</h2>
              {action.isError && <AppNotice tone="danger" role="alert" className="mb-3" title={t("memberSpace.executeError")}>
                <p>{action.error.message}</p></AppNotice>}
              {doneId && !action.isError && <p role="status" className="mb-3 text-sm font-semibold text-success-app">{t("memberSpace.executed")}</p>}
              {waiting.length === 0 ? <p className="text-sm text-muted-app">{t("memberSpace.withdrawalsEmpty")}</p> : (
                <ul className="divide-y divide-border-app border-y border-border-app">
                  {waiting.map((request) => (
                    <li key={request.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-2 py-4">
                      <div className="min-w-0 flex-1 basis-56">
                        <p className="font-semibold break-words">{request.memberName}</p>
                        <p className="text-sm break-words whitespace-pre-line">{request.reason}</p>
                        <p className="text-xs text-muted-app">{t("memberSpace.requestedFor", { date: formatDay(request.requestedEffectiveDate, locale) })}</p>
                      </div>
                      {request.state === "Held" && <AppBadge tone="warning">{t("memberSpace.held")}</AppBadge>}
                      <AppButton disabled={action.isPending} onClick={() => void execute(request)}>
                        {action.isPending ? t("memberSpace.executing") : t("memberSpace.execute")}</AppButton>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h2 className="mb-3 font-heading text-lg font-bold">{t("memberSpace.roster")}</h2>
              {roster.length === 0 ? <p className="text-sm text-muted-app">{t("memberSpace.rosterEmpty")}</p> : (
                <ul className="divide-y divide-border-app border-y border-border-app">
                  {roster.map((member) => (
                    <li key={member.id} className="flex flex-wrap items-center gap-3 px-2 py-3">
                      <span className="min-w-0 flex-1 font-medium break-words">{member.displayName}</span>
                      <span className="text-sm text-muted-app">{t("memberSpace.joinedOn", { date: formatDay(member.joinedAt, locale) })}</span>
                      <MembershipStateBadge state={member.state} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
    </>
  );
}
