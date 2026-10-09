import { useId, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import { MembershipStateBadge, membershipStateLabels } from "@/components/custom/MembershipStateBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useClubMembers, useClubWithdrawals, useMembershipAction } from "@/hooks/useMemberSpace";
import type { Locale } from "@/i18n";
import type { ManagedMembershipState, Membership, WithdrawalRequest } from "@/services/memberSpace";
import { cn } from "@/utils/cn";
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
  // Banned members leave the roster, so the confirmation lives at page level.
  const [stateNotice, setStateNotice] = useState<string | null>(null);
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
              {stateNotice && <p role="status" className="mb-3 text-sm font-semibold text-success-app">{stateNotice}</p>}
              {roster.length === 0 ? <p className="text-sm text-muted-app">{t("memberSpace.rosterEmpty")}</p> : (
                <ul className="divide-y divide-border-app border-y border-border-app">
                  {roster.map((member) => <MemberRow key={member.id} member={member} clubId={clubId!} locale={locale}
                    onSaved={setStateNotice} />)}
                </ul>
              )}
            </section>
          </div>
        )}
    </>
  );
}

const nextStates: Record<"Active" | "Inactive", ManagedMembershipState[]> = {
  Active: ["Inactive", "Banned"],
  Inactive: ["Active", "Banned"],
};
const actionLabels = { Active: "memberSpace.toActive", Inactive: "memberSpace.toInactive",
  Banned: "memberSpace.toBanned" } as const;
const formTitles = { Active: "memberSpace.stateFormTitle_Active", Inactive: "memberSpace.stateFormTitle_Inactive",
  Banned: "memberSpace.stateFormTitle_Banned" } as const;

/** UC21: one roster row with the allowed transitions (effective today), a reason for bans and readable history. */
interface MemberRowProps {
  member: Membership;
  clubId: string;
  locale: Locale;
  onSaved: (message: string) => void;
}

function MemberRow({ member, clubId, locale, onSaved }: MemberRowProps) {
  const { t } = useTranslation();
  const auth = useAuth();
  const action = useMembershipAction();
  const inFlight = useRef(false);
  const reasonId = useId();
  const [target, setTarget] = useState<ManagedMembershipState | null>(null);
  const [reason, setReason] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const name = member.displayName ?? "";
  const options = member.state === "Active" || member.state === "Inactive" ? nextStates[member.state] : [];
  const history = member.statusHistory ?? [];

  function choose(state: ManagedMembershipState) {
    setTarget((current) => (current === state ? null : state));
    setReason("");
    action.reset();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.data || !target || inFlight.current || !event.currentTarget.reportValidity()) return;
    inFlight.current = true;
    try {
      await action.mutateAsync({ kind: "state", clubId, membershipId: member.id, state: target,
        ...(reason.trim() ? { reason: reason.trim() } : {}), csrfToken: auth.data.csrfToken });
      onSaved(t("memberSpace.stateSaved", { name, state: t(membershipStateLabels[target]) }));
      setTarget(null);
    } catch {
      // action.isError renders below.
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <li className="px-2 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-0 flex-1 basis-40 font-medium break-words">{name}</span>
        <span className="text-sm text-muted-app">{t("memberSpace.joinedOn", { date: formatDay(member.joinedAt, locale) })}</span>
        <MembershipStateBadge state={member.state} />
        <div role="group" aria-label={`${t("memberSpace.changeState")}: ${name}`} className="flex flex-wrap gap-2">
          {options.map((state) => (
            <AppButton key={state} variant={state === "Banned" ? "ghost" : "secondary"} aria-expanded={target === state}
              className={cn({ "text-danger-app hover:text-danger-app": state === "Banned" })} onClick={() => choose(state)}>
              {t(actionLabels[state])}
            </AppButton>
          ))}
          <AppButton variant="ghost" aria-expanded={showHistory} onClick={() => setShowHistory((value) => !value)}>
            {t("memberSpace.history")}
          </AppButton>
        </div>
      </div>
      {target && (
        <form onSubmit={(event) => void submit(event)}
          className={cn("mt-3 space-y-3 rounded-2xl p-4", target === "Banned" ? "bg-danger-app/10" : "bg-surface-app")}>
          <p className="font-semibold">{t(formTitles[target], { name })}</p>
          <p className="text-sm text-muted-app">{t("memberSpace.stateEffective")}</p>
          {target === "Banned" && <p className="text-sm font-medium text-danger-app">{t("memberSpace.banWarning")}</p>}
          <div className="space-y-1.5">
            <label htmlFor={reasonId} className="block text-sm font-medium">
              {target === "Banned" ? t("memberSpace.stateReason") : t("memberSpace.stateReasonOptional")}</label>
            <AppTextarea id={reasonId} value={reason} required={target === "Banned"} maxLength={2000} rows={2}
              className="w-full" onChange={(event) => setReason(event.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <AppButton type="submit" disabled={action.isPending || (target === "Banned" && !reason.trim())}
              className={cn({ "bg-danger-app": target === "Banned" })}>
              {action.isPending ? t("memberSpace.stateSaving") : t("memberSpace.stateConfirm")}</AppButton>
            <AppButton type="button" variant="ghost" onClick={() => setTarget(null)}>{t("memberSpace.cancel")}</AppButton>
          </div>
          {action.isError && <AppNotice tone="danger" role="alert" title={t("memberSpace.stateError")}><p>{action.error.message}</p></AppNotice>}
        </form>
      )}
      {showHistory && (
        <div className="mt-3 rounded-2xl bg-surface-app p-4 text-sm">
          <p className="mb-2 font-semibold">{t("memberSpace.history")}</p>
          {history.length === 0 ? <p className="text-muted-app">{t("memberSpace.historyEmpty")}</p> : (
            <ol className="space-y-1.5">
              {history.map((item, index) => (
                <li key={`${item.at}-${index}`}>
                  <span>{t("memberSpace.historyItem", { from: t(membershipStateLabels[item.fromState]),
                    to: t(membershipStateLabels[item.toState]), date: formatDay(item.effectiveDate, locale) })}</span>
                  {item.reason && <span className="block text-muted-app break-words">{item.reason}</span>}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </li>
  );
}
