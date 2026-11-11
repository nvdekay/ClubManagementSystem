import { useRef, useState } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppFieldError } from "@/components/ui/field/AppFieldError";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useBoardNomination, useBoardNominationAction } from "@/hooks/useBoardNominations";
import { useConfirm } from "@/hooks/useConfirm";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { cn } from "@/utils/cn";

export function BoardNominationDetailPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const askConfirm = useConfirm();
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
  // The server wants a reason on every returned seat, and a general reason when all of them go back.
  const pendingSeats = query.data?.seats.filter((seat) => seat.state === "Pending Confirmation") ?? [];
  const returningAll = pendingSeats.every((seat) => decisions[seat.id] === "return");
  const field = useFieldValidation<string>({
    ...Object.fromEntries(pendingSeats.filter((seat) => decisions[seat.id] === "return").map((seat) =>
      [`seat:${seat.id}`, reasons[seat.id]?.trim() ? null : t("common.fieldRequired")])),
    decisionNote: returningAll && !decisionNote.trim() ? t("common.fieldRequired") : null,
  });
  function stateLabel(value: string) {
    return value === "Pending Confirmation" ? t("boardNominations.pending")
      : value === "Confirmed" ? t("boardNominations.confirmed")
        : value === "Returned" ? t("boardNominations.returned") : value;
  }
  function date(value: string) {
    return new Intl.DateTimeFormat(i18n.language,
      { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }
  // A term runs whole days, so its bounds read better without the midnight time.
  function day(value: string) {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(value));
  }

  async function claim() {
    if (!auth.data || !id) return;
    try { await action.mutateAsync({ kind: "claim", id, csrfToken: auth.data.csrfToken }); }
    catch { /* Error is rendered below. */ }
  }

  async function decide() {
    if (!auth.data || !id || !query.data || !field.touchAll()) return;
    const confirmedSeatIds = pendingSeats.filter((seat) => (decisions[seat.id] ?? "confirm") === "confirm")
      .map((seat) => seat.id);
    const returnedSeats = pendingSeats.filter((seat) => decisions[seat.id] === "return")
      .map((seat) => ({ seatId: seat.id, reason: reasons[seat.id] ?? "" }));
    if (inFlight.current || !(await askConfirm(t("boardNominations.confirmPrompt")))) return;
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
  function tone(value: string) {
    return value === "Confirmed" ? "success" as const : value === "Returned" ? "danger" as const : "warning" as const;
  }
  return <>
    <PageHeader title={nomination.clubName} back={back}
      description={`${nomination.term.name} · ${day(nomination.term.startAt)} – ${day(nomination.term.endAt)}`}
      actions={<AppBadge tone={tone(nomination.state)}>{stateLabel(nomination.state)}</AppBadge>} />
    <div className="space-y-3">
      {saved && <AppNotice tone="success" role="status">{t("boardNominations.successDecision")}</AppNotice>}
      {nomination.clubState === "Active" && <AppNotice tone="success" role="status">{t("boardNominations.activeClub")}</AppNotice>}
    </div>
    <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="min-w-0 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-heading text-base font-semibold">{t("boardNominations.seats")}</h2>
          <span className="text-sm text-muted-app">{t("boardNominations.waitingSince", { date: date(nomination.submittedAt) })}</span></div>
        <ul className="mt-3 divide-y divide-border-app">
          {nomination.seats.map((seat) => <li key={seat.id} className="py-4 last:pb-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border-app bg-bg-app text-muted-app"><AppIcon name="badge" className="size-4.5" /></span>
              <div className="min-w-0 flex-1"><h3 className="font-medium">{seat.positionName}</h3><p className="text-sm text-muted-app">{seat.displayName}</p></div>
              <AppBadge tone={tone(seat.state)}>{seat.state === "Confirmed" ? t("boardNominations.confirmed")
                : seat.state === "Returned" ? t("boardNominations.returned") : t("boardNominations.pending")}</AppBadge>
            </div>
            {seat.state === "Returned" && <p className="mt-3 rounded-lg border-l-2 border-danger-app bg-surface-app px-3 py-2 text-sm break-words text-muted-app sm:ml-14">{seat.reason}</p>}
            {canDecide && seat.state === "Pending Confirmation" && <div className="mt-3 space-y-2 sm:ml-14">
              <div role="group" aria-label={`${t("boardNominations.status")}: ${seat.positionName}`}
                className="inline-flex flex-wrap gap-1 rounded-lg border border-border-app bg-surface-app p-1">
                {(["confirm", "return"] as const).map((choice) => {
                  const chosen = (decisions[seat.id] ?? "confirm") === choice;
                  return <button key={choice} type="button" aria-pressed={chosen}
                    onClick={() => setDecisions((current) => ({ ...current, [seat.id]: choice }))}
                    className={cn("inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-app hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app sm:min-h-9", {
                      "bg-segment-app text-success-app shadow-xs hover:text-success-app": chosen && choice === "confirm",
                      "bg-segment-app text-danger-app shadow-xs hover:text-danger-app": chosen && choice === "return",
                    })}>
                    <AppIcon name={choice === "confirm" ? "check" : "arrowLeft"} className="size-4" />
                    {choice === "confirm" ? t("boardNominations.confirmSeat") : t("boardNominations.returnSeat")}
                  </button>;
                })}
              </div>
              {decisions[seat.id] === "return" && <div><AppInput aria-label={`${t("boardNominations.reason")}: ${seat.positionName}`}
                placeholder={t("boardNominations.reason")} value={reasons[seat.id] ?? ""} className="w-full"
                {...field.control(`seat:${seat.id}`)}
                onChange={(event) => setReasons((current) => ({ ...current, [seat.id]: event.target.value }))} />
                <AppFieldError message={field.error(`seat:${seat.id}`)} /></div>}
            </div>}
          </li>)}
        </ul>
      </section>
      <aside className="min-w-0 xl:sticky xl:top-24">
        {nomination.task.state === "Decided" ? <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
          <h2 className="font-heading text-base font-semibold">{t("boardNominations.history")}</h2>
          <ol className="mt-4 space-y-4">{nomination.decisions.map((decision) => <li key={decision.id} className="border-l-2 border-brand-app pl-3">
            <p className="font-medium">{decision.outcome === "Approve" ? t("boardNominations.outcomeApprove") : decision.outcome === "Reject" ? t("boardNominations.outcomeReject") : decision.outcome}</p>
            <p className="text-xs text-muted-app">{date(decision.at)}</p>
            {decision.reason && <p className="mt-1 text-sm break-words text-muted-app">{decision.reason}</p>}
            <p className="mt-2 text-sm text-muted-app">{t("boardNominations.confirmedLabel")}: {decision.confirmedSeatIds.length} · {t("boardNominations.returnedLabel")}: {decision.returnedSeatIds.length}</p>
          </li>)}</ol>
        </section> : canDecide ? <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
          <h2 className="font-heading text-base font-semibold">{t("boardNominations.decisionTitle")}</h2>
          <p className="mt-1 text-sm text-muted-app">{t("boardNominations.decisionHint")}</p>
          <label className="mt-4 block text-sm font-medium text-text-app">{t("boardNominations.generalReason")}{returningAll && <AppRequiredMark />}
            <AppInput className="mt-1.5 w-full font-normal" value={decisionNote} {...field.control("decisionNote", returningAll)}
              onChange={(event) => setDecisionNote(event.target.value)} />
            <AppFieldError message={field.error("decisionNote")} />
          </label>
          <AppButton className="mt-5 w-full" disabled={action.isPending} onClick={() => void decide()}>
            {action.isPending ? t("boardNominations.deciding") : t("boardNominations.submitDecision")}</AppButton>
        </section> : assignedElsewhere ? <AppNotice tone="warning"><p role="status">{t("boardNominations.claimedByOther")}</p></AppNotice>
          : nomination.task.state === "Open" ? <div className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
            <h2 className="mb-4 font-heading text-base font-semibold">{t("boardNominations.decisionTitle")}</h2>
            <AppButton className="w-full" disabled={action.isPending} onClick={() => void claim()}>
              {action.isPending ? t("boardNominations.claiming") : t("boardNominations.claim")}</AppButton>
          </div> : <AppNotice>{t("boardNominations.readOnly")}</AppNotice>}
        {action.isError && <p role="alert" className="mt-4 text-sm text-danger-app">{action.error.message || t("boardNominations.decisionError")}</p>}
      </aside>
    </div>
  </>;
}
