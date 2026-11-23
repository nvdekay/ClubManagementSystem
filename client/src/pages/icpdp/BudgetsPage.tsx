import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { SponsoredItems } from "@/components/custom/SponsoredItems";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useBudget, useBudgets } from "@/hooks/useBudgets";
import { useSponsoredItems } from "@/hooks/useSponsoredItems";
import type { BudgetSummary } from "@/services/budgets";
import { cn } from "@/utils/cn";
import { formatMoney } from "@/utils/formatMoney";

const filters = [
  "all",
  "awaitingAdvance",
  "awaitingReview",
  "awaitingVendorPay",
  "awaitingRefundConfirm",
  "inProgress",
  "closed",
] as const;
type Filter = typeof filters[number];

// Kiểm tra ngân sách có thuộc bộ lọc trạng thái đang chọn không
function matches(filter: Filter, budget: BudgetSummary): boolean {
  const counts = budget.itemCounts;
  switch (filter) {
    case "awaitingAdvance":
      return (counts?.awaitingAdvance ?? 0) > 0;
    case "awaitingReview":
      return (counts?.awaitingReview ?? 0) > 0;
    case "awaitingVendorPay":
      return (counts?.awaitingVendorPay ?? 0) > 0;
    case "awaitingRefundConfirm":
      return (counts?.awaitingRefundConfirm ?? 0) > 0;
    case "inProgress":
      return budget.state !== "Closed" && budget.state !== "Cancelled";
    case "closed":
      return budget.state === "Closed" || budget.state === "Cancelled";
    default:
      return true;
  }
}

// Dịch trạng thái ngân sách sang nhãn hiển thị
function stateLabel(t: TFunction, state: string): string {
  switch (state) {
    case "Approved": return t("budgets.stateApproved");
    case "Closed": return t("budgets.stateClosed");
    case "Cancelled": return t("budgets.stateCancelled");
    default: return t("budgets.stateApproved");
  }
}

// Chọn màu badge theo trạng thái ngân sách
function stateTone(state: string): AppBadgeTone {
  return state === "Closed" ? "success" : state === "Cancelled" ? "danger" : "info";
}

// Dịch bộ lọc danh sách ngân sách sang nhãn hiển thị
function filterLabel(t: TFunction, filter: Filter): string {
  switch (filter) {
    case "awaitingAdvance": return t("budgets.filterAwaitingAdvance");
    case "awaitingReview": return t("budgets.filterAwaitingReview");
    case "awaitingVendorPay": return t("budgets.filterAwaitingVendorPay");
    case "awaitingRefundConfirm": return t("budgets.filterAwaitingRefundConfirm");
    case "inProgress": return t("budgets.filterInProgress");
    case "closed": return t("budgets.filterClosed");
    default: return t("budgets.filterAll");
  }
}

// Cổng kiểm tra đăng nhập và quyền cho hai trang ngân sách
function Gate({ children }: { children: (csrfToken: string) => ReactNode }) {
  const { t } = useTranslation();
  const auth = useAuth();
  if (auth.isPending) return <div className="space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-20 w-full" />)}</div>;
  if (!auth.data) return <AppNotice>
    <p>{t("budgets.signIn")}</p>
    <Link className="inline-block font-semibold text-primary-app hover:underline"
      to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>{t("budgets.signInLink")}</Link>
  </AppNotice>;
  if (!auth.data.systemRoles.includes("ICPDP_OFFICER")) {
    return <AppNotice tone="danger" role="alert">{t("budgets.unauthorized")}</AppNotice>;
  }
  return <>{children(auth.data.csrfToken)}</>;
}

// Danh sách ngân sách sự kiện kèm bộ lọc theo trạng thái và câu lạc bộ
function BudgetList() {
  const { t, i18n } = useTranslation();
  const list = useBudgets(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [clubId, setClubId] = useState("");
  function money(value: number) {
    return formatMoney(value, i18n.language);
  }
  function day(value: string) {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(value));
  }

  if (list.isPending) return <div className="space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-20 w-full" />)}</div>;
  if (list.isError) return <AppNotice tone="danger" role="alert" title={list.error.message || t("budgets.loadError")}>
    <AppButton variant="secondary" onClick={() => void list.refetch()}>{t("budgets.retry")}</AppButton>
  </AppNotice>;

  const clubs = [...new Map(list.data.map((budget) => [budget.clubId, budget.clubName])).entries()]
    .sort(([, a], [, b]) => a.localeCompare(b, i18n.language));
  const clubOptions = [
    { value: "", label: t("budgets.allClubs") },
    ...clubs.map(([id, name]) => ({ value: id, label: name })),
  ];
  const byClub = clubId ? list.data.filter((budget) => budget.clubId === clubId) : list.data;
  const shown = byClub.filter((budget) => matches(filter, budget));

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label={t("budgets.title")} className="inline-flex flex-wrap gap-1 rounded-lg border border-border-app bg-surface-app p-1">
          {filters.map((value) => {
            const count = byClub.filter((budget) => matches(value, budget)).length;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-app transition-colors hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app sm:min-h-9",
                  { "bg-segment-app text-text-app shadow-xs": filter === value },
                )}
              >
                {filterLabel(t, value)} · {count}
              </button>
            );
          })}
        </div>
        <AppSelect
          className="w-full sm:w-64"
          label={t("budgets.filterClub")}
          value={clubId}
          onChange={setClubId}
          options={clubOptions}
        />
      </div>

      {shown.length ? (
        <ul className="divide-y divide-border-app rounded-2xl border border-border-app bg-bg-app shadow-xs">
          {shown.map((budget) => {
            const remaining = Math.max(budget.approvedTotal - budget.disbursedTotal, 0);
            const counts = budget.itemCounts;
            const pendingBadges = [
              counts?.awaitingAdvance ? { tone: "warning" as const, text: t("budgets.countAdvance", { count: counts.awaitingAdvance }) } : null,
              counts?.awaitingReview ? { tone: "warning" as const, text: t("budgets.countReview", { count: counts.awaitingReview }) } : null,
              counts?.awaitingVendorPay ? { tone: "warning" as const, text: t("budgets.countVendorPay", { count: counts.awaitingVendorPay }) } : null,
              counts?.awaitingRefundConfirm ? { tone: "warning" as const, text: t("budgets.countRefundConfirm", { count: counts.awaitingRefundConfirm }) } : null,
              counts?.awaitingClubRefund ? { tone: "neutral" as const, text: t("budgets.countClubRefund", { count: counts.awaitingClubRefund }) } : null,
              counts?.awaitingClubConfirm ? { tone: "neutral" as const, text: t("budgets.countClubConfirm", { count: counts.awaitingClubConfirm }) } : null,
            ].filter((badge): badge is NonNullable<typeof badge> => badge !== null);

            return (
              <li key={budget.id}>
                <Link
                  to={`/workspace/budgets/${budget.id}`}
                  className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4 hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-ring-app"
                >
                  <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border-app bg-bg-app text-muted-app">
                    <AppIcon name="file" />
                  </span>
                  <span className="min-w-0 flex-1 basis-64">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-heading text-base font-semibold break-words">{budget.eventTitle}</span>
                      <AppBadge tone={stateTone(budget.state)}>{stateLabel(t, budget.state)}</AppBadge>
                      {pendingBadges.map((badge) => (
                        <AppBadge key={badge.text} tone={badge.tone}>{badge.text}</AppBadge>
                      ))}
                    </span>
                    <span className="mt-1 block text-sm text-muted-app">
                      {budget.clubName} · {t("budgets.eventOn", { date: day(budget.eventStartAt) })}
                    </span>
                  </span>
                  <span className="grid w-full grid-cols-[1fr_auto] gap-x-6 text-sm tabular-nums sm:w-auto sm:min-w-72">
                    <span className="text-muted-app">{t("budgets.approved")}</span>
                    <span className="text-right font-semibold">{money(budget.approvedTotal)}</span>
                    <span className="text-muted-app">{t("budgets.transferred")}</span>
                    <span className="text-right">{money(budget.disbursedTotal)}</span>
                    {remaining > 0 && budget.state !== "Closed" && budget.state !== "Cancelled" && (
                      <>
                        <span className="text-muted-app">{t("budgets.remaining")}</span>
                        <span className="text-right">{money(remaining)}</span>
                      </>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <AppEmptyState variant="boxed" icon="sparkles" title={t("budgets.none")} message={t("budgets.noneHint")} />
      )}
    </>
  );
}

// Trang ICPDP danh sách ngân sách sự kiện
export function BudgetsPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t("budgets.title")} description={t("budgets.description")} />
      <Gate>{() => <BudgetList />}</Gate>
    </>
  );
}

// Chi tiết một ngân sách sự kiện theo từng hạng mục tài trợ
function BudgetDetailView({ id, csrfToken }: { id: string; csrfToken: string }) {
  const { t, i18n } = useTranslation();
  const budget = useBudget(id, true);
  const sponsored = useSponsoredItems(id);
  const back = { to: "/workspace/budgets", label: t("budgets.back") };

  function day(value: string) {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(value));
  }

  if (budget.isPending || sponsored.isPending) {
    return <div className="space-y-4"><AppSkeleton className="h-10 w-1/2" /><AppSkeleton className="h-96 w-full" /></div>;
  }
  if (budget.isError) {
    return (
      <>
        <PageHeader title={t("budgets.budget")} back={back} />
        <AppNotice tone="danger" role="alert" title={budget.error.message || t("budgets.loadError")}>
          <AppButton variant="secondary" onClick={() => void budget.refetch()}>{t("budgets.retry")}</AppButton>
        </AppNotice>
      </>
    );
  }
  const data = budget.data;
  return (
    <>
      <PageHeader
        title={data.eventTitle}
        back={back}
        description={`${data.clubName} · ${t("budgets.eventOn", { date: day(data.eventStartAt) })}`}
        actions={<AppBadge tone={stateTone(data.state)}>{stateLabel(t, data.state)}</AppBadge>}
      />
      {sponsored.isError ? (
        <AppNotice tone="danger" role="alert">{t("sponsoredItems.error")}</AppNotice>
      ) : sponsored.data ? (
        <SponsoredItems budgetId={id} csrfToken={csrfToken} />
      ) : (
        <AppNotice>{t("budgets.noSponsoredData")}</AppNotice>
      )}
    </>
  );
}

// Trang ICPDP chi tiết một ngân sách sự kiện
export function BudgetDetailPage() {
  const { id } = useParams();
  return <Gate>{(csrfToken) => (id ? <BudgetDetailView id={id} csrfToken={csrfToken} /> : null)}</Gate>;
}
