import { useRef, useState } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useLeadershipTransition, useLeadershipTransitionAction } from "@/hooks/useLeadershipTransitions";

export function LeadershipTransitionDetailPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const isOfficer = Boolean(auth.data?.systemRoles.includes("ICPDP_OFFICER"));
  const query = useLeadershipTransition(id, isOfficer);
  const action = useLeadershipTransitionAction();
  const [outcome, setOutcome] = useState<"Approve" | "Request revision">("Approve");
  const [reason, setReason] = useState("");
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const inFlight = useRef(false);
  function date(value: string) {
    return new Intl.DateTimeFormat(i18n.language,
      { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }
  const back = { to: "/workspace/leadership-transitions", label: t("leadershipTransitions.detailBack") };
  const loading = <div className="space-y-4"><AppSkeleton className="h-10 w-1/2" />
    <AppSkeleton className="h-96 w-full" /></div>;

  async function claim() {
    if (!auth.data || !id) return;
    try { await action.mutateAsync({ kind: "claim", id, csrfToken: auth.data.csrfToken }); }
    catch { /* Rendered below. */ }
  }
  async function decide() {
    if (!auth.data || !id || inFlight.current || !window.confirm(t("leadershipTransitions.confirmPrompt"))) return;
    inFlight.current = true;
    try {
      await action.mutateAsync({ kind: "decide", id, csrfToken: auth.data.csrfToken,
        input: { outcome, reason, followUpObligationIds: outcome === "Approve" ? followUps : [] } });
      setSaved(true);
    } catch { /* Rendered below. */ }
    finally { inFlight.current = false; }
  }

  if (auth.isPending) return loading;
  if (!auth.data) return <AppNotice>{t("leadershipTransitions.signIn")}</AppNotice>;
  if (!isOfficer) return <AppNotice tone="danger">{t("leadershipTransitions.unauthorized")}</AppNotice>;
  if (query.isPending) return loading;
  if (query.isError || !query.data) return <><PageHeader title={t("leadershipTransitions.queueTitle")} back={back} />
    <AppNotice tone="danger" role="alert" title={query.error?.message ?? t("leadershipTransitions.loadError")}>
      <AppButton variant="secondary" onClick={() => void query.refetch()}>{t("leadershipTransitions.retry")}</AppButton>
    </AppNotice></>;

  const plan = query.data;
  const canDecide = plan.task.state === "Open" && plan.task.assigneeId === auth.data.user.id;
  const assignedElsewhere = plan.task.state === "Open" && Boolean(plan.task.assigneeId)
    && plan.task.assigneeId !== auth.data.user.id;
  const stateLabel = plan.state === "Confirmed" ? t("leadershipTransitions.confirmed")
    : plan.state === "Returned" ? t("leadershipTransitions.returned") : t("leadershipTransitions.pending");
  return <>
    <PageHeader title={plan.clubName} back={back} description={`${plan.fromTerm.name} → ${plan.toTerm.name}`}
      actions={<AppBadge tone={plan.state === "Confirmed" ? "success" : plan.state === "Returned" ? "danger" : "warning"}>
        {stateLabel}</AppBadge>} />
    {saved && <AppNotice tone="success" role="status">{t("leadershipTransitions.success")}</AppNotice>}
    {plan.clubState === "Suspended" && <AppNotice tone="warning" role="status" title={t("leadershipTransitions.suspendedTitle")}>
      {t("leadershipTransitions.suspended")}</AppNotice>}
    <div className="mt-6 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-9">
        <section><h2 className="font-heading text-xl font-bold">{t("leadershipTransitions.terms")}</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-surface-app p-4">
            <dt className="text-sm text-muted-app">{t("leadershipTransitions.fromTerm")}</dt><dd className="mt-1 font-bold">{plan.fromTerm.name}</dd>
            <dd className="text-sm text-muted-app">{date(plan.fromTerm.startAt)} – {date(plan.fromTerm.endAt)}</dd></div>
          <div className="rounded-2xl bg-surface-app p-4"><dt className="text-sm text-muted-app">{t("leadershipTransitions.toTerm")}</dt>
            <dd className="mt-1 font-bold">{plan.toTerm.name}</dd><dd className="text-sm text-muted-app">{date(plan.toTerm.startAt)} – {date(plan.toTerm.endAt)}</dd></div></dl>
        </section>
        <section><h2 className="font-heading text-xl font-bold">{t("leadershipTransitions.candidates")}</h2>
          <ul className="mt-4 divide-y divide-border-app border-y border-border-app">{plan.candidates.map((candidate) =>
            <li key={candidate.positionCode} className="flex justify-between gap-4 px-2 py-4"><span className="font-semibold">{candidate.positionName}</span>
              <span className="text-right text-muted-app">{candidate.displayName}</span></li>)}</ul></section>
        <section><h2 className="font-heading text-xl font-bold">{t("leadershipTransitions.obligations")}</h2>
          {plan.outstandingObligations.length ? <ul className="mt-4 space-y-3">{plan.outstandingObligations.map((item) =>
            <li key={item.id} className="rounded-2xl border border-border-app p-4"><p className="font-semibold">{item.description}</p>
              <p className="mt-1 text-sm text-muted-app">{item.type}</p>{canDecide && outcome === "Approve" && <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={followUps.includes(item.id)} onChange={(event) => setFollowUps((current) =>
                  event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} />
                {t("leadershipTransitions.followUp")}</label>}</li>)}</ul>
            : <p className="mt-3 text-muted-app">{t("leadershipTransitions.noObligations")}</p>}</section>
        <section><h2 className="font-heading text-xl font-bold">{t("leadershipTransitions.handover")}</h2>
          {plan.handover.items.length ? <ul className="mt-3 list-disc space-y-2 pl-5">{plan.handover.items.map((item) =>
            <li key={item.id}>{item.description}</li>)}</ul> : <p className="mt-3 text-muted-app">{t("leadershipTransitions.noHandover")}</p>}</section>
        {plan.handover.proposedBoardRoles && <section><h2 className="font-heading text-xl font-bold">{t("leadershipTransitions.roleChanges")}</h2>
          <ul className="mt-4 divide-y divide-border-app border-y border-border-app">{plan.handover.proposedBoardRoles.map((role) =>
            <li key={role.code} className="px-2 py-4"><p className="font-semibold">{role.name} <span className="text-sm text-muted-app">({role.code})</span></p>
              <p className="mt-1 text-sm text-muted-app">{t("leadershipTransitions.permissions")}: {role.permissionCodes.map((code) => t(`applications.perm_${code.replaceAll(".", "_")}`,
                { defaultValue: code })).join(", ") || "—"}</p></li>)}</ul></section>}
      </div>
      <aside className="min-w-0 lg:sticky lg:top-6">
        {plan.task.state === "Decided" ? <section><h2 className="font-heading text-lg font-bold">{t("leadershipTransitions.history")}</h2>
          <ol className="mt-4 space-y-4">{plan.decisions.map((decision) => <li key={decision.id} className="border-l-2 border-primary-app pl-3">
            <p className="font-semibold">{decision.outcome === "Approve" ? t("leadershipTransitions.outcomeApprove") : t("leadershipTransitions.outcomeReturn")} · {date(decision.at)}</p>
            {decision.reason && <p className="mt-1 text-sm text-muted-app">{decision.reason}</p>}
            {decision.followUpObligationIds.length > 0 && <p className="mt-1 text-sm text-muted-app">{t("leadershipTransitions.conditional", { count: decision.followUpObligationIds.length })}</p>}
          </li>)}</ol></section> : canDecide ? <section className="rounded-2xl bg-surface-app p-5">
          <h2 className="font-heading text-lg font-bold">{t("leadershipTransitions.decisionTitle")}</h2>
          <select className="mt-4 min-h-11 w-full rounded-xl border border-border-app bg-bg-app px-3.5 text-sm"
            value={outcome} onChange={(event) => setOutcome(event.target.value as typeof outcome)}>
            <option value="Approve">{t("leadershipTransitions.approve")}</option><option value="Request revision">{t("leadershipTransitions.return")}</option>
          </select><label className="mt-4 block text-sm font-semibold">{t("leadershipTransitions.reason")}
            <AppInput className="mt-2 w-full font-normal" value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          {outcome === "Request revision" && !reason.trim() && <p className="mt-2 text-sm text-danger-app">{t("leadershipTransitions.returnReason")}</p>}
          <AppButton className="mt-5 w-full" disabled={action.isPending || (outcome === "Request revision" && !reason.trim())
            || (outcome === "Approve" && plan.clubState === "Suspended")} onClick={() => void decide()}>
            {action.isPending ? t("leadershipTransitions.deciding") : t("leadershipTransitions.submitDecision")}</AppButton>
        </section> : assignedElsewhere ? <AppNotice tone="warning">{t("leadershipTransitions.claimedByOther")}</AppNotice>
          : plan.task.state === "Open" ? <AppButton className="w-full" disabled={action.isPending} onClick={() => void claim()}>
            {action.isPending ? t("leadershipTransitions.claiming") : t("leadershipTransitions.claim")}</AppButton>
            : <AppNotice>{t("leadershipTransitions.readOnly")}</AppNotice>}
        {action.isError && <p role="alert" className="mt-4 text-sm text-danger-app">{action.error.message}</p>}
      </aside>
    </div>
  </>;
}
