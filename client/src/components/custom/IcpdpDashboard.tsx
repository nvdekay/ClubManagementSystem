import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { DashboardTaskList } from "@/components/custom/DashboardTaskList";
import { AppBarList } from "@/components/ui/chart/AppBarList";
import { AppChartFrame } from "@/components/ui/chart/AppChartFrame";
import { AppColumnChart } from "@/components/ui/chart/AppColumnChart";
import { AppDonut } from "@/components/ui/chart/AppDonut";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppSparkline } from "@/components/ui/chart/AppSparkline";
import { AppStackBar } from "@/components/ui/chart/AppStackBar";
import type { ChartTone } from "@/components/ui/chart/chartScale";
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
    // Complaint tasks have no dashboard.queue_* key; reuse the ICPDP menu label instead of showing the raw code.
    label: queue.entityType === "COMPLAINT" ? t("common.icpdpComplaints")
      : t(`dashboard.queue_${queue.entityType}` as "dashboard.queue_EVENT_PROPOSAL", { defaultValue: queue.entityType }),
    values: [queue.onTime, queue.overdue], href: queueHref[queue.entityType] }));
  const fieldRows = charts.clubsByField.map((item) => ({ key: item.field || "none",
    label: item.field === "other" ? t("dashboard.otherFields") : item.field || t("dashboard.noField"), values: [item.count] }));
  const violations = count("openViolations");

  const onTime = pending - overdue;
  // The queues holding late work, worst first, so the SLA card says where to act.
  const lateQueues = queueRows.filter((row) => (row.values[1] ?? 0) > 0).sort((a, b) => b.values[1]! - a.values[1]!).slice(0, 4);
  const stateTone: Record<string, ChartTone> = { Active: "success", Suspended: "warning", Dissolving: "danger" };
  const stateOrder = ["Active", "Suspended", "Dissolving"];
  function rank(state: string) { return stateOrder.includes(state) ? stateOrder.indexOf(state) : stateOrder.length; }
  const stateSegments = [...charts.clubsByState].sort((a, b) => rank(a.state) - rank(b.state)).map((item) => ({ key: item.state,
    label: t(`clubLifecycle.state_${item.state}` as "clubLifecycle.state_Active", { defaultValue: item.state }),
    value: item.count, tone: stateTone[item.state] ?? "muted" }));
  const totalClubs = charts.clubsByState.reduce((sum, item) => sum + item.count, 0);
  const remaining = Math.max(0, charts.budget.approved - charts.budget.disbursed);
  const disbursedShare = charts.budget.approved ? Math.round((charts.budget.disbursed / charts.budget.approved) * 100) : 0;
  const currentIndex = charts.eventsByMonth.length - 3;
  const oversight = [
    { key: "internalEvents", icon: "users" as const, label: t("dashboard.internalEvents"), href: "/workspace/internal-events" },
    { key: "pendingReports", icon: "clipboard" as const, label: t("dashboard.pendingReports"), href: "/workspace/periodic-reports" },
    { key: "upcomingBookings", icon: "mapPin" as const, label: t("dashboard.upcomingBookings"), href: "/workspace/bookings" },
    { key: "boardHistory", icon: "crown" as const, label: t("dashboard.boardHistory"), href: "/icpdp/clubs" },
  ];

  return (
    <div className="space-y-5">
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <li><AppStatTile icon="inbox" label={t("dashboard.tilePending")} value={number.format(pending)} href="/workspace/reviews"
          tone={overdue ? "attention" : "default"}
          hint={overdue ? t("dashboard.tilePendingHint", { count: overdue }) : t("dashboard.tilePendingHintNone")}
          chart={<AppStackBar formatValue={(value) => number.format(value)} segments={[
            { key: "onTime", label: t("dashboard.onTime"), value: onTime, tone: "chart-2" },
            { key: "overdue", label: t("dashboard.overdue"), value: overdue, tone: "danger" }]} />} /></li>
        <li><AppStatTile icon="building" label={t("dashboard.tileActiveClubs")} value={number.format(state("Active"))} href="/icpdp/clubs"
          hint={t("dashboard.tileActiveClubsHint", { suspended: state("Suspended"), dissolving: state("Dissolving") })}
          chart={<AppStackBar formatValue={(value) => number.format(value)} segments={stateSegments} />} /></li>
        <li><AppStatTile icon="calendar" label={t("dashboard.tileEventsMonth")} value={number.format(current?.count ?? 0)}
          href="/workspace/event-proposals" hint={t("dashboard.tileEventsMonthHint", { count: next?.count ?? 0 })}
          chart={<AppSparkline values={charts.eventsByMonth.map((item) => item.count)} highlight={currentIndex} />} /></li>
        <li><AppStatTile icon="scale" label={t("dashboard.tileViolations")} value={violations === undefined ? "–" : number.format(violations)}
          href="/workspace/violations" tone={violations ? "attention" : "default"} hint={t("dashboard.tileViolationsHint")} /></li>
      </ul>

      <div className="grid gap-5 lg:grid-cols-3">
        <AppChartFrame className="lg:col-span-2" title={t("dashboard.queueTitle")} description={t("dashboard.queueDescription")}
          legend={[{ label: t("dashboard.onTime"), tone: "chart-2" }, { label: t("dashboard.overdue"), tone: "danger" }]}
          table={{ label: t("dashboard.tableView"), columns: [t("dashboard.queueType"), t("dashboard.onTime"), t("dashboard.overdue")],
            rows: queueRows.map((row) => [row.label, row.values[0]!, row.values[1]!]) }}>
          <AppBarList rows={queueRows} tones={["chart-2", "danger"]} seriesLabels={[t("dashboard.onTime"), t("dashboard.overdue")]}
            emptyLabel={t("dashboard.queueEmpty")} />
        </AppChartFrame>
        <AppChartFrame title={t("dashboard.slaTitle")} description={t("dashboard.slaDescription")}>
          <AppDonut label={`${t("dashboard.slaTitle")}: ${pending ? Math.round((onTime / pending) * 100) : 100}%`}
            centerValue={pending ? `${Math.round((onTime / pending) * 100)}%` : "–"} centerLabel={t("dashboard.slaCenter")}
            formatValue={(value) => number.format(value)} segments={[
              { key: "onTime", label: t("dashboard.onTime"), value: onTime, tone: "chart-2" },
              { key: "overdue", label: t("dashboard.overdue"), value: overdue, tone: "danger" }]} />
          <div className="mt-5 border-t border-border-app pt-4">
            <h4 className="text-sm font-medium text-text-app">{t("dashboard.slaWorst")}</h4>
            {lateQueues.length ? <ul className="mt-2 divide-y divide-border-app">
              {lateQueues.map((row) => <li key={row.key}>
                <Link to={row.href ?? "/workspace/reviews"} className="flex items-center gap-3 rounded-md py-2 text-sm hover:text-primary-app focus-visible:outline-2 focus-visible:outline-ring-app">
                  <span className="min-w-0 flex-1 text-text-app">{row.label}</span>
                  <span className="rounded-md bg-danger-app/10 px-1.5 py-0.5 text-xs font-medium text-danger-app tabular-nums">{number.format(row.values[1]!)}</span>
                  <AppIcon name="chevronRight" className="size-4 text-muted-app" />
                </Link></li>)}
            </ul> : <p className="mt-2 flex items-center gap-2 text-sm text-success-app"><AppIcon name="check" className="size-4" />{t("dashboard.allClear")}</p>}
          </div>
        </AppChartFrame>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <AppChartFrame className="lg:col-span-2" title={t("dashboard.eventsTitle")} description={t("dashboard.eventsDescription")}
          table={{ label: t("dashboard.tableView"), columns: [t("dashboard.month"), t("dashboard.events")],
            rows: charts.eventsByMonth.map((item) => [monthLong(item.month), item.count]) }}>
          <AppColumnChart tones={["chart-1"]} seriesLabels={[t("dashboard.events")]}
            points={charts.eventsByMonth.map((item) => ({ key: item.month, label: monthName(item.month), title: monthLong(item.month),
              values: [item.count], emphasized: item.month === current?.month }))} />
        </AppChartFrame>
        <AppChartFrame title={t("dashboard.statesTitle")} description={t("dashboard.statesDescription")}
          table={{ label: t("dashboard.tableView"), columns: [t("dashboard.statesTitle"), t("dashboard.clubs")],
            rows: stateSegments.map((item) => [item.label, item.value]) }}>
          <AppDonut label={`${t("dashboard.statesTitle")}: ${number.format(totalClubs)}`} centerValue={number.format(totalClubs)}
            centerLabel={t("dashboard.statesCenter")} formatValue={(value) => number.format(value)} segments={stateSegments} />
        </AppChartFrame>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <AppChartFrame title={t("dashboard.fieldsTitle")} description={t("dashboard.fieldsDescription")}
          table={{ label: t("dashboard.tableView"), columns: [t("dashboard.field"), t("dashboard.clubs")],
            rows: fieldRows.map((row) => [row.label, row.values[0]!]) }}>
          <AppBarList rows={fieldRows} tones={["chart-1"]} seriesLabels={[t("dashboard.clubs")]} emptyLabel={t("dashboard.noData")} />
        </AppChartFrame>
        <AppChartFrame title={t("dashboard.budgetTitle")}
          description={charts.budget.periodCode ? t("dashboard.budgetDescription", { period: charts.budget.periodCode }) : t("dashboard.budgetNoSemester")}>
          <AppDonut label={`${t("dashboard.budgetDisbursed")}: ${disbursedShare}%`} centerValue={`${disbursedShare}%`}
            centerLabel={t("dashboard.budgetCenter")} formatValue={(value) => `${money.format(value)} ₫`} segments={[
              { key: "disbursed", label: t("dashboard.budgetDisbursed"), value: charts.budget.disbursed, tone: "chart-1" },
              { key: "remaining", label: t("dashboard.budgetRemaining"), value: remaining, tone: "muted" }]} />
          <p className="mt-4 border-t border-border-app pt-3 text-xs text-muted-app">
            {t("dashboard.budgetApproved", { amount: `${money.format(charts.budget.approved)} ₫` })}</p>
        </AppChartFrame>
        <DashboardTaskList title={t("dashboard.needsAttention")} description={t("dashboard.needsAttentionDescription")} tasks={[
          { key: "overdueApprovals", label: t("dashboard.overdueApprovals"), count: count("overdueApprovals"), href: "/workspace/reviews" },
          { key: "overdueReports", label: t("dashboard.overdueReports"), count: count("overdueReports"), href: "/workspace/periodic-reports" },
          { key: "overdueSettlements", label: t("dashboard.overdueSettlements"), count: count("overdueSettlements"), href: "/workspace/budgets" },
          { key: "overdueRefunds", label: t("dashboard.overdueRefunds"), count: count("overdueRefunds"), href: "/workspace/budgets" },
          { key: "unreconciledBudgets", label: t("dashboard.unreconciledBudgets"), count: count("unreconciledBudgets"), href: "/workspace/budgets" },
        ]} />
      </div>

      <section aria-labelledby="oversight-title">
        <div className="mb-3">
          <h3 id="oversight-title" className="font-heading text-base font-semibold text-text-app">{t("dashboard.oversightTitle")}</h3>
          <p className="mt-0.5 text-sm text-muted-app">{t("dashboard.oversightDescription")}</p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {oversight.map((item) => {
            const value = count(item.key);
            return <li key={item.key}><AppStatTile icon={item.icon} label={item.label} href={item.href}
              value={value === undefined ? "–" : number.format(value)} /></li>;
          })}
        </ul>
      </section>
    </div>
  );
}
