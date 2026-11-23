import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useConfirm } from "@/hooks/useConfirm";
import { useEventDefenseActions, useLiveDefenseSession } from "@/hooks/useEventDefense";
import { useEventProposal } from "@/hooks/useEventProposalReviews";
import { apiErrors } from "@/i18n/apiErrors";
import { ProposalDecisionPanel } from "@/pages/icpdp/ProposalDecisionPanel";
import type { EventDefenseState } from "@/services/eventDefense";
import { cn } from "@/utils/cn";

function renderInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={idx}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={idx} className="rounded bg-surface-app px-1 py-0.5 font-mono text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}

function MarkdownPreview({ source, emptyText }: { source: string; emptyText: string }) {
  if (!source.trim()) {
    return <p className="text-sm text-muted-app">{emptyText}</p>;
  }
  const lines = source.split(/\r?\n/);
  return (
    <div className="space-y-2 text-sm leading-6 text-text-app">
      {lines.map((line, idx) => {
        if (line.startsWith("### ")) {
          return <h4 key={idx} className="font-heading text-sm font-semibold">{renderInlineMarkdown(line.slice(4))}</h4>;
        }
        if (line.startsWith("## ")) {
          return <h3 key={idx} className="font-heading text-base font-semibold">{renderInlineMarkdown(line.slice(3))}</h3>;
        }
        if (line.startsWith("# ")) {
          return <h2 key={idx} className="font-heading text-lg font-bold">{renderInlineMarkdown(line.slice(2))}</h2>;
        }
        if (/^[-*] /.test(line)) {
          return (
            <div key={idx} className="flex gap-2 pl-2">
              <span aria-hidden>•</span>
              <span className="min-w-0 break-words">{renderInlineMarkdown(line.slice(2))}</span>
            </div>
          );
        }
        if (/^\d+\. /.test(line)) {
          const match = /^(\d+)\.\s+(.*)$/.exec(line);
          if (match) {
            return (
              <div key={idx} className="flex gap-2 pl-2">
                <span className="font-medium text-muted-app">{match[1]}.</span>
                <span className="min-w-0 break-words">{renderInlineMarkdown(match[2]!)}</span>
              </div>
            );
          }
        }
        if (!line.trim()) {
          return <div key={idx} className="h-2" />;
        }
        return <p key={idx} className="break-words">{renderInlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

function defenseTone(state: EventDefenseState): AppBadgeTone {
  switch (state) {
    case "IN_PROGRESS":
    case "CONFIRMED":
      return "success";
    case "DEFENDED":
      return "info";
    case "RESCHEDULE_REQUESTED":
      return "warning";
    case "NO_SHOW":
    case "CANCELLED":
      return "danger";
    default:
      return "neutral";
  }
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function resolveProposalError(error: Error | null | undefined, fallback: string): string {
  if (!error) return fallback;
  if (error.message === apiErrors.vi.unknown || error.message === apiErrors.en.unknown) {
    return fallback;
  }
  return error.message || fallback;
}

export function LiveDefenseRoomPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const askConfirm = useConfirm();
  const auth = useAuth();
  const isOfficer = Boolean(auth.data?.systemRoles.includes("ICPDP_OFFICER"));

  const proposal = useEventProposal(id, isOfficer);
  const liveSession = useLiveDefenseSession(id, isOfficer);
  const actions = useEventDefenseActions();
  const { mutateAsync: mutateDefense, reset: resetDefenseMutation } = actions;

  const [activeTab, setActiveTab] = useState<"mine" | "all">("mine");
  const [previewMode, setPreviewMode] = useState(false);
  const [localDraft, setLocalDraft] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const userId = auth.data?.user.id ?? "";
  const csrfToken = auth.data?.csrfToken ?? "";
  const session = liveSession.data ?? proposal.data?.activeDefenseSession;
  const serverNote = session?.notes.find((entry) => entry.officerId === userId);
  const serverContent = serverNote?.content ?? "";
  const noteDraft = localDraft ?? serverContent;
  const displayedSavedAt = lastSavedAt ?? serverNote?.updatedAt ?? null;

  // Debounced auto-save (2s) while the session is IN_PROGRESS.
  useEffect(() => {
    if (!id || !csrfToken || session?.state !== "IN_PROGRESS") return;
    if (localDraft === null || localDraft === serverContent) return;
    const draftToSave = localDraft;
    const timer = window.setTimeout(() => {
      void mutateDefense({ kind: "saveNote", eventId: id, content: draftToSave, csrfToken })
        .then((updated) => {
          if ("notes" in updated) {
            const mine = updated.notes.find((entry) => entry.officerId === userId);
            setLastSavedAt(mine?.updatedAt ?? new Date().toISOString());
          }
        })
        .catch((error) => {
          console.error("[LiveDefenseRoomPage] auto-save note failed:", error);
        });
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [csrfToken, id, localDraft, mutateDefense, serverContent, session?.state, userId]);

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }

  function formatMoney(value: number) {
    return new Intl.NumberFormat(i18n.language, { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
  }

  if (auth.isPending || (isOfficer && (proposal.isPending || liveSession.isPending))) {
    return (
      <div className="space-y-4">
        <AppSkeleton className="h-10 w-1/2" />
        <AppSkeleton className="h-[32rem] w-full" />
      </div>
    );
  }

  if (!auth.data) {
    return (
      <AppNotice>
        <p>{t("eventReviews.signIn")}</p>
        <Link
          className="inline-block font-semibold text-primary-app hover:underline"
          to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}
        >
          {t("eventReviews.signInLink")}
        </Link>
      </AppNotice>
    );
  }

  if (!isOfficer) {
    return <AppNotice tone="danger" role="alert">{t("eventReviews.unauthorized")}</AppNotice>;
  }

  const backLink = { to: `/workspace/event-proposals/${id ?? ""}`, label: t("eventDefense.backToProposal") };

  if (proposal.isError || !proposal.data || !session) {
    const loadErrorMessage = proposal.error
      ? resolveProposalError(proposal.error, t("eventReviews.loadError"))
      : (liveSession.error?.message ?? t("eventReviews.loadError"));
    return (
      <>
        <PageHeader title={t("eventDefense.liveTitle")} back={backLink} />
        <AppNotice tone="danger" role="alert" title={loadErrorMessage}>
          <AppButton variant="secondary" onClick={() => { void proposal.refetch(); void liveSession.refetch(); }}>
            {t("eventReviews.retry")}
          </AppButton>
        </AppNotice>
      </>
    );
  }

  const detail = proposal.data;
  const { event, versions, budget } = detail;
  const current = versions.find((version) => version.revisionNo === event.currentRevisionNo) ?? versions.at(-1);
  const payload = current?.payload ?? {};
  const lines = current?.budgetLines ?? [];
  const isAssignee = session.leadOfficerId === userId;
  const isInProgress = session.state === "IN_PROGRESS";
  const isEnded = session.state === "DEFENDED" || session.state === "NO_SHOW" || session.state === "CANCELLED";

  async function handleStart() {
    if (!id) return;
    resetDefenseMutation();
    try {
      await mutateDefense({ kind: "start", eventId: id, csrfToken });
    } catch (error) {
      console.error("[LiveDefenseRoomPage] start defense failed:", error);
    }
  }

  async function handleEnd() {
    if (!id) return;
    if (!(await askConfirm(t("eventDefense.confirmEndDefense")))) return;
    resetDefenseMutation();
    try {
      // Flush unsaved draft before ending if needed.
      if (localDraft !== null && localDraft !== serverContent) {
        await mutateDefense({ kind: "saveNote", eventId: id, content: localDraft, csrfToken });
      }
      await mutateDefense({ kind: "end", eventId: id, csrfToken });
    } catch (error) {
      console.error("[LiveDefenseRoomPage] end defense failed:", error);
    }
  }

  async function handleNoShow() {
    if (!id) return;
    if (!(await askConfirm(t("eventDefense.noShowWarning")))) return;
    resetDefenseMutation();
    try {
      await mutateDefense({ kind: "noShow", eventId: id, csrfToken });
    } catch (error) {
      console.error("[LiveDefenseRoomPage] mark no-show failed:", error);
    }
  }

  return (
    <>
      <PageHeader
        title={`${t("eventDefense.liveTitle")} · ${event.title}`}
        back={backLink}
        description={`${event.clubName} · ${session.title} · ${session.propertyName}`}
        actions={<AppBadge tone={defenseTone(session.state)}>{t(`eventDefense.state_${session.state}`)}</AppBadge>}
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Column 1: Proposal Details */}
        <div className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
            <h2 className="font-heading text-base font-semibold">{t("eventDefense.proposalColumn")}</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs text-muted-app">{t("eventReviews.when")}</dt>
                <dd className="mt-1 font-medium">{formatDate(event.startAt)} – {formatDate(event.endAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-app">{t("eventReviews.where")}</dt>
                <dd className="mt-1 font-medium break-words">
                  {event.property ? `${event.property.code} · ${event.property.name}` : event.venueText ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-app">{t("eventReviews.capacity")}</dt>
                <dd className="mt-1 font-medium">{t("eventReviews.capacityValue", { count: event.capacity })}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-app">{t("eventReviews.risk")}</dt>
                <dd className="mt-1 font-medium">{event.riskCategory ?? "—"}</dd>
              </div>
              {([
                ["objective", optionalText(payload.objective) ?? event.objective],
                ["plan", optionalText(payload.plan)],
                ["riskNote", optionalText(payload.riskNote)],
                ["facilityNeeds", optionalText(payload.facilityNeeds)],
              ] as const)
                .filter(([, value]) => Boolean(value))
                .map(([key, value]) => (
                  <div key={key} className="sm:col-span-2">
                    <dt className="text-xs text-muted-app">
                      {key === "objective"
                        ? t("eventReviews.objective")
                        : key === "plan"
                          ? t("eventReviews.plan")
                          : key === "riskNote"
                            ? t("eventReviews.riskNote")
                            : t("eventReviews.facilityNeeds")}
                    </dt>
                    <dd className="mt-1.5 whitespace-pre-wrap break-words leading-6">{value}</dd>
                  </div>
                ))}
            </dl>
          </section>

          <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
            <h2 className="font-heading text-base font-semibold">{t("eventReviews.budget")}</h2>
            {lines.length > 0 ? (
              <div className="mt-4 overflow-x-auto rounded-xl border border-border-app bg-bg-app">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead className="bg-surface-app">
                    <tr className="text-xs text-muted-app">
                      <th scope="col" className="px-4 py-2 font-medium">{t("eventReviews.category")}</th>
                      <th scope="col" className="px-4 py-2 font-medium">{t("eventReviews.purpose")}</th>
                      <th scope="col" className="px-4 py-2 text-right font-medium">{t("eventReviews.requestedAmount")}</th>
                      {budget && <th scope="col" className="px-4 py-2 text-right font-medium">{t("eventReviews.approvedAmount")}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={index} className="border-t border-border-app align-top">
                        <td className="px-4 py-2.5 font-medium">{line.category}</td>
                        <td className="px-4 py-2.5">
                          <p className="break-words">{line.purpose}</p>
                          {line.plannedItems && <p className="mt-0.5 whitespace-pre-line text-xs text-muted-app">{line.plannedItems}</p>}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(line.amount)}</td>
                        {budget && (
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {budget.lines[index] ? formatMoney(budget.lines[index]!.approvedAmount) : "—"}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-app">{t("eventReviews.budgetNone")}</p>
            )}
          </section>
        </div>

        {/* Column 2: Live Defense Controls, Notes & Decision */}
        <div className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-base font-semibold">{session.title}</h2>
                <p className="mt-1 text-sm text-muted-app">
                  {formatDate(session.startAt)} · {t("eventDefense.durationValue", { minutes: session.durationMinutes })} · {session.propertyName}
                </p>
                {session.note && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-app">{session.note}</p>}
              </div>
              {isAssignee && (
                <div className="flex flex-wrap gap-2">
                  {(session.state === "SCHEDULED" || session.state === "CONFIRMED") && (
                    <AppButton disabled={actions.isPending} onClick={() => void handleStart()}>
                      {t("eventDefense.startSessionNow")}
                    </AppButton>
                  )}
                  {isInProgress && (
                    <AppButton disabled={actions.isPending} onClick={() => void handleEnd()}>
                      {t("eventDefense.endSessionNow")}
                    </AppButton>
                  )}
                  {(session.state === "SCHEDULED" || session.state === "CONFIRMED" || isInProgress) && (
                    <AppButton variant="ghost" disabled={actions.isPending} onClick={() => void handleNoShow()}>
                      {t("eventDefense.noShowButton")}
                    </AppButton>
                  )}
                </div>
              )}
            </div>

            {!isAssignee && !isEnded && (
              <p className="text-xs text-muted-app">{t("eventDefense.onlyAssigneeCanControl")}</p>
            )}

            {isEnded && (
              <AppNotice tone={session.state === "DEFENDED" ? "info" : "danger"}>
                {t("eventDefense.sessionEndedBanner", { state: t(`eventDefense.state_${session.state}`) })}
              </AppNotice>
            )}

            {actions.isError && (
              <p role="alert" className="text-sm text-danger-app">
                {actions.error.message}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-heading text-base font-semibold">{t("eventDefense.notesColumn")}</h2>
              <div className="inline-flex rounded-lg border border-border-app bg-surface-app p-1">
                <button
                  type="button"
                  aria-pressed={activeTab === "mine"}
                  onClick={() => setActiveTab("mine")}
                  className={cn(
                    "min-h-8 rounded-md px-3 text-xs font-medium text-muted-app transition-colors hover:text-text-app",
                    { "bg-segment-app text-text-app shadow-xs": activeTab === "mine" },
                  )}
                >
                  {t("eventDefense.myNoteTab")}
                </button>
                <button
                  type="button"
                  aria-pressed={activeTab === "all"}
                  onClick={() => setActiveTab("all")}
                  className={cn(
                    "min-h-8 rounded-md px-3 text-xs font-medium text-muted-app transition-colors hover:text-text-app",
                    { "bg-segment-app text-text-app shadow-xs": activeTab === "all" },
                  )}
                >
                  {t("eventDefense.allNotesTab", { count: session.notes.length })}
                </button>
              </div>
            </div>

            {activeTab === "mine" ? (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-app">{t("eventDefense.markdownHint")}</p>
                  <AppButton type="button" variant="secondary" onClick={() => setPreviewMode((prev) => !prev)}>
                    {previewMode ? t("eventDefense.editToggle") : t("eventDefense.previewToggle")}
                  </AppButton>
                </div>

                {previewMode ? (
                  <div className="min-h-64 rounded-xl border border-border-app bg-surface-app p-4">
                    <MarkdownPreview source={noteDraft} emptyText={t("eventDefense.emptyNotes")} />
                  </div>
                ) : (
                  <AppTextarea
                    value={noteDraft}
                    disabled={!isInProgress}
                    maxLength={50_000}
                    onChange={(e) => setLocalDraft(e.target.value)}
                    placeholder="# Strengths&#10;- ...&#10;&#10;# Questions & Risks&#10;- ..."
                    className="min-h-64 w-full font-mono text-sm"
                  />
                )}

                <div className="flex items-center justify-between text-xs text-muted-app">
                  <span>
                    {actions.isPending && actions.variables?.kind === "saveNote"
                      ? t("eventDefense.savingNote")
                      : displayedSavedAt
                        ? t("eventDefense.savedAt", { time: new Date(displayedSavedAt).toLocaleTimeString(i18n.language) })
                        : ""}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {session.notes.length > 0 ? (
                  session.notes.map((entry) => (
                    <article key={entry.officerId} className="rounded-xl border border-border-app bg-surface-app p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-app pb-2">
                        <span className="text-sm font-semibold">{entry.officerName}</span>
                        <span className="text-xs text-muted-app">{formatDate(entry.updatedAt)}</span>
                      </div>
                      <div className="mt-3">
                        <MarkdownPreview source={entry.content} emptyText={t("eventDefense.emptyNotes")} />
                      </div>
                    </article>
                  ))
                ) : (
                  <AppEmptyState message={t("eventDefense.emptyNotes")} />
                )}
              </div>
            )}
          </section>

          {session.state === "DEFENDED" && !session.outcome && isAssignee && (
            <ProposalDecisionPanel detail={detail} csrfToken={csrfToken} postDefense />
          )}
        </div>
      </div>
    </>
  );
}
