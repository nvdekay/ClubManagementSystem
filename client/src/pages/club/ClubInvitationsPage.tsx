import { useState } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useClubInvitations, useRespondToInvitation } from "@/hooks/useClubInvitations";

export function ClubInvitationsPage() {
  const { clubId = "" } = useParams();
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const allowed = Boolean(auth.data?.workspaces.some((w) => w.kind === "club" && w.clubId === clubId && w.permissions.includes("club.event.manage")));
  const list = useClubInvitations(clubId, allowed);
  const action = useRespondToInvitation(clubId);
  const [drafts, setDrafts] = useState<Record<string, { note: string; representative: string; members: string }>>({});
  function edit(id: string, field: "note" | "representative" | "members", value: string) {
    setDrafts((current) => ({ ...current, [id]: { ...(current[id] ?? { note: "", representative: "", members: "" }), [field]: value } }));
  }
  async function respond(id: string, outcome: "Accepted" | "Declined") {
    if (!auth.data || action.isPending) return;
    const draft = drafts[id];
    try {
      await action.mutateAsync({ id, csrfToken: auth.data.csrfToken, input: { outcome, responseNote: draft?.note,
        ...(outcome === "Accepted" ? { responseDetails: { representative: draft?.representative ?? "",
          members: Number(draft?.members || 0) } } : {}) } });
    } catch { /* The mutation error is displayed below. */ }
  }
  if (auth.isPending) return <AppSkeleton className="h-64 w-full" />;
  if (!allowed) return <AppNotice tone="danger">{t("clubInvitations.denied")}</AppNotice>;
  return <>
    <PageHeader title={t("clubInvitations.title")} description={t("clubInvitations.description")} />
    {list.isPending && <AppSkeleton className="h-64 w-full" />}
    {list.isError && <AppNotice tone="danger" role="alert">{list.error.message}
      <AppButton onClick={() => void list.refetch()}>{t("clubInvitations.retry")}</AppButton></AppNotice>}
    {action.isError && <AppNotice tone="danger" role="alert">{action.error.message}</AppNotice>}
    {action.isSuccess && <AppNotice tone="success" role="status">{t("clubInvitations.success")}</AppNotice>}
    {list.data?.length === 0 && <AppNotice>{t("clubInvitations.empty")}</AppNotice>}
    <div className="space-y-6">{list.data?.map((invitation) => {
      const editable = invitation.status === "Pending" && new Date(invitation.deadline) > new Date()
        && ["Approved", "Upcoming"].includes(invitation.event.state) && new Date(invitation.event.startAt) > new Date();
      const draft = drafts[invitation.id];
      return <section key={invitation.id} className="space-y-3 rounded-2xl border border-border-app bg-surface-app p-5">
        <div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-bold">{invitation.event.title}</h2>
          <span>{t(`clubInvitations.${invitation.status}`)}</span></div>
        <p>{new Date(invitation.event.startAt).toLocaleString(i18n.language)} · {invitation.event.venue}</p>
        <p className="whitespace-pre-wrap break-words">{invitation.event.objective}</p>
        <p className="whitespace-pre-wrap break-words">{invitation.event.coordination}</p>
        <p>{t("clubInvitations.deadline")}: {new Date(invitation.deadline).toLocaleString(i18n.language)}</p>
        {invitation.responseNote && <p className="whitespace-pre-wrap break-words">{invitation.responseNote}</p>}
        {editable && <div className="space-y-3">
          <label className="block">{t("clubInvitations.representative")}<input maxLength={2000}
            className="block w-full rounded-lg border border-border-app bg-bg-app p-3" value={draft?.representative ?? ""}
            onChange={(e) => edit(invitation.id, "representative", e.target.value)} /></label>
          <label className="block">{t("clubInvitations.members")}<input type="number" min="0" step="1"
            className="block w-full rounded-lg border border-border-app bg-bg-app p-3" value={draft?.members ?? ""}
            onChange={(e) => edit(invitation.id, "members", e.target.value)} /></label>
          <label className="block">{t("clubInvitations.note")}<textarea maxLength={5000}
            className="block w-full rounded-lg border border-border-app bg-bg-app p-3" value={draft?.note ?? ""}
            onChange={(e) => edit(invitation.id, "note", e.target.value)} /></label>
          <div className="flex flex-wrap gap-3"><AppButton disabled={action.isPending} onClick={() => void respond(invitation.id, "Accepted")}>{t("clubInvitations.accept")}</AppButton>
            <AppButton variant="secondary" disabled={action.isPending || !draft?.note.trim()} onClick={() => void respond(invitation.id, "Declined")}>{t("clubInvitations.decline")}</AppButton></div>
        </div>}
      </section>;
    })}</div>
  </>;
}
