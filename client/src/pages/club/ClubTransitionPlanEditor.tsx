import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { useWriteTransitionPlan } from "@/hooks/useClubTransitionPlans";
import type { TransitionContext, TransitionInput, TransitionPlan } from "@/services/clubTransitionPlans";
interface Props { clubId: string; csrfToken: string; context: TransitionContext; plan?: TransitionPlan }
export function ClubTransitionPlanEditor({ clubId, csrfToken, context, plan }: Props) {
  const { t, i18n } = useTranslation();
  const action = useWriteTransitionPlan(clubId);
  const [name, setName] = useState(plan?.input.toTerm.name ?? "");
  const [start, setStart] = useState(plan?.input.toTerm.startAt.slice(0, 10) ?? "");
  const [end, setEnd] = useState(plan?.input.toTerm.endAt.slice(0, 10) ?? "");
  const [earlyReason, setEarlyReason] = useState(plan?.input.earlyReason ?? "");
  const [items, setItems] = useState(plan?.input.handoverItems.map((i) => i.description).join("\n") ?? "");
  const [candidates, setCandidates] = useState<Record<string, string>>(Object.fromEntries(plan?.input.candidates.map((c, n, all) => [`${c.positionCode}:${all.slice(0, n).filter((item) => item.positionCode === c.positionCode).length}`, c.membershipId]) ?? []));
  const [assignees, setAssignees] = useState<Record<string, string>>(plan?.input.assignees ?? {});
  const [dirty, setDirty] = useState(false);
  const editable = !plan || ["Draft", "Returned"].includes(plan.state);
  const inputClass = "block w-full rounded-xl border border-border-app bg-bg-app p-3 text-text-app";
  function edited(update: () => void) { update(); setDirty(true); }
  async function save(submit = false) {
    const input: TransitionInput = { toTerm: { name, startAt: `${start}T00:00:00.000Z`, endAt: `${end}T00:00:00.000Z` }, earlyReason,
      handoverItems: items.split("\n").filter((v) => v.trim()).map((description, n) => ({ id: String(n + 1), description })),
      candidates: Object.entries(candidates).filter(([, id]) => id).map(([key, membershipId]) => ({ positionCode: key.split(":")[0]!, membershipId })),
      assignees: Object.fromEntries(Object.entries(assignees).filter(([, id]) => id)) };
    try { await action.mutateAsync({ csrfToken, action: { ...(plan ? { id: plan.id, revision: plan.revision } : {}), ...(!submit ? { input } : {}) } }); }
    catch { /* The mutation error is displayed below. */ }
  }
  const labels = { Draft: "clubTransitionPlans.draft", Returned: "clubTransitionPlans.returned", Confirmed: "clubTransitionPlans.confirmed", "Pending Confirmation": "clubTransitionPlans.pending" } as const;
  return <section className="space-y-4 rounded-2xl border border-border-app bg-surface-app p-5">
    {plan && <h2 className="font-bold">{t(labels[plan.state as keyof typeof labels])}</h2>}
    <div className="grid gap-4 sm:grid-cols-3">
      <label>{t("clubTransitionPlans.term")}<input className={inputClass} maxLength={200} value={name} disabled={!editable} onChange={(e) => edited(() => setName(e.target.value))} /></label>
      <label>{t("clubTransitionPlans.start")}<input type="date" className={inputClass} value={start} disabled={!editable} onChange={(e) => edited(() => setStart(e.target.value))} /></label>
      <label>{t("clubTransitionPlans.end")}<input type="date" className={inputClass} value={end} disabled={!editable} onChange={(e) => edited(() => setEnd(e.target.value))} /></label>
    </div>
    <label className="block">{t("clubTransitionPlans.earlyReason")}<textarea className={inputClass} value={earlyReason} maxLength={2000} disabled={!editable} onChange={(e) => edited(() => setEarlyReason(e.target.value))} /></label>
    <h3 className="font-semibold">{t("clubTransitionPlans.board")}</h3>
    {context.positions.flatMap((p) => Array.from({ length: p.isSingleHolder ? 1 : 2 }, (_, n) => <label key={`${p.code}:${n}`} className="block">{p.name}{!p.isSingleHolder && ` ${n + 1}`}<select className={inputClass} value={candidates[`${p.code}:${n}`] ?? ""} disabled={!editable} onChange={(e) => edited(() => setCandidates((c) => ({ ...c, [`${p.code}:${n}`]: e.target.value })))}>
      <option value="">{t("clubTransitionPlans.choose")}</option>{context.members.map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}
    </select></label>))}
    <h3 className="font-semibold">{t("clubTransitionPlans.obligations")}</h3>
    {context.obligations.map((o) => <label key={o.id} className="block break-words">{o.description}<select className={inputClass} value={assignees[o.id] ?? ""} disabled={!editable} onChange={(e) => edited(() => setAssignees((c) => ({ ...c, [o.id]: e.target.value })))}>
      <option value="">{t("clubTransitionPlans.choose")}</option>{context.members.filter((m) => Object.values(candidates).includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}
    </select></label>)}
    <label className="block">{t("clubTransitionPlans.handover")}<textarea className={inputClass} value={items} disabled={!editable} onChange={(e) => edited(() => setItems(e.target.value))} /></label>
    {editable && <div className="flex flex-wrap gap-3"><AppButton disabled={action.isPending || !name || !start || !end} onClick={() => void save()}>{t(plan ? "clubTransitionPlans.save" : "clubTransitionPlans.create")}</AppButton>
      {plan && <AppButton variant="secondary" disabled={action.isPending || dirty} onClick={() => void save(true)}>{t("clubTransitionPlans.submit")}</AppButton>}</div>}
    {action.isError && <AppNotice tone="danger" role="alert">{action.error.message}</AppNotice>}
    {plan && <details><summary>{t("clubTransitionPlans.history")}</summary>{plan.history.map((h, n) => <div key={n} className="my-3 border-t border-border-app py-2">
      <p>{new Date(h.at).toLocaleString(i18n.language)} · {h.reason}</p>{h.snapshot && <><p>{h.snapshot.toTerm.name}</p><p className="whitespace-pre-wrap">{h.snapshot.handoverItems.map((i) => i.description).join("\n")}</p></>}
    </div>)}</details>}
  </section>;
}
