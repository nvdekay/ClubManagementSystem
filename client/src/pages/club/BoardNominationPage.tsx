import { useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppCard } from "@/components/ui/card/AppCard";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useBoardNominationAction, useBoardNominationContext } from "@/hooks/useBoardNominations";

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

  if (auth.isPending) return <div className="mx-auto grid max-w-5xl gap-5">
    <AppSkeleton className="h-48 w-full" /><AppSkeleton className="h-72 w-full" />
  </div>;
  if (!auth.data) return <AppCard className="mx-auto max-w-3xl"><p>{t("boardNominations.signIn")}</p></AppCard>;
  if (!canNominate) return <AppCard className="mx-auto max-w-3xl"><p role="alert" className="text-danger-app">
    {t("boardNominations.unauthorized")}</p></AppCard>;
  if (context.isPending) return <div className="mx-auto grid max-w-5xl gap-5">
    <AppSkeleton className="h-48 w-full" /><AppSkeleton className="h-72 w-full" />
  </div>;
  if (context.isError || !context.data) return <AppCard className="mx-auto max-w-3xl space-y-4">
    <p role="alert" className="text-danger-app">{context.error?.message ?? t("boardNominations.loadError")}</p>
    <AppButton variant="secondary" onClick={() => void context.refetch()}>{t("boardNominations.retry")}</AppButton>
  </AppCard>;

  const available = context.data.positions.filter((position) =>
    !context.data.occupiedPositionIds.includes(position.id)
    && !context.data.pendingPositionIds.includes(position.id));
  return <div className="mx-auto max-w-5xl">
    <Link to={`/club/${clubId ?? ""}`} className="text-sm font-semibold text-accent-app">{t("boardNominations.back")}</Link>
    <header className="mt-5 border-b border-border-app pb-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-app">{t("boardNominations.eyebrow")}</p>
      <h1 className="mt-2 text-3xl font-bold font-heading sm:text-4xl">{t("boardNominations.title")}</h1>
      <p className="mt-3 max-w-3xl text-muted-app">{t("boardNominations.description")}</p>
    </header>
    {submitted && <p role="status" className="mt-5 rounded-lg bg-success-app/10 p-4 text-success-app">{t("boardNominations.success")}</p>}
    <AppCard className="mt-6 p-5 sm:p-6">
      <h2 className="text-xl font-bold font-heading">{context.data.clubName}</h2>
      <p className="mt-2 text-sm text-muted-app">{context.data.term
        ? `${context.data.term.name} · ${date(context.data.term.startAt)} – ${date(context.data.term.endAt)}`
        : t("boardNominations.term")}</p>
    </AppCard>
    <AppCard className="mt-6 p-5 sm:p-6">
      <h2 className="text-xl font-bold font-heading">{t("boardNominations.positions")}</h2>
      {!available.length ? <p className="mt-4 rounded-lg border border-dashed border-border-app p-6 text-center text-muted-app">
        {t("boardNominations.noSeats")}</p> : !context.data.candidates.length
        ? <p className="mt-4 rounded-lg border border-dashed border-border-app p-6 text-center text-muted-app">
          {t("boardNominations.noCandidates")}</p> : <div className="mt-4 space-y-4">
          {available.map((position) => {
            const conflictIds = position.isLeaderRole ? context.data!.presidentConflictMembershipIds : [];
            const candidates = context.data!.candidates.filter((candidate) =>
              !conflictIds.includes(candidate.membershipId));
            return <label key={position.id} className="grid gap-2 rounded-xl border border-border-app p-4 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,1fr)] sm:items-center">
              <span className="font-semibold">{position.name}
                {position.unit && <span className="ml-2 text-sm font-normal text-muted-app">{position.unit}</span>}
                {position.isLeaderRole && <span className="ml-2 rounded-full bg-primary-app/10 px-2 py-1 text-xs text-primary-app">{t("boardNominations.leader")}</span>}
              </span>
              <select className="min-h-11 w-full rounded-lg border border-border-app bg-surface-app px-3 py-2"
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
    </AppCard>
    {action.isError && <p role="alert" className="mt-4 text-sm text-danger-app">{action.error.message || t("boardNominations.actionError")}</p>}
  </div>;
}
