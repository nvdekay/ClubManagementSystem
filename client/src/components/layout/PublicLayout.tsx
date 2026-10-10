import { useTranslation } from "react-i18next";
import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router";

import { UniversityLogo } from "@/components/custom/UniversityLogo";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/utils/cn";

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    "inline-flex min-h-10 items-center rounded-full px-3.5 text-sm font-medium text-muted-app transition-colors hover:text-text-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app",
    { "bg-primary-soft-app font-semibold text-primary-app hover:text-primary-app": isActive },
  );
}

export function PublicLayout() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const auth = useAuth();
  // Bring the visitor back to the page they were reading after signing in.
  const loginTarget = `/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`;

  if (!auth.data) return <Navigate to={loginTarget} replace />;

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b border-border-app bg-bg-app/85 backdrop-blur">
        <nav aria-label={t("common.navigation")} className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-2 px-4 py-3 sm:px-8">
          <NavLink to="/" aria-label={t("auth.brand")} className="mr-auto rounded-sm no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
            <UniversityLogo alt={t("auth.schoolLogo")} priority className="w-34 sm:w-40" />
          </NavLink>
          <div className="order-last flex w-full items-center gap-1 sm:order-none sm:w-auto">
            <NavLink to="/clubs" className={navClass}>{t("discovery.navClubs")}</NavLink>
            <NavLink to="/events" className={navClass}>{t("discovery.navEvents")}</NavLink>
          </div>
          <button type="button" onClick={toggleTheme} aria-label={theme === "dark" ? t("common.lightMode") : t("common.darkModeLabel")}
            className="flex size-10 items-center justify-center rounded-full text-muted-app transition-colors hover:bg-surface-app hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app">
            <AppIcon name={theme === "dark" ? "sun" : "moon"} />
          </button>
          <button type="button" onClick={() => void i18n.changeLanguage(i18n.language === "vi" ? "en" : "vi")} aria-label={t("common.switchLanguage")}
            className="flex size-10 items-center justify-center rounded-full text-xs font-bold text-muted-app transition-colors hover:bg-surface-app hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app">
            {i18n.language === "vi" ? "EN" : "VI"}
          </button>
          <Link to={auth.data ? "/workspace" : loginTarget} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary-app px-4 text-sm font-semibold text-on-primary-app no-underline shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
            {auth.data ? t("common.myWorkspace") : t("discovery.navWorkspace")}
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-8 sm:py-12">
        <Outlet />
      </main>
      <footer className="border-t border-border-app">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted-app sm:px-8">
          <span className="font-semibold text-text-app">{t("auth.brand")}</span>
          <span>{t("auth.subtitle")}</span>
        </div>
      </footer>
    </div>
  );
}
