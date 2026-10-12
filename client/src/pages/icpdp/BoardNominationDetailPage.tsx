import { useRef, useState } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useBoardNomination, useBoardNominationAction } from "@/hooks/useBoardNominations";

export function BoardNominationDetailPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const isOfficer = Boolean(auth.data?.systemRoles.includes("ICPDP_OFFICER"));
  const query = useBoardNomination(id, isOfficer);
  const action = useBoardNominationAction();
  const [decisions, setDecisions] = useState<Record<string, "confirm" | "return">>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [decisionNote, setDecisionNote] = useState("");
  const [saved, setSaved] = useState(false);
  // A double click fires twice (two confirms, two requests) before the button re-renders disabled.
  const inFlight = useRef(false);
  function stateLabel(value: string) {
    return value === "Pending Confirmation" ? t("boardNominations.pending")
      : value === "Confirmed" ? t("boardNominations.confirmed")
        : value === "Returned" ? t("boardNominations.returned") : value;
  }
  function date(value: string) {
    return new Intl.DateTimeFormat(i18n.language,
      { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }

  async function claim() {
    if (!auth.data || !id) return;
    try { await action.mutateAsync({ kind: "claim", id, csrfToken: auth.data.csrfToken }); }
    catch { /* Error is rendered below. */ }
  }

  async function decide() {
    if (!auth.data || !id || !query.data) return;
    const pending = query.data.seats.filter((seat) => seat.state === "Pending Confirmation");
    const confirmedSeatIds = pending.filter((seat) => (decisions[seat.id] ?? "confirm") === "confirm")
      .map((seat) => seat.id);
    const returnedSeats = pending.filter((seat) => decisions[seat.id] === "return")
      .map((seat) => ({ seatId: seat.id, reason: reasons[seat.id] ?? "" }));
    if (inFlight.current || !window.confirm(t("boardNominations.confirmPrompt"))) return;
    inFlight.current = true;
    try {
      await action.mutateAsync({ kind: "decide", id,
        input: { confirmedSeatIds, returnedSeats, reason: decisionNote }, csrfToken: auth.data.csrfToken });
      setSaved(true);
    } catch { /* Error is rendered below. */ }
    finally { inFlight.current = false; }
  }

  const back = { to: "/workspace/board-nominations", label: t("boardNominations.detailBack") };
  const loading = <div className="space-y-4"><AppSkeleton className="h-10 w-1/2" /><AppSkeleton className="h-96 w-full" /></div>;
  if (auth.isPending) return loading;
  if (!auth.data) return <AppNotice>{t("boardNominations.signIn")}</AppNotice>;
  if (!isOfficer) return <AppNotice tone="danger" role="alert">{t("boardNominations.unauthorized")}</AppNotice>;
  if (query.isPending) return loading;
  if (query.isError || !query.data) return <>
    <PageHeader title={t("boardNominations.queueTitle")} back={back} />
    <AppNotice tone="danger" role="alert" title={query.error?.message ?? t("boardNominations.queueError")}>
      <AppButton variant="secondary" onClick={() => void query.refetch()}>{t("boardNominations.retry")}</AppButton>
    </AppNotice>
  </>;

  const nomination = query.data;
  const canDecide = nomination.task.state === "Open" && nomination.task.assigneeId === auth.data.user.id;
  const assignedElsewhere = nomination.task.state === "Open" && Boolean(nomination.task.assigneeId)
    && nomination.task.assigneeId !== auth.data.user.id;
  const pendingSeats = nomination.seats.filter((seat) => seat.state === "Pending Confirmation");
  const returningAll = pendingSeats.every((seat) => decisions[seat.id] === "return");
  function tone(value: string) {
    return value === "Confirmed" ? "success" as const : value === "Returned" ? "danger" as const : "warning" as const;
  }
  return <>
    <PageHeader title={nomination.clubName} back={back}
      description={`${nomination.term.name} · ${date(nomination.term.startAt)} – ${date(nomination.term.endAt)}`}
      actions={<AppBadge tone={tone(nomination.state)}>{stateLabel(nomination.state)}</AppBadge>} />
    <div className="space-y-3">
      {saved && <AppNotice tone="success" role="status">{t("boardNominations.successDecision")}</AppNotice>}
      {nomination.clubState === "Active" && <AppNotice tone="success" role="status">{t("boardNominations.activeClub")}</AppNotice>}
    </div>
    <div className="mt-6 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-heading text-xl font-bold">{t("boardNominations.seats")}</h2>
          <span className="text-sm text-muted-app">{t("boardNominations.waitingSince", { date: date(nomination.submittedAt) })}</span></div>
        <ul className="mt-4 divide-y divide-border-app border-y border-border-app">
          {nomination.seats.map((seat) => <li key={seat.id} className="px-2 py-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft-app text-primary-app"><AppIcon name="badge" className="size-4.5" /></span>
              <div className="min-w-0 flex-1"><h3 className="font-bold">{seat.positionName}</h3><p className="text-sm text-muted-app">{seat.displayName}</p></div>
              <AppBadge tone={tone(seat.state)}>{seat.state === "Confirmed" ? t("boardNominations.confirmed")
                : seat.state === "Returned" ? t("boardNominations.returned") : t("boardNominations.pending")}</AppBadge>
            </div>
            {seat.state === "Returned" && <p className="mt-2 text-sm break-words text-muted-app">{seat.reason}</p>}
            {canDecide && seat.state === "Pending Confirmation" && <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <select className="min-h-11 rounded-xl border border-border-app bg-bg-app px-3.5 text-sm text-text-app focus-visible:border-ring-app focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:outline-none"
                aria-label={`${t("boardNominations.status")}: ${seat.positionName}`}
                value={decisions[seat.id] ?? "confirm"}
                onChange={(event) => setDecisions((current) => ({ ...current,
                  [seat.id]: event.target.value as "confirm" | "return" }))}>
                <option value="confirm">{t("boardNominations.confirmSeat")}</option>
                <option value="return">{t("boardNominations.returnSeat")}</option>
              </select>
              {decisions[seat.id] === "return" && <AppInput aria-label={`${t("boardNominations.reason")}: ${seat.positionName}`}
                placeholder={t("boardNominations.reason")} value={reasons[seat.id] ?? ""}
                onChange={(event) => setReasons((current) => ({ ...current, [seat.id]: event.target.value }))} />}
            </div>}
          </li>)}
        </ul>
      </section>
      <aside className="min-w-0 lg:sticky lg:top-6">
        {nomination.task.state === "Decided" ? <section>
          <h2 className="font-heading text-lg font-bold">{t("boardNominations.history")}</h2>
          <ol className="mt-4 space-y-4">{nomination.decisions.map((decision) => <li key={decision.id} className="border-l-2 border-primary-app pl-3">
            <p className="font-semibold">{decision.outcome === "Approve" ? t("boardNominations.outcomeApprove") : decision.outcome === "Reject" ? t("boardNominations.outcomeReject") : decision.outcome} · {date(decision.at)}</p>
            {decision.reason && <p className="mt-1 text-sm break-words text-muted-app">{decision.reason}</p>}
            <p className="mt-2 text-sm text-muted-app">{t("boardNominations.confirmedLabel")}: {decision.confirmedSeatIds.length} · {t("boardNominations.returnedLabel")}: {decision.returnedSeatIds.length}</p>
          </li>)}</ol>
        </section> : canDecide ? <section className="rounded-2xl bg-surface-app p-5">
          <h2 className="font-heading text-lg font-bold">{t("boardNominations.decisionTitle")}</h2>
          <p className="mt-1 text-sm text-muted-app">{t("boardNominations.decisionHint")}</p>
          <label className="mt-4 block text-sm font-semibold">{t("boardNominations.generalReason")}
            <AppInput className="mt-2 w-full font-normal" value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} />
          </label>
          <AppButton className="mt-5 w-full" disabled={action.isPending
            || pendingSeats.some((seat) => decisions[seat.id] === "return" && !reasons[seat.id]?.trim())
            || (returningAll && !decisionNote.trim())} onClick={() => void decide()}>
            {action.isPending ? t("boardNominations.deciding") : t("boardNominations.submitDecision")}</AppButton>
        </section> : assignedElsewhere ? <AppNotice tone="warning"><p role="status">{t("boardNominations.claimedByOther")}</p></AppNotice>
          : nomination.task.state === "Open" ? <div className="rounded-2xl bg-surface-app p-5">
            <AppButton className="w-full" disabled={action.isPending} onClick={() => void claim()}>
              {action.isPending ? t("boardNominations.claiming") : t("boardNominations.claim")}</AppButton>
          </div> : <AppNotice>{t("boardNominations.readOnly")}</AppNotice>}
        {action.isError && <p role="alert" className="mt-4 text-sm text-danger-app">{action.error.message || t("boardNominations.decisionError")}</p>}
      </aside>
    </div>
  </>;
}
