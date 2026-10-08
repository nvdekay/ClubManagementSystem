import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppCard } from "@/components/ui/card/AppCard";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppSearchInput } from "@/components/ui/search-input/AppSearchInput";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppSwitch } from "@/components/ui/switch/AppSwitch";
import { useAuth, useLoginError, useLogout } from "@/hooks/useAuth";
import { useAccountAction, useAccounts } from "@/hooks/useAccounts";
import { type AccountAction, type SystemRoleCode } from "@/services/accounts";
import { googleLoginUrl, type Workspace } from "@/services/auth";
import { cn } from "@/utils/cn";
import { LoginPage } from "@/pages/auth/LoginPage";

type Theme = "light" | "dark";

function initialTheme(): Theme {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function workspaceKey(workspace: Workspace): string {
  return `${workspace.kind}:${workspace.clubId ?? ""}`;
}

export function AuthWorkspacePage() {
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const logout = useLogout();
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [selectedKey, setSelectedKey] = useState(() => sessionStorage.getItem("workspace") ?? "");
  const [choosing, setChoosing] = useState(false);
  const [search, setSearch] = useState("");
  const [targetId, setTargetId] = useState("");
  const [roleCode, setRoleCode] = useState<SystemRoleCode>("ICPDP_OFFICER");
  const [reason, setReason] = useState("");
  const errorCode = new URLSearchParams(window.location.search).get("error");
  const lockError = useLoginError(errorCode === "locked");
  const loginError = errorCode === "domain" ? t("auth.domainError")
    : errorCode === "locked" ? t("auth.lockedError")
      : errorCode ? t("auth.signInError") : null;
  const requestedReturnTo = new URLSearchParams(window.location.search).get("returnTo");
  const returnTo = requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//")
    && !requestedReturnTo.includes("\\") ? requestedReturnTo : "/workspace";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const workspaces = auth.data?.workspaces ?? [];
  const selected = workspaces.find((workspace) => workspaceKey(workspace) === selectedKey)
    ?? (workspaces.length === 1 ? workspaces[0] : undefined);
  const accounts = useAccounts(search, selected?.kind === "icpdp" && !choosing);
  const accountAction = useAccountAction();
  const target = accounts.data?.items.find((item) => item.user.id === targetId);
  const roleOptions: Array<{ value: SystemRoleCode; label: string }> = [
    { value: "ICPDP_OFFICER", label: t("auth.officerRole") },
    { value: "ICPDP_HEAD", label: t("auth.headRole") },
    { value: "ATTENDANCE_UNLOCK", label: t("auth.attendanceRole") },
  ];

  function selectWorkspace(workspace: Workspace) {
    const key = workspaceKey(workspace);
    sessionStorage.setItem("workspace", key);
    setSelectedKey(key);
    setChoosing(false);
  }

  async function signOut() {
    if (!auth.data) return;
    try {
      await logout.mutateAsync(auth.data.csrfToken);
      sessionStorage.removeItem("workspace");
      setSelectedKey("");
    } catch {
      // The mutation exposes the error state below.
    }
  }

  async function updateAccount(kind: AccountAction["kind"]) {
    if (!auth.data || !target) return;
    const action: AccountAction = kind === "grant" || kind === "revoke"
      ? { kind, userId: target.user.id, roleCode, reason }
      : { kind, userId: target.user.id, reason };
    try {
      await accountAction.mutateAsync({ action, csrfToken: auth.data.csrfToken });
      setReason("");
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
    if (workspace.kind !== "club") return workspace.kind === "student"
      ? t("auth.student") : t("auth.icpdp");
    return workspace.role ? t(`auth.${workspace.role}`) : t("auth.member");
  }

  function systemRoleLabel(code: string): string {
    if (code === "ICPDP_OFFICER") return t("auth.officerRole");
    if (code === "ICPDP_HEAD") return t("auth.headRole");
    if (code === "ATTENDANCE_UNLOCK") return t("auth.attendanceRole");
    return code;
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

  return (
    <main className="mx-auto min-h-full max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border-app pb-6">
        <div>
          <p className="text-2xl font-bold tracking-tight text-primary-app">{t("auth.brand")}</p>
          <p className="mt-1 text-sm text-muted-app">{t("auth.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/clubs" className="text-sm font-semibold text-accent-app">
            {t("discovery.navClubs")}
          </Link>
          <label className="flex flex-wrap items-center gap-2 text-sm text-muted-app">
            {t("common.darkModeLabel")}
            <AppSwitch
              checked={theme === "dark"}
              onChange={(checked) => setTheme(checked ? "dark" : "light")}
              aria-label={t("common.darkModeLabel")}
            />
          </label>
          <AppButton
            variant="secondary"
            onClick={() => void i18n.changeLanguage(i18n.language === "vi" ? "en" : "vi")}
            aria-label={t("common.languageLabel")}
          >
            {i18n.language === "vi" ? "EN" : "VI"}
          </AppButton>
        </div>
      </header>

      {auth.isPending ? (
        <AppCard className="mx-auto mt-12 max-w-xl space-y-4 p-6">
          <p role="status" className="text-sm text-muted-app">{t("auth.loading")}</p>
          <AppSkeleton className="h-8 w-2/3" />
          <AppSkeleton className="h-12 w-full" />
        </AppCard>
      ) : auth.isError ? (
        <AppCard className="mx-auto mt-12 max-w-xl space-y-4 p-6">
          <h1 className="text-xl font-semibold font-heading">{t("auth.accountError")}</h1>
          <p role="alert" className="text-sm text-danger-app">{auth.error.message}</p>
          <AppButton onClick={() => void auth.refetch()}>{t("auth.retry")}</AppButton>
        </AppCard>
      ) : !auth.data ? (
        <AppCard className="mx-auto mt-12 max-w-xl p-6 sm:p-8">
          <h1 className="text-2xl font-semibold font-heading">{t("auth.signInTitle")}</h1>
          <p className="mt-3 text-muted-app">{t("auth.signInDescription")}</p>
          {loginError && <p role="alert" className="mt-4 text-sm text-danger-app">
            {loginError} {errorCode === "locked" && lockError.data}
          </p>}
          <a
            href={googleLoginUrl(returnTo)}
            className="mt-8 inline-flex min-h-11 items-center justify-center rounded-md bg-primary-app px-5 text-on-primary-app transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app"
          >
            {t("auth.signInGoogle")}
          </a>
        </AppCard>
      ) : (
        <section className="mx-auto mt-10 max-w-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold font-heading">{t("auth.welcome", { name: auth.data.user.displayName })}</h1>
              <p className="mt-1 text-sm text-muted-app">{auth.data.user.email}</p>
            </div>
            <AppButton variant="secondary" disabled={logout.isPending} onClick={() => void signOut()}>
              {t("auth.logout")}
            </AppButton>
          </div>
          {logout.isError && <p role="alert" className="mt-3 text-sm text-danger-app">{t("auth.logoutError")}</p>}
          {!selected || choosing ? (
            <div className="mt-8">
              <h2 className="text-lg font-semibold font-heading">{t("auth.chooseWorkspace")}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {workspaces.map((workspace) => (
                  <button
                    key={workspaceKey(workspace)}
                    type="button"
                    onClick={() => selectWorkspace(workspace)}
                    className={cn("rounded-lg border border-border-app bg-surface-app p-5 text-left transition-colors hover:border-primary-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app", {
                      "border-primary-app": selectedKey === workspaceKey(workspace),
                    })}
                  >
                    <span className="block text-lg font-semibold">{workspaceTitle(workspace)}</span>
                    <span className="mt-1 block text-sm text-muted-app">{workspaceSubtitle(workspace)}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <AppCard className="mt-8 p-6">
                <p className="text-sm text-muted-app">{t("auth.currentWorkspace")}</p>
                <h2 className="mt-2 text-xl font-semibold font-heading">{workspaceTitle(selected)}</h2>
                <p className="mt-1 text-sm text-muted-app">{workspaceSubtitle(selected)}</p>
                <p className="mt-6 text-sm text-muted-app">{t("auth.workspaceReady")}</p>
                {workspaces.length > 1 && (
                  <AppButton className="mt-6" variant="secondary" onClick={() => setChoosing(true)}>
                    {t("auth.switchWorkspace")}
                  </AppButton>
                )}
              </AppCard>
              {selected.kind === "student" && (
                <div className="mt-8">
                  <Link to="/workspace/applications" className="font-semibold text-accent-app">
                    {t("applications.title")}
                  </Link>
                </div>
              )}
              {selected.kind === "icpdp" && (
                <div className="mt-8">
                  <Link to="/workspace/policy" className="mb-5 inline-block text-sm font-semibold text-accent-app">
                    {t("policy.title")}
                  </Link>
                  <h2 className="text-lg font-semibold font-heading">{t("auth.manageAccounts")}</h2>
                  <AppSearchInput className="mt-4 w-full" placeholder={t("auth.searchUsers")}
                    onSearch={setSearch} />
                  {accounts.isPending ? (
                    <AppSkeleton className="mt-4 h-36 w-full" />
                  ) : accounts.isError ? (
                    <p role="alert" className="mt-4 text-sm text-danger-app">{accounts.error.message}</p>
                  ) : accounts.data?.items.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-app">{t("auth.noUsers")}</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {accounts.data?.items.map((item) => (
                        <AppCard key={item.user.id} className="flex-row flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{item.user.displayName}</p>
                            <p className="text-sm text-muted-app">{item.user.email}</p>
                            <p className="mt-1 text-xs text-muted-app">
                              {t("auth.accountState")}: {item.user.accountState === "Locked"
                                ? t("auth.lockedState") : t("auth.activeState")}
                              {item.systemRoles.length > 0 && ` · ${item.systemRoles.map(systemRoleLabel).join(", ")}`}
                            </p>
                          </div>
                          <AppButton variant="secondary" onClick={() => setTargetId(item.user.id)}>
                            {t("auth.manage")}
                          </AppButton>
                        </AppCard>
                      ))}
                    </div>
                  )}
                  {target && (
                    <AppCard className="mt-5 space-y-4 p-6">
                      <h3 className="font-semibold font-heading">{target.user.displayName}</h3>
                      <label className="block text-sm">
                        {t("auth.role")}
                        <AppSelect className="mt-2 block w-full" label={t("auth.role")}
                          value={roleCode} options={roleOptions} onChange={setRoleCode} />
                      </label>
                      <label className="block text-sm">
                        {t("auth.reason")}
                        <AppInput className="mt-2 block w-full" value={reason}
                          onChange={(event) => setReason(event.target.value)} maxLength={1000} />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <AppButton disabled={accountAction.isPending} onClick={() => void updateAccount("grant")}>
                          {t("auth.grant")}
                        </AppButton>
                        <AppButton variant="secondary" disabled={accountAction.isPending || !reason.trim()}
                          onClick={() => void updateAccount("revoke")}>{t("auth.revoke")}</AppButton>
                        <AppButton variant="secondary" disabled={accountAction.isPending || !reason.trim()}
                          onClick={() => void updateAccount("lock")}>{t("auth.lock")}</AppButton>
                        <AppButton variant="secondary" disabled={accountAction.isPending || !reason.trim()}
                          onClick={() => void updateAccount("unlock")}>{t("auth.unlock")}</AppButton>
                      </div>
                      {accountAction.isError && (
                        <p role="alert" className="text-sm text-danger-app">
                          {t("auth.saveError")} {accountAction.error.message}
                        </p>
                      )}
                      {accountAction.isSuccess && (
                        <p role="status" className="text-sm text-success-app">{t("auth.saveSuccess")}</p>
                      )}
                    </AppCard>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      )}
    </main>
  );
}
