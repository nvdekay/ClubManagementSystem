import { useState } from "react";
import { vnDateInput, vnDayBoundary, vnTomorrowInput } from "@/utils/formatDate";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppFieldError } from "@/components/ui/field/AppFieldError";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { useWriteTransitionPlan } from "@/hooks/useClubTransitionPlans";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import type { TransitionContext, TransitionInput, TransitionPlan } from "@/services/clubTransitionPlans";
interface Props { clubId: string; csrfToken: string; context: TransitionContext; plan?: TransitionPlan }
export function ClubTransitionPlanEditor({ clubId, csrfToken, context, plan }: Props) {
  const { t, i18n } = useTranslation();
  const action = useWriteTransitionPlan(clubId);
  const [name, setName] = useState(plan?.input.toTerm.name ?? "");
  const [start, setStart] = useState(plan ? vnDateInput(plan.input.toTerm.startAt) : "");
  const [end, setEnd] = useState(plan ? vnDateInput(plan.input.toTerm.endAt) : "");
  const [earlyReason, setEarlyReason] = useState(plan?.input.earlyReason ?? "");
  const [items, setItems] = useState(plan?.input.handoverItems.map((i) => i.description).join("\n") ?? "");
  const [candidates, setCandidates] = useState<Record<string, string>>(Object.fromEntries(plan?.input.candidates.map((c, n, all) => [`${c.positionCode}:${all.slice(0, n).filter((item) => item.positionCode === c.positionCode).length}`, c.membershipId]) ?? []));
  const [assignees, setAssignees] = useState<Record<string, string>>(plan?.input.assignees ?? {});
  const [dirty, setDirty] = useState(false);
  const editable = !plan || ["Draft", "Returned"].includes(plan.state);
  const inputClass = "block w-full rounded-xl border border-border-app bg-bg-app p-3 text-text-app aria-[invalid=true]:border-danger-app";
  // Handing over before the current term ends needs a reason (checked when the plan is submitted).
  const early = Boolean(start && context.term && new Date(vnDayBoundary(start, "start")) < new Date(context.term.endAt));
  // The term is needed to save a draft; board seats, assignees and the early reason only to submit it.
  const termErrors = {
    name: name.trim() ? null : t("common.fieldRequired"),
    start: !start ? t("common.fieldRequired") : start < vnTomorrowInput() ? t("common.dateNotPast") : null,
    end: !end ? t("common.fieldRequired") : start && end < start ? t("common.endAfterStart") : null,
  };
  const field = useFieldValidation<string>({ ...termErrors,
    earlyReason: early && !earlyReason.trim() ? t("common.fieldRequired") : null,
    ...Object.fromEntries(context.positions.map((p) => ["seat:" + p.code,
      Object.entries(candidates).some(([key, id]) => id && key.split(":")[0] === p.code) ? null : t("common.chooseRequired")])),
    ...Object.fromEntries(context.obligations.map((o) => ["obligation:" + o.id, assignees[o.id] ? null : t("common.chooseRequired")])) });
  function edited(update: () => void) { update(); setDirty(true); }
  async function save(submit = false) {
    if (!submit && Object.values(termErrors).some(Boolean)) { Object.keys(termErrors).forEach(field.touch); return; }
    if (submit && !field.touchAll()) return;
    const input: TransitionInput = { toTerm: { name, startAt: vnDayBoundary(start, "start"), endAt: vnDayBoundary(end, "end") }, earlyReason,
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
      <label>{t("clubTransitionPlans.term")}<AppRequiredMark /><input className={inputClass} maxLength={200} {...field.control("name")} value={name} disabled={!editable} onChange={(e) => edited(() => setName(e.target.value))} /><AppFieldError message={field.error("name")} /></label>
      <label>{t("clubTransitionPlans.start")}<AppRequiredMark /><input type="date" className={inputClass} min={vnTomorrowInput()} {...field.control("start")} value={start} disabled={!editable} onChange={(e) => edited(() => setStart(e.target.value))} /><AppFieldError message={field.error("start")} /></label>
      <label>{t("clubTransitionPlans.end")}<AppRequiredMark /><input type="date" className={inputClass} min={start || vnTomorrowInput()} {...field.control("end")} value={end} disabled={!editable} onChange={(e) => edited(() => setEnd(e.target.value))} /><AppFieldError message={field.error("end")} /></label>
    </div>
    <label className="block">{t("clubTransitionPlans.earlyReason")}{early && <AppRequiredMark />}<textarea className={inputClass} {...field.control("earlyReason", early)} value={earlyReason} maxLength={2000} disabled={!editable} onChange={(e) => edited(() => setEarlyReason(e.target.value))} /><AppFieldError message={field.error("earlyReason")} /></label>
    <h3 className="font-semibold">{t("clubTransitionPlans.board")}</h3>
    {context.positions.flatMap((p) => Array.from({ length: p.isSingleHolder ? 1 : 2 }, (_, n) => <label key={`${p.code}:${n}`} className="block">{p.name}{!p.isSingleHolder && ` ${n + 1}`}{n === 0 && <AppRequiredMark />}<select className={inputClass} value={candidates[`${p.code}:${n}`] ?? ""} disabled={!editable} required={n === 0} aria-invalid={n === 0 && field.error("seat:" + p.code) ? true : undefined} onChange={(e) => { edited(() => setCandidates((c) => ({ ...c, [`${p.code}:${n}`]: e.target.value }))); field.touch("seat:" + p.code); }}>
      <option value="">{t("clubTransitionPlans.choose")}</option>{context.members.map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}
    </select>{n === 0 && <AppFieldError message={field.error("seat:" + p.code)} />}</label>))}
    <h3 className="font-semibold">{t("clubTransitionPlans.obligations")}</h3>
    {context.obligations.map((o) => <label key={o.id} className="block break-words">{o.description}<AppRequiredMark /><select className={inputClass} value={assignees[o.id] ?? ""} disabled={!editable} required aria-invalid={field.error("obligation:" + o.id) ? true : undefined} onChange={(e) => { edited(() => setAssignees((c) => ({ ...c, [o.id]: e.target.value }))); field.touch("obligation:" + o.id); }}>
      <option value="">{t("clubTransitionPlans.choose")}</option>{context.members.filter((m) => Object.values(candidates).includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}
    </select><AppFieldError message={field.error("obligation:" + o.id)} /></label>)}
    <label className="block">{t("clubTransitionPlans.handover")}<textarea className={inputClass} value={items} disabled={!editable} onChange={(e) => edited(() => setItems(e.target.value))} /></label>
    {editable && <div className="flex flex-wrap gap-3"><AppButton disabled={action.isPending} onClick={() => void save()}>{t(plan ? "clubTransitionPlans.save" : "clubTransitionPlans.create")}</AppButton>
      {plan && <AppButton variant="secondary" disabled={action.isPending || dirty} onClick={() => void save(true)}>{t("clubTransitionPlans.submit")}</AppButton>}</div>}
    {action.isError && <AppNotice tone="danger" role="alert">{action.error.message}</AppNotice>}
    {plan && <details><summary>{t("clubTransitionPlans.history")}</summary>{plan.history.map((h, n) => <div key={n} className="my-3 border-t border-border-app py-2">
      <p>{new Date(h.at).toLocaleString(i18n.language)} · {h.reason}</p>{h.snapshot && <><p>{h.snapshot.toTerm.name}</p><p className="whitespace-pre-wrap">{h.snapshot.handoverItems.map((i) => i.description).join("\n")}</p></>}
    </div>)}</details>}
  </section>;
}
