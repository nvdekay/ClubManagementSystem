import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { AppIcon, type AppIconName } from "@/components/ui/icon/AppIcon";
import { useAuth } from "@/hooks/useAuth";

interface WorkspaceAction {
  href: string;
  label: string;
  description: string;
  icon: AppIconName;
}

interface WorkspaceHomeProps {
  /** Workspace name shown under the greeting, e.g. the club name. */
  subtitle: string;
  actions: WorkspaceAction[];
  children?: ReactNode;
}

/** Overview page rendered inside WorkspaceShell: a greeting band and a list of shortcuts. */
export function WorkspaceHome({ subtitle, actions, children }: WorkspaceHomeProps) {
  const { t } = useTranslation();
  const auth = useAuth();
  const name = auth.data?.user.displayName ?? "";

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-primary-soft-app px-6 py-8 sm:px-10 sm:py-10">
        <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-auth-orb-small-app opacity-60 blur-2xl" />
        <div className="relative max-w-2xl">
          <p className="text-sm font-semibold text-primary-app">{subtitle}</p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            {t("auth.overviewGreeting", { name })}
          </h1>
          <p className="mt-3 text-pretty text-muted-app">{t("auth.workspaceHomeDescription")}</p>
        </div>
      </section>

      {children}

      <ul className="mt-8 grid gap-x-8 sm:grid-cols-2">
        {actions.map((action) => (
          <li key={action.href} className="border-b border-border-app">
            <Link to={action.href} className="group flex items-center gap-4 rounded-xl px-2 py-4 transition-colors hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-ring-app">
              <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-strong-app text-primary-app transition-colors group-hover:bg-primary-app group-hover:text-on-primary-app">
                <AppIcon name={action.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-text-app">{action.label}</span>
                <span className="mt-0.5 block text-sm text-muted-app">{action.description}</span>
              </span>
              <AppIcon name="chevronRight" className="size-5 text-muted-app transition-transform group-hover:translate-x-0.5 group-hover:text-primary-app" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
