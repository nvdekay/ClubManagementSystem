import { useRef, useState } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useBoardNominationAction, useBoardNominationContext,
  useClubBoardNominations } from "@/hooks/useBoardNominations";
import type { BoardNomination } from "@/services/boardNominations";

function nominationTone(state: string) {
  if (state === "Confirmed") return "success" as const;
  if (state === "Returned") return "warning" as const;
  return "info" as const;
}

/** UC10: the club follows each submitted nomination and reads why ICPDP returned a seat. */
function NominationHistory({ clubId }: { clubId: string }) {
  const { t, i18n } = useTranslation();
  const history = useClubBoardNominations(clubId, true);
  function stateLabel(state: string) {
    if (state === "Confirmed") return t("boardNominations.nominationConfirmed");
    if (state === "Returned") return t("boardNominations.nominationReturned");
    return t("boardNominations.nominationPending");
  }
  function seatLabel(state: BoardNomination["seats"][number]["state"]) {
    if (state === "Confirmed") return t("boardNominations.confirmed");
    if (state === "Returned") return t("boardNominations.returned");
    return t("boardNominations.pending");
  }
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" });
  return <section className="mt-12">
    <h2 className="font-heading text-xl font-bold">{t("boardNominations.clubHistory")}</h2>
    {history.isPending ? <AppSkeleton className="mt-4 h-32 w-full" />
      : history.isError ? <AppNotice tone="danger" role="alert" className="mt-4">{t("boardNominations.clubHistoryError")}</AppNotice>
        : !history.data.length ? <AppNotice className="mt-4">{t("boardNominations.clubHistoryEmpty")}</AppNotice>
          : <ul className="mt-4 space-y-4">
            {history.data.map((nomination) => {
              const note = nomination.decisions.at(-1)?.reason;
              return <li key={nomination.id} className="rounded-2xl border border-border-app px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <AppBadge tone={nominationTone(nomination.state)}>{stateLabel(nomination.state)}</AppBadge>
                  <span className="text-sm text-muted-app">{nomination.term.name} · {t("boardNominations.waitingSince",
                    { date: date.format(new Date(nomination.submittedAt)) })}</span>
                </div>
                <ul className="mt-3 divide-y divide-border-app">
                  {nomination.seats.map((seat) => <li key={seat.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="font-semibold break-words">{seat.positionName} · {seat.displayName}</p>
                      {seat.reason && <p className="mt-0.5 text-sm text-muted-app break-words">
                        {t("boardNominations.seatReason", { reason: seat.reason })}</p>}
                    </div>
                    <AppBadge tone={nominationTone(seat.state)}>{seatLabel(seat.state)}</AppBadge>
                  </li>)}
                </ul>
                {note && <p className="mt-2 text-sm text-muted-app break-words">{t("boardNominations.decisionNote", { reason: note })}</p>}
              </li>;
            })}
          </ul>}
  </section>;
}

export function BoardNominationPage() {
  const { clubId } = useParams();
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const canNominate = Boolean(auth.data?.workspaces.some((item) => item.kind === "club"
    && item.clubId === clubId && item.permissions.includes("club.board.nominate")));
  const context = useBoardNominationContext(clubId, canNominate);
  const action = useBoardNominationAction();
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  // A double click fires twice before React re-renders the disabled button.
  const inFlight = useRef(false);
  function date(value: string) {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(value));
  }

  async function submit() {
    if (!auth.data || !clubId || inFlight.current) return;
    inFlight.current = true;
    const seats = Object.entries(selection).filter(([, membershipId]) => membershipId)
      .map(([positionId, membershipId]) => ({ positionId, membershipId }));
    try {
      await action.mutateAsync({ kind: "submit", clubId, seats, csrfToken: auth.data.csrfToken });
      setSubmitted(true);
      setSelection({});
    } catch { /* Mutation error is displayed below. */ }
    finally { inFlight.current = false; }
  }

  const loading = <div className="space-y-4">
    <AppSkeleton className="h-24 w-full" /><AppSkeleton className="h-72 w-full" />
  </div>;
  if (auth.isPending) return loading;
  if (!auth.data) return <AppNotice><p>{t("boardNominations.signIn")}</p></AppNotice>;
  if (!canNominate) return <AppNotice tone="danger" role="alert">{t("boardNominations.unauthorized")}</AppNotice>;
  if (context.isPending) return loading;
  if (context.isError || !context.data) return <AppNotice tone="danger" role="alert"
    title={context.error?.message ?? t("boardNominations.loadError")}>
    <AppButton variant="secondary" onClick={() => void context.refetch()}>{t("boardNominations.retry")}</AppButton>
  </AppNotice>;

  // A multi-holder seat (Phó chủ nhiệm) stays open after one holder is confirmed or pending.
  const available = context.data.positions.filter((position) => !position.isSingleHolder
    || (!context.data.occupiedPositionIds.includes(position.id)
      && !context.data.pendingPositionIds.includes(position.id)));
  const seated = context.data.seatedMembershipIds;
  return <>
    <PageHeader title={t("boardNominations.title")} description={t("boardNominations.description")} />
    {submitted && <AppNotice tone="success" role="status" className="mb-6">{t("boardNominations.success")}</AppNotice>}
    <section aria-label={context.data.clubName} className="flex flex-wrap items-center gap-4 rounded-2xl bg-surface-app px-5 py-4">
      <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft-app text-primary-app">
        <AppIcon name="calendar" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-heading text-lg font-bold break-words">{context.data.clubName}</h2>
        <p className="mt-0.5 text-sm text-muted-app">{context.data.term
          ? `${context.data.term.name} · ${date(context.data.term.startAt)} – ${date(context.data.term.endAt)}`
          : t("boardNominations.term")}</p>
      </div>
    </section>
    <section className="mt-10">
      <h2 className="font-heading text-xl font-bold">{t("boardNominations.positions")}</h2>
      {!available.length ? <AppNotice className="mt-4">{t("boardNominations.noSeats")}</AppNotice>
        : !context.data.candidates.length ? <AppNotice className="mt-4">{t("boardNominations.noCandidates")}</AppNotice>
          : <div className="mt-4 divide-y divide-border-app border-y border-border-app">
            {available.map((position) => {
              const conflictIds = position.isLeaderRole ? context.data!.presidentConflictMembershipIds : [];
              // One person holds at most one seat, so a member picked elsewhere is not offered here.
              const takenIds = Object.entries(selection).filter(([id, value]) => id !== position.id && value)
                .map(([, value]) => value);
              const candidates = context.data!.candidates.filter((candidate) =>
                !conflictIds.includes(candidate.membershipId) && !takenIds.includes(candidate.membershipId)
                && !seated.includes(candidate.membershipId));
              return <label key={position.id} className="grid gap-3 px-1 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,1fr)] sm:items-center">
                <span className="flex min-w-0 flex-wrap items-center gap-2 font-semibold">{position.name}
                  {position.unit && <span className="text-sm font-normal text-muted-app">{position.unit}</span>}
                  {position.isLeaderRole && <AppBadge tone="info">{t("boardNominations.leader")}</AppBadge>}
                  {!position.isSingleHolder && <AppBadge>{t("boardNominations.multiHolder")}</AppBadge>}
                </span>
                <select className="min-h-11 w-full rounded-xl border border-border-app bg-bg-app px-3.5 py-2 text-sm text-text-app transition-colors hover:border-primary-app focus-visible:border-ring-app focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:outline-none"
                  aria-label={`${t("boardNominations.candidate")}: ${position.name}`}
                  value={selection[position.id] ?? ""}
                  onChange={(event) => setSelection((current) => ({ ...current, [position.id]: event.target.value }))}>
                  <option value="">{t("boardNominations.selectCandidate")}</option>
                  {candidates.map((candidate) => <option key={candidate.membershipId} value={candidate.membershipId}>
                    {candidate.displayName}</option>)}
                </select>
                {position.isLeaderRole && !candidates.length && <span className="text-sm text-warning-app sm:col-start-2">{t("boardNominations.conflict")}</span>}
              </label>;
            })}
          </div>}
      <AppButton className="mt-6 w-full sm:w-auto" disabled={action.isPending
        || !Object.values(selection).some(Boolean) || !available.length}
        onClick={() => void submit()}>
        {action.isPending ? t("boardNominations.submitting") : t("boardNominations.submit")}
      </AppButton>
      {action.isError && <p role="alert" className="mt-4 text-sm text-danger-app">{action.error.message || t("boardNominations.actionError")}</p>}
    </section>
    {clubId && <NominationHistory clubId={clubId} />}
  </>;
}
