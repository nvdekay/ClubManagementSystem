import { useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppCard } from "@/components/ui/card/AppCard";
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

  if (auth.isPending) return <div className="mx-auto grid max-w-6xl gap-5">
    <AppSkeleton className="h-48 w-full" /><AppSkeleton className="h-96 w-full" />
  </div>;
  if (!auth.data) return <AppCard className="mx-auto max-w-3xl">{t("boardNominations.signIn")}</AppCard>;
  if (!isOfficer) return <AppCard className="mx-auto max-w-3xl"><p role="alert" className="text-danger-app">{t("boardNominations.unauthorized")}</p></AppCard>;
  if (query.isPending) return <div className="mx-auto grid max-w-6xl gap-5">
    <AppSkeleton className="h-48 w-full" /><AppSkeleton className="h-96 w-full" />
  </div>;
  if (query.isError || !query.data) return <AppCard className="mx-auto max-w-3xl space-y-4">
    <p role="alert" className="text-danger-app">{query.error?.message ?? t("boardNominations.queueError")}</p>
    <AppButton variant="secondary" onClick={() => void query.refetch()}>{t("boardNominations.retry")}</AppButton>
  </AppCard>;

  const nomination = query.data;
  const canDecide = nomination.task.state === "Open" && nomination.task.assigneeId === auth.data.user.id;
  const assignedElsewhere = nomination.task.state === "Open" && Boolean(nomination.task.assigneeId)
    && nomination.task.assigneeId !== auth.data.user.id;
  const pendingSeats = nomination.seats.filter((seat) => seat.state === "Pending Confirmation");
  const returningAll = pendingSeats.every((seat) => decisions[seat.id] === "return");
  return <div className="mx-auto max-w-6xl">
    <Link to="/workspace/board-nominations" className="text-sm font-semibold text-accent-app">{t("boardNominations.detailBack")}</Link>
    <header className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b border-border-app pb-6">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-app">ICPDP</p>
        <h1 className="mt-2 text-3xl font-bold font-heading sm:text-4xl">{nomination.clubName}</h1>
        <p className="mt-2 text-muted-app">{nomination.term.name} · {date(nomination.term.startAt)} – {date(nomination.term.endAt)}</p></div>
      <span className="rounded-full border border-border-app bg-surface-app px-4 py-2 text-sm font-semibold">{stateLabel(nomination.state)}</span>
    </header>
    {saved && <p role="status" className="mt-5 rounded-lg bg-success-app/10 p-4 text-success-app">{t("boardNominations.successDecision")}</p>}
    {nomination.clubState === "Active" && <p role="status" className="mt-5 rounded-lg bg-success-app/10 p-4 text-success-app">{t("boardNominations.activeClub")}</p>}
    <AppCard className="mt-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold font-heading">{t("boardNominations.seats")}</h2>
        <span className="text-sm text-muted-app">{t("boardNominations.waitingSince", { date: date(nomination.submittedAt) })}</span></div>
      <div className="mt-4 space-y-3">
        {nomination.seats.map((seat) => <div key={seat.id} className="grid gap-3 rounded-xl border border-border-app p-4 md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.7fr)_minmax(12rem,1fr)] md:items-center">
          <div><h3 className="font-bold">{seat.positionName}</h3><p className="mt-1 text-sm text-muted-app">{seat.displayName}</p></div>
          <span className="text-sm font-semibold">{seat.state === "Confirmed" ? t("boardNominations.confirmed")
            : seat.state === "Returned" ? t("boardNominations.returned") : t("boardNominations.pending")}</span>
          {seat.state === "Returned" && <p className="text-sm text-muted-app">{seat.reason}</p>}
          {canDecide && seat.state === "Pending Confirmation" && <div className="grid gap-2 sm:col-span-3 sm:grid-cols-2">
            <select className="min-h-11 rounded-lg border border-border-app bg-surface-app px-3 py-2"
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
        </div>)}
      </div>
    </AppCard>
    {nomination.task.state === "Decided" ? <AppCard className="mt-6 p-5 sm:p-6">
      <h2 className="text-lg font-bold font-heading">{t("boardNominations.history")}</h2>
      {nomination.decisions.map((decision) => <div key={decision.id} className="mt-3 rounded-lg bg-surface-app p-4">
        <p className="font-semibold">{decision.outcome === "Approve" ? t("boardNominations.outcomeApprove") : decision.outcome === "Reject" ? t("boardNominations.outcomeReject") : decision.outcome} · {date(decision.at)}</p>
        {decision.reason && <p className="mt-1 text-sm text-muted-app">{decision.reason}</p>}
        <p className="mt-2 text-sm text-muted-app">{t("boardNominations.confirmedLabel")}: {decision.confirmedSeatIds.length} · {t("boardNominations.returnedLabel")}: {decision.returnedSeatIds.length}</p>
      </div>)}
    </AppCard> : canDecide ? <AppCard className="mt-6 p-5 sm:p-6">
      <h2 className="text-xl font-bold font-heading">{t("boardNominations.decisionTitle")}</h2>
      <p className="mt-2 text-sm text-muted-app">{t("boardNominations.decisionHint")}</p>
      <label className="mt-4 block text-sm font-semibold">{t("boardNominations.generalReason")}
        <AppInput className="mt-2 w-full" value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} />
      </label>
      <AppButton className="mt-5 w-full sm:w-auto" disabled={action.isPending
        || pendingSeats.some((seat) => decisions[seat.id] === "return" && !reasons[seat.id]?.trim())
        || (returningAll && !decisionNote.trim())} onClick={() => void decide()}>
        {action.isPending ? t("boardNominations.deciding") : t("boardNominations.submitDecision")}</AppButton>
    </AppCard> : assignedElsewhere ? <AppCard className="mt-6"><p role="status">{t("boardNominations.claimedByOther")}</p></AppCard>
      : nomination.task.state === "Open" ? <AppCard className="mt-6 p-5 sm:p-6">
        <AppButton disabled={action.isPending} onClick={() => void claim()}>
          {action.isPending ? t("boardNominations.claiming") : t("boardNominations.claim")}</AppButton>
      </AppCard> : <AppCard className="mt-6"><p>{t("boardNominations.readOnly")}</p></AppCard>}
    {action.isError && <p role="alert" className="mt-4 text-sm text-danger-app">{action.error.message || t("boardNominations.decisionError")}</p>}
  </div>;
}
