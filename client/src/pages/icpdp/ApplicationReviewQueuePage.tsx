import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useApplicationReviewAction, useApplicationReviewQueue } from "@/hooks/useApplicationReviews";

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

  const loading = <div className="space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-24 w-full" />)}</div>;

  return (
    <>
      <PageHeader title={t("reviews.title")} description={t("reviews.description")}
        actions={queue.data && <AppBadge tone="info">{t("reviews.openCount", { count: queue.data.length })}</AppBadge>} />

      {auth.isPending || (isOfficer && queue.isPending) ? loading : !auth.data ? (
        <AppNotice>
          <p>{t("reviews.signIn")}</p>
          <Link className="inline-block font-semibold text-accent-app"
            to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>
            {t("reviews.signInLink")}</Link>
        </AppNotice>
      ) : !isOfficer ? (
        <AppNotice tone="danger" role="alert">{t("reviews.unauthorized")}</AppNotice>
      ) : queue.isError ? (
        <AppNotice tone="danger" role="alert" title={queue.error.message || t("reviews.loadError")}>
          <AppButton variant="secondary" onClick={() => void queue.refetch()}>{t("reviews.retry")}</AppButton>
        </AppNotice>
      ) : queue.data?.length ? (
        <ul className="divide-y divide-border-app border-y border-border-app">
          {queue.data.map(({ task, application }) => {
            const mine = task.assigneeId === currentUserId;
            const assignedElsewhere = Boolean(task.assigneeId && !mine);
            return (
              <li key={task.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 px-2 py-5">
                <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft-app text-primary-app">
                  <AppIcon name="inbox" />
                </span>
                <div className="min-w-0 flex-1 basis-56">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-lg font-bold break-words">{application.draft.clubName}</h2>
                    <AppBadge tone={mine ? "success" : assignedElsewhere ? "danger" : "neutral"}>
                      {mine ? t("reviews.assignedToYou") : assignedElsewhere
                        ? t("reviews.assigned") : t("reviews.unassigned")}
                    </AppBadge>
                  </div>
                  <p className="mt-1 text-sm text-muted-app">
                    {application.draft.field} · {t("reviews.version", { number: application.currentVersionNo })}
                  </p>
                  <p className="mt-1 text-sm text-muted-app">{t("reviews.waitingSince", { date: date(task.openedAt) })}</p>
                </div>
                <AppButton variant={assignedElsewhere ? "secondary" : "primary"} disabled={action.isPending}
                  onClick={() => void openReview(application.id, assignedElsewhere)}>
                  {action.isPending && action.variables?.id === application.id
                    ? t("reviews.claiming") : t("reviews.open")}
                  <AppIcon name="chevronRight" className="size-4" />
                </AppButton>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="py-16 text-center">
          <span aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-mint-soft-app text-mint-app"><AppIcon name="sparkles" className="size-7" /></span>
          <h2 className="mt-4 font-heading text-xl font-bold">{t("reviews.none")}</h2>
          <p className="mt-2 text-sm text-muted-app">{t("reviews.noneHint")}</p>
        </div>
      )}
      {action.isError && <AppNotice tone="danger" role="alert" className="mt-4">{action.error.message}</AppNotice>}
    </>
  );
}
