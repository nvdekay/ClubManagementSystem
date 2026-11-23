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

/** Overview page rendered inside WorkspaceShell: a one-line greeting and a list of shortcuts. */
export function WorkspaceHome({ subtitle, actions, children }: WorkspaceHomeProps) {
  const { t } = useTranslation();
  const auth = useAuth();
  const name = auth.data?.user.displayName ?? "";

  return (
    <>
      <header className="mb-2">
        <p className="text-sm text-muted-app">{subtitle}</p>
        <h1 className="mt-0.5 font-heading text-2xl font-semibold tracking-tight break-words text-balance">
          {t("auth.overviewGreeting", { name })}
        </h1>
      </header>

      {children}

      <ul className="mt-8 grid gap-x-8 sm:grid-cols-2">
        {actions.map((action) => (
          <li key={action.href} className="border-b border-border-app">
            <Link to={action.href} className="group flex items-center gap-4 rounded-xl px-2 py-3.5 transition-colors hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-ring-app">
              <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border-app bg-bg-app text-muted-app transition-colors group-hover:text-brand-app">
                <AppIcon name={action.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-text-app">{action.label}</span>
                <span className="mt-0.5 block text-sm text-muted-app">{action.description}</span>
              </span>
              <AppIcon name="chevronRight" className="size-5 text-muted-app transition-transform group-hover:translate-x-0.5 group-hover:text-text-app" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
