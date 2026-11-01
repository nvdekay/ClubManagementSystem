import { useState } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppFieldError } from "@/components/ui/field/AppFieldError";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useClubInvitations, useRespondToInvitation } from "@/hooks/useClubInvitations";
import { useFieldValidation } from "@/hooks/useFieldValidation";

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
  // One response form per invitation. The note is only required to decline, so it is checked on that click.
  const errors: Record<string, string | null> = Object.fromEntries((list.data ?? []).flatMap(({ id }) => {
    const members = drafts[id]?.members ?? "";
    return [["note:" + id, drafts[id]?.note.trim() ? null : t("clubInvitations.declineReasonRequired")],
      ["members:" + id, !members || (Number.isInteger(Number(members)) && Number(members) >= 0) ? null
        : Number(members) < 0 ? t("common.numberMin", { min: 0 }) : t("common.invalidNumber")]];
  }));
  const field = useFieldValidation(errors);
  async function respond(id: string, outcome: "Accepted" | "Declined") {
    if (!auth.data || action.isPending) return;
    const key = (outcome === "Accepted" ? "members:" : "note:") + id;
    field.touch(key);
    if (errors[key]) return;
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
            className="block w-full rounded-lg border border-border-app bg-bg-app p-3 aria-[invalid=true]:border-danger-app" value={draft?.members ?? ""}
            {...field.control("members:" + invitation.id, false)} onChange={(e) => edit(invitation.id, "members", e.target.value)} />
            <AppFieldError message={field.error("members:" + invitation.id)} /></label>
          <label className="block">{t("clubInvitations.note")}<textarea maxLength={5000}
            className="block w-full rounded-lg border border-border-app bg-bg-app p-3 aria-[invalid=true]:border-danger-app" value={draft?.note ?? ""}
            aria-invalid={field.error("note:" + invitation.id) ? true : undefined} onChange={(e) => edit(invitation.id, "note", e.target.value)} />
            <AppFieldError message={field.error("note:" + invitation.id)} /></label>
          <div className="flex flex-wrap gap-3"><AppButton disabled={action.isPending} onClick={() => void respond(invitation.id, "Accepted")}>{t("clubInvitations.accept")}</AppButton>
            <AppButton variant="secondary" disabled={action.isPending} onClick={() => void respond(invitation.id, "Declined")}>{t("clubInvitations.decline")}</AppButton></div>
        </div>}
      </section>;
    })}</div>
  </>;
}
