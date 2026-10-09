import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
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

  const back = { to: "/workspace/reviews", label: t("reviews.detailBack") };
  const label = "text-xs font-semibold tracking-wide text-muted-app uppercase";

  // A disabled query stays pending forever, so only wait for a review the user may load.
  if (auth.isPending || (isOfficer && review.isPending)) return <div className="space-y-4">
    <AppSkeleton className="h-10 w-1/2" /><AppSkeleton className="h-[28rem] w-full" />
  </div>;
  if (!auth.data) return <AppNotice>
    <p>{t("reviews.signIn")}</p>
    <Link className="inline-block font-semibold text-accent-app"
      to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>
      {t("reviews.signInLink")}</Link>
  </AppNotice>;
  if (!isOfficer) return <AppNotice tone="danger" role="alert">{t("reviews.unauthorized")}</AppNotice>;
  if (review.isError || !review.data || !currentVersion) return (
    <>
      <PageHeader title={t("reviews.application")} back={back} />
      <AppNotice tone="danger" role="alert" title={review.error?.message ?? t("reviews.loadError")}>
        <AppButton variant="secondary" onClick={() => void review.refetch()}>{t("reviews.retry")}</AppButton>
      </AppNotice>
    </>
  );

  const { application, task, decisions } = review.data;
  const mine = task.assigneeId === auth.data.user.id;
  const isOpen = task.state === "Open" && ["Submitted", "Under Review"].includes(application.state);
  const stateTone = application.state === "Approved" ? "success"
    : application.state === "Rejected" ? "danger"
      : application.state === "Revision Requested" ? "warning" : "info";

  return (
    <>
      <PageHeader title={currentVersion.snapshot.clubName} back={back}
        description={`${currentVersion.snapshot.field} · ${t("reviews.version", { number: currentVersion.versionNo })}`}
        actions={<AppBadge tone={stateTone}>
          {t("reviews.status")}: {t(`applications.status${application.state.replaceAll(" ", "")}`, { defaultValue: application.state })}
        </AppBadge>} />

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-10">
          <section>
            <h2 className="font-heading text-xl font-bold">{t("reviews.overview")}</h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <div><dt className={label}>{t("reviews.clubName")}</dt><dd className="mt-1 font-medium break-words">{currentVersion.snapshot.clubName}</dd></div>
              <div><dt className={label}>{t("reviews.field")}</dt><dd className="mt-1 font-medium break-words">{currentVersion.snapshot.field}</dd></div>
              <div className="sm:col-span-2"><dt className={label}>{t("reviews.objectives")}</dt><dd className="mt-2 leading-7 break-words whitespace-pre-wrap">{currentVersion.snapshot.objectives}</dd></div>
            </dl>
          </section>

          <div className="grid gap-10 border-t border-border-app pt-8 md:grid-cols-2">
            <section className="min-w-0"><h2 className="font-heading text-lg font-bold">{t("reviews.founders")}</h2>
              <ul className="mt-4 divide-y divide-border-app">{currentVersion.snapshot.foundingUserIds.map((founder) => {
                const profile = review.data.founders.find((item) => item.id === founder);
                return <li key={founder} className="flex items-center gap-3 py-2.5 text-sm">
                  <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mint-soft-app text-mint-app"><AppIcon name="users" className="size-4" /></span>
                  <span className="min-w-0">
                    {profile ? <><span className="block font-semibold">{profile.displayName}</span>
                      <span className="block text-xs break-all text-muted-app">{profile.email}</span></>
                      : <span className="font-mono text-xs break-all">{founder}</span>}
                  </span>
                </li>;
              })}</ul>
            </section>
            <section className="min-w-0"><h2 className="font-heading text-lg font-bold">{t("reviews.documents")}</h2>
              {currentVersion.snapshot.documents.length ? <ul className="mt-4 divide-y divide-border-app">{currentVersion.snapshot.documents.map((document) =>
                <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft-app text-primary-app"><AppIcon name="file" className="size-4" /></span>
                    <div className="min-w-0"><p className="font-medium break-words">{document.fileName}</p><p className="text-xs text-muted-app">{document.documentType} · {Math.ceil(document.bytes / 1024)} KB</p></div>
                  </div>
                  <AppButton variant="secondary" disabled={documentAccess.isPending} onClick={() => void openDocument(document.id)}>
                    <AppIcon name="external" className="size-4" />{t("reviews.openDocument")}</AppButton>
                </li>)}</ul>
                : <p className="mt-4 text-sm text-muted-app">{t("reviews.noDocuments")}</p>}
              {documentAccess.isError && <p role="alert" className="mt-3 text-sm text-danger-app">{t("reviews.documentError")}</p>}
            </section>
          </div>

          <section className="border-t border-border-app pt-8"><h2 className="font-heading text-xl font-bold">{t("reviews.roles")}</h2>
            <ul className="mt-4 divide-y divide-border-app">{currentVersion.snapshot.proposedRoles.map((role) =>
              <li key={role.code} className="py-4">
                <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{role.name}</h3>
                  <span className="font-mono text-xs text-muted-app">{role.code}</span>
                  {role.isBoardSeat && <AppBadge tone="info">{t("reviews.boardSeat")}</AppBadge>}</div>
                <p className="mt-2 text-sm break-words"><span className="text-muted-app">{t("reviews.permissions")}: </span>
                  {role.isLeaderRole ? t("reviews.leaderAllPermissions")
                    : role.permissionCodes.map((code) => t(`applications.perm_${code.replaceAll(".", "_")}`,
                      { defaultValue: code })).join(", ") || t("reviews.noPermissions")}</p>
              </li>)}</ul>
          </section>

          <section className="border-t border-border-app pt-8"><h2 className="font-heading text-xl font-bold">{t("reviews.history")}</h2>
            <ol className="mt-5 space-y-4 border-l-2 border-border-app pl-5">{review.data.versions.map((version) =>
              <li key={version.id} className="relative"><span aria-hidden="true" className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-primary-app" />
                <p className="font-semibold">{t("reviews.version", { number: version.versionNo })}</p><p className="text-sm text-muted-app">{date(version.submittedAt)}</p></li>)}</ol>
          </section>
        </div>

        <aside className="min-w-0 space-y-6 lg:sticky lg:top-6">
          {isOpen && !mine ? (
            <div className="rounded-2xl bg-surface-app p-5"><p className="text-sm text-muted-app">{task.assigneeId ? t("reviews.claimedByOther") : t("reviews.decisionHint")}</p>
              {!task.assigneeId && <AppButton className="mt-5 w-full" disabled={action.isPending} onClick={() => void claim()}>{action.isPending ? t("reviews.claiming") : t("reviews.claim")}</AppButton>}
            </div>
          ) : isOpen ? (
            <section className="rounded-2xl bg-surface-app p-5">
              <h2 className="font-heading text-lg font-bold">{t("reviews.decisionPanel")}</h2>
              <p className="mt-1 text-sm text-muted-app">{t("reviews.decisionHint")}</p>
              <div className="mt-5 grid grid-cols-3 gap-1 rounded-full bg-surface-strong-app p-1">{(["Request revision", "Approve", "Reject"] as ReviewOutcome[]).map((value) =>
                <button key={value} type="button" onClick={() => setOutcome(value)} className={cn("min-h-11 rounded-full px-2 py-2 text-xs font-semibold text-muted-app transition-colors hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app", {
                  "bg-bg-app text-primary-app shadow-sm hover:text-primary-app": outcome === value,
                })}>
                  {value === "Approve" ? t("reviews.approve") : value === "Reject" ? t("reviews.reject") : t("reviews.requestRevision")}
                </button>)}</div>
              {outcome === "Request revision" && <fieldset className="mt-5"><legend className="text-sm font-semibold">{t("reviews.sections")}</legend>
                <div className="mt-3 space-y-1">{sectionKeys.map((section) => <label key={section} className="flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm hover:bg-surface-strong-app"><input type="checkbox" checked={sections.includes(section)} onChange={() => toggleSection(section)} className="size-4 accent-primary-app" />{sectionLabel(section)}</label>)}</div>
                <label className="mt-4 block text-sm font-semibold">{t("reviews.deadline")}<input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-border-app bg-bg-app px-3.5 text-text-app focus-visible:border-ring-app focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:outline-none" /></label>
              </fieldset>}
              <label className="mt-5 block text-sm font-semibold">{t("reviews.reason")}<AppTextarea className="mt-2 min-h-28 w-full font-normal" value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t("reviews.reasonHint")} maxLength={5000} /></label>
              <label className="mt-5 block text-sm font-semibold">{t("reviews.reviewNote")}<AppTextarea className="mt-2 min-h-28 w-full font-normal" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder={t("reviews.reviewNoteHint")} maxLength={10000} /></label>
              <AppButton className="mt-6 w-full" disabled={action.isPending} onClick={() => void decide()}>{action.isPending ? t("reviews.submitting") : t("reviews.submitDecision")}</AppButton>
              {formError && <p role="alert" className="mt-3 text-sm text-danger-app">{formError}</p>}
              {action.isError && <p role="alert" className="mt-3 text-sm text-danger-app">{action.error.message || t("reviews.actionError")}</p>}
              {action.isSuccess && <p role="status" className="mt-3 text-sm text-success-app">{t("reviews.success")}</p>}
            </section>
          ) : null}

          <section><h2 className="font-heading text-lg font-bold">{t("reviews.decisions")}</h2>
            {decisions.length ? <ol className="mt-4 space-y-4">{decisions.map((decision) => <li key={decision.id} className="border-l-2 border-primary-app pl-3"><p className="font-semibold">{decision.outcome === "Approve" ? t("reviews.approve") : decision.outcome === "Reject" ? t("reviews.reject") : decision.outcome === "Request revision" ? t("reviews.requestRevision") : decision.outcome}</p><p className="mt-1 text-xs text-muted-app">{t("reviews.decidedAt", { date: date(decision.at) })}</p>{decision.reason && <p className="mt-2 text-sm break-words">{decision.reason}</p>}</li>)}</ol>
              : <p className="mt-3 text-sm text-muted-app">{t("reviews.noDecisions")}</p>}
          </section>
        </aside>
      </div>
    </>
  );
}
