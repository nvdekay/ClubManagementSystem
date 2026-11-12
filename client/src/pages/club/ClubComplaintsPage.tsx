import { useState } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { ComplaintCard } from "@/components/custom/ComplaintCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { appToast } from "@/components/ui/toast/AppToast";
import { useAuth } from "@/hooks/useAuth";
import { useClubComplaints, useRespondToComplaint } from "@/hooks/useComplaints";
import type { ComplaintEvidence, ComplaintForClub } from "@/services/complaints";

/** UC52: complaints ICPDP forwarded to this club (never with the complainant, D5), answered once each. */
export function ClubComplaintsPage() {
  const { clubId = "" } = useParams();
  const { t } = useTranslation();
  const auth = useAuth();
  const allowed = Boolean(auth.data?.workspaces.some((item) => item.clubId === clubId
    && item.permissions.includes("club.complaint.respond")));
  const inbox = useClubComplaints(clubId, allowed);
  if (auth.isPending) return <AppSkeleton className="h-48 w-full" />;
  return (
    <>
      <PageHeader title={t("complaints.clubTitle")} description={t("complaints.clubDescription")} />
      {!allowed ? <AppNotice tone="danger" role="alert">{t("complaints.forbidden")}</AppNotice>
        : inbox.isPending ? <AppSkeleton className="h-48 w-full" />
          : inbox.isError ? <AppNotice tone="danger" role="alert" title={t("complaints.loadError")}>
            <p>{inbox.error.message}</p>
            <AppButton variant="secondary" onClick={() => void inbox.refetch()}>{t("complaints.retry")}</AppButton></AppNotice>
            : inbox.data.length === 0 ? <AppEmptyState variant="boxed" message={t("complaints.clubEmpty")} />
              : <ul className="space-y-3">{inbox.data.map((item) => <li key={item.id}><ClubComplaint clubId={clubId} item={item} /></li>)}</ul>}
    </>
  );
}

function ClubComplaint({ clubId, item }: { clubId: string; item: ComplaintForClub }) {
  const { t } = useTranslation();
  const auth = useAuth();
  const respond = useRespondToComplaint();
  const [text, setText] = useState("");
  const [action, setAction] = useState("");
  const [evidence, setEvidence] = useState<ComplaintEvidence[]>([]);

  async function send() {
    if (!auth.data || !text.trim() || !action.trim()) return;
    try {
      await respond.mutateAsync({ clubId, id: item.id, response: { text, action, evidence: evidence.filter((item) => item.url.trim()) }, csrfToken: auth.data.csrfToken });
      appToast.success(t("complaints.answered"));
    } catch (error) {
      appToast.danger(error instanceof Error ? error.message : t("complaints.error"));
    }
  }

  return (
    <ComplaintCard title={item.eventTitle ?? ""} state={item.state} type={item.type} description={item.description}
      evidence={item.evidence} at={item.forwardedAt} responseDueAt={item.responseDueAt} clubResponse={item.clubResponse}
      note={{ label: t("complaints.forwardNote"), text: item.forwardNote }}
      actions={item.state === "Forwarded" ? <form className="w-full space-y-3" onSubmit={(event) => { event.preventDefault(); void send(); }}>
        <label className="block text-sm font-medium text-text-app">{t("complaints.answerText")}<AppRequiredMark />
          <AppTextarea className="mt-1.5 block w-full font-normal" rows={3} maxLength={4000} value={text}
            onChange={(event) => setText(event.target.value)} /></label>
        <label className="block text-sm font-medium text-text-app">{t("complaints.answerAction")}<AppRequiredMark />
          <AppTextarea className="mt-1.5 block w-full font-normal" rows={2} maxLength={2000} value={action}
            onChange={(event) => setAction(event.target.value)} /></label>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">{t("complaints.evidenceLabel")}</legend>
          <p className="text-xs text-muted-app">{t("complaints.evidenceHint")}</p>
          {evidence.map((item, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <AppInput className="min-w-0 flex-1 basis-40" aria-label={t("complaints.evidenceName")} placeholder={t("complaints.evidenceName")}
                value={item.label} maxLength={120}
                onChange={(event) => setEvidence((list) => list.map((row, at) => at === index ? { ...row, label: event.target.value } : row))} />
              <AppInput className="min-w-0 flex-[2] basis-56" type="url" aria-label={t("complaints.evidenceUrl")}
                placeholder={t("complaints.evidenceUrl")} value={item.url} maxLength={500}
                onChange={(event) => setEvidence((list) => list.map((row, at) => at === index ? { ...row, url: event.target.value } : row))} />
              <AppButton type="button" variant="secondary" onClick={() => setEvidence((list) => list.filter((_row, at) => at !== index))}>
                {t("complaints.removeEvidence")}</AppButton>
            </div>
          ))}
          {evidence.length < 5 && <AppButton type="button" variant="secondary"
            onClick={() => setEvidence((list) => [...list, { label: "", url: "" }])}>{t("complaints.addEvidence")}</AppButton>}
        </fieldset>
        <AppButton type="submit" disabled={respond.isPending || !text.trim() || !action.trim()}>{t("complaints.answerSubmit")}</AppButton>
      </form> : undefined} />
  );
}
