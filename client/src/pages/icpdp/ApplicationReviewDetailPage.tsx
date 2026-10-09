import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppCard } from "@/components/ui/card/AppCard";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useApplicationReview, useApplicationReviewAction,
  useReviewDocumentAccess } from "@/hooks/useApplicationReviews";
import type { ReviewOutcome } from "@/services/applicationReviews";
import { cn } from "@/utils/cn";

const sectionKeys = ["club-information", "founders", "documents", "role-structure", "other"];

export function ApplicationReviewDetailPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const isOfficer = Boolean(auth.data?.systemRoles.includes("ICPDP_OFFICER"));
  const review = useApplicationReview(id, isOfficer);
  const action = useApplicationReviewAction();
  const documentAccess = useReviewDocumentAccess();
  const [outcome, setOutcome] = useState<ReviewOutcome>("Request revision");
  const [reason, setReason] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [deadline, setDeadline] = useState("");
  const [sections, setSections] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const currentVersion = useMemo(() => review.data?.versions.find((version) =>
    version.versionNo === review.data?.application.currentVersionNo) ?? review.data?.versions.at(-1),
  [review.data]);

  function date(value: string) {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" })
      .format(new Date(value));
  }

  function sectionLabel(section: string) {
    const labels: Record<string, string> = {
      "club-information": t("reviews.sectionClub"), founders: t("reviews.sectionFounders"),
      documents: t("reviews.sectionDocuments"), "role-structure": t("reviews.sectionRoles"),
      other: t("reviews.sectionOther"),
    };
    return labels[section];
  }

  function toggleSection(section: string) {
    setSections((current) => current.includes(section)
      ? current.filter((item) => item !== section) : [...current, section]);
  }

  async function claim() {
    if (!auth.data || !id) return;
    try { await action.mutateAsync({ kind: "claim", id, csrfToken: auth.data.csrfToken }); }
    catch { /* Mutation state is rendered below. */ }
  }

  async function decide() {
    if (!auth.data || !id) return;
    // Same rules the server enforces, checked before asking for confirmation.
    const missing = outcome !== "Approve" && !reason.trim() ? t("reviews.reasonRequired")
      : outcome === "Request revision" && !sections.length ? t("reviews.sectionsRequired")
        : outcome === "Request revision" && (!deadline || new Date(deadline) <= new Date())
          ? t("reviews.deadlineRequired") : null;
    setFormError(missing);
    if (missing) return;
    const prompt = outcome === "Approve" ? t("reviews.confirmApprove")
      : outcome === "Reject" ? t("reviews.confirmReject") : t("reviews.confirmRevision");
    if (!window.confirm(prompt)) return;
    try {
      await action.mutateAsync({ kind: "decide", id, csrfToken: auth.data.csrfToken,
        input: { outcome, reason: reason || undefined, reviewNote: reviewNote || undefined,
          sections: outcome === "Request revision" ? sections : [],
          revisionDeadlineAt: outcome === "Request revision" && deadline
            ? new Date(deadline).toISOString() : undefined } });
    } catch { /* Mutation state is rendered below. */ }
  }

  async function openDocument(documentId: string) {
    if (!id) return;
    try {
      const result = await documentAccess.mutateAsync({ id, documentId });
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch {
      // Mutation error is rendered next to the document list.
    }
  }

  // A disabled query stays pending forever, so only wait for a review the user may load.
  if (auth.isPending || (isOfficer && review.isPending)) return <AppSkeleton className="mx-auto h-[32rem] max-w-6xl" />;
  if (!auth.data) return <AppCard className="mx-auto max-w-3xl">
    <p>{t("reviews.signIn")}</p>
    <Link className="mt-3 inline-block font-semibold text-accent-app"
      to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>
      {t("reviews.signInLink")}</Link>
  </AppCard>;
  if (!isOfficer) return <AppCard><p role="alert" className="text-danger-app">{t("reviews.unauthorized")}</p></AppCard>;
  if (review.isError || !review.data || !currentVersion) return (
    <AppCard className="mx-auto max-w-3xl space-y-4">
      <p role="alert" className="text-danger-app">{review.error?.message ?? t("reviews.loadError")}</p>
      <AppButton variant="secondary" onClick={() => void review.refetch()}>{t("reviews.retry")}</AppButton>
    </AppCard>
  );

  const { application, task, decisions } = review.data;
  const mine = task.assigneeId === auth.data.user.id;
  const isOpen = task.state === "Open" && ["Submitted", "Under Review"].includes(application.state);

  return (
    <div className="mx-auto max-w-7xl">
      <Link to="/workspace/reviews" className="text-sm font-semibold text-accent-app">{t("reviews.detailBack")}</Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4 border-b border-border-app pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-app">{t("reviews.application")}</p>
          <h1 className="mt-2 text-3xl font-bold font-heading">{currentVersion.snapshot.clubName}</h1>
          <p className="mt-2 text-muted-app">{currentVersion.snapshot.field} · {t("reviews.version", { number: currentVersion.versionNo })}</p>
        </div>
        <span className="rounded-full border border-border-app bg-surface-app px-4 py-2 text-sm font-semibold">
          {t("reviews.status")}: {t(`applications.status${application.state.replaceAll(" ", "")}`, { defaultValue: application.state })}
        </span>
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="space-y-6">
          <AppCard className="p-6">
            <h2 className="text-xl font-bold font-heading">{t("reviews.overview")}</h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-app">{t("reviews.clubName")}</dt><dd className="mt-1 font-medium">{currentVersion.snapshot.clubName}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-app">{t("reviews.field")}</dt><dd className="mt-1 font-medium">{currentVersion.snapshot.field}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-app">{t("reviews.objectives")}</dt><dd className="mt-2 whitespace-pre-wrap leading-7">{currentVersion.snapshot.objectives}</dd></div>
            </dl>
          </AppCard>

          <div className="grid gap-6 md:grid-cols-2">
            <AppCard className="p-6"><h2 className="font-bold font-heading">{t("reviews.founders")}</h2>
              <ul className="mt-4 space-y-2">{currentVersion.snapshot.foundingUserIds.map((founder) => {
                const profile = review.data.founders.find((item) => item.id === founder);
                return <li key={founder} className="rounded-md bg-surface-app px-3 py-2 text-sm">
                  {profile ? <><span className="font-semibold">{profile.displayName}</span>
                    <span className="block break-all text-xs text-muted-app">{profile.email}</span></>
                    : <span className="break-all font-mono text-xs">{founder}</span>}
                </li>;
              })}</ul>
            </AppCard>
            <AppCard className="p-6"><h2 className="font-bold font-heading">{t("reviews.documents")}</h2>
              {currentVersion.snapshot.documents.length ? <ul className="mt-4 space-y-3">{currentVersion.snapshot.documents.map((document) =>
                <li key={document.id} className="flex items-start justify-between gap-3"><div><p className="break-words font-medium">{document.fileName}</p><p className="text-xs text-muted-app">{document.documentType} · {Math.ceil(document.bytes / 1024)} KB</p></div><AppButton variant="secondary" disabled={documentAccess.isPending} onClick={() => void openDocument(document.id)}>{t("reviews.openDocument")}</AppButton></li>)}</ul>
                : <p className="mt-4 text-sm text-muted-app">{t("reviews.noDocuments")}</p>}
              {documentAccess.isError && <p role="alert" className="mt-3 text-sm text-danger-app">{t("reviews.documentError")}</p>}
            </AppCard>
          </div>

          <AppCard className="p-6"><h2 className="text-xl font-bold font-heading">{t("reviews.roles")}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">{currentVersion.snapshot.proposedRoles.map((role) =>
              <section key={role.code} className="rounded-lg border border-border-app p-4">
                <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{role.name}</h3><p className="mt-1 font-mono text-xs text-muted-app">{role.code}</p></div>
                  {role.isBoardSeat && <span className="rounded-full bg-accent-app/10 px-2 py-1 text-xs font-semibold text-accent-app">{t("reviews.boardSeat")}</span>}</div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-app">{t("reviews.permissions")}</p>
                <p className="mt-1 break-words text-sm">{role.isLeaderRole ? t("reviews.leaderAllPermissions")
                  : role.permissionCodes.map((code) => t(`applications.perm_${code.replaceAll(".", "_")}`,
                    { defaultValue: code })).join(", ") || t("reviews.noPermissions")}</p>
              </section>)}</div>
          </AppCard>

          <AppCard className="p-6"><h2 className="text-xl font-bold font-heading">{t("reviews.history")}</h2>
            <ol className="mt-5 space-y-4 border-l border-border-app pl-5">{review.data.versions.map((version) =>
              <li key={version.id}><p className="font-semibold">{t("reviews.version", { number: version.versionNo })}</p><p className="text-sm text-muted-app">{date(version.submittedAt)}</p></li>)}</ol>
          </AppCard>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6">
          {isOpen && !mine ? (
            <AppCard className="p-6"><p className="text-sm text-muted-app">{task.assigneeId ? t("reviews.claimedByOther") : t("reviews.decisionHint")}</p>
              {!task.assigneeId && <AppButton className="mt-5 w-full" disabled={action.isPending} onClick={() => void claim()}>{action.isPending ? t("reviews.claiming") : t("reviews.claim")}</AppButton>}
            </AppCard>
          ) : isOpen ? (
            <AppCard className="p-6">
              <h2 className="text-xl font-bold font-heading">{t("reviews.decisionPanel")}</h2>
              <p className="mt-2 text-sm text-muted-app">{t("reviews.decisionHint")}</p>
              <div className="mt-5 grid grid-cols-3 gap-2">{(["Request revision", "Approve", "Reject"] as ReviewOutcome[]).map((value) =>
                <button key={value} type="button" onClick={() => setOutcome(value)} className={cn("min-h-11 rounded-md border border-border-app px-2 py-2 text-xs font-semibold transition-colors hover:border-primary-app", {
                  "border-primary-app bg-primary-app text-on-primary-app": outcome === value,
                })}>
                  {value === "Approve" ? t("reviews.approve") : value === "Reject" ? t("reviews.reject") : t("reviews.requestRevision")}
                </button>)}</div>
              {outcome === "Request revision" && <fieldset className="mt-5"><legend className="text-sm font-semibold">{t("reviews.sections")}</legend>
                <div className="mt-3 space-y-2">{sectionKeys.map((section) => <label key={section} className="flex min-h-11 items-center gap-3 rounded-md border border-border-app px-3 py-2 text-sm"><input type="checkbox" checked={sections.includes(section)} onChange={() => toggleSection(section)} className="size-4 accent-primary-app" />{sectionLabel(section)}</label>)}</div>
                <label className="mt-4 block text-sm font-semibold">{t("reviews.deadline")}<input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} className="mt-2 min-h-11 w-full rounded-md border border-border-app bg-bg-app px-3 text-text-app" /></label>
              </fieldset>}
              <label className="mt-5 block text-sm font-semibold">{t("reviews.reason")}<AppTextarea className="mt-2 min-h-28 w-full" value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t("reviews.reasonHint")} maxLength={5000} /></label>
              <label className="mt-5 block text-sm font-semibold">{t("reviews.reviewNote")}<AppTextarea className="mt-2 min-h-28 w-full" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder={t("reviews.reviewNoteHint")} maxLength={10000} /></label>
              <AppButton className="mt-6 w-full" disabled={action.isPending} onClick={() => void decide()}>{action.isPending ? t("reviews.submitting") : t("reviews.submitDecision")}</AppButton>
              {formError && <p role="alert" className="mt-3 text-sm text-danger-app">{formError}</p>}
              {action.isError && <p role="alert" className="mt-3 text-sm text-danger-app">{action.error.message || t("reviews.actionError")}</p>}
              {action.isSuccess && <p role="status" className="mt-3 text-sm text-success-app">{t("reviews.success")}</p>}
            </AppCard>
          ) : null}

          <AppCard className="p-6"><h2 className="font-bold font-heading">{t("reviews.decisions")}</h2>
            {decisions.length ? <ol className="mt-4 space-y-4">{decisions.map((decision) => <li key={decision.id} className="border-l-2 border-primary-app pl-3"><p className="font-semibold">{decision.outcome === "Approve" ? t("reviews.approve") : decision.outcome === "Reject" ? t("reviews.reject") : decision.outcome === "Request revision" ? t("reviews.requestRevision") : decision.outcome}</p><p className="mt-1 text-xs text-muted-app">{t("reviews.decidedAt", { date: date(decision.at) })}</p>{decision.reason && <p className="mt-2 text-sm">{decision.reason}</p>}</li>)}</ol>
              : <p className="mt-3 text-sm text-muted-app">{t("reviews.noDecisions")}</p>}
          </AppCard>
        </aside>
      </div>
    </div>
  );
}
