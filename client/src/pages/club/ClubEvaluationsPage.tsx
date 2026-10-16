import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useClubEvaluations } from "@/hooks/useClubCompliance";
import { evaluations } from "@/i18n/evaluations";
export function ClubEvaluationsPage() {
  const { clubId = "" } = useParams(); const { t, i18n } = useTranslation(); const auth = useAuth();
  const allowed = Boolean(auth.data?.workspaces.some((w) => w.kind === "club" && w.clubId === clubId && w.permissions.includes("club.report.submit")));
  const query = useClubEvaluations(clubId, allowed);
  function metric(code: string) { const key = `metric_${code}`; return key in evaluations.en ? t(`evaluations.${key as keyof typeof evaluations.en}`) : code; }
  if (auth.isPending) return <AppSkeleton className="h-64 w-full" />;
  if (!allowed) return <AppNotice tone="danger">{t("clubCompliance.denied")}</AppNotice>;
  return <><PageHeader title={t("clubCompliance.evaluations")} />{query.isPending && <AppSkeleton className="h-64 w-full" />}
    {query.isError && <AppNotice tone="danger" role="alert">{query.error.message}<AppButton onClick={() => void query.refetch()}>{t("clubCompliance.retry")}</AppButton></AppNotice>}
    {query.data?.length === 0 && <AppNotice>{t("clubCompliance.empty")}</AppNotice>}
    <div className="space-y-6">{query.data?.map((e) => <section key={e.id} className="space-y-4 rounded-2xl border border-border-app bg-surface-app p-5">
      <h2 className="text-xl font-bold">{e.periodCode} · {t("clubCompliance.version")} {e.revisionNo}</h2>
      {e.publishedAt && <p>{new Date(e.publishedAt).toLocaleString(i18n.language)}</p>}
      <p className="text-lg font-bold">{t("clubCompliance.score")}: {e.totalScore ?? t("clubCompliance.missing")} {e.classification && `· ${t(`evaluations.rating${e.classification}`)}`}</p>
      <div className="space-y-3">{e.dimensions.map((d) => <article key={d.code} className="border-t border-border-app pt-3">
        <div className="flex flex-wrap justify-between gap-3"><h3 className="font-semibold">{d.name}</h3><span>{d.score ?? t("clubCompliance.missing")} · {t("evaluations.weight")}: {d.weight}</span></div>
        {d.justification && <p className="whitespace-pre-wrap break-words">{d.justification}</p>}
        <details><summary>{t("clubCompliance.sources")}</summary><dl className="grid grid-cols-2 gap-2 pt-2">{d.evidence.map((s, n) => <div key={n} className="col-span-2 flex flex-wrap justify-between gap-2"><dt>{metric(s.metric)} ({s.sourcePeriod})</dt><dd>{s.value}</dd></div>)}</dl></details>
      </article>)}</div>
      <details><summary>{t("clubCompliance.history")}</summary>{e.revisions.map((r) => <p key={r.id}>{t("clubCompliance.version")} {r.revisionNo}: {r.totalScore ?? t("clubCompliance.missing")}</p>)}</details>
      <details><summary>{t("evaluations.trend")}</summary>{e.trend.map((r) => <p key={r.periodCode}>{r.periodCode}: {r.totalScore ?? t("clubCompliance.missing")}</p>)}</details>
    </section>)}</div></>;
}
