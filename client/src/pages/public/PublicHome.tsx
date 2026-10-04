import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { AppCard } from "@/components/ui/card/AppCard";

export function PublicHome() {
  const { t } = useTranslation();
  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-border-app bg-surface-app px-6 py-12 sm:px-12 sm:py-20">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary-app">
          {t("discovery.heroEyebrow")}
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight sm:text-6xl">
          {t("discovery.heroTitle")}
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-app">{t("discovery.heroDescription")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/clubs" className="inline-flex min-h-11 items-center rounded-md bg-primary-app px-5 font-semibold text-on-primary-app">
            {t("discovery.exploreClubs")}
          </Link>
          <Link to="/events" className="inline-flex min-h-11 items-center rounded-md border border-border-app px-5 font-semibold">
            {t("discovery.exploreEvents")}
          </Link>
        </div>
      </section>
      <div className="grid gap-5 md:grid-cols-2">
        <Link to="/clubs">
          <AppCard className="h-full p-7 transition-colors hover:border-primary-app">
            <h2 className="text-xl font-semibold">{t("discovery.clubsTitle")}</h2>
            <p className="mt-3 text-muted-app">{t("discovery.clubsDescription")}</p>
          </AppCard>
        </Link>
        <Link to="/events">
          <AppCard className="h-full p-7 transition-colors hover:border-primary-app">
            <h2 className="text-xl font-semibold">{t("discovery.eventsTitle")}</h2>
            <p className="mt-3 text-muted-app">{t("discovery.eventsDescription")}</p>
          </AppCard>
        </Link>
      </div>
    </div>
  );
}
