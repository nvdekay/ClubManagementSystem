import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppCard } from "@/components/ui/card/AppCard";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useApplicationReviewAction, useApplicationReviewQueue } from "@/hooks/useApplicationReviews";
import { cn } from "@/utils/cn";

export function ApplicationReviewQueuePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const isOfficer = Boolean(auth.data?.systemRoles.includes("ICPDP_OFFICER"));
  const queue = useApplicationReviewQueue(isOfficer);
  const action = useApplicationReviewAction();
  const currentUserId = auth.data?.user.id;

  function date(value: string) {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" })
      .format(new Date(value));
  }

  async function openReview(applicationId: string, readOnly: boolean) {
    if (!auth.data) return;
    if (readOnly) {
      navigate(`/workspace/reviews/${applicationId}`);
      return;
    }
    try {
      await action.mutateAsync({ kind: "claim", id: applicationId,
        csrfToken: auth.data.csrfToken });
      navigate(`/workspace/reviews/${applicationId}`);
    } catch {
      // Mutation error is rendered in context below.
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/icpdp" className="text-sm font-semibold text-accent-app">{t("reviews.back")}</Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b border-border-app pb-6">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-app">{t("reviews.eyebrow")}</p>
          <h1 className="mt-2 text-3xl font-bold font-heading sm:text-4xl">{t("reviews.title")}</h1>
          <p className="mt-3 text-muted-app">{t("reviews.description")}</p>
        </div>
        {queue.data && (
          <span className="rounded-full border border-border-app bg-surface-app px-4 py-2 text-sm font-semibold">
            {t("reviews.openCount", { count: queue.data.length })}
          </span>
        )}
      </div>

      {auth.isPending || queue.isPending ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <AppSkeleton className="h-48 w-full" /><AppSkeleton className="h-48 w-full" />
        </div>
      ) : !auth.data ? (
        <AppCard className="mt-8"><p>{t("reviews.signIn")}</p></AppCard>
      ) : !isOfficer ? (
        <AppCard className="mt-8 border-danger-app/40"><p role="alert" className="text-danger-app">{t("reviews.unauthorized")}</p></AppCard>
      ) : queue.isError ? (
        <AppCard className="mt-8 space-y-4">
          <p role="alert" className="text-danger-app">{queue.error.message || t("reviews.loadError")}</p>
          <AppButton variant="secondary" onClick={() => void queue.refetch()}>{t("reviews.retry")}</AppButton>
        </AppCard>
      ) : queue.data?.length ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {queue.data.map(({ task, application }) => {
            const mine = task.assigneeId === currentUserId;
            const assignedElsewhere = Boolean(task.assigneeId && !mine);
            return (
              <AppCard key={task.id} className="group relative overflow-hidden p-0">
                <div className="h-1 bg-primary-app" />
                <div className="flex h-full flex-col p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-app">
                        {t("reviews.version", { number: application.currentVersionNo })}
                      </p>
                      <h2 className="mt-2 break-words text-xl font-bold font-heading">{application.draft.clubName}</h2>
                      <p className="mt-1 text-sm text-muted-app">{application.draft.field}</p>
                    </div>
                    <span className={cn("shrink-0 rounded-full bg-surface-app px-3 py-1 text-xs font-semibold text-muted-app", {
                      "bg-success-app/15 text-success-app": mine,
                      "bg-danger-app/10 text-danger-app": assignedElsewhere,
                    })}>
                      {mine ? t("reviews.assignedToYou") : assignedElsewhere
                        ? t("reviews.assigned") : t("reviews.unassigned")}
                    </span>
                  </div>
                  <p className="mt-6 text-sm text-muted-app">{t("reviews.waitingSince", { date: date(task.openedAt) })}</p>
                  <AppButton className="mt-5 w-full" disabled={action.isPending}
                    onClick={() => void openReview(application.id, assignedElsewhere)}>
                    {action.isPending && action.variables?.id === application.id
                      ? t("reviews.claiming") : t("reviews.open")}
                  </AppButton>
                </div>
              </AppCard>
            );
          })}
        </div>
      ) : (
        <AppCard className="mt-8 py-14 text-center">
          <div aria-hidden="true" className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-app/15 text-xl text-success-app">✓</div>
          <h2 className="mt-4 text-xl font-bold font-heading">{t("reviews.none")}</h2>
          <p className="mt-2 text-sm text-muted-app">{t("reviews.noneHint")}</p>
        </AppCard>
      )}
      {action.isError && <p role="alert" className="mt-4 text-sm text-danger-app">{action.error.message}</p>}
    </div>
  );
}
