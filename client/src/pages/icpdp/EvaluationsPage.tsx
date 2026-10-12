import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useEvaluation, useEvaluationAction, useEvaluationOverview, useEvaluationPeriodAction } from "@/hooks/useEvaluations";
import type { Classification, DimensionView, EvaluationState } from "@/services/evaluations";

const metricKeys = ["registrations", "attendances", "uniqueAttendees", "outsiderAttendees", "activeMembers", "completedEvents",
  "publicCompletedEvents", "cancelledEvents", "acceptedInvitations", "applications", "feedbackCount", "feedbackAverage",
  "reportsDue", "reportsOnTime", "budgets", "budgetsClean", "leaderSeated", "membersLeft", "violationPenalty", "openViolations"] as const;
type MetricKey = typeof metricKeys[number];
type DimensionCode = "D1" | "D2" | "D3" | "D4" | "D5" | "D6" | "D7" | "D8";

function stateLabel(t: TFunction, state: EvaluationState | undefined): string {
  switch (state) {
    case "Draft": return t("evaluations.stateDraft");
    case "Data Ready": return t("evaluations.stateDataReady");
    case "Under Review": return t("evaluations.stateUnderReview");
    case "Finalized": return t("evaluations.stateFinalized");
    case "Published": return t("evaluations.statePublished");
    default: return t("evaluations.notGenerated");
  }
}

function stateTone(state: EvaluationState | undefined): AppBadgeTone {
  return state === "Published" ? "success" : state === "Finalized" ? "info" : state === "Under Review" ? "warning" : "neutral";
}

function ratingLabel(t: TFunction, value: Classification): string {
  switch (value) {
    case "EXCELLENT": return t("evaluations.ratingEXCELLENT");
    case "GOOD": return t("evaluations.ratingGOOD");
    case "FAIR": return t("evaluations.ratingFAIR");
    default: return t("evaluations.ratingNEEDS_IMPROVEMENT");
  }
}

function ratingTone(value: Classification): AppBadgeTone {
  return value === "EXCELLENT" ? "success" : value === "GOOD" ? "info" : value === "FAIR" ? "warning" : "danger";
}

function metricLabel(t: TFunction, metric: string): string {
  return metricKeys.includes(metric as MetricKey) ? t(`evaluations.metric_${metric as MetricKey}`) : metric;
}

function dimensionName(t: TFunction, dimension: DimensionView): string {
  return /^D[1-8]$/.test(dimension.code) ? t(`evaluationSchemes.dim_${dimension.code as DimensionCode}`) : dimension.name;
}

function Gate({ children }: { children: (csrfToken: string) => ReactNode }) {
  const { t } = useTranslation();
  const auth = useAuth();
  if (auth.isPending) return <div className="space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-16 w-full" />)}</div>;
  if (!auth.data) return <AppNotice>
    <p>{t("evaluations.signIn")}</p>
    <Link className="inline-block font-semibold text-accent-app"
      to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>{t("evaluations.signInLink")}</Link>
  </AppNotice>;
  if (!auth.data.systemRoles.includes("ICPDP_OFFICER")) {
    return <AppNotice tone="danger" role="alert">{t("evaluations.unauthorized")}</AppNotice>;
  }
  return <>{children(auth.data.csrfToken)}</>;
}

function Overview({ csrfToken }: { csrfToken: string }) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const overview = useEvaluationOverview(params.get("period") ?? undefined, true);
  const action = useEvaluationPeriodAction();

  if (overview.isPending) return <div className="space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-14 w-full" />)}</div>;
  if (overview.isError) return <AppNotice tone="danger" role="alert" title={overview.error.message || t("evaluations.loadError")}>
    <AppButton variant="secondary" onClick={() => void overview.refetch()}>{t("evaluations.retry")}</AppButton></AppNotice>;
  const data = overview.data;
  if (!data.periodCode) return <AppNotice>{t("evaluations.noPeriods")}</AppNotice>;
  const periodCode = data.periodCode;
  const missing = data.rows.filter((row) => !row.evaluationId).length;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="text-sm font-semibold">{t("evaluations.period")}
          <AppSelect className="mt-2 w-56" label={t("evaluations.period")} value={periodCode}
            onChange={(value) => setParams({ period: value })} options={data.periods.map((item) => ({ value: item.code, label: item.code }))} /></div>
        {data.scheme && <AppBadge tone="info">{t("evaluations.schemeVersion", { version: data.scheme.version })}</AppBadge>}
      </div>
      {!data.scheme ? <AppNotice className="mb-6">
        <p>{t("evaluations.noScheme")}</p>
        <Link to="/workspace/evaluation-schemes" className="mt-2 inline-block font-semibold text-accent-app">{t("evaluations.schemeLink")}</Link>
      </AppNotice> : <div className="mb-8 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl bg-surface-app p-5">
          <p className="text-sm text-muted-app">{t("evaluations.generateHint")}</p>
          <AppButton className="mt-4" disabled={action.isPending || missing === 0}
            onClick={() => action.mutate({ kind: "generate", periodCode, csrfToken })}>
            {action.isPending && action.variables?.kind === "generate" ? t("evaluations.generating") : `${t("evaluations.generate")} · ${missing}`}</AppButton>
        </section>
        <section className="rounded-2xl bg-surface-app p-5">
          <p className="text-sm text-muted-app">{t("evaluations.publishHint")}</p>
          <AppButton className="mt-4" disabled={action.isPending || !data.canPublish}
            onClick={() => { if (window.confirm(t("evaluations.confirmPublish", { period: periodCode }))) action.mutate({ kind: "publish", periodCode, csrfToken }); }}>
            {action.isPending && action.variables?.kind === "publish" ? t("evaluations.publishing") : t("evaluations.publish")}</AppButton>
        </section>
      </div>}
      {action.isError && <AppNotice tone="danger" role="alert" className="mb-6">{action.error.message}</AppNotice>}
      {data.rows.length ? <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead><tr className="border-b border-border-app text-muted-app">
            <th scope="col" className="py-2 pr-3 font-semibold">{t("evaluations.club")}</th>
            <th scope="col" className="py-2 pr-3 font-semibold">{t("evaluations.status")}</th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">{t("evaluations.total")}</th>
            <th scope="col" className="py-2 pr-3 font-semibold">{t("evaluations.rating")}</th>
            <th scope="col" className="py-2"><span className="sr-only">{t("evaluations.open")}</span></th>
          </tr></thead>
          <tbody className="divide-y divide-border-app">{data.rows.map((row) =>
            <tr key={row.clubId} className="align-middle">
              <td className="py-3 pr-3"><p className="font-medium break-words">{row.clubName}</p>
                <p className="text-xs text-muted-app">
                  {[row.revisionNo && row.revisionNo > 1 ? t("evaluations.revision", { number: row.revisionNo }) : "",
                    row.insufficientCount ? t("evaluations.missingData", { count: row.insufficientCount }) : "",
                    row.manualCount ? t("evaluations.manualScores", { count: row.manualCount }) : ""].filter(Boolean).join(" · ")}</p></td>
              <td className="py-3 pr-3"><AppBadge tone={stateTone(row.state)}>{stateLabel(t, row.state)}</AppBadge></td>
              <td className="py-3 pr-3 text-right font-semibold tabular-nums">{row.totalScore ?? "—"}</td>
              <td className="py-3 pr-3">{row.classification ? <AppBadge tone={ratingTone(row.classification)}>{ratingLabel(t, row.classification)}</AppBadge> : "—"}</td>
              <td className="py-3 text-right">{row.evaluationId && <Link to={`/workspace/evaluations/${row.evaluationId}`}
                className="inline-flex min-h-11 items-center gap-1 font-semibold text-accent-app hover:underline">{t("evaluations.open")}<AppIcon name="chevronRight" className="size-4" /></Link>}</td>
            </tr>)}</tbody>
        </table>
      </div> : <p className="text-sm text-muted-app">{t("evaluations.none")}</p>}
    </>
  );
}

export function EvaluationsPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t("evaluations.title")} description={t("evaluations.description")} />
      <Gate>{(csrfToken) => <Overview csrfToken={csrfToken} />}</Gate>
    </>
  );
}

function DimensionRow({ dimension, editable, busy, onSave }: { dimension: DimensionView; editable: boolean; busy: boolean;
  onSave: (manual: { score: number; justification: string } | null) => Promise<boolean> }) {
  const { t } = useTranslation();
  const [showData, setShowData] = useState(false);
  const [editing, setEditing] = useState(false);
  const [score, setScore] = useState(String(dimension.score ?? ""));
  const [justification, setJustification] = useState(dimension.justification ?? "");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const value = Number(score);
    if (!score.trim() || !Number.isFinite(value) || value < 0 || value > 100 || !justification.trim()) {
      setError(t("evaluations.manualInvalid")); return;
    }
    setError(null);
    if (await onSave({ score: value, justification: justification.trim() })) setEditing(false);
  }

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <p className="font-semibold"><span className="font-mono text-muted-app">{dimension.code}</span> {dimensionName(t, dimension)}</p>
          <p className="text-xs text-muted-app">{t("evaluations.weight")}: {dimension.weight}%
            {dimension.computedScore !== undefined && dimension.isManual && ` · ${t("evaluations.computed")}: ${dimension.computedScore}`}</p>
          {dimension.isManual && dimension.justification && <p className="mt-1 text-sm break-words">{dimension.justification}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dimension.isManual && <AppBadge tone="warning">{t("evaluations.manualBadge")}</AppBadge>}
          {dimension.score !== undefined ? <span className="font-heading text-xl font-bold tabular-nums">{dimension.score}</span>
            : <AppBadge>{t("evaluations.insufficient")}</AppBadge>}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-sm">
        <button type="button" className="font-semibold text-accent-app hover:underline" aria-expanded={showData}
          onClick={() => setShowData((value) => !value)}>{showData ? t("evaluations.hideData") : t("evaluations.showData")}</button>
        {editable && dimension.allowsManual && !editing && <button type="button" className="font-semibold text-accent-app hover:underline"
          onClick={() => setEditing(true)}>{t("evaluations.scoreByHand")}</button>}
        {editable && dimension.isManual && !editing && <button type="button" className="font-semibold text-accent-app hover:underline"
          disabled={busy} onClick={() => void onSave(null)}>{t("evaluations.clearManual")}</button>}
      </div>
      {showData && <dl className="mt-3 grid gap-x-6 gap-y-2 rounded-xl bg-surface-app p-3 text-sm sm:grid-cols-2">{dimension.evidence.map((item) =>
        <div key={item.metric} className="flex justify-between gap-3">
          <dt className="text-muted-app" title={t("evaluations.source", { source: item.sourceEntity })}>{metricLabel(t, item.metric)}</dt>
          <dd className="font-semibold tabular-nums">{item.value}</dd>
        </div>)}</dl>}
      {editing && <div className="mt-3 grid gap-3 rounded-xl border border-border-app p-3 sm:grid-cols-[8rem_1fr]">
        <label className="block text-sm font-semibold">{t("evaluations.manualScore")}
          <AppInput type="number" min={0} max={100} step={0.5} className="mt-1.5 w-full font-normal tabular-nums" value={score}
            onChange={(e) => setScore(e.target.value)} /></label>
        <label className="block text-sm font-semibold">{t("evaluations.justification")}
          <AppTextarea className="mt-1.5 min-h-20 w-full font-normal" value={justification} maxLength={2000}
            placeholder={t("evaluations.justificationHint")} onChange={(e) => setJustification(e.target.value)} /></label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <AppButton disabled={busy} onClick={() => void save()}>{t("evaluations.saveManual")}</AppButton>
          <AppButton variant="secondary" onClick={() => setEditing(false)}>{t("evaluations.cancel")}</AppButton>
        </div>
        {error && <p role="alert" className="text-sm text-danger-app sm:col-span-2">{error}</p>}
      </div>}
    </li>
  );
}

function EvaluationDetailView({ id, csrfToken }: { id: string; csrfToken: string }) {
  const { t, i18n } = useTranslation();
  const query = useEvaluation(id, true);
  const action = useEvaluationAction();
  const navigate = useNavigate();
  const back = { to: "/workspace/evaluations", label: t("evaluations.back") };
  if (query.isPending) return <div className="space-y-4"><AppSkeleton className="h-10 w-1/2" /><AppSkeleton className="h-96 w-full" /></div>;
  if (query.isError) return <>
    <PageHeader title={t("evaluations.evaluation")} back={back} />
    <AppNotice tone="danger" role="alert" title={query.error.message || t("evaluations.loadError")}>
      <AppButton variant="secondary" onClick={() => void query.refetch()}>{t("evaluations.retry")}</AppButton></AppNotice>
  </>;
  const item = query.data;
  const editable = ["Draft", "Data Ready", "Under Review"].includes(item.state);
  const isLatest = (item.revisions[0]?.revisionNo ?? item.revisionNo) === item.revisionNo;
  function date(value: string) {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(value));
  }

  async function run(next: Parameters<typeof action.mutateAsync>[0]["action"], confirmText?: string): Promise<boolean> {
    if (confirmText && !window.confirm(confirmText)) return false;
    try {
      const result = await action.mutateAsync({ id, action: next, csrfToken });
      // A revision of a published result is a new evaluation with its own id.
      if (result.id !== id) navigate(`/workspace/evaluations/${result.id}`);
      return true;
    } catch { return false; }
  }

  return (
    <>
      <PageHeader title={item.clubName} back={back}
        description={`${item.periodCode} · ${t("evaluations.revision", { number: item.revisionNo })} · ${t("evaluations.schemeVersion", { version: item.schemeVersion })}`}
        actions={<AppBadge tone={stateTone(item.state)}>{stateLabel(t, item.state)}</AppBadge>} />
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0">
          <ul className="divide-y divide-border-app border-y border-border-app">{item.dimensions.map((dimension) =>
            <DimensionRow key={`${dimension.code}-${dimension.score}-${dimension.isManual}`} dimension={dimension} editable={editable && isLatest}
              busy={action.isPending}
              onSave={(manual) => run({ kind: "manual", dimensionCode: dimension.code, manual })} />)}</ul>
        </section>

        <aside className="min-w-0 space-y-6 lg:sticky lg:top-6">
          <section className="rounded-2xl bg-surface-app p-5">
            <p className="text-xs font-semibold tracking-wide text-muted-app uppercase">{t("evaluations.total")}</p>
            {item.totalScore !== undefined ? <p className="mt-1 font-heading text-4xl font-bold tabular-nums">{item.totalScore}</p>
              : <p className="mt-1 text-sm text-muted-app">{editable ? t("evaluations.finalizeHint") : t("evaluations.noTotal")}</p>}
            {item.classification && <AppBadge className="mt-2" tone={ratingTone(item.classification)}>{ratingLabel(t, item.classification)}</AppBadge>}
            <p className="mt-3 text-xs text-muted-app">{t("evaluations.totalHint")}</p>
            <p className="mt-1 text-xs text-muted-app">{t("evaluations.bands", { ...item.thresholds })}</p>
            {isLatest && <div className="mt-5 space-y-2">
              {editable && <AppButton className="w-full" disabled={action.isPending}
                onClick={() => void run({ kind: "finalize" }, t("evaluations.confirmFinalize"))}>{t("evaluations.finalize")}</AppButton>}
              {editable && <AppButton className="w-full" variant="secondary" disabled={action.isPending}
                onClick={() => void run({ kind: "regenerate" }, t("evaluations.confirmRegenerate"))}>{t("evaluations.regenerate")}</AppButton>}
              {item.state === "Finalized" && <AppButton className="w-full" variant="secondary" disabled={action.isPending}
                onClick={() => void run({ kind: "reopen" })}>{t("evaluations.reopen")}</AppButton>}
              {item.state === "Published" && <>
                <p className="text-xs text-muted-app">{t("evaluations.reviseHint")}</p>
                <AppButton className="w-full" variant="secondary" disabled={action.isPending}
                  onClick={() => void run({ kind: "regenerate" }, t("evaluations.confirmRevise"))}>{t("evaluations.revise")}</AppButton>
              </>}
            </div>}
            {action.isError && <p role="alert" className="mt-3 text-sm text-danger-app">{action.error.message}</p>}
          </section>
          {action.isSuccess && <AppNotice role="status">{t("evaluations.success")}</AppNotice>}

          {item.revisions.length > 1 && <section>
            <h2 className="font-heading text-lg font-bold">{t("evaluations.revisions")}</h2>
            <ul className="mt-3 space-y-2 text-sm">{item.revisions.map((revision) =>
              <li key={revision.id} className="flex flex-wrap items-center justify-between gap-2">
                <Link to={`/workspace/evaluations/${revision.id}`} className="font-semibold text-accent-app hover:underline">
                  {t("evaluations.revision", { number: revision.revisionNo })}</Link>
                <span className="text-muted-app">{revision.totalScore ?? "—"} · {stateLabel(t, revision.state)}
                  {revision.publishedAt && ` · ${date(revision.publishedAt)}`}</span>
              </li>)}</ul>
          </section>}

          <section>
            <h2 className="font-heading text-lg font-bold">{t("evaluations.trend")}</h2>
            {item.trend.length ? <ul className="mt-3 space-y-2 text-sm">{item.trend.map((entry) =>
              <li key={entry.periodCode} className="flex justify-between gap-2"><span>{entry.periodCode}</span>
                <span className="font-semibold tabular-nums">{entry.totalScore ?? "—"}{entry.classification && ` · ${ratingLabel(t, entry.classification)}`}</span></li>)}</ul>
              : <p className="mt-2 text-sm text-muted-app">{t("evaluations.noTrend")}</p>}
          </section>
        </aside>
      </div>
    </>
  );
}

export function EvaluationDetailPage() {
  const { id } = useParams();
  return <Gate>{(csrfToken) => id ? <EvaluationDetailView id={id} csrfToken={csrfToken} /> : null}</Gate>;
}
