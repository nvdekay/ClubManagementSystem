import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { RevisionChanges } from "@/components/custom/RevisionChanges";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppFieldError } from "@/components/ui/field/AppFieldError";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useApplicationReview, useApplicationReviewAction,
  useReviewDocumentAccess } from "@/hooks/useApplicationReviews";
import type { ReviewOutcome } from "@/services/applicationReviews";
import type { ApplicationVersion } from "@/services/applications";
import { cn } from "@/utils/cn";
import { diffFields, type DiffField } from "@/utils/revisionDiff";
import { useConfirm } from "@/hooks/useConfirm";
import { useFieldValidation } from "@/hooks/useFieldValidation";

const sectionKeys = ["club-information", "founders", "documents", "other"];
const roleOrder = { LEADER: 0, VICE_LEADER: 1, MEMBER: 2 } as const;

export function ApplicationReviewDetailPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const askConfirm = useConfirm();
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
  // Same rules the server enforces: a reason unless approving; sections and a future deadline for a revision.
  const revision = outcome === "Request revision";
  const field = useFieldValidation({
    reason: outcome !== "Approve" && !reason.trim() ? t("reviews.reasonRequired") : null,
    sections: revision && !sections.length ? t("reviews.sectionsRequired") : null,
    deadline: revision && (!deadline || new Date(deadline) <= new Date()) ? t("reviews.deadlineRequired") : null,
  });
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
    field.touch("sections");
  }

  async function claim() {
    if (!auth.data || !id) return;
    try { await action.mutateAsync({ kind: "claim", id, csrfToken: auth.data.csrfToken }); }
    catch { /* Mutation state is rendered below. */ }
  }

  async function decide() {
    if (!auth.data || !id) return;
    // Checked before asking for confirmation.
    if (!field.touchAll()) return;
    const prompt = outcome === "Approve" ? t("reviews.confirmApprove")
      : outcome === "Reject" ? t("reviews.confirmReject") : t("reviews.confirmRevision");
    if (!(await askConfirm(prompt))) return;
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
  const label = "text-xs text-muted-app";

  // A disabled query stays pending forever, so only wait for a review the user may load.
  if (auth.isPending || (isOfficer && review.isPending)) return <div className="space-y-4">
    <AppSkeleton className="h-10 w-1/2" /><AppSkeleton className="h-[28rem] w-full" />
  </div>;
  if (!auth.data) return <AppNotice>
    <p>{t("reviews.signIn")}</p>
    <Link className="inline-block font-semibold text-primary-app hover:underline"
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
  const founders = [...currentVersion.snapshot.founders].sort((left, right) => roleOrder[left.role] - roleOrder[right.role]);
  const logo = currentVersion.snapshot.documents.find((document) => document.documentType === "LOGO");
  // The version submitted before the current one, and the revision request that sent it back.
  const previous = review.data.versions.filter((version) => version.versionNo < currentVersion.versionNo)
    .sort((a, b) => b.versionNo - a.versionNo)[0];
  const revisionRequest = [...decisions].reverse().find((decision) => decision.outcome === "Request revision"
    && new Date(decision.at) <= new Date(currentVersion.submittedAt));
  const profiles = review.data.founders;
  function founderName(userId: string) {
    return profiles.find((item) => item.id === userId)?.displayName ?? userId;
  }
  function documentLabel(type: string) {
    return type === "LOGO" ? t("applications.logo") : type === "PROPOSAL" ? t("applications.proposal") : type;
  }
  const versionFields: DiffField<ApplicationVersion>[] = [
    { key: "clubName", label: t("reviews.clubName"), read: (v) => v.snapshot.clubName },
    { key: "field", label: t("reviews.field"), read: (v) => v.snapshot.field ?? "" },
    { key: "summary", label: t("reviews.summary"), read: (v) => v.snapshot.summary },
    { key: "objectives", label: t("reviews.objectives"), read: (v) => v.snapshot.objectives },
    { key: "fanpageUrl", label: t("reviews.fanpageUrl"), read: (v) => v.snapshot.fanpageUrl },
    { key: "contactEmail", label: t("reviews.contactEmail"), read: (v) => v.snapshot.contactEmail },
    { key: "founders", label: t("reviews.founders"), read: (v) => [...v.snapshot.founders]
      .sort((left, right) => roleOrder[left.role] - roleOrder[right.role])
      .map((founder) => `${founderName(founder.userId)} — ${t(`applications.role${founder.role}`)}`).join("\n") },
    { key: "documents", label: t("reviews.documents"), read: (v) => v.snapshot.documents
      .map((document) => `${documentLabel(document.documentType)}: ${document.fileName}`).join("\n") },
  ];
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

      {review.data.nameConflicts.length > 0 && <AppNotice tone="warning" role="status" className="mb-8">
        {t("reviews.nameConflict", { clubs: review.data.nameConflicts.map((club) => `${club.name} (${club.code})`).join(", ") })}
      </AppNotice>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          {previous && <RevisionChanges previousNumber={previous.versionNo} changes={diffFields(previous, currentVersion, versionFields)}
            requestedSections={revisionRequest?.sections.map(sectionLabel)} reason={revisionRequest?.reason} />}
          <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
            <h2 className="font-heading text-base font-semibold">{t("reviews.overview")}</h2>
            <dl className="mt-4 grid gap-5 sm:grid-cols-2">
              <div><dt className={label}>{t("reviews.clubName")}</dt><dd className="mt-1 font-medium break-words">{currentVersion.snapshot.clubName}</dd></div>
              <div><dt className={label}>{t("reviews.field")}</dt><dd className="mt-1 font-medium break-words">{currentVersion.snapshot.field}</dd></div>
              <div className="sm:col-span-2"><dt className={label}>{t("reviews.summary")}</dt><dd className="mt-2 leading-7 break-words whitespace-pre-wrap">{currentVersion.snapshot.summary || "—"}</dd></div>
              <div className="sm:col-span-2"><dt className={label}>{t("reviews.objectives")}</dt><dd className="mt-2 leading-7 break-words whitespace-pre-wrap">{currentVersion.snapshot.objectives || "—"}</dd></div>
              <div><dt className={label}>{t("reviews.fanpageUrl")}</dt><dd className="mt-1 break-all">{currentVersion.snapshot.fanpageUrl
                ? <a className="font-medium text-primary-app hover:underline" href={currentVersion.snapshot.fanpageUrl} target="_blank" rel="noopener noreferrer">{currentVersion.snapshot.fanpageUrl}</a> : "—"}</dd></div>
              <div><dt className={label}>{t("reviews.contactEmail")}</dt><dd className="mt-1 break-all">{currentVersion.snapshot.contactEmail || "—"}</dd></div>
              {logo?.publicUrl && <div className="sm:col-span-2"><dt className={label}>{t("reviews.logo")}</dt><dd className="mt-2">
                <img src={logo.publicUrl} alt={t("reviews.logo")} className="size-24 rounded-xl border border-border-app object-cover" /></dd></div>}
            </dl>
          </section>

          <div className="grid gap-6 2xl:grid-cols-2">
            <section className="min-w-0 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs"><h2 className="font-heading text-base font-semibold">{t("reviews.founders")}</h2>
              <ul className="mt-4 divide-y divide-border-app">{founders.map(({ userId: founder, role }) => {
                const profile = review.data.founders.find((item) => item.id === founder);
                return <li key={founder} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft-app text-primary-app"><AppIcon name="users" className="size-4" /></span>
                  <span className="min-w-0">
                    {profile ? <><span className="block font-medium">{profile.displayName}</span>
                      <span className="block text-xs break-all text-muted-app">{profile.email}</span></>
                      : <span className="font-mono text-xs break-all">{founder}</span>}
                  </span>
                  <AppBadge tone={role === "MEMBER" ? "neutral" : "info"}>{t(`applications.role${role}`)}</AppBadge>
                </li>;
              })}</ul>
            </section>
            <section className="min-w-0 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs"><h2 className="font-heading text-base font-semibold">{t("reviews.documents")}</h2>
              {currentVersion.snapshot.documents.length ? <ul className="mt-4 divide-y divide-border-app">{currentVersion.snapshot.documents.map((document) =>
                <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border-app bg-bg-app text-muted-app"><AppIcon name="file" className="size-4" /></span>
                    <div className="min-w-0"><p className="font-medium break-words">{document.fileName}</p><p className="text-xs text-muted-app">{document.documentType === "LOGO" ? t("applications.logo")
                      : document.documentType === "PROPOSAL" ? t("applications.proposal") : document.documentType} · {Math.ceil(document.bytes / 1024)} KB</p></div>
                  </div>
                  <AppButton variant="secondary" disabled={documentAccess.isPending} onClick={() => void openDocument(document.id)}>
                    <AppIcon name="external" className="size-4" />{t("reviews.openDocument")}</AppButton>
                </li>)}</ul>
                : <div className="mt-4"><AppEmptyState message={t("reviews.noDocuments")} /></div>}
              {documentAccess.isError && <p role="alert" className="mt-3 text-sm text-danger-app">{t("reviews.documentError")}</p>}
            </section>
          </div>

          <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs"><h2 className="font-heading text-base font-semibold">{t("reviews.roles")}</h2>
            <p className="mt-1 text-sm text-muted-app">{t("reviews.rolesHint")}</p>
            <ul className="mt-4 flex flex-wrap gap-2">{founders.filter((founder) => founder.role !== "MEMBER").map((founder) => {
              const profile = review.data.founders.find((item) => item.id === founder.userId);
              return <li key={founder.userId}><AppBadge tone="info">
                {t(`applications.role${founder.role}`)}: {profile?.displayName ?? founder.userId}</AppBadge></li>;
            })}</ul>
          </section>

          <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs"><h2 className="font-heading text-base font-semibold">{t("reviews.history")}</h2>
            <ol className="mt-4 ml-1 space-y-4 border-l-2 border-border-app pl-5">{review.data.versions.map((version) =>
              <li key={version.id} className="relative"><span aria-hidden="true" className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-brand-app" />
                <p className="font-medium">{t("reviews.version", { number: version.versionNo })}</p><p className="text-sm text-muted-app">{date(version.submittedAt)}</p></li>)}</ol>
          </section>
        </div>

        <aside className="min-w-0 space-y-6 xl:sticky xl:top-24">
          {isOpen && !mine ? (
            <div className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs"><p className="text-sm text-muted-app">{task.assigneeId ? t("reviews.claimedByOther") : t("reviews.decisionHint")}</p>
              {!task.assigneeId && <AppButton className="mt-5 w-full" disabled={action.isPending} onClick={() => void claim()}>{action.isPending ? t("reviews.claiming") : t("reviews.claim")}</AppButton>}
            </div>
          ) : isOpen ? (
            <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
              <h2 className="font-heading text-base font-semibold">{t("reviews.decisionPanel")}</h2>
              <p className="mt-1 text-sm text-muted-app">{t("reviews.decisionHint")}</p>
              <div className="mt-5 grid grid-cols-3 gap-1 rounded-lg border border-border-app bg-surface-app p-1">{(["Request revision", "Approve", "Reject"] as ReviewOutcome[]).map((value) =>
                <button key={value} type="button" onClick={() => setOutcome(value)} className={cn("min-h-11 rounded-md px-2 py-1.5 text-xs font-medium text-muted-app transition-colors hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app sm:min-h-9", {
                  "bg-segment-app text-text-app shadow-xs": outcome === value,
                })}>
                  {value === "Approve" ? t("reviews.approve") : value === "Reject" ? t("reviews.reject") : t("reviews.requestRevision")}
                </button>)}</div>
              {outcome === "Request revision" && <fieldset className="mt-5"><legend className="text-sm font-medium text-text-app">{t("reviews.sections")}<AppRequiredMark /></legend>
                <div className="mt-3 space-y-1">{sectionKeys.map((section) => <label key={section} className="flex min-h-10 items-center gap-3 rounded-lg px-2 text-sm hover:bg-surface-app"><input type="checkbox" checked={sections.includes(section)} onChange={() => toggleSection(section)} className="size-4 accent-primary-app" />{sectionLabel(section)}</label>)}</div>
                <AppFieldError message={field.error("sections")} />
                <label className="mt-4 block text-sm font-medium text-text-app">{t("reviews.deadline")}<AppRequiredMark /><AppInput type="datetime-local" value={deadline} {...field.control("deadline")} onChange={(event) => setDeadline(event.target.value)} className="mt-1.5 block w-full font-normal" />
                  <AppFieldError message={field.error("deadline")} /></label>
              </fieldset>}
              <label className="mt-4 block text-sm font-medium text-text-app">{t("reviews.reason")}{outcome !== "Approve" && <AppRequiredMark />}<AppTextarea className="mt-1.5 block min-h-28 w-full font-normal" value={reason} {...field.control("reason", outcome !== "Approve")} onChange={(event) => setReason(event.target.value)} placeholder={t("reviews.reasonHint")} maxLength={5000} />
                <AppFieldError message={field.error("reason")} /></label>
              <label className="mt-4 block text-sm font-medium text-text-app">{t("reviews.reviewNote")}<AppTextarea className="mt-1.5 block min-h-28 w-full font-normal" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder={t("reviews.reviewNoteHint")} maxLength={10000} /></label>
              <AppButton className="mt-6 w-full" disabled={action.isPending} onClick={() => void decide()}>{action.isPending ? t("reviews.submitting") : t("reviews.submitDecision")}</AppButton>
              {action.isError && <p role="alert" className="mt-3 text-sm text-danger-app">{action.error.message || t("reviews.actionError")}</p>}
              {action.isSuccess && <p role="status" className="mt-3 text-sm text-success-app">{t("reviews.success")}</p>}
            </section>
          ) : null}

          <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs"><h2 className="font-heading text-base font-semibold">{t("reviews.decisions")}</h2>
            {decisions.length ? <ol className="mt-4 space-y-4">{decisions.map((decision) => <li key={decision.id} className="border-l-2 border-brand-app pl-3"><p className="font-medium">{decision.outcome === "Approve" ? t("reviews.approve") : decision.outcome === "Reject" ? t("reviews.reject") : decision.outcome === "Request revision" ? t("reviews.requestRevision") : decision.outcome}</p><p className="mt-1 text-xs text-muted-app">{t("reviews.decidedAt", { date: date(decision.at) })}</p>{decision.reason && <p className="mt-2 text-sm break-words">{decision.reason}</p>}</li>)}</ol>
              : <div className="mt-3"><AppEmptyState message={t("reviews.noDecisions")} /></div>}
          </section>
        </aside>
      </div>
    </>
  );
}
