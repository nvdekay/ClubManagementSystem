import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export function PublicNotFound() {
  const { t } = useTranslation();
  return (
    <div className="py-20 text-center">
      <p aria-hidden="true" className="font-heading text-7xl font-extrabold text-primary-app">404</p>
      <h1 className="mt-4 font-heading text-3xl font-bold">{t("discovery.notFound")}</h1>
      <Link to="/clubs" className="mt-8 inline-flex min-h-11 items-center rounded-full bg-primary-app px-6 text-sm font-semibold text-on-primary-app hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
        {t("discovery.backToClubs")}
      </Link>
    </div>
  );
}
