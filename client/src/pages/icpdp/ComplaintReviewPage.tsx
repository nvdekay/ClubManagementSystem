import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ComplaintCard, complaintStateKey } from "@/components/custom/ComplaintCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { appToast } from "@/components/ui/toast/AppToast";
import { useAuth } from "@/hooks/useAuth";
import { useComplaintQueue, useDecideComplaint } from "@/hooks/useComplaints";
import type { ComplaintDecisionInput, ComplaintForIcpdp, ComplaintState, Severity, TriageOutcome, Validity } from "@/services/complaints";

const STATES: ComplaintState[] = ["Submitted", "Under Triage", "Forwarded", "Club Responded", "Dismissed", "Escalated", "Closed", "Withdrawn"];
const OUTCOMES: TriageOutcome[] = ["Dismissed", "Forwarded", "Escalated"];
const SEVERITIES: Severity[] = ["MINOR", "MODERATE", "SERIOUS"];
const VALIDITIES: Validity[] = ["VALID", "PARTLY_VALID", "UNFOUNDED"];

function outcomeKey(value: TriageOutcome) {
  switch (value) {
    case "Dismissed": return "complaints.outcome_Dismissed" as const;
    case "Forwarded": return "complaints.outcome_Forwarded" as const;
    case "Escalated": return "complaints.outcome_Escalated" as const;
  }
}
function severityKey(value: Severity) {
  switch (value) {
    case "MINOR": return "complaints.severity_MINOR" as const;
    case "MODERATE": return "complaints.severity_MODERATE" as const;
    case "SERIOUS": return "complaints.severity_SERIOUS" as const;
  }
}
function validityKey(value: Validity) {
  switch (value) {
    case "VALID": return "complaints.validity_VALID" as const;
    case "PARTLY_VALID": return "complaints.validity_PARTLY_VALID" as const;
    case "UNFOUNDED": return "complaints.validity_UNFOUNDED" as const;
  }
}

/** UC51: ICPDP triage queue — open, decide (dismiss / forward / escalate), then close or escalate after the club answered. */
export function ComplaintReviewPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const [state, setState] = useState<ComplaintState | "">("");
  const queue = useComplaintQueue(state, Boolean(auth.data));
  return (
    <>
      <PageHeader title={t("complaints.queueTitle")} description={t("complaints.queueDescription")} />
      <div className="mb-4 max-w-xs">
        <div className="min-w-0 text-sm font-semibold">{t("complaints.filterState")}<AppSelect label={t("complaints.filterState")} value={state} className="mt-1 w-full font-normal" onChange={(value) => setState(value as ComplaintState | "")}
          options={[{ value: "", label: t("complaints.filterAll") }, ...STATES.map((value) => ({ value, label: t(complaintStateKey(value)) }))]} /></div>
      </div>
      {queue.isPending ? <AppSkeleton className="h-48 w-full" />
        : queue.isError ? <AppNotice tone="danger" role="alert" title={t("complaints.loadError")}>
          <p>{queue.error.message}</p>
          <AppButton variant="secondary" onClick={() => void queue.refetch()}>{t("complaints.retry")}</AppButton></AppNotice>
          : queue.data.length === 0 ? <p className="py-10 text-center text-muted-app">{t("complaints.queueEmpty")}</p>
            : <ul className="space-y-3">{queue.data.map((item) => <li key={item.id}><ReviewItem item={item} /></li>)}</ul>}
    </>
  );
}

function ReviewItem({ item }: { item: ComplaintForIcpdp }) {
  const { t } = useTranslation();
  const auth = useAuth();
  const decide = useDecideComplaint();
  const dissolved = item.clubState === "Dissolved";
  const [outcome, setOutcome] = useState<TriageOutcome>(dissolved ? "Dismissed" : "Forwarded");
  const [severity, setSeverity] = useState<Severity>("MINOR");
  const [validity, setValidity] = useState<Validity>("VALID");
  const [reason, setReason] = useState("");
  const [due, setDue] = useState("");

  async function run(decision: ComplaintDecisionInput) {
    if (!auth.data) return;
    try {
      await decide.mutateAsync({ id: item.id, decision, csrfToken: auth.data.csrfToken });
      setReason("");
      appToast.success(t("complaints.saved"));
    } catch (error) {
      appToast.danger(error instanceof Error ? error.message : t("complaints.error"));
    }
  }

  const reasonField = <label className="block text-sm font-semibold">{t("complaints.reason")}<AppRequiredMark />
    <AppTextarea className="mt-1 block w-full font-normal" rows={2} maxLength={2000} value={reason}
      onChange={(event) => setReason(event.target.value)} />
    <span className="block text-xs font-normal text-muted-app">{t("complaints.reasonHint")}</span></label>;

  const severityField = <div className="min-w-0 text-sm font-semibold">{t("complaints.severity")}<AppSelect label={t("complaints.severity")} value={severity} className="mt-1 w-full font-normal"
    onChange={(value) => setSeverity(value as Severity)} options={SEVERITIES.map((value) => ({ value, label: t(severityKey(value)) }))} /></div>;

  return (
    <ComplaintCard title={`${item.clubName ?? ""} · ${t("complaints.from", { name: item.complainant.displayName })}`}
      state={item.state} type={item.type} description={item.description} evidence={item.evidence} eventTitle={item.eventTitle}
      at={item.submittedAt} responseDueAt={item.responseDueAt} clubResponse={item.clubResponse} closureReason={item.closure?.reason}
      note={item.triage ? { label: t("complaints.decisionReason"), text: item.triage.reason } : undefined}
      extra={<p className="mt-1 flex flex-wrap gap-2 text-xs text-muted-app">
        <span className="break-all">{item.complainant.email}</span>
        {item.linkedComplaintIds.length > 0 && <AppBadge tone="info">{t("complaints.linkedCount", { count: item.linkedComplaintIds.length })}</AppBadge>}
        {item.linkedComplaintId && <AppBadge>{t("complaints.linked")}</AppBadge>}
        {item.violationId && <AppBadge tone="danger">{t("complaints.violationLink")}</AppBadge>}
      </p>}
      actions={item.state === "Submitted" ? <AppButton disabled={decide.isPending} onClick={() => void run({ kind: "open" })}>
        {t("complaints.open")}</AppButton>
        : item.state === "Under Triage" ? <form className="w-full space-y-3" onSubmit={(event) => { event.preventDefault();
          void run({ kind: "triage", outcome, severity, validity, reason,
            ...(outcome === "Forwarded" && due ? { responseDueAt: new Date(`${due}T23:59:59+07:00`).toISOString() } : {}) }); }}>
          {dissolved && <AppNotice tone="warning">{t("complaints.dissolvedHint")}</AppNotice>}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="min-w-0 text-sm font-semibold">{t("complaints.outcome")}<AppSelect label={t("complaints.outcome")} value={outcome} className="mt-1 w-full font-normal" disabled={dissolved}
              onChange={(value) => setOutcome(value as TriageOutcome)} options={OUTCOMES.map((value) => ({ value, label: t(outcomeKey(value)) }))} /></div>
            {severityField}
            <div className="min-w-0 text-sm font-semibold">{t("complaints.validity")}<AppSelect label={t("complaints.validity")} value={validity} className="mt-1 w-full font-normal"
              onChange={(value) => setValidity(value as Validity)} options={VALIDITIES.map((value) => ({ value, label: t(validityKey(value)) }))} /></div>
          </div>
          {outcome === "Forwarded" && <label className="block text-sm font-semibold">{t("complaints.responseDue")}
            <AppInput type="date" className="mt-1 block font-normal" value={due} onChange={(event) => setDue(event.target.value)} /></label>}
          {reasonField}
          <AppButton type="submit" disabled={decide.isPending || !reason.trim()}>{t("complaints.triage")}</AppButton>
        </form>
          : item.state === "Club Responded" ? <div className="w-full space-y-3">
            <p className="text-sm font-semibold">{t("complaints.closeTitle")}</p>
            <div className="max-w-xs">{severityField}</div>
            {reasonField}
            <div className="flex flex-wrap gap-2">
              <AppButton disabled={decide.isPending || !reason.trim()} onClick={() => void run({ kind: "close", reason })}>{t("complaints.close")}</AppButton>
              <AppButton variant="secondary" disabled={decide.isPending || !reason.trim() || dissolved}
                onClick={() => void run({ kind: "escalate", severity, reason })}>{t("complaints.escalate")}</AppButton>
            </div>
          </div> : undefined} />
  );
}
