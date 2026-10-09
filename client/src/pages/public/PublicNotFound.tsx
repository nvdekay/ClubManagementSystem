import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export function PublicNotFound() {
  const { t } = useTranslation();
  return (
    <div className="py-20 text-center">
      <h1 className="text-3xl font-bold font-heading">{t("discovery.notFound")}</h1>
      <Link to="/clubs" className="mt-6 inline-block font-semibold text-accent-app">
        {t("discovery.backToClubs")}
      </Link>
    </div>
  );
}
