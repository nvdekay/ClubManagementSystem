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
      <header className="border-b border-border-app bg-surface-app">
        <nav aria-label={t("common.navigation")} className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-4 sm:px-8">
          <NavLink to="/" className="mr-auto text-xl font-bold text-primary-app">
            {t("auth.brand")}
          </NavLink>
          <NavLink to="/clubs" className={({ isActive }) => cn(
            "rounded px-2 py-2 text-sm hover:text-primary-app focus-visible:outline-2 focus-visible:outline-ring-app",
            { "font-semibold text-primary-app": isActive },
          )}>{t("discovery.navClubs")}</NavLink>
          <NavLink to="/events" className={({ isActive }) => cn(
            "rounded px-2 py-2 text-sm hover:text-primary-app focus-visible:outline-2 focus-visible:outline-ring-app",
            { "font-semibold text-primary-app": isActive },
          )}>{t("discovery.navEvents")}</NavLink>
          <NavLink to="/workspace" className="rounded px-2 py-2 text-sm hover:text-primary-app focus-visible:outline-2 focus-visible:outline-ring-app">
            {t("discovery.navWorkspace")}
          </NavLink>
          <label className="flex items-center gap-2 text-xs text-muted-app">
            {t("common.darkModeLabel")}
            <AppSwitch checked={theme === "dark"} onChange={(value) => setTheme(value ? "dark" : "light")} />
          </label>
          <AppButton variant="secondary" onClick={() => void i18n.changeLanguage(i18n.language === "vi" ? "en" : "vi")}>
            {i18n.language === "vi" ? "EN" : "VI"}
          </AppButton>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
        <Outlet />
      </main>
    </div>
  );
}
