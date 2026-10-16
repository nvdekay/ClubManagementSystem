import { useState } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useClubViolations, useSubmitComplianceResponse } from "@/hooks/useClubCompliance";
export function ClubViolationsPage() {
  const { clubId = "" } = useParams(); const { t, i18n } = useTranslation(); const auth = useAuth();
  const allowed = Boolean(auth.data?.workspaces.some((w) => w.kind === "club" && w.clubId === clubId && w.permissions.includes("club.complaint.respond")));
  const query = useClubViolations(clubId, allowed); const action = useSubmitComplianceResponse(clubId); const [texts, setTexts] = useState<Record<string, string>>({}); const [urls, setUrls] = useState<Record<string, string>>({});
  async function submit(id: string, actionId?: string) { if (!auth.data) return; const key = actionId ?? id; try { await action.mutateAsync({ csrfToken: auth.data.csrfToken,
    action: actionId ? { id, actionId, note: texts[key] ?? "", evidence: (urls[key] ?? "").split("\n").filter((u) => u.trim()).map((url) => ({ note: "", url })) } : { id, text: texts[key] ?? "" } }); } catch { /* The mutation error is displayed below. */ } }
  const inputClass = "block w-full rounded-xl border border-border-app bg-bg-app p-3 text-text-app";
  if (auth.isPending) return <AppSkeleton className="h-64 w-full" />;
  if (!allowed) return <AppNotice tone="danger">{t("clubCompliance.denied")}</AppNotice>;
  return <><PageHeader title={t("clubCompliance.violations")} />
    {query.isPending && <AppSkeleton className="h-64 w-full" />}{query.isError && <AppNotice tone="danger" role="alert">{query.error.message}<AppButton onClick={() => void query.refetch()}>{t("clubCompliance.retry")}</AppButton></AppNotice>}
    {action.isError && <AppNotice tone="danger" role="alert">{action.error.message}</AppNotice>}{query.data?.length === 0 && <AppNotice>{t("clubCompliance.empty")}</AppNotice>}
    <div className="space-y-6">{query.data?.map((v) => <section key={v.id} className="space-y-4 rounded-2xl border border-border-app bg-surface-app p-5">
      <h2 className="text-xl font-bold">{v.title}</h2><p className="whitespace-pre-wrap break-words">{v.description}</p><p className="whitespace-pre-wrap break-words">{v.decisionReason}</p>
      {v.clubResponse && <><h3 className="font-semibold">{t("clubCompliance.request")}</h3><p className="whitespace-pre-wrap break-words">{v.clubResponse.requestMessage}</p><p>{t("clubCompliance.due")}: {new Date(v.clubResponse.dueAt).toLocaleString(i18n.language)}</p>
        {v.clubResponse.source ? <p className="whitespace-pre-wrap break-words">{v.clubResponse.text}</p> : v.state === "Awaiting Club Response" && <><label className="block">{t("clubCompliance.response")}<textarea className={inputClass} maxLength={5000} value={texts[v.id] ?? ""} onChange={(e) => setTexts((s) => ({ ...s, [v.id]: e.target.value }))} /></label><AppButton disabled={action.isPending || !texts[v.id]?.trim()} onClick={() => void submit(v.id)}>{t("clubCompliance.submit")}</AppButton></>}
      </>}
      {v.actions.map((a) => <div key={a.id} className="space-y-3 border-t border-border-app pt-3"><h3 className="font-semibold">{a.description}</h3><p>{t("clubCompliance.due")}: {new Date(a.dueAt).toLocaleDateString(i18n.language)}</p>
        {a.submission ? <AppNotice><p>{a.submission.note}</p><p className="font-semibold">{t(a.state === "Verified" ? "clubCompliance.verified" : a.state === "Failed" ? "clubCompliance.failed" : "clubCompliance.awaiting")}</p>{a.submission.evidence.map((e, n) => <p key={n} className="break-words">{e.note} {e.url}</p>)}</AppNotice>
          : a.state === "Pending" && v.state === "Corrective Action" && <><label className="block">{t("clubCompliance.note")}<textarea className={inputClass} maxLength={5000} value={texts[a.id] ?? ""} onChange={(e) => setTexts((s) => ({ ...s, [a.id]: e.target.value }))} /></label>
            <label className="block">{t("clubCompliance.urls")}<textarea className={inputClass} value={urls[a.id] ?? ""} onChange={(e) => setUrls((s) => ({ ...s, [a.id]: e.target.value }))} /></label><AppButton disabled={action.isPending || !texts[a.id]?.trim()} onClick={() => void submit(v.id, a.id)}>{t("clubCompliance.submitAction")}</AppButton></>}
      </div>)}
    </section>)}</div></>;
}
