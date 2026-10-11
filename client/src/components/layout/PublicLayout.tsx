import { useTranslation } from "react-i18next";
import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router";

import { UniversityLogo } from "@/components/custom/UniversityLogo";
import { UserMenu } from "@/components/layout/UserMenu";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/utils/cn";

/** Contact details published on the FPT Education PDP site footer. */
const FPT_EDUCATION = { name: "FPT Education", address: "Hoa Lac High Tech Park, Hanoi, Vietnam", email: "fpteducation@fe.edu.vn" };

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    "relative inline-flex min-h-11 items-center px-3 text-sm font-semibold text-text-app no-underline transition-colors hover:text-fpt-orange-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app",
    { "text-fpt-orange-app after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-full after:bg-fpt-orange-app": isActive },
  );
}

const iconButton = "flex size-10 items-center justify-center rounded-full text-muted-app transition-colors hover:bg-surface-app hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app";

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
      <header className="sticky top-0 z-30">
        <div className="bg-fpt-orange-app text-on-fpt-orange-app">
          <div className="mx-auto flex min-h-8 max-w-7xl flex-wrap items-center justify-between gap-x-4 px-4 py-1 text-xs sm:px-8">
            <span className="font-medium">{t("discovery.topBar")}</span>
            <a href={`mailto:${FPT_EDUCATION.email}`} className="hidden items-center gap-1.5 text-on-fpt-orange-app no-underline hover:underline sm:inline-flex">
              <AppIcon name="send" className="size-3.5" />{FPT_EDUCATION.email}
            </a>
          </div>
        </div>
        <div className="border-b border-border-app bg-bg-app/95 shadow-sm backdrop-blur">
          <nav aria-label={t("common.navigation")} className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5 sm:px-8">
            <Link to="/" aria-label={t("auth.brand")} className="mr-auto rounded-sm no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
              <UniversityLogo alt={t("auth.schoolLogo")} priority className="w-34 sm:w-40" />
            </Link>
            <div className="order-last flex w-full items-center gap-1 md:order-none md:w-auto">
              <NavLink to="/" end className={navClass}>{t("discovery.navHome")}</NavLink>
              <NavLink to="/clubs" className={navClass}>{t("discovery.navClubs")}</NavLink>
              <NavLink to="/events" className={navClass}>{t("discovery.navEvents")}</NavLink>
            </div>
            <button type="button" onClick={toggleTheme} aria-label={theme === "dark" ? t("common.lightMode") : t("common.darkModeLabel")} className={iconButton}>
              <AppIcon name={theme === "dark" ? "sun" : "moon"} />
            </button>
            <button type="button" onClick={() => void i18n.changeLanguage(i18n.language === "vi" ? "en" : "vi")} aria-label={t("common.switchLanguage")}
              className={cn(iconButton, "text-xs font-bold")}>
              {i18n.language === "vi" ? "EN" : "VI"}
            </button>
            <UserMenu user={auth.data.user} csrfToken={auth.data.csrfToken} />
          </nav>
        </div>
      </header>
      {/* The landing page draws full-width bands, so it manages its own width. */}
      <main className={cn("mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-8 sm:py-12", { "max-w-none p-0 sm:p-0": location.pathname === "/" })}>
        <Outlet />
      </main>
      <footer className="bg-fpt-orange-app text-on-fpt-orange-app">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 text-sm sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div className="space-y-3">
            <p className="font-heading text-lg font-bold">{FPT_EDUCATION.name}</p>
            <p className="max-w-sm opacity-90">{t("discovery.footerAbout")}</p>
            <p className="flex items-start gap-2"><AppIcon name="mapPin" className="mt-0.5 size-4 shrink-0" />{FPT_EDUCATION.address}</p>
            <p className="flex items-start gap-2"><AppIcon name="send" className="mt-0.5 size-4 shrink-0" />
              <span>{t("discovery.footerEmail")}: <a href={`mailto:${FPT_EDUCATION.email}`} className="font-semibold text-on-fpt-orange-app hover:underline">{FPT_EDUCATION.email}</a></span>
            </p>
          </div>
          <div>
            <p className="relative pb-2 font-semibold after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-6 after:rounded-full after:bg-on-fpt-orange-app">{t("discovery.footerExplore")}</p>
            <ul className="mt-4 space-y-2.5">
              {([["/", "discovery.navHome"], ["/clubs", "discovery.navClubs"], ["/events", "discovery.navEvents"]] as const).map(([to, key]) => (
                <li key={to}><Link to={to} className="inline-flex items-center gap-1 text-on-fpt-orange-app no-underline opacity-80 transition-opacity hover:opacity-100">
                  <AppIcon name="chevronRight" className="size-3.5" />{t(key)}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="relative pb-2 font-semibold after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-6 after:rounded-full after:bg-on-fpt-orange-app">{t("discovery.footerAccount")}</p>
            <ul className="mt-4 space-y-2.5">
              {([["/workspace", "common.myWorkspace"], ["/workspace/applications", "discovery.ctaFound"]] as const).map(([to, key]) => (
                <li key={to}><Link to={to} className="inline-flex items-center gap-1 text-on-fpt-orange-app no-underline opacity-80 transition-opacity hover:opacity-100">
                  <AppIcon name="chevronRight" className="size-3.5" />{t(key)}</Link></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-on-fpt-orange-app/25">
          <p className="mx-auto max-w-7xl px-4 py-4 text-xs sm:px-8">© Copyright <strong>{FPT_EDUCATION.name}</strong> · {t("auth.brand")}</p>
        </div>
      </footer>
    </div>
  );
}
