import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon, type AppIconName } from "@/components/ui/icon/AppIcon";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth, useLoginError } from "@/hooks/useAuth";
import type { Workspace } from "@/services/auth";
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
  if (workspace.kind === "student") return "graduationCap";
  if (workspace.kind === "icpdp") return "shield";
  return "briefcase";
}

export function AuthWorkspacePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
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

  function workspaceTitle(workspace: Workspace): string {
    if (workspace.kind === "student") return t("auth.student");
    if (workspace.kind === "icpdp") return t("auth.icpdp");
    if (workspace.role === "leader") {
      return t("auth.clubLeaderWorkspace", { club: workspace.clubName ?? t("auth.club") });
    }
    return workspace.clubName ?? t("auth.club");
  }

  function workspaceSubtitle(workspace: Workspace): string {
    if (workspace.kind === "student") return t("auth.studentWorkspaceHint");
    if (workspace.kind === "icpdp") return t("auth.icpdpWorkspaceHint");
    const role = workspace.role ? t(`auth.${workspace.role}`) : t("auth.member");
    return t(workspace.role === "leader" || workspace.role === "founder" ? "auth.clubWorkspaceHint" : "auth.clubMemberWorkspaceHint", { role });
  }

  if (!auth.data && window.location.pathname !== "/login") {
    return <Navigate to={`/login${window.location.search}`} replace />;
  }

  if (!auth.data) {
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

  if (window.location.pathname === "/login") {
    const destination = returnTo.split(/[?#]/)[0] === "/login" ? "/workspace" : returnTo;
    return <Navigate to={destination} replace />;
  }

  const workspaces = auth.data?.workspaces ?? [];
  return (
    <div className="min-h-full bg-bg-app">
      <main className="flex min-h-dvh items-center p-[clamp(24px,5vw,64px)]">
        {auth.isPending ? (
          <div className="mx-auto w-full max-w-6xl space-y-5">
            <p role="status" className="text-sm text-muted-app">{t("auth.loading")}</p>
            <AppSkeleton className="h-12 w-2/3" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <AppSkeleton className="h-64 w-full" />
              <AppSkeleton className="h-64 w-full" />
              <AppSkeleton className="h-64 w-full" />
            </div>
          </div>
        ) : auth.isError ? (
          <div className="mx-auto space-y-4 text-center">
            <h1 className="font-heading text-2xl font-bold">{t("auth.accountError")}</h1>
            <p role="alert" className="text-sm text-danger-app">{auth.error.message}</p>
            <AppButton onClick={() => void auth.refetch()}>{t("auth.retry")}</AppButton>
          </div>
        ) : (
          <section aria-labelledby="workspace-heading" className="mx-auto flex w-full max-w-6xl flex-col gap-8">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-app">{auth.data.user.email}</p>
              <h1 id="workspace-heading" className="m-0 max-w-2xl font-heading text-[clamp(30px,5vw,44px)] leading-[1.15] font-extrabold tracking-[-0.025em] text-balance text-text-app">
                {t("auth.chooseWorkspaceTitle", {
                  name: i18n.language === "vi"
                    ? auth.data.user.displayName.trim().split(/\s+/).at(-1)
                    : auth.data.user.displayName.trim().split(/\s+/)[0],
                })}
              </h1>
              <p className="m-0 text-muted-app">{t("auth.chooseWorkspaceHint")}</p>
            </div>

            {workspaces.length === 0 ? (
              <div className="rounded-2xl border border-border-app bg-surface-app p-8 text-muted-app">
                {t("auth.noWorkspaces")}
              </div>
            ) : (
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {workspaces.map((workspace) => (
                  <li key={workspaceKey(workspace)} className="flex">
                    <button type="button" onClick={() => selectWorkspace(workspace)}
                      className="group flex w-full flex-col items-start gap-4 rounded-2xl border border-border-app bg-bg-app p-7 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-app hover:shadow-lg focus-visible:border-primary-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
                      <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft-app text-primary-app transition-colors group-hover:bg-primary-app group-hover:text-on-primary-app">
                        <AppIcon name={workspaceIcon(workspace)} className="size-6" />
                      </span>
                      <span className="font-heading text-2xl leading-tight font-bold text-balance text-text-app">{workspaceTitle(workspace)}</span>
                      <span className="leading-7 text-pretty text-muted-app">{workspaceSubtitle(workspace)}</span>
                      <span className="mt-auto flex items-center gap-2 pt-3 font-semibold text-primary-app">
                        {t("auth.openWorkspace")}
                        <AppIcon name="chevronRight" className="transition-transform group-hover:translate-x-1" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
