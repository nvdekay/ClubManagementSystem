import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { createColumnHelper, useTable } from "@tanstack/react-table";
import { AppButton } from "@/components/ui/button/AppButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSearchInput } from "@/components/ui/search-input/AppSearchInput";
import { AppPagination } from "@/components/ui/pagination/AppPagination";
import { AppTable, appTableFeatures, type AppTableFeatures } from "@/components/ui/table/AppTable";
import { appToast } from "@/components/ui/toast/AppToast";
import { useAuth } from "@/hooks/useAuth";
import { useRecruitmentCampaigns } from "@/hooks/useRecruitmentCampaigns";
import { useApplicationsForReview, useCandidateEvaluations, useReviewRecruitmentApplications } from "@/hooks/useRecruitmentApplications";
import type { CandidateEvaluationGroup, RecruitmentApplication } from "@/services/recruitmentApplications";
import { ApplicationReviewDialog } from "./ApplicationReviewDialog";
import { formatDate, formatScore, stateTone } from "./recruitmentReviewFormat";

interface ReviewRow {
  application: RecruitmentApplication;
  group?: CandidateEvaluationGroup;
  mine: boolean;
}

type StateFilter = RecruitmentApplication["state"] | "all";

const REVIEW_STATES: RecruitmentApplication["state"][] = ["Submitted", "Screening", "Shortlisted", "Accepted",
  "Waitlisted", "Rejected", "Onboarded", "Declined", "Withdrawn"];
const NO_ROWS: ReviewRow[] = [];
const column = createColumnHelper<AppTableFeatures, ReviewRow>();

export function RecruitmentReviewPage() {
  const { clubId, campaignId } = useParams();
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const workspace = auth.data?.workspaces.find((item) => item.kind === "club" && item.clubId === clubId);
  const canReview = Boolean(workspace?.permissions.includes("club.application.review"));
  const query = useApplicationsForReview(clubId, campaignId);
  // Same cached list as the campaign page; used to show question labels instead of field keys.
  const campaigns = useRecruitmentCampaigns(clubId, Boolean(auth.data));
  const formSchema = campaigns.data?.find((campaign) => campaign.id === campaignId)?.formSchema;
  const questionLabels = useMemo(() => new Map((formSchema ?? []).map((field) => [field.key, field.label])), [formSchema]);
  const evaluations = useCandidateEvaluations(clubId, campaignId);
  const action = useReviewRecruitmentApplications();
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string>();
  const userId = auth.data?.user.id;

  const allRows = useMemo(() => {
    if (!query.data) return NO_ROWS;
    const groups = new Map((evaluations.data?.applications ?? []).map((group) => [group.applicationId, group]));
    return query.data.map((application) => {
      const group = groups.get(application.id);
      return { application, group, mine: Boolean(group?.evaluations.some((item) => item.reviewerId === userId)) };
    });
  }, [query.data, evaluations.data, userId]);

  const rows = useMemo(() => {
    const needle = search.toLocaleLowerCase();
    return allRows.filter(({ application }) => (stateFilter === "all" || application.state === stateFilter)
      && (!needle || (application.applicantName ?? "").toLocaleLowerCase().includes(needle)));
  }, [allRows, stateFilter, search]);

  const columns = useMemo(() => column.columns([
    column.display({ id: "select", enableSorting: false,
      header: () => <span className="sr-only">{t("recruitmentApplications.selectApplication")}</span>,
      cell: ({ row }) => {
        const id = row.original.application.id;
        return <input type="checkbox" className="size-5 accent-primary-app" checked={selected.includes(id)}
          aria-label={t("recruitmentApplications.selectApplication") + ": " + applicantName(row.original.application)}
          onChange={(event) => setSelected((old) => event.target.checked ? [...old, id] : old.filter((item) => item !== id))} />;
      } }),
    column.accessor((row) => applicantName(row.application), { id: "applicant",
      header: () => t("recruitmentApplications.colApplicant"),
      cell: ({ row, getValue }) => <div className="min-w-40">
        <p className="font-semibold break-words">{getValue()}</p>
        <p className="text-xs text-muted-app break-words">{row.original.application.position}</p></div> }),
    column.accessor((row) => row.application.submittedAt ?? "", { id: "submitted",
      header: () => t("recruitmentApplications.colSubmitted"),
      cell: ({ row }) => <span className="tabular-nums">{formatDate(row.original.application.submittedAt, i18n.language)}</span> }),
    column.accessor((row) => row.application.state, { id: "state", enableSorting: false,
      header: () => t("recruitmentApplications.state"),
      cell: ({ getValue }) => <AppBadge tone={stateTone(getValue())}>{t(`recruitmentApplications.state${getValue()}`)}</AppBadge> }),
    column.accessor((row) => row.group?.summary.mean, { id: "score", sortUndefined: "last", sortDescFirst: true,
      header: () => t("recruitmentApplications.colScore"),
      cell: ({ row }) => {
        const summary = row.original.group?.summary;
        if (!summary?.count) return <span className="text-muted-app">—</span>;
        return summary.mean === undefined
          ? <span className="text-muted-app">{t("recruitmentApplications.evaluationCount", { count: summary.count })}</span>
          : <div><p className="font-semibold tabular-nums">{formatScore(summary.mean)}/{formatScore(summary.maxTotal)}</p>
            <p className="text-xs text-muted-app">{t("recruitmentApplications.scoreReviewers", { count: summary.scoredCount })}</p></div>;
      } }),
    column.display({ id: "spread", enableSorting: false,
      header: () => t("recruitmentApplications.colSpread"),
      cell: ({ row }) => {
        const summary = row.original.group?.summary;
        if (summary?.min === undefined || summary.max === undefined) return <span className="text-muted-app">—</span>;
        return <div className="tabular-nums"><p>{formatScore(summary.min)}–{formatScore(summary.max)}</p>
          <p className="text-xs text-muted-app">σ {formatScore(summary.stdDev ?? 0)}</p></div>;
      } }),
    column.display({ id: "mine", enableSorting: false,
      header: () => t("recruitmentApplications.colMine"),
      cell: ({ row }) => row.original.mine
        ? <span className="font-semibold text-success-app"><span aria-hidden="true">✓</span><span className="sr-only">{t("recruitmentApplications.myDone")}</span></span>
        : <span className="text-muted-app"><span aria-hidden="true">—</span><span className="sr-only">{t("recruitmentApplications.myPending")}</span></span> }),
    column.display({ id: "actions", enableSorting: false,
      header: () => <span className="sr-only">{t("recruitmentApplications.colActions")}</span>,
      cell: ({ row }) => <AppButton variant="secondary" onClick={() => setOpenId(row.original.application.id)}>
        {t("recruitmentApplications.openReview")}</AppButton> }),
  ]), [t, i18n.language, selected]);

  const table = useTable({ features: appTableFeatures, columns, data: rows });
  const opened = allRows.find((row) => row.application.id === openId);

  async function bulk(actionName: "shortlist" | "decide") {
    if (!clubId || !campaignId || !auth.data || !selected.length) return;
    setError("");
    try {
      await action.mutateAsync({ clubId, campaignId, action: actionName, applicationIds: selected,
        ...(actionName === "shortlist" ? { reason: reason.trim() } : { outcome: "Rejected" as const, reason: reason.trim() }),
        csrfToken: auth.data.csrfToken });
      setSelected([]);
      setReason("");
      appToast.success(t("recruitmentApplications.actionDone"));
    } catch (caught) { setError(caught instanceof Error ? caught.message : t("recruitmentApplications.reviewError")); }
  }

  const back = { to: "/club/" + (clubId ?? "") + "/recruitment", label: t("recruitmentApplications.reviewBack") };
  const header = <PageHeader back={back} title={t("recruitmentApplications.reviewTitle")}
    description={t("recruitmentApplications.reviewDescription")} />;
  if (query.isError) return <>{header}<AppNotice tone="danger" role="alert" title={query.error.message}>
    <AppButton variant="secondary" onClick={() => void query.refetch()}>{t("recruitmentApplications.retry")}</AppButton></AppNotice></>;

  const stateOptions = [{ value: "all" as StateFilter, label: t("recruitmentApplications.allStates") },
    ...REVIEW_STATES.map((state) => ({ value: state as StateFilter, label: t(`recruitmentApplications.state${state}`) }))];
  const pagination = table.state.pagination;

  return <>
    {header}
    {evaluations.isError && <AppNotice tone="warning" role="alert" className="mb-4" title={t("recruitmentApplications.evaluationLoadError")}>
      <AppButton variant="secondary" onClick={() => void evaluations.refetch()}>{t("recruitmentApplications.retry")}</AppButton></AppNotice>}
    {selected.length > 0 && <section aria-label={t("recruitmentApplications.reviewReason")} className="mb-6 space-y-3 rounded-2xl bg-surface-app p-4 sm:p-5">
      <label className="block text-sm font-semibold">{t("recruitmentApplications.reviewReason")}
        <AppTextarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={2000}
          className="mt-2 block min-h-20 w-full font-normal" />
        <span className="mt-1 block text-xs font-normal text-muted-app">{t("recruitmentApplications.reviewReasonHint")}</span></label>
      {error && <AppNotice tone="danger" role="alert">{error}</AppNotice>}
      <div className="flex flex-wrap items-center gap-2">
        <AppButton disabled={action.isPending || !reason.trim()} onClick={() => void bulk("shortlist")}>{t("recruitmentApplications.bulkShortlist")}</AppButton>
        <AppButton className="bg-danger-app text-bg-app hover:opacity-90" disabled={action.isPending || !reason.trim()}
          onClick={() => void bulk("decide")}>{t("recruitmentApplications.bulkReject")}</AppButton>
        <AppButton variant="ghost" onClick={() => setSelected([])}>{t("recruitmentApplications.clearSelection")}</AppButton>
        <AppBadge tone="info">{selected.length} {t("recruitmentApplications.selected")}</AppBadge>
      </div>
    </section>}
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <AppSearchInput onSearch={setSearch} aria-label={t("recruitmentApplications.searchApplicant")}
        placeholder={t("recruitmentApplications.searchApplicant")} className="w-full min-w-0 sm:w-72" />
      <AppSelect value={stateFilter} options={stateOptions} onChange={setStateFilter}
        label={t("recruitmentApplications.filterState")} className="w-full sm:w-auto" />
    </div>
    <AppTable table={table} loading={query.isPending}
      emptyMessage={allRows.length ? t("recruitmentApplications.noMatches") : t("recruitmentApplications.noReviewApplications")} />
    <AppPagination className="mt-4" pageIndex={pagination.pageIndex} pageCount={table.getPageCount()}
      onPageChange={(index) => table.setPageIndex(index)} prevLabel={t("recruitmentApplications.prevPage")}
      nextLabel={t("recruitmentApplications.nextPage")} navLabel={t("recruitmentApplications.pagination")}
      pageLabel={(page) => t("recruitmentApplications.pageNumber", { page })} />
    {clubId && campaignId && auth.data && opened && <ApplicationReviewDialog key={opened.application.id} onClose={() => setOpenId(undefined)}
      clubId={clubId} campaignId={campaignId} application={opened.application} group={opened.group}
      rubric={evaluations.data?.rubric} evaluationsLoading={evaluations.isPending} canReview={canReview}
      questionLabels={questionLabels} userId={auth.data.user.id} csrfToken={auth.data.csrfToken} />}
  </>;
}

function applicantName(application: RecruitmentApplication) {
  return application.applicantName ?? application.id.slice(-6);
}
