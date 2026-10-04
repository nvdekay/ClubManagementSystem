import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppSwitch } from "@/components/ui/switch/AppSwitch";
import { cn } from "@/utils/cn";

type Theme = "light" | "dark";

function initialTheme(): Theme {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function PublicLayout() {
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div className="min-h-full">
      <header className="bg-bg-app">
        <nav aria-label={t("common.navigation")} className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4 sm:px-8">
          <NavLink to="/" className="mr-auto flex items-center gap-3 text-text-app no-underline">
            <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-brand-app font-heading text-xl font-extrabold text-on-brand-app">F</span>
            <span className="font-heading text-lg font-bold">{t("auth.brand")}</span>
          </NavLink>
          <NavLink to="/clubs" className={({ isActive }) => cn(
            "rounded-full px-3 py-2 text-sm text-text-app transition-colors hover:text-primary-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app",
            { "bg-surface-app font-semibold text-primary-app": isActive },
          )}>{t("discovery.navClubs")}</NavLink>
          <NavLink to="/events" className={({ isActive }) => cn(
            "rounded-full px-3 py-2 text-sm text-text-app transition-colors hover:text-primary-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app",
            { "bg-surface-app font-semibold text-primary-app": isActive },
          )}>{t("discovery.navEvents")}</NavLink>
          <label className="flex items-center gap-2 px-2 text-xs text-muted-app">
            {t("common.darkModeLabel")}
            <AppSwitch checked={theme === "dark"} onChange={(value) => setTheme(value ? "dark" : "light")} />
          </label>
          <AppButton variant="secondary" className="rounded-full" onClick={() => void i18n.changeLanguage(i18n.language === "vi" ? "en" : "vi")}>
            {i18n.language === "vi" ? "EN" : "VI"}
          </AppButton>
          <NavLink to="/login" className="rounded-full bg-primary-app px-4 py-2 text-sm font-semibold text-on-primary-app no-underline transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
            {t("discovery.navWorkspace")}
          </NavLink>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-12">
        <Outlet />
      </main>
    </div>
  );
}
