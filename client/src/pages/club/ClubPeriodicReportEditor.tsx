import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { useChangePeriodicReport } from "@/hooks/useClubPeriodicReports";
import type { PeriodicReportDetail } from "@/services/periodicReports";

interface Props { clubId: string; csrfToken: string; report: PeriodicReportDetail }
export function ClubPeriodicReportEditor({ clubId, csrfToken, report }: Props) {
  const { t, i18n } = useTranslation();
  const action = useChangePeriodicReport(clubId);
  const [narrative, setNarrative] = useState(report.narrative ?? "");
  const [nextPlan, setNextPlan] = useState(report.nextPlan ?? "");
  const initialNotes = report.evidence.flatMap((e) => e.note ? [e.note] : []).join("\n");
  const initialUrls = report.evidence.flatMap((e) => e.url ? [e.url] : []).join("\n");
  const [notes, setNotes] = useState(initialNotes);
  const [urls, setUrls] = useState(initialUrls);
  const editable = ["Draft", "Returned for correction"].includes(report.state);
  const dirty = narrative !== (report.narrative ?? "") || nextPlan !== (report.nextPlan ?? "") || notes !== initialNotes || urls !== initialUrls;
  const inputClass = "block min-h-28 w-full rounded-xl border border-border-app bg-bg-app p-3 text-text-app disabled:cursor-not-allowed disabled:opacity-70";
  async function change(kind: "save" | "submit") {
    try {
      await action.mutateAsync({ csrfToken, action: kind === "submit" ? { kind, id: report.id, revision: report.revision ?? 0 }
        : { kind, id: report.id, revision: report.revision ?? 0, input: { narrative, nextPlan,
          evidence: [...notes.split("\n").filter((v) => v.trim()).map((note) => ({ note })),
            ...urls.split("\n").filter((v) => v.trim()).map((url) => ({ url }))] } } });
    } catch { /* The mutation error is displayed below. */ }
  }
  const status = report.state as "Draft" | "Submitted" | "Accepted" | "Returned for correction";
  return <section className="space-y-4 rounded-2xl border border-border-app bg-surface-app p-5">
    <div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-bold">{report.periodCode}</h2>
      <span>{t(`clubPeriodicReports.${status}`)} · {t("clubPeriodicReports.version")} {report.versionNo}</span></div>
    <p>{t("clubPeriodicReports.deadline")}: {new Date(report.dueAt).toLocaleDateString(i18n.language)} {report.lateFlag && t("clubPeriodicReports.late")}</p>
    {report.decision && <AppNotice><p className="whitespace-pre-wrap break-words">{report.decision.reason ?? report.decision.observation}</p>
      {report.decision.sections.map((s) => <span key={s} className="mr-3 mt-2 inline-block font-semibold">{t(({ narrative: "periodicReports.sectionNarrative", nextPlan: "periodicReports.sectionNextPlan", figures: "periodicReports.sectionFigures", evidence: "periodicReports.sectionEvidence", other: "periodicReports.sectionOther" } as const)[s])}</span>)}</AppNotice>}
    <label className="block">{t("clubPeriodicReports.narrative")}<textarea className={inputClass} maxLength={20000} value={narrative} disabled={!editable || action.isPending} onChange={(e) => setNarrative(e.target.value)} /></label>
    <label className="block">{t("clubPeriodicReports.nextPlan")}<textarea className={inputClass} maxLength={20000} value={nextPlan} disabled={!editable || action.isPending} onChange={(e) => setNextPlan(e.target.value)} /></label>
    <label className="block">{t("clubPeriodicReports.evidence")}<textarea className={inputClass} value={notes} disabled={!editable || action.isPending} onChange={(e) => setNotes(e.target.value)} /></label>
    <label className="block">{t("clubPeriodicReports.evidenceUrls")}<textarea className={inputClass} value={urls} disabled={!editable || action.isPending} onChange={(e) => setUrls(e.target.value)} /></label>
    {editable && <div className="flex flex-wrap gap-3"><AppButton disabled={action.isPending || !dirty} onClick={() => void change("save")}>{t("clubPeriodicReports.save")}</AppButton>
      <AppButton variant="secondary" disabled={action.isPending || dirty || !narrative.trim() || !nextPlan.trim() || (!notes.trim() && !urls.trim())} onClick={() => void change("submit")}>{t("clubPeriodicReports.submit")}</AppButton></div>}
    {action.isError && <AppNotice tone="danger" role="alert">{action.error.message}</AppNotice>}
    <details><summary>{t("clubPeriodicReports.figures")}</summary><dl className="mt-3 grid grid-cols-2 gap-2">
      <dt>{t("periodicReports.eventsHeld")}</dt><dd>{report.live.events?.completed ?? 0}</dd>
      <dt>{t("periodicReports.activeMembers")}</dt><dd>{report.live.members?.active ?? 0}</dd>
      <dt>{t("periodicReports.attendance")}</dt><dd>{report.live.attendance?.total ?? 0}</dd>
    </dl></details>
    <details><summary>{t("clubPeriodicReports.history")}</summary><div className="space-y-4 pt-3">{report.versions?.map((v) => <article key={v.versionNo} className="space-y-2 border-t border-border-app pt-3">
      <h3 className="font-semibold">{t("clubPeriodicReports.version")} {v.versionNo} · {new Date(v.submittedAt).toLocaleString(i18n.language)}</h3>
      <p className="whitespace-pre-wrap break-words">{v.narrative}</p><p className="whitespace-pre-wrap break-words">{v.nextPlan}</p>
      {v.evidence.map((e, index) => <p key={index} className="break-words">{e.note} {e.url}</p>)}
      {v.decision && <p className="whitespace-pre-wrap break-words">{v.decision.outcome === "Accept" ? t("clubPeriodicReports.Accepted") : t("clubPeriodicReports.Returned for correction")}: {v.decision.reason ?? v.decision.observation}</p>}
    </article>)}</div></details>
  </section>;
}
