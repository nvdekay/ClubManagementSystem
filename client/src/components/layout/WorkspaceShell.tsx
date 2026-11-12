import { type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router";

import { UniversityLogo } from "@/components/custom/UniversityLogo";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { SidebarAccountMenu } from "@/components/layout/SidebarAccountMenu";
import { AppIcon, type AppIconName } from "@/components/ui/icon/AppIcon";
import { common } from "@/i18n/common";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth, useLogout } from "@/hooks/useAuth";
import { usePageTransition } from "@/hooks/usePageTransition";
import type { Workspace } from "@/services/auth";
import { cn } from "@/utils/cn";
import { workspaceIcon } from "@/utils/workspaceIcon";

type Context = { kind: "student" } | { kind: "icpdp" } | { kind: "club"; clubId: string };

interface NavItem {
  to: string;
  label: string;
  icon: AppIconName;
  end?: boolean;
}

/** A parent entry that folds its children; it opens by itself while one of them is the current page. */
interface NavGroup {
  group: string;
  label: string;
  icon: AppIconName;
  children: NavItem[];
}

type NavEntry = NavItem | NavGroup;

/** A folding parent only when it has two or more visible children; one child stays a plain link, none hides it. */
function group(key: string, label: string, icon: AppIconName, children: NavItem[]): NavEntry[] {
  if (children.length > 1) return [{ group: key, label, icon, children }];
  return children;
}

const linkClass = "relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-app transition-colors hover:bg-surface-app hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app";
const activeLinkClass = "bg-surface-app text-text-app hover:bg-surface-app";
/** Orange marker on the sidebar edge beside the active top-level entry. */
const markerClass = "before:absolute before:top-2 before:bottom-2 before:-left-3 before:w-1 before:rounded-r-full before:bg-brand-app";

const collapsedKey = "sidebarCollapsed";

function readCollapsed(): boolean {
  try { return localStorage.getItem(collapsedKey) === "1"; } catch { return false; }
}

function isCurrent(item: NavItem, pathname: string): boolean {
  return pathname === item.to || (!item.end && pathname.startsWith(`${item.to}/`));
}

const studentPrefixes = ["/student", "/workspace/applications", "/workspace/recruitment",
  "/workspace/event-registrations", "/workspace/complaints", "/workspace/clubs"];

/** The workspace a management URL belongs to; the sidebar and access check follow it. */
function contextFor(pathname: string): Context {
  const club = /^\/club\/([^/]+)/.exec(pathname);
  if (club) return { kind: "club", clubId: decodeURIComponent(club[1]!) };
  if (studentPrefixes.some((prefix) => pathname.startsWith(prefix))) return { kind: "student" };
  return { kind: "icpdp" };
}

function matches(workspace: Workspace, context: Context): boolean {
  return workspace.kind === context.kind
    && (context.kind !== "club" || workspace.clubId === context.clubId);
}

/** Left-sidebar frame for every Student, ICPDP and club management screen. */
export function WorkspaceShell() {
  const { t } = useTranslation();
  const location = useLocation();
  const auth = useAuth();
  const logout = useLogout();
  // The drawer remembers the path it was opened on, so navigating closes it without an effect.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === location.pathname;
  const menuButton = useRef<HTMLButtonElement>(null);
  // Explicit open/closed choices per group; a group without one follows the current page.
  const [folded, setFolded] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const pageRef = usePageTransition<HTMLDivElement>();
  // Collapsed sidebar: the entry whose hover/focus flyout is showing, anchored to that icon's row.
  const [flyout, setFlyout] = useState<{ key: string; top?: number; bottom?: number } | null>(null);
  const context = contextFor(location.pathname);
  const workspace = auth.data?.workspaces.find((item) => matches(item, context));

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") { setMenuPath(null); menuButton.current?.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (workspace) sessionStorage.setItem("workspace", `${workspace.kind}:${workspace.clubId ?? ""}`);
  }, [workspace]);

  if (auth.isPending) {
    return <div className="flex h-full">
      <div className={cn("hidden w-72 shrink-0 border-r border-border-app bg-sidebar-app p-5 lg:block", { "w-18 p-3": collapsed })}>
        <AppSkeleton className="h-9 w-full" /><AppSkeleton className="mt-8 h-14 w-full" />
        <div className="mt-8 space-y-3">{[0, 1, 2, 3].map((item) => <AppSkeleton key={item} className="h-9 w-full" />)}</div>
      </div>
      <div className="flex-1 space-y-4 p-6 sm:p-10"><AppSkeleton className="h-10 w-1/2" /><AppSkeleton className="h-64 w-full" /></div>
    </div>;
  }
  if (!auth.data) {
    const params = new URLSearchParams({ returnTo: `${location.pathname}${location.search}` });
    return <Navigate to={`/login?${params.toString()}`} replace />;
  }

  const me = auth.data;
  const nav = navigation(context, workspace, t);
  const crumbs = breadcrumb(nav, location.pathname, workspaceNameFor(context, workspace, t));
  const workspaceName = workspaceNameFor(context, workspace, t);
  const roleName = workspace?.kind === "club" && workspace.role ? t(`auth.${workspace.role}`)
    : context.kind === "icpdp" ? t("auth.officerRole") : t("auth.student");

  function setSidebarCollapsed(next: boolean) {
    setCollapsed(next);
    try { localStorage.setItem(collapsedKey, next ? "1" : "0"); } catch { /* The choice just lasts this visit. */ }
  }

  /** Anchors the flyout to the hovered row, opening upwards when the row sits low on the screen. */
  function openFlyout(key: string, row: HTMLElement) {
    const rect = row.getBoundingClientRect();
    setFlyout(rect.top > window.innerHeight * 0.6
      ? { key, bottom: window.innerHeight - rect.bottom }
      : { key, top: rect.top });
  }

  /** Collapsed-sidebar row: the icon plus, on hover or keyboard focus, a panel with its label or its tabs. */
  function compactEntry(key: string, icon: ReactNode, title: string, children?: NavItem[]) {
    const shown = flyout?.key === key;
    return <li key={key} className="relative"
      onMouseEnter={(event) => openFlyout(key, event.currentTarget)}
      onMouseLeave={() => setFlyout(null)}
      onFocus={(event) => openFlyout(key, event.currentTarget)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFlyout(null); }}
      onKeyDown={(event) => { if (event.key === "Escape") setFlyout(null); }}>
      {icon}
      {/* Fixed so the nav's scroll box can't clip it; the transparent left padding bridges the gap
          between icon and panel, so moving the pointer across it keeps the flyout open. */}
      {shown && <div className="fixed left-15 z-50 pl-4" style={{ top: flyout.top, bottom: flyout.bottom }}>
        <div className="min-w-52 rounded-xl border border-border-app bg-bg-app p-1.5 shadow-lg transition-[opacity,translate] duration-150 ease-out starting:-translate-x-1 starting:opacity-0">
          {children ? <>
            <p className="px-2.5 pt-1.5 pb-1 text-xs font-medium tracking-wide text-muted-app uppercase">{title}</p>
            <ul className="space-y-0.5">{children.map((child) => <li key={child.to}>{navLink(child, false, true, () => setFlyout(null))}</li>)}</ul>
          </> : <p className="px-2.5 py-1.5 text-sm font-medium text-text-app">{title}</p>}
        </div>
      </div>}
    </li>;
  }

  function navLink(item: NavItem, compact: boolean, nested = false, onNavigate?: () => void) {
    return <NavLink to={item.to} end={item.end} aria-label={compact ? item.label : undefined} onClick={onNavigate}
      className={({ isActive }) => cn(linkClass, { [activeLinkClass]: isActive, [markerClass]: isActive && !nested, "justify-center px-0": compact })}>
      {({ isActive }) => <>
        <AppIcon name={item.icon} className={cn("size-4.5 shrink-0", { "text-brand-app": isActive })} />
        {!compact && <span className="min-w-0 flex-1">{item.label}</span>}
      </>}
    </NavLink>;
  }

  async function signOut() {
    try {
      await logout.mutateAsync(me.csrfToken);
      sessionStorage.removeItem("workspace");
    } catch {
      // logout.isError is shown in the sidebar footer.
    }
  }

  function switcher(compact: boolean) {
    return (
        <Link to="/workspace" title={compact ? undefined : t("auth.switchWorkspace")} aria-label={compact ? `${workspaceName} · ${t("auth.switchWorkspace")}` : undefined}
          className={cn("group flex items-center gap-3 rounded-xl border border-border-app bg-bg-app px-3 py-2.5 shadow-xs transition-colors hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-ring-app", { "justify-center border-transparent bg-transparent px-0 py-0 shadow-none": compact })}>
          <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft-app text-brand-app">
            <AppIcon name={workspaceIcon(context.kind)} className="size-4.5" />
          </span>
          {!compact && <>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-sm font-semibold break-words text-text-app" title={workspaceName}>{workspaceName}</span>
              <span className="block text-xs text-muted-app">{roleName}<span className="sr-only"> · {t("auth.switchWorkspace")}</span></span>
            </span>
            <AppIcon name="chevronRight" className="size-4 text-muted-app group-hover:text-text-app" />
          </>}
        </Link>
    );
  }

  function sidebar(compact: boolean) {
    const toggleLabel = compact ? t("common.expandSidebar") : t("common.collapseSidebar");
    return <div className="flex h-full flex-col">
      <div className={cn("flex items-center justify-between gap-3 px-5 pt-5", { "justify-center px-3": compact })}>
        {!compact && <Link to="/" aria-label={t("auth.brand")} className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
          <UniversityLogo alt={t("auth.schoolLogo")} className="w-38" />
        </Link>}
        <button type="button" onClick={() => setSidebarCollapsed(!compact)} aria-label={toggleLabel} title={toggleLabel} aria-expanded={!compact}
          className="hidden size-10 shrink-0 items-center justify-center rounded-full text-muted-app transition-colors hover:bg-surface-strong-app hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app lg:flex">
          <AppIcon name="panelLeft" />
        </button>
        <button type="button" onClick={() => setMenuPath(null)} aria-label={t("common.closeMenu")}
          className="flex size-10 items-center justify-center rounded-full text-muted-app hover:bg-surface-strong-app focus-visible:outline-2 focus-visible:outline-ring-app lg:hidden">
          <AppIcon name="close" />
        </button>
      </div>

      {/* Collapsed: the switcher shows workspace + role in the same flyout as the menu icons, not a browser tooltip. */}
      {compact ? <ul className="mt-5 px-3">{compactEntry("workspace-switcher", switcher(true), `${workspaceName} · ${roleName}`)}</ul>
        : <div className="mx-3 mt-5">{switcher(false)}</div>}

      <div className={cn("mx-5 mt-5 border-t border-border-app", { "mx-3": compact })} />
      <nav aria-label={t("common.workspaceNav")} className="mt-4 flex-1 overflow-y-auto px-3 pb-4">
        {nav.map((section) => section.items.length > 0 && (
          <div key={section.title} className={cn("mb-5", { "mb-3 border-b border-border-app pb-3 last:border-b-0": compact })}>
            {!compact && <p className="px-3 pb-2 text-xs font-medium tracking-wide text-muted-app uppercase">{section.title}</p>}
            <ul className="space-y-0.5">{section.items.map((entry) => {
              if (!("group" in entry)) return compact
                ? compactEntry(entry.to, navLink(entry, true), entry.label)
                : <li key={entry.to}>{navLink(entry, false)}</li>;
              const containsCurrent = entry.children.some((child) => isCurrent(child, location.pathname));
              // Collapsed: hovering shows the group's tabs in a flyout; clicking still reopens the sidebar on it.
              if (compact) return compactEntry(entry.group,
                <button type="button" aria-label={entry.label} aria-haspopup="true" aria-expanded={flyout?.key === entry.group}
                  onClick={() => { setFolded({ ...folded, [entry.group]: false }); setSidebarCollapsed(false); setFlyout(null); }}
                  className={cn(linkClass, "w-full justify-center px-0", { [activeLinkClass]: containsCurrent, [markerClass]: containsCurrent })}>
                  <AppIcon name={entry.icon} className={cn("size-4.5 shrink-0", { "text-brand-app": containsCurrent })} />
                </button>, entry.label, entry.children);
              const open = folded[entry.group] === undefined ? containsCurrent : !folded[entry.group];
              const listId = `nav-group-${entry.group}`;
              return <li key={entry.group}>
                <button type="button" aria-expanded={open} aria-controls={listId}
                  title={t("common.toggleGroup", { group: entry.label })}
                  onClick={() => setFolded({ ...folded, [entry.group]: open })}
                  className={cn(linkClass, "w-full text-left", { [cn("text-text-app", markerClass)]: containsCurrent })}>
                  <AppIcon name={entry.icon} className={cn("size-4.5 shrink-0", { "text-brand-app": containsCurrent })} />
                  <span className="min-w-0 flex-1">{entry.label}</span>
                  <AppIcon name="chevronRight" className={cn("size-4 transition-transform", { "rotate-90": open })} />
                </button>
                {/* Always rendered so opening/closing slides (0fr → 1fr rows) instead of making the menu jump; inert while closed. */}
                <div inert={!open} className={cn("grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 ease-out", { "grid-rows-[1fr]": open })}>
                  <div className="min-h-0 overflow-hidden">
                    <ul id={listId} className="mt-1 ml-5 space-y-0.5 border-l border-border-app pl-2">
                      {entry.children.map((child) => <li key={child.to}>{navLink(child, false, true)}</li>)}
                    </ul>
                  </div>
                </div>
              </li>;
            })}</ul>
          </div>
        ))}
      </nav>

      <div className={cn("border-t border-border-app px-3 py-3", { "px-1": compact })}>
        <SidebarAccountMenu user={me.user} compact={compact} signingOut={logout.isPending} onSignOut={() => void signOut()} />
        {logout.isError && <p role="alert" className="mt-2 px-2 text-xs text-danger-app">{t("auth.logoutError")}</p>}
      </div>
    </div>;
  }

  return (
    <div className="flex min-h-full">
      {/* z-40: sticky makes the aside its own stacking layer, and the collapsed flyouts inside it must sit above page content. */}
      <aside className={cn("sticky top-0 z-40 hidden h-dvh w-72 shrink-0 border-r border-border-app bg-sidebar-app transition-[width] duration-200 lg:block", { "w-18": collapsed })}>{sidebar(collapsed)}</aside>

      {menuOpen && <div className="fixed inset-0 z-40 lg:hidden">
        <button type="button" aria-label={t("common.closeMenu")} tabIndex={-1} onClick={() => setMenuPath(null)}
          className="absolute inset-0 bg-backdrop-app transition-opacity duration-200 starting:opacity-0" />
        <aside className="absolute inset-y-0 left-0 w-[min(18rem,85vw)] border-r border-border-app bg-sidebar-app shadow-xl transition-transform duration-200 ease-out starting:-translate-x-full">{sidebar(false)}</aside>
      </div>}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-border-app bg-bg-app/90 px-4 py-2 backdrop-blur sm:px-8">
          <button ref={menuButton} type="button" onClick={() => setMenuPath(location.pathname)} aria-label={t("common.openMenu")} aria-expanded={menuOpen}
            className="flex size-11 items-center justify-center rounded-lg text-text-app hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-ring-app lg:hidden">
            <AppIcon name="menu" />
          </button>
          <span className="min-w-0 flex-1 lg:hidden">
            <span className="block truncate font-heading font-semibold" title={workspaceName}>{workspaceName}</span>
            <span className="block text-xs text-muted-app">{roleName}</span>
          </span>
          <p className="hidden min-w-0 flex-1 flex-wrap items-center gap-x-2 text-sm lg:flex">
            {crumbs.map((crumb, index) => <span key={crumb} className="flex items-center gap-2">
              {index > 0 && <AppIcon name="chevronRight" className="size-3.5 text-muted-app" />}
              <span className={cn("text-muted-app", { "font-medium text-text-app": index === crumbs.length - 1 })}>{crumb}</span>
            </span>)}
          </p>
          <NotificationBell userId={me.user.id} csrfToken={me.csrfToken} scope={context} />
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div ref={pageRef} className="mx-auto w-full max-w-screen-2xl">
            {workspace ? <Outlet /> : <section className="mx-auto max-w-lg py-16 text-center">
              <span aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-xl border border-border-app text-muted-app"><AppIcon name="shield" className="size-7" /></span>
              <h1 className="mt-5 font-heading text-2xl font-bold">{t("auth.workspaceDenied")}</h1>
              <p className="mt-2 text-muted-app">{t("auth.workspaceDeniedDescription")}</p>
              <Link to="/workspace" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary-app px-3.5 text-sm font-medium text-on-primary-app hover:opacity-90 sm:min-h-9">
                {t("auth.chooseWorkspace")}</Link>
            </section>}
          </div>
        </main>
      </div>
    </div>
  );
}

function workspaceNameFor(context: Context, workspace: Workspace | undefined,
  t: (key: "auth.student" | "auth.icpdp" | "auth.club") => string): string {
  return context.kind === "student" ? t("auth.student")
    : context.kind === "icpdp" ? t("auth.icpdp") : workspace?.clubName ?? t("auth.club");
}

/** Top-bar trail: workspace › menu group › current page, read from the same entries the sidebar shows. */
function breadcrumb(nav: Array<{ items: NavEntry[] }>, pathname: string, workspaceName: string): string[] {
  for (const section of nav) for (const entry of section.items) {
    if (!("group" in entry)) {
      if (isCurrent(entry, pathname)) return [workspaceName, entry.label];
      continue;
    }
    const child = entry.children.find((item) => isCurrent(item, pathname));
    if (child) return [workspaceName, entry.label, child.label];
  }
  return [workspaceName];
}

function navigation(context: Context, workspace: Workspace | undefined,
  t: (key: `common.${keyof typeof common.en}`) => string): Array<{ title: string; items: NavEntry[] }> {
  const explore = { title: t("common.sectionExplore"), items: [
    { to: "/clubs", label: t("common.navDiscover"), icon: "compass" as const },
    { to: "/events", label: t("common.navEvents"), icon: "sparkles" as const },
  ] };
  if (context.kind === "student") {
    return [{ title: t("common.sectionWork"), items: [
      { to: "/student", label: t("common.navOverview"), icon: "home", end: true },
      ...group("student-clubs", t("common.groupClubs"), "building", [
        { to: "/workspace/clubs", label: t("common.navMyClubs"), icon: "users" },
        { to: "/workspace/recruitment", label: t("common.navRecruitment"), icon: "userPlus" },
        { to: "/workspace/applications", label: t("common.navApplications"), icon: "filePlus" },
      ]),
      ...group("student-events", t("common.groupEventsFeedback"), "ticket", [
        { to: "/workspace/event-registrations", label: t("common.navMyEvents"), icon: "calendar" },
        { to: "/workspace/complaints", label: t("common.navComplaints"), icon: "message" },
      ]),
    ] }, explore];
  }
  if (context.kind === "icpdp") {
    // Grouped by job so the long ICPDP menu reads as a few areas instead of one flat list.
    return [{ title: t("common.sectionWork"), items: [
      { to: "/icpdp", label: t("common.navOverview"), icon: "home", end: true },
      { group: "clubs", label: t("common.groupClubs"), icon: "building", children: [
        { to: "/icpdp/clubs", label: t("common.icpdpClubs"), icon: "grid" },
        { to: "/workspace/reviews", label: t("common.icpdpReviews"), icon: "filePlus" },
        { to: "/workspace/suspension-requests", label: t("common.navSuspensions"), icon: "pause" },
        { to: "/workspace/board-nominations", label: t("common.icpdpNominations"), icon: "crown" },
        { to: "/workspace/leadership-transitions", label: t("common.icpdpTransitions"), icon: "repeat" },
        { to: "/workspace/club-fields", label: t("common.icpdpClubFields"), icon: "tag" },
      ] },
      { group: "events", label: t("common.groupEvents"), icon: "ticket", children: [
        { to: "/workspace/event-proposals", label: t("common.icpdpEventProposals"), icon: "inbox" },
        { to: "/workspace/internal-events", label: t("common.icpdpInternalEvents"), icon: "users" },
        { to: "/workspace/event-reports", label: t("common.navEventReports"), icon: "file" },
        { to: "/workspace/budgets", label: t("common.icpdpBudgets"), icon: "coins" },
        { to: "/workspace/school-events", label: t("common.icpdpSchoolEvents"), icon: "flag" },
        { to: "/events", label: t("common.icpdpEvents"), icon: "calendar" },
        { to: "/workspace/room-allocations", label: t("common.navRoomAllocations"), icon: "door" },
        { to: "/workspace/bookings", label: t("common.navBookings"), icon: "mapPin" },
        { to: "/workspace/properties", label: t("common.icpdpProperties"), icon: "monitor" },
      ] },
      { group: "evaluation", label: t("common.groupEvaluation"), icon: "barChart", children: [
        { to: "/workspace/evaluation-schemes", label: t("common.icpdpSchemes"), icon: "listChecks" },
        { to: "/workspace/periodic-reports", label: t("common.icpdpPeriodicReports"), icon: "clipboard" },
        { to: "/workspace/evaluations", label: t("common.icpdpEvaluations"), icon: "star" },
        { to: "/workspace/violations", label: t("common.icpdpViolations"), icon: "scale" },
        { to: "/workspace/exports", label: t("common.icpdpExports"), icon: "download" },
      ] },
      { to: "/workspace/complaint-review", label: t("common.icpdpComplaints"), icon: "message" },
      { to: "/workspace/routing-rules", label: t("common.icpdpRouting"), icon: "route" },
      { group: "system", label: t("common.groupSystem"), icon: "settings", children: [
        { to: "/workspace/policy", label: t("common.icpdpPolicy"), icon: "book" },
        { to: "/icpdp/accounts", label: t("common.icpdpAccounts"), icon: "key" },
      ] },
    ] }];
  }
  const base = `/club/${encodeURIComponent(context.clubId)}`;
  function can(permission: string) {
    return Boolean(workspace?.permissions.includes(permission));
  }
  const member = workspace?.role !== "founder";
  // Club pages are grouped like the ICPDP menu; each child still follows the role's permissions.
  return [{ title: t("common.sectionWork"), items: [
    { to: base, label: t("common.navOverview"), icon: "home", end: true },
    ...group("club-people", t("common.groupPeople"), "building", [
      ...(member ? [{ to: `${base}/members`, label: t("common.navMembers"), icon: "users" as const }] : []),
      ...(can("club.recruitment.manage") ? [{ to: `${base}/recruitment`, label: t("common.navCampaigns"), icon: "userPlus" as const }] : []),
      ...(can("club.transition.plan") ? [{ to: `${base}/transition-plans`, label: t("common.navTransitions"), icon: "repeat" as const }] : []),
      ...(can("club.suspension.request") ? [{ to: `${base}/suspension-requests`, label: t("common.navSuspensions"), icon: "pause" as const }] : []),
      ...(can("club.board.nominate") ? [{ to: `${base}/board`, label: t("common.navBoard"), icon: "crown" as const }] : []),
      ...(can("club.board.nominate") ? [{ to: `${base}/board-history`, label: t("common.navBoardHistory"), icon: "history" as const }] : []),
      ...(can("club.profile.manage") ? [{ to: `${base}/settings`, label: t("common.navSettings"), icon: "settings" as const }] : []),
    ]),
    ...group("club-events", t("common.groupClubEvents"), "ticket", [
      ...(can("club.event.manage") ? [{ to: `${base}/invitations`, label: t("common.navInvitations"), icon: "mail" as const }] : []),
      ...(can("club.event.manage") ? [{ to: `${base}/events`, label: t("common.navClubEvents"), icon: "megaphone" as const }] : []),
      ...(can("club.attendance.manage") ? [{ to: `${base}/event-attendance`, label: t("common.navEventAttendance"), icon: "clipboardCheck" as const }] : []),
      ...(can("club.feedback.view") ? [{ to: `${base}/event-feedback`, label: t("common.navEventFeedback"), icon: "message" as const }] : []),
      ...(can("club.report.submit") ? [{ to: `${base}/periodic-reports`, label: t("common.navPeriodicReports"), icon: "clipboard" as const }] : []),
      ...(can("club.report.submit") ? [{ to: `${base}/event-reports`, label: t("common.navEventReports"), icon: "file" as const }] : []),
    ]),
    ...group("club-resources", t("common.groupFinanceFacilities"), "wallet", [
      ...(can("club.expense.record") ? [{ to: `${base}/budgets`, label: t("common.navEventFinances"), icon: "coins" as const }] : []),
      ...(can("club.room.view") ? [{ to: `${base}/rooms`, label: t("common.navClubRooms"), icon: "door" as const }] : []),
      ...(can("club.booking.manage") ? [{ to: `${base}/bookings`, label: t("common.navBookings"), icon: "mapPin" as const }] : []),
    ]),
    ...(can("club.complaint.respond") ? [{ to: `${base}/violations`, label: t("common.navCompliance"), icon: "scale" as const }] : []),
    ...(can("club.report.submit") ? [{ to: `${base}/evaluations`, label: t("common.navClubEvaluations"), icon: "star" as const }] : []),
    ...(can("club.complaint.respond") ? [{ to: `${base}/complaints`, label: t("common.navClubComplaints"), icon: "inbox" as const }] : []),
    { to: `/clubs/${encodeURIComponent(context.clubId)}`, label: t("common.navPublicPage"), icon: "globe" },
  ] }, explore];
}
