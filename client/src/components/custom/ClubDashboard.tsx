import { useTranslation } from "react-i18next";

import { DashboardTaskList } from "@/components/custom/DashboardTaskList";
import { AppAreaChart } from "@/components/ui/chart/AppAreaChart";
import { AppBarList } from "@/components/ui/chart/AppBarList";
import { AppChartFrame } from "@/components/ui/chart/AppChartFrame";
import { AppColumnChart } from "@/components/ui/chart/AppColumnChart";
import { AppStatTile } from "@/components/ui/chart/AppStatTile";
import type { ClubDashboardCharts, Dashboard } from "@/services/dashboard";

interface ClubDashboardProps {
  clubId: string;
  data: Dashboard;
  charts: ClubDashboardCharts;
}

/** Club Leader overview: members, events, recruitment and feedback, plus what the club still owes. */
export function ClubDashboard({ clubId, data, charts }: ClubDashboardProps) {
  const { t, i18n } = useTranslation();
  const base = `/club/${encodeURIComponent(clubId)}`;
  function count(key: string) {
    const panel = data.panels.find((item) => item.key === key);
    return panel?.status === "ready" ? panel.count : undefined;
  }
  const number = new Intl.NumberFormat(i18n.language);
  const decimal = new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  // Axis labels stay one short word: "T5" in Vietnamese ("Tháng 5" wraps on a phone), "May" in English.
  function monthName(month: string) {
    return i18n.language.startsWith("vi") ? `T${Number(month.slice(5))}`
      : new Intl.DateTimeFormat(i18n.language, { month: "short", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
  }
  function monthLong(month: string) {
    return new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
  }
  const day = new Intl.DateTimeFormat(i18n.language, { day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
  const members = charts.membersByMonth;
  const active = count("activeMembers");
  const funnel = charts.recruitment ? [
    { key: "submitted", label: t("dashboard.stageSubmitted"), values: [charts.recruitment.submitted] },
    { key: "shortlisted", label: t("dashboard.stageShortlisted"), values: [charts.recruitment.shortlisted] },
    { key: "accepted", label: t("dashboard.stageAccepted"), values: [charts.recruitment.accepted] },
    { key: "onboarded", label: t("dashboard.stageOnboarded"), values: [charts.recruitment.onboarded] },
  ] : [];

  return (
    <div className="space-y-5">
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <li><AppStatTile icon="users" label={t("dashboard.tileMembers")} value={active === undefined ? "–" : number.format(active)}
          href={`${base}/members`} hint={t("dashboard.tileMembersHint", { count: Math.max(0, (members.at(-1)?.count ?? 0) - (active ?? 0)) })} /></li>
        <li><AppStatTile icon="calendar" label={t("dashboard.tileUpcoming")} value={number.format(count("upcomingEvents") ?? 0)}
          href={`${base}/events`} hint={t("dashboard.tileUpcomingHint", { count: count("pendingEventProposals") ?? 0 })} /></li>
        <li><AppStatTile icon="megaphone" label={t("dashboard.tileCampaigns")} value={number.format(count("openCampaigns") ?? 0)}
          href={`${base}/recruitment`} hint={t("dashboard.tileCampaignsHint")} /></li>
        <li><AppStatTile icon="star" label={t("dashboard.tileRating")} href={`${base}/event-feedback`}
          value={charts.feedback.average === undefined ? "–" : `${decimal.format(charts.feedback.average)} / 5`}
          hint={charts.feedback.respondents ? t("dashboard.tileRatingHint", { count: charts.feedback.respondents }) : t("dashboard.tileRatingNone")} /></li>
      </ul>

      <div className="grid gap-5 lg:grid-cols-3">
        <AppChartFrame className="lg:col-span-2" title={t("dashboard.membersTitle")} description={t("dashboard.membersDescription")}
          table={{ label: t("dashboard.tableView"), columns: [t("dashboard.month"), t("dashboard.members")],
            rows: members.map((item) => [monthLong(item.month), item.count]) }}>
          <AppAreaChart seriesLabel={t("dashboard.members")}
            points={members.map((item) => ({ key: item.month, label: monthName(item.month), value: item.count }))} />
        </AppChartFrame>
        <DashboardTaskList title={t("dashboard.tasksTitle")} description={t("dashboard.tasksDescription")} tasks={[
          { key: "overdueReports", label: t("dashboard.overdueReports"), count: count("overdueReports"), href: `${base}/periodic-reports` },
          { key: "missingEvidence", label: t("dashboard.missingEvidence"), count: count("missingEvidence"), href: `${base}/budgets` },
          { key: "openViolations", label: t("dashboard.openViolations"), count: count("openViolations"), href: `${base}/violations` },
          { key: "transitionFollowUps", label: t("dashboard.transitionFollowUps"), count: count("transitionFollowUps"), href: `${base}/transition-plans` },
        ]} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3 lg:items-start">
        <AppChartFrame className="lg:col-span-2" title={t("dashboard.turnoutTitle")} description={t("dashboard.turnoutDescription")}
          legend={[{ label: t("dashboard.registered"), tone: "chart-1" }, { label: t("dashboard.attended"), tone: "chart-2" }]}
          table={{ label: t("dashboard.tableView"), columns: [t("dashboard.event"), t("dashboard.registered"), t("dashboard.attended")],
            rows: charts.eventTurnout.map((item) => [item.title, item.registered, item.attended]) }}>
          {charts.eventTurnout.length ? <AppColumnChart tones={["chart-1", "chart-2"]} seriesLabels={[t("dashboard.registered"), t("dashboard.attended")]}
            points={charts.eventTurnout.map((item) => ({ key: item.eventId, label: day.format(new Date(item.startAt)), title: item.title,
              values: [item.registered, item.attended] }))} />
            : <p className="py-6 text-center text-sm text-muted-app">{t("dashboard.noData")}</p>}
        </AppChartFrame>
        <div className="flex flex-col gap-5">
          <AppChartFrame title={t("dashboard.funnelTitle")}
            description={charts.recruitment ? t("dashboard.funnelDescription", { title: charts.recruitment.title }) : undefined}
            table={{ label: t("dashboard.tableView"), columns: [t("dashboard.stage"), t("dashboard.applicants")],
              rows: funnel.map((row) => [row.label, row.values[0]!]) }}>
            <AppBarList rows={funnel} tones={["chart-1"]} seriesLabels={[t("dashboard.applicants")]} emptyLabel={t("dashboard.funnelNone")} />
          </AppChartFrame>
          <AppChartFrame title={t("dashboard.ratingTitle")} description={t("dashboard.ratingDescription")}
            table={{ label: t("dashboard.tableView"), columns: [t("dashboard.rating"), t("dashboard.responses")],
              rows: charts.feedback.distribution.map((value, index) => [t("dashboard.stars", { count: index + 1 }), value]) }}>
            {charts.feedback.respondents ? <AppBarList tones={["chart-1"]} seriesLabels={[t("dashboard.responses")]} emptyLabel={t("dashboard.noData")}
              rows={charts.feedback.distribution.map((value, index) => ({ key: String(index + 1), label: t("dashboard.stars", { count: index + 1 }), values: [value] })).reverse()} />
              : <p className="py-6 text-center text-sm text-muted-app">{t("dashboard.tileRatingNone")}</p>}
          </AppChartFrame>
          <DashboardTaskList variant="neutral" title={t("dashboard.clubRecordsTitle")} description={t("dashboard.clubRecordsDescription")}
            tasks={[
              { key: "currentTerms", label: t("dashboard.currentTerms"), count: count("currentTerms"), href: `${base}/board-history` },
              { key: "structureHistory", label: t("dashboard.structureHistory"), count: count("structureHistory"), href: `${base}/board-history` },
              { key: "upcomingBookings", label: t("dashboard.upcomingBookings"), count: count("upcomingBookings"), href: `${base}/bookings` },
              { key: "activeBudgets", label: t("dashboard.activeBudgets"), count: count("activeBudgets"), href: `${base}/budgets` },
            ].filter((task) => data.panels.some((item) => item.key === task.key))} />
        </div>
      </div>
    </div>
  );
}
