import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate } from "react-router";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppCard } from "@/components/ui/card/AppCard";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth, useLogout } from "@/hooks/useAuth";
import type { Workspace } from "@/services/auth";

interface WorkspaceAction {
  href: string;
  label: string;
  description: string;
}

interface WorkspaceHomeProps {
  kind: Workspace["kind"];
  clubId?: string;
  actions: WorkspaceAction[];
}

function key(workspace: Workspace): string {
  return `${workspace.kind}:${workspace.clubId ?? ""}`;
}

export function WorkspaceHome({ kind, clubId, actions }: WorkspaceHomeProps) {
  const { t } = useTranslation();
  const auth = useAuth();
  const logout = useLogout();
  const workspace = auth.data?.workspaces.find((item) =>
    item.kind === kind && (kind !== "club" || item.clubId === clubId));

  useEffect(() => {
    if (workspace) sessionStorage.setItem("workspace", key(workspace));
  }, [workspace]);

  async function signOut() {
    if (!auth.data) return;
    await logout.mutateAsync(auth.data.csrfToken);
    sessionStorage.removeItem("workspace");
  }

  if (auth.isPending) {
    return <main className="mx-auto min-h-full max-w-6xl space-y-4 px-4 py-8 sm:px-8">
      <AppSkeleton className="h-12 w-2/3" />
      <AppSkeleton className="h-64 w-full" />
    </main>;
  }
  if (!auth.data) return <Navigate to="/login" replace />;
  if (!workspace) {
    return <main className="mx-auto min-h-full max-w-xl px-4 py-12">
      <AppCard className="p-6">
        <h1 className="text-xl font-bold">{t("auth.workspaceDenied")}</h1>
        <p className="text-muted-app">{t("auth.workspaceDeniedDescription")}</p>
        <Link to="/workspace" className="font-semibold text-accent-app">{t("auth.chooseWorkspace")}</Link>
      </AppCard>
    </main>;
  }

  const title = workspace.kind === "student" ? t("auth.studentHome")
    : workspace.kind === "icpdp" ? t("auth.icpdpHome")
      : workspace.clubName ?? t("auth.club");
  const role = workspace.kind === "club" && workspace.role ? t(`auth.${workspace.role}`)
    : workspace.kind === "icpdp" ? t("auth.officerRole") : t("auth.student");

  return (
    <main className="mx-auto min-h-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border-app pb-6">
        <div>
          <Link to="/" className="text-sm font-semibold text-accent-app">{t("auth.brand")}</Link>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-1 text-muted-app">{role} · {auth.data.user.displayName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/workspace" className="inline-flex min-h-11 items-center rounded-full border border-border-app px-4 text-sm font-semibold text-text-app">
            {t("auth.switchWorkspace")}
          </Link>
          <AppButton variant="secondary" disabled={logout.isPending} onClick={() => void signOut()}>
            {t("auth.logout")}
          </AppButton>
        </div>
      </header>

      <section className="py-8">
        <p className="max-w-2xl text-muted-app">{t("auth.workspaceHomeDescription")}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => (
            <Link key={action.href} to={action.href} className="rounded-2xl border border-border-app bg-surface-app p-5 text-text-app transition-colors hover:border-primary-app">
              <h2 className="font-bold">{action.label}</h2>
              <p className="mt-2 text-sm text-muted-app">{action.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
