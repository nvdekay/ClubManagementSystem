import { useTranslation } from "react-i18next";

import { DashboardTaskList } from "@/components/custom/DashboardTaskList";
import { AppBarList } from "@/components/ui/chart/AppBarList";
import { AppChartFrame } from "@/components/ui/chart/AppChartFrame";
import { AppColumnChart } from "@/components/ui/chart/AppColumnChart";
import { AppMeter } from "@/components/ui/chart/AppMeter";
import { AppStatTile } from "@/components/ui/chart/AppStatTile";
import type { Dashboard, IcpdpDashboardCharts } from "@/services/dashboard";

const queueHref: Record<string, string> = {
  CLUB_APPLICATION: "/workspace/reviews",
  EVENT_PROPOSAL: "/workspace/event-proposals",
  PERIODIC_REPORT: "/workspace/periodic-reports",
  POST_EVENT_REPORT: "/workspace/event-reports",
  PROPERTY_BOOKING: "/workspace/bookings",
  BOARD_NOMINATION: "/workspace/board-nominations",
  TRANSITION_PLAN: "/workspace/leadership-transitions",
  SUSPENSION_REQUEST: "/workspace/suspension-requests",
  BUDGET_SETTLEMENT: "/workspace/budgets",
};

interface IcpdpDashboardProps {
  data: Dashboard;
  charts: IcpdpDashboardCharts;
}

/** ICPDP overview: headline numbers, the review queues, the event calendar and where clubs stand. */
export function IcpdpDashboard({ data, charts }: IcpdpDashboardProps) {
  const { t, i18n } = useTranslation();
  function count(key: string) {
    const panel = data.panels.find((item) => item.key === key);
    return panel?.status === "ready" ? panel.count : undefined;
  }
  const number = new Intl.NumberFormat(i18n.language);
  const money = new Intl.NumberFormat(i18n.language, { notation: "compact", maximumFractionDigits: 1 });
  // Axis labels stay one short word: "T5" in Vietnamese ("Tháng 5" wraps on a phone), "May" in English.
  function monthName(month: string) {
    return i18n.language.startsWith("vi") ? `T${Number(month.slice(5))}`
      : new Intl.DateTimeFormat(i18n.language, { month: "short", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
  }
  function monthLong(month: string) {
    return new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
  }
  const current = charts.eventsByMonth.at(-3);
  const next = charts.eventsByMonth.at(-2);
  const overdue = charts.queues.reduce((sum, queue) => sum + queue.overdue, 0);
  const pending = charts.queues.reduce((sum, queue) => sum + queue.onTime + queue.overdue, 0);
  function state(name: string) {
    return charts.clubsByState.find((item) => item.state === name)?.count ?? 0;
  }
  const queueRows = charts.queues.map((queue) => ({ key: queue.entityType,
    label: t(`dashboard.queue_${queue.entityType}` as "dashboard.queue_EVENT_PROPOSAL", { defaultValue: queue.entityType }),
    values: [queue.onTime, queue.overdue], href: queueHref[queue.entityType] }));
  const fieldRows = charts.clubsByField.map((item) => ({ key: item.field || "none",
    label: item.field === "other" ? t("dashboard.otherFields") : item.field || t("dashboard.noField"), values: [item.count] }));
  const violations = count("openViolations");

  return (
    <div className="space-y-5">
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <li><AppStatTile icon="inbox" label={t("dashboard.tilePending")} value={number.format(pending)} href="/workspace/reviews"
          tone={overdue ? "attention" : "default"}
          hint={overdue ? t("dashboard.tilePendingHint", { count: overdue }) : t("dashboard.tilePendingHintNone")} /></li>
        <li><AppStatTile icon="compass" label={t("dashboard.tileActiveClubs")} value={number.format(state("Active"))} href="/icpdp/clubs"
          hint={t("dashboard.tileActiveClubsHint", { suspended: state("Suspended"), dissolving: state("Dissolving") })} /></li>
        <li><AppStatTile icon="calendar" label={t("dashboard.tileEventsMonth")} value={number.format(current?.count ?? 0)}
          href="/workspace/event-proposals" hint={t("dashboard.tileEventsMonthHint", { count: next?.count ?? 0 })} /></li>
        <li><AppStatTile icon="shield" label={t("dashboard.tileViolations")} value={violations === undefined ? "–" : number.format(violations)}
          href="/workspace/violations" tone={violations ? "attention" : "default"} hint={t("dashboard.tileViolationsHint")} /></li>
      </ul>

      <div className="grid gap-5 lg:grid-cols-3">
        <AppChartFrame className="lg:col-span-2" title={t("dashboard.queueTitle")} description={t("dashboard.queueDescription")}
          legend={[{ label: t("dashboard.onTime"), tone: "chart-1" }, { label: t("dashboard.overdue"), tone: "danger" }]}
          table={{ label: t("dashboard.tableView"), columns: [t("dashboard.queueType"), t("dashboard.onTime"), t("dashboard.overdue")],
            rows: queueRows.map((row) => [row.label, row.values[0]!, row.values[1]!]) }}>
          <AppBarList rows={queueRows} tones={["chart-1", "danger"]} seriesLabels={[t("dashboard.onTime"), t("dashboard.overdue")]}
            emptyLabel={t("dashboard.queueEmpty")} />
        </AppChartFrame>
        <DashboardTaskList title={t("dashboard.needsAttention")} description={t("dashboard.needsAttentionDescription")} tasks={[
          { key: "overdueApprovals", label: t("dashboard.overdueApprovals"), count: count("overdueApprovals"), href: "/workspace/reviews" },
          { key: "overdueReports", label: t("dashboard.overdueReports"), count: count("overdueReports"), href: "/workspace/periodic-reports" },
          { key: "overdueSettlements", label: t("dashboard.overdueSettlements"), count: count("overdueSettlements"), href: "/workspace/budgets" },
          { key: "overdueRefunds", label: t("dashboard.overdueRefunds"), count: count("overdueRefunds"), href: "/workspace/budgets" },
          { key: "unreconciledBudgets", label: t("dashboard.unreconciledBudgets"), count: count("unreconciledBudgets"), href: "/workspace/budgets" },
        ]} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3 lg:items-start">
        <AppChartFrame className="lg:col-span-2" title={t("dashboard.eventsTitle")} description={t("dashboard.eventsDescription")}
          table={{ label: t("dashboard.tableView"), columns: [t("dashboard.month"), t("dashboard.events")],
            rows: charts.eventsByMonth.map((item) => [monthLong(item.month), item.count]) }}>
          <AppColumnChart tones={["chart-1"]} seriesLabels={[t("dashboard.events")]}
            points={charts.eventsByMonth.map((item) => ({ key: item.month, label: monthName(item.month), title: monthLong(item.month),
              values: [item.count], emphasized: item.month === current?.month }))} />
        </AppChartFrame>
        <div className="flex flex-col gap-5">
          <AppChartFrame title={t("dashboard.budgetTitle")}
            description={charts.budget.periodCode ? t("dashboard.budgetDescription", { period: charts.budget.periodCode }) : t("dashboard.budgetNoSemester")}>
            <p className="font-heading text-3xl font-semibold text-text-app">{money.format(charts.budget.disbursed)} ₫</p>
            <div className="mt-3">
              <AppMeter label={t("dashboard.budgetDisbursed")} value={charts.budget.disbursed} max={charts.budget.approved}
                valueText={t("dashboard.budgetApproved", { amount: `${money.format(charts.budget.approved)} ₫` })} />
            </div>
          </AppChartFrame>
          <AppChartFrame title={t("dashboard.fieldsTitle")} description={t("dashboard.fieldsDescription")}
            table={{ label: t("dashboard.tableView"), columns: [t("dashboard.field"), t("dashboard.clubs")],
              rows: fieldRows.map((row) => [row.label, row.values[0]!]) }}>
            <AppBarList rows={fieldRows} tones={["chart-1"]} seriesLabels={[t("dashboard.clubs")]} emptyLabel={t("dashboard.noData")} />
          </AppChartFrame>
          <DashboardTaskList variant="neutral" title={t("dashboard.oversightTitle")} description={t("dashboard.oversightDescription")} tasks={[
            { key: "internalEvents", label: t("dashboard.internalEvents"), count: count("internalEvents"), href: "/workspace/internal-events" },
            { key: "pendingReports", label: t("dashboard.pendingReports"), count: count("pendingReports"), href: "/workspace/periodic-reports" },
            { key: "upcomingBookings", label: t("dashboard.upcomingBookings"), count: count("upcomingBookings"), href: "/workspace/bookings" },
            { key: "boardHistory", label: t("dashboard.boardHistory"), count: count("boardHistory"), href: "/icpdp/clubs" },
          ]} />
        </div>
      </div>
    </div>
  );
}
