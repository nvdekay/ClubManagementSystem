import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router";

import { UniversityLogo } from "@/components/custom/UniversityLogo";
import { AppIcon, type AppIconName } from "@/components/ui/icon/AppIcon";
import { common } from "@/i18n/common";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth, useLogout } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import type { Workspace } from "@/services/auth";
import { cn } from "@/utils/cn";

type Context = { kind: "student" } | { kind: "icpdp" } | { kind: "club"; clubId: string };

interface NavItem {
  to: string;
  label: string;
  icon: AppIconName;
  end?: boolean;
}

const studentPrefixes = ["/student", "/workspace/applications", "/workspace/recruitment",
  "/workspace/event-registrations", "/workspace/feedback", "/workspace/clubs"];

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
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const auth = useAuth();
  const logout = useLogout();
  const { theme, toggleTheme } = useTheme();
  // The drawer remembers the path it was opened on, so navigating closes it without an effect.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === location.pathname;
  const menuButton = useRef<HTMLButtonElement>(null);
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
      <div className="hidden w-68 shrink-0 border-r border-border-app bg-sidebar-app p-5 lg:block">
        <AppSkeleton className="h-9 w-32" /><AppSkeleton className="mt-8 h-14 w-full" />
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
  const workspaceName = context.kind === "student" ? t("auth.student")
    : context.kind === "icpdp" ? t("auth.icpdp") : workspace?.clubName ?? t("auth.club");
  const roleName = workspace?.kind === "club" && workspace.role ? t(`auth.${workspace.role}`)
    : context.kind === "icpdp" ? t("auth.officerRole") : t("auth.student");

  async function signOut() {
    try {
      await logout.mutateAsync(me.csrfToken);
      sessionStorage.removeItem("workspace");
    } catch {
      // logout.isError is shown in the sidebar footer.
    }
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <Link to="/" aria-label={t("auth.brand")} className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
          <UniversityLogo alt={t("auth.schoolLogo")} className="w-38" />
        </Link>
        <button type="button" onClick={() => setMenuPath(null)} aria-label={t("common.closeMenu")}
          className="flex size-10 items-center justify-center rounded-full text-muted-app hover:bg-surface-strong-app focus-visible:outline-2 focus-visible:outline-ring-app lg:hidden">
          <AppIcon name="close" />
        </button>
      </div>

      <Link to="/workspace" title={t("auth.switchWorkspace")} className="group mx-3 mt-6 flex items-center gap-3 rounded-xl border border-border-app bg-bg-app px-3 py-2.5 transition-colors hover:border-primary-app focus-visible:outline-2 focus-visible:outline-ring-app">
        <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft-app text-primary-app">
          <AppIcon name={context.kind === "club" ? "users" : context.kind === "icpdp" ? "shield" : "sparkles"} className="size-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-bold break-words text-text-app" title={workspaceName}>{workspaceName}</span>
          <span className="block text-xs text-muted-app">{roleName}<span className="sr-only"> · {t("auth.switchWorkspace")}</span></span>
        </span>
        <AppIcon name="chevronRight" className="size-4 text-muted-app group-hover:text-primary-app" />
      </Link>

      <nav aria-label={t("common.workspaceNav")} className="mt-6 flex-1 overflow-y-auto px-3 pb-4">
        {nav.map((section) => section.items.length > 0 && (
          <div key={section.title} className="mb-5">
            <p className="px-3 pb-2 text-xs font-semibold tracking-wide text-muted-app uppercase">{section.title}</p>
            <ul className="space-y-1">{section.items.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={({ isActive }) => cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-app transition-colors hover:bg-surface-strong-app hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app",
                  { "bg-primary-soft-app font-semibold text-primary-app hover:bg-primary-soft-app hover:text-primary-app": isActive },
                )}>
                  <AppIcon name={item.icon} />
                  <span className="min-w-0 flex-1">{item.label}</span>
                </NavLink>
              </li>
            ))}</ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border-app px-3 py-4">
        <div className="flex items-center gap-3 px-2">
          <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mint-soft-app text-sm font-bold text-mint-app">
            {me.user.displayName.trim().charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold" title={me.user.displayName}>{me.user.displayName}</span>
            <span className="block truncate text-xs text-muted-app" title={me.user.email}>{me.user.email}</span>
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          <IconButton label={theme === "dark" ? t("common.lightMode") : t("common.darkModeLabel")} onClick={toggleTheme}>
            <AppIcon name={theme === "dark" ? "sun" : "moon"} />
          </IconButton>
          <IconButton label={t("common.switchLanguage")} onClick={() => void i18n.changeLanguage(i18n.language === "vi" ? "en" : "vi")}>
            <span className="text-xs font-bold">{i18n.language === "vi" ? "EN" : "VI"}</span>
          </IconButton>
          <button type="button" disabled={logout.isPending} onClick={() => void signOut()}
            className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-muted-app transition-colors hover:bg-surface-strong-app hover:text-danger-app focus-visible:outline-2 focus-visible:outline-ring-app disabled:opacity-50">
            <AppIcon name="logout" className="size-4.5" />{t("auth.logout")}
          </button>
        </div>
        {logout.isError && <p role="alert" className="mt-2 px-2 text-xs text-danger-app">{t("auth.logoutError")}</p>}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-dvh w-68 shrink-0 border-r border-border-app bg-sidebar-app lg:block">{sidebar}</aside>

      {menuOpen && <div className="fixed inset-0 z-40 lg:hidden">
        <button type="button" aria-label={t("common.closeMenu")} tabIndex={-1} onClick={() => setMenuPath(null)}
          className="absolute inset-0 bg-text-app/40" />
        <aside className="absolute inset-y-0 left-0 w-[min(18rem,85vw)] border-r border-border-app bg-sidebar-app shadow-xl">{sidebar}</aside>
      </div>}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border-app bg-bg-app/90 px-4 py-3 backdrop-blur lg:hidden">
          <button ref={menuButton} type="button" onClick={() => setMenuPath(location.pathname)} aria-label={t("common.openMenu")} aria-expanded={menuOpen}
            className="flex size-11 items-center justify-center rounded-full text-text-app hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-ring-app">
            <AppIcon name="menu" />
          </button>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-heading font-bold" title={workspaceName}>{workspaceName}</span>
            <span className="block text-xs text-muted-app">{roleName}</span>
          </span>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-10">
          <div className="mx-auto w-full max-w-screen-2xl">
            {workspace ? <Outlet /> : <section className="mx-auto max-w-lg py-16 text-center">
              <span aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary-soft-app text-primary-app"><AppIcon name="shield" className="size-7" /></span>
              <h1 className="mt-5 font-heading text-2xl font-bold">{t("auth.workspaceDenied")}</h1>
              <p className="mt-2 text-muted-app">{t("auth.workspaceDeniedDescription")}</p>
              <Link to="/workspace" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary-app px-5 text-sm font-semibold text-on-primary-app hover:opacity-90">
                {t("auth.chooseWorkspace")}</Link>
            </section>}
          </div>
        </main>
      </div>
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick}
    className="flex size-10 items-center justify-center rounded-full text-muted-app transition-colors hover:bg-surface-strong-app hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app">
    {children}
  </button>;
}

function navigation(context: Context, workspace: Workspace | undefined,
  t: (key: `common.${keyof typeof common.en}`) => string): Array<{ title: string; items: NavItem[] }> {
  const clubsPath = context.kind === "icpdp" ? "/icpdp/clubs" : "/clubs";
  const explore = { title: t("common.sectionExplore"), items: [
    { to: clubsPath, label: t("common.navDiscover"), icon: "compass" as const },
    { to: "/events", label: t("common.navEvents"), icon: "calendar" as const },
  ] };
  if (context.kind === "student") {
    return [{ title: t("common.sectionWork"), items: [
      { to: "/student", label: t("common.navOverview"), icon: "home", end: true },
      { to: "/workspace/recruitment", label: t("common.navRecruitment"), icon: "send" },
      { to: "/workspace/applications", label: t("common.navApplications"), icon: "file" },
      { to: "/workspace/clubs", label: t("common.navMyClubs"), icon: "users" },
      { to: "/workspace/event-registrations", label: t("common.navMyEvents"), icon: "calendar" },
      { to: "/workspace/feedback", label: t("common.navFeedback"), icon: "megaphone" },
    ] }, explore];
  }
  if (context.kind === "icpdp") {
    return [{ title: t("common.sectionWork"), items: [
      { to: "/icpdp", label: t("common.navOverview"), icon: "home", end: true },
      { to: "/workspace/reviews", label: t("common.navReviews"), icon: "inbox" },
      { to: "/workspace/board-nominations", label: t("common.navNominations"), icon: "badge" },
      { to: "/workspace/leadership-transitions", label: t("common.navTransitions"), icon: "calendar" },
      { to: "/workspace/student-feedback", label: t("common.navFeedbackInbox"), icon: "inbox" },
      { to: "/workspace/policy", label: t("common.navPolicy"), icon: "shield" },
      { to: "/workspace/club-lifecycle", label: t("common.navClubLifecycle"), icon: "settings" },
      { to: "/workspace/club-fields", label: t("common.navClubFields"), icon: "layers" },
      { to: "/workspace/properties", label: t("common.navProperties"), icon: "mapPin" },
      { to: "/workspace/evaluation-schemes", label: t("common.navEvaluationSchemes"), icon: "star" },
      { to: "/workspace/exports", label: t("common.navExports"), icon: "file" },
      { to: "/icpdp/accounts", label: t("common.navAccounts"), icon: "users" },
    ] }, explore];
  }
  const base = `/club/${encodeURIComponent(context.clubId)}`;
  function can(permission: string) {
    return Boolean(workspace?.permissions.includes(permission));
  }
  return [{ title: t("common.sectionWork"), items: [
    { to: base, label: t("common.navOverview"), icon: "home", end: true },
    ...(can("club.board.nominate") ? [{ to: `${base}/board`, label: t("common.navBoard"), icon: "badge" as const }] : []),
    ...(can("club.recruitment.manage") ? [{ to: `${base}/recruitment`, label: t("common.navCampaigns"), icon: "megaphone" as const }] : []),
    ...(can("club.profile.manage") ? [{ to: `${base}/settings`, label: t("common.navSettings"), icon: "settings" as const }] : []),
    ...(can("club.member.manage") ? [{ to: `${base}/members`, label: t("common.navMembers"), icon: "users" as const }] : []),
    ...(can("club.feedback.view") ? [{ to: `${base}/feedback`, label: t("common.navFeedbackInbox"), icon: "inbox" as const }] : []),
    { to: `/clubs/${encodeURIComponent(context.clubId)}`, label: t("common.navPublicPage"), icon: "globe" },
  ] }, explore];
}
