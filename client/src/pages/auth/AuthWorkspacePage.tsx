import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon, type AppIconName } from "@/components/ui/icon/AppIcon";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth, useLoginError, useLogout } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { googleLoginUrl, type Workspace } from "@/services/auth";
import { cn } from "@/utils/cn";
import { LoginPage } from "@/pages/auth/LoginPage";

function workspaceKey(workspace: Workspace): string {
  return `${workspace.kind}:${workspace.clubId ?? ""}`;
}

function workspacePath(workspace: Workspace): string {
  if (workspace.kind === "student") return "/student";
  if (workspace.kind === "icpdp") return "/icpdp";
  return `/club/${encodeURIComponent(workspace.clubId ?? "")}`;
}

function workspaceIcon(workspace: Workspace): AppIconName {
  if (workspace.kind === "student") return "sparkles";
  if (workspace.kind === "icpdp") return "shield";
  return "users";
}

export function AuthWorkspacePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const logout = useLogout();
  const { theme, toggleTheme } = useTheme();
  const lastKey = sessionStorage.getItem("workspace") ?? "";
  const errorCode = new URLSearchParams(window.location.search).get("error");
  const lockError = useLoginError(errorCode === "locked");
  const loginError = errorCode === "domain" ? t("auth.domainError")
    : errorCode === "locked" ? t("auth.lockedError")
      : errorCode ? t("auth.signInError") : null;
  const requestedReturnTo = new URLSearchParams(window.location.search).get("returnTo");
  const returnTo = requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//")
    && !requestedReturnTo.includes("\\") ? requestedReturnTo : "/workspace";

  useEffect(() => {
    if (window.location.pathname === "/workspace" && auth.data?.workspaces.length === 1) {
      navigate(workspacePath(auth.data.workspaces[0]!), { replace: true });
    }
  }, [auth.data, navigate]);

  function selectWorkspace(workspace: Workspace) {
    sessionStorage.setItem("workspace", workspaceKey(workspace));
    navigate(workspacePath(workspace));
  }

  async function signOut() {
    if (!auth.data) return;
    try {
      await logout.mutateAsync(auth.data.csrfToken);
      sessionStorage.removeItem("workspace");
    } catch {
      // The mutation exposes the error state below.
    }
  }

  function workspaceTitle(workspace: Workspace): string {
    if (workspace.kind === "student") return t("auth.student");
    if (workspace.kind === "icpdp") return t("auth.icpdp");
    return workspace.clubName ?? t("auth.club");
  }

  function workspaceSubtitle(workspace: Workspace): string {
    if (workspace.kind === "student") return t("auth.studentWorkspaceHint");
    if (workspace.kind === "icpdp") return t("auth.icpdpWorkspaceHint");
    return workspace.role ? t(`auth.${workspace.role}`) : t("auth.member");
  }

  if (!auth.data && window.location.pathname === "/login") {
    const authError = auth.isError ? auth.error.message : loginError;
    return (
      <LoginPage
        authError={authError}
        isPending={auth.isPending}
        lockedReason={errorCode === "locked" ? lockError.data : null}
        returnTo={returnTo}
      />
    );
  }

  const workspaces = auth.data?.workspaces ?? [];
  const groups = [
    { title: t("auth.groupPersonal"), items: workspaces.filter((item) => item.kind === "student") },
    { title: t("auth.groupSchool"), items: workspaces.filter((item) => item.kind === "icpdp") },
    { title: t("auth.groupClubs"), items: workspaces.filter((item) => item.kind === "club") },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="relative min-h-full overflow-hidden bg-bg-app">
      <span aria-hidden="true" className="pointer-events-none absolute -top-32 -right-24 size-96 rounded-full bg-auth-orb-large-app opacity-70 blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 -left-32 size-80 rounded-full bg-auth-orb-small-app opacity-50 blur-3xl" />

      <header className="relative mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-5 sm:px-8">
        <Link to="/" className="mr-auto flex items-center gap-2.5 font-heading text-lg font-extrabold text-text-app">
          <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-xl bg-primary-app text-on-primary-app">F</span>
          {t("auth.brand")}
        </Link>
        <Link to="/clubs" className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold text-text-app hover:text-primary-app focus-visible:outline-2 focus-visible:outline-ring-app">
          {t("discovery.navClubs")}
        </Link>
        <button type="button" onClick={toggleTheme} aria-label={theme === "dark" ? t("common.lightMode") : t("common.darkModeLabel")}
          className="flex size-10 items-center justify-center rounded-full text-muted-app hover:bg-surface-app hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app">
          <AppIcon name={theme === "dark" ? "sun" : "moon"} />
        </button>
        <button type="button" onClick={() => void i18n.changeLanguage(i18n.language === "vi" ? "en" : "vi")} aria-label={t("common.switchLanguage")}
          className="flex size-10 items-center justify-center rounded-full text-xs font-bold text-muted-app hover:bg-surface-app hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app">
          {i18n.language === "vi" ? "EN" : "VI"}
        </button>
      </header>

      <main className="relative mx-auto max-w-xl px-4 pt-6 pb-16 sm:pt-12">
        {auth.isPending ? (
          <div className="space-y-4">
            <p role="status" className="text-sm text-muted-app">{t("auth.loading")}</p>
            <AppSkeleton className="h-10 w-2/3" />
            <AppSkeleton className="h-48 w-full" />
          </div>
        ) : auth.isError ? (
          <div className="space-y-4 text-center">
            <h1 className="font-heading text-2xl font-bold">{t("auth.accountError")}</h1>
            <p role="alert" className="text-sm text-danger-app">{auth.error.message}</p>
            <AppButton onClick={() => void auth.refetch()}>{t("auth.retry")}</AppButton>
          </div>
        ) : !auth.data ? (
          <div className="text-center">
            <h1 className="font-heading text-3xl font-bold">{t("auth.signInTitle")}</h1>
            <p className="mt-3 text-muted-app">{t("auth.signInDescription")}</p>
            {loginError && <p role="alert" className="mt-4 text-sm text-danger-app">
              {loginError} {errorCode === "locked" && lockError.data}
            </p>}
            <a href={googleLoginUrl(returnTo)}
              className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-primary-app px-6 font-semibold text-on-primary-app transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
              {t("auth.signInGoogle")}
            </a>
          </div>
        ) : (
          <>
            <div className="text-center">
              <span aria-hidden="true" className="mx-auto flex size-16 items-center justify-center rounded-full bg-mint-soft-app font-heading text-2xl font-bold text-mint-app">
                {auth.data.user.displayName.trim().charAt(0).toUpperCase()}
              </span>
              <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight text-balance">
                {t("auth.welcome", { name: auth.data.user.displayName })}
              </h1>
              <p className="mt-2 text-muted-app">{t("auth.chooseWorkspaceHint")}</p>
            </div>

            {groups.length === 0 ? (
              <p className="mt-10 text-center text-muted-app">{t("auth.noWorkspaces")}</p>
            ) : groups.map((group) => (
              <section key={group.title} className="mt-8">
                <h2 className="px-1 pb-2 text-xs font-semibold tracking-wide text-muted-app uppercase">{group.title}</h2>
                <ul className="divide-y divide-border-app overflow-hidden rounded-2xl border border-border-app bg-bg-app/80 backdrop-blur">
                  {group.items.map((workspace) => (
                    <li key={workspaceKey(workspace)}>
                      <button type="button" onClick={() => selectWorkspace(workspace)}
                        className="group flex min-h-18 w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-primary-soft-app focus-visible:bg-primary-soft-app focus-visible:outline-none">
                        <span aria-hidden="true" className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", {
                          "bg-primary-soft-app text-primary-app": workspace.kind !== "student",
                          "bg-mint-soft-app text-mint-app": workspace.kind === "student",
                        })}>
                          <AppIcon name={workspaceIcon(workspace)} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 font-semibold break-words text-text-app">{workspaceTitle(workspace)}</span>
                          <span className="block text-sm text-muted-app">{workspaceSubtitle(workspace)}</span>
                        </span>
                        {lastKey === workspaceKey(workspace) && (
                          <span className="hidden shrink-0 rounded-full bg-surface-strong-app px-2.5 py-1 text-xs font-semibold text-muted-app sm:inline">{t("auth.lastUsed")}</span>
                        )}
                        <AppIcon name="chevronRight" className="size-5 text-muted-app transition-transform group-hover:translate-x-0.5 group-hover:text-primary-app" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-app">
              <span className="truncate">{auth.data.user.email}</span>
              <span aria-hidden="true">·</span>
              <button type="button" disabled={logout.isPending} onClick={() => void signOut()}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full font-semibold text-accent-app hover:underline focus-visible:outline-2 focus-visible:outline-ring-app disabled:opacity-50">
                <AppIcon name="logout" className="size-4" />{t("auth.logout")}
              </button>
            </div>
            {logout.isError && <p role="alert" className="mt-3 text-center text-sm text-danger-app">{t("auth.logoutError")}</p>}
          </>
        )}
      </main>
    </div>
  );
}
