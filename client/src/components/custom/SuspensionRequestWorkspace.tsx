import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useSuspensionRequests, useSuspensionRequestAction } from "@/hooks/useSuspensionRequests";
interface Props { clubId?: string }
export function SuspensionRequestWorkspace({ clubId }: Props) {
  const { t, i18n } = useTranslation(); const auth = useAuth();
  const allowed = Boolean(clubId ? auth.data?.workspaces.some((w) => w.kind === "club" && w.clubId === clubId && w.permissions.includes("club.suspension.request")) : auth.data?.systemRoles.includes("ICPDP_OFFICER"));
  const query = useSuspensionRequests(clubId, allowed); const action = useSuspensionRequestAction(clubId);
  const [reason, setReason] = useState(""); const [until, setUntil] = useState(""); const [obligationsPlan, setObligationsPlan] = useState(""); const [recoveryPlan, setRecoveryPlan] = useState("");
  const [acknowledged, setAcknowledged] = useState(""); const [decisions, setDecisions] = useState<Record<string, string>>({});
  const impactKey = JSON.stringify(query.data?.impacts.map((i) => i.id).sort() ?? []);
  const inputClass = "block w-full rounded-xl border border-border-app bg-bg-app p-3 text-text-app";
  async function submit() { if (!auth.data || !query.data) return; try { await action.mutateAsync({ kind: "submit", csrfToken: auth.data.csrfToken,
    input: { reason, until: `${until}T23:59:59.999Z`, obligationsPlan, recoveryPlan, acknowledgedImpactIds: query.data.impacts.map((i) => i.id) } }); } catch { /* The mutation error is displayed below. */ } }
  async function decide(id: string, outcome: "Approve" | "Reject") { if (!auth.data) return; try { await action.mutateAsync({ kind: "decide", csrfToken: auth.data.csrfToken, id, outcome, reason: decisions[id] ?? "" }); } catch { /* The mutation error is displayed below. */ } }
  if (auth.isPending) return <AppSkeleton className="h-64 w-full" />;
  if (!allowed) return <AppNotice tone="danger">{t("suspensionRequests.denied")}</AppNotice>;
  return <><PageHeader title={t("suspensionRequests.title")} description={t(clubId ? "suspensionRequests.description" : "suspensionRequests.reviewDescription")} />
    {query.isPending && <AppSkeleton className="h-64 w-full" />}
    {query.isError && <AppNotice tone="danger" role="alert">{query.error.message}<AppButton onClick={() => void query.refetch()}>{t("suspensionRequests.retry")}</AppButton></AppNotice>}
    {action.isError && <AppNotice tone="danger" role="alert">{action.error.message}</AppNotice>}
    {clubId && query.data && !query.data.requests.some((r) => r.state === "Pending") && <section className="mb-6 space-y-4 rounded-2xl border border-border-app bg-surface-app p-5">
      <label className="block">{t("suspensionRequests.reason")}<textarea className={inputClass} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
      <label className="block">{t("suspensionRequests.until")}<input type="date" className={inputClass} value={until} onChange={(e) => setUntil(e.target.value)} /></label>
      <label className="block">{t("suspensionRequests.obligations")}<textarea className={inputClass} maxLength={5000} value={obligationsPlan} onChange={(e) => setObligationsPlan(e.target.value)} /></label>
      <label className="block">{t("suspensionRequests.recovery")}<textarea className={inputClass} maxLength={5000} value={recoveryPlan} onChange={(e) => setRecoveryPlan(e.target.value)} /></label>
      <h2 className="font-semibold">{t("suspensionRequests.impact")}</h2><ul className="list-inside list-disc">{query.data.impacts.map((i) => <li key={i.id}>{i.title} · {new Date(i.startAt).toLocaleString(i18n.language)}</li>)}</ul>
      <label className="flex items-start gap-3"><input type="checkbox" checked={acknowledged === impactKey} onChange={(e) => setAcknowledged(e.target.checked ? impactKey : "")} />{t("suspensionRequests.acknowledge")}</label>
      <AppButton disabled={action.isPending || acknowledged !== impactKey || !reason.trim() || !until || !obligationsPlan.trim() || !recoveryPlan.trim()} onClick={() => void submit()}>{t("suspensionRequests.submit")}</AppButton>
    </section>}
    {query.data?.requests.length === 0 && <AppNotice>{t("suspensionRequests.empty")}</AppNotice>}
    <div className="space-y-6">{query.data?.requests.map((r) => <section key={r.id} className="space-y-3 rounded-2xl border border-border-app bg-surface-app p-5">
      <h2 className="font-bold">{r.clubName} · {t(`suspensionRequests.${r.state}`)}</h2><p className="whitespace-pre-wrap break-words">{r.reason}</p>
      <p>{t("suspensionRequests.until")}: {new Date(r.until).toLocaleDateString(i18n.language)}</p><p className="whitespace-pre-wrap break-words">{r.obligationsPlan}</p><p className="whitespace-pre-wrap break-words">{r.recoveryPlan}</p>
      {r.decisionReason && <AppNotice>{r.decisionReason}</AppNotice>}
      {!clubId && r.state === "Pending" && <><label className="block">{t("suspensionRequests.decision")}<textarea className={inputClass} maxLength={2000} value={decisions[r.id] ?? ""} onChange={(e) => setDecisions((d) => ({ ...d, [r.id]: e.target.value }))} /></label>
        <div className="flex flex-wrap gap-3"><AppButton disabled={action.isPending || !decisions[r.id]?.trim()} onClick={() => void decide(r.id, "Approve")}>{t("suspensionRequests.approve")}</AppButton>
          <AppButton variant="secondary" disabled={action.isPending || !decisions[r.id]?.trim()} onClick={() => void decide(r.id, "Reject")}>{t("suspensionRequests.reject")}</AppButton></div></>}
    </section>)}</div></>;
}
