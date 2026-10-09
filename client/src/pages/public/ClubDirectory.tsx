import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";

import { ClubLogo } from "@/components/custom/ClubLogo";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { AppPagination } from "@/components/ui/pagination/AppPagination";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useClubs } from "@/hooks/useDiscovery";

function ClubCover({ name, logoUrl }: { name: string; logoUrl?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="relative block h-28 overflow-hidden bg-primary-soft-app">
      {logoUrl && !failed ? (
        <img src={logoUrl} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)}
          className="size-full scale-105 object-cover opacity-75 transition-transform duration-300 group-hover:scale-110" />
      ) : (
        <span aria-hidden="true" className="flex size-full items-center justify-center font-heading text-5xl font-extrabold text-primary-app/15">
          {name.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <span aria-hidden="true" className="absolute inset-0 bg-text-app/5" />
    </span>
  );
}

export function ClubDirectory() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";
  const [query, setQuery] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [field, setField] = useState(() => searchParams.get("field") ?? "");
  const [page, setPage] = useState(1);
  const clubs = useClubs(search, field, page);

  function submitSearch() {
    setSearch(query.trim());
    setPage(1);
  }
  function changeField(value: string) {
    setField(value);
    setPage(1);
  }
  function clearFilters() {
    setSearch("");
    setQuery("");
    setField("");
    setPage(1);
  }

  return (
    <section>
      <div className="text-center">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-text-app sm:text-4xl">{t("discovery.clubsTitle")}</h1>
        <p className="mt-3 text-muted-app">
          {t("discovery.clubsCountPrefix")} <strong className="font-bold text-recruitment-app">{clubs.data?.total ?? 0}</strong> {t("discovery.clubsCountSuffix")}
        </p>
      </div>
      <div className="mt-7 rounded-xl bg-surface-app p-3">
        <form onSubmit={(event) => { event.preventDefault(); submitSearch(); }} className="flex">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
            aria-label={t("discovery.searchPlaceholder")} placeholder={t("discovery.searchPlaceholder")}
            className="min-h-11 min-w-0 flex-1 rounded-l-lg border border-r-0 border-border-app bg-bg-app px-4 text-text-app placeholder:text-muted-app focus:border-recruitment-app focus:ring-2 focus:ring-recruitment-soft-app focus:outline-none" />
          <button type="submit" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-r-lg bg-recruitment-app px-4 font-semibold text-on-recruitment-app transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-recruitment-app sm:px-6">
            <AppIcon name="search" className="size-5" />
            <span className="hidden sm:inline">{t("discovery.searchAction")}</span>
          </button>
        </form>
        <div className="mt-3 flex justify-end">
          <AppSelect
            className="w-full sm:w-56"
            label={t("discovery.fields")}
            value={field}
            options={[
              { value: "", label: t("discovery.allFields") },
              ...(clubs.data?.fields ?? []).map((value) => ({ value, label: value })),
            ]}
            onChange={changeField}
          />
        </div>
      </div>
      {clubs.isPending ? (
        <div role="status" className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <span className="sr-only">{t("discovery.loading")}</span>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((item) => <AppSkeleton key={item} className="h-72 w-full rounded-2xl" />)}
        </div>
      ) : clubs.isError ? (
        <div role="alert" className="mt-8 space-y-3">
          <p className="text-danger-app">{t("discovery.loadError")}</p>
          <AppButton onClick={() => void clubs.refetch()}>{t("discovery.retry")}</AppButton>
        </div>
      ) : clubs.data.items.length === 0 ? (
        <div className="mt-8 space-y-4">
          <AppEmptyState message={t("discovery.noClubs")} />
          {(search || field) && <AppButton variant="secondary" onClick={clearFilters}>
            {t("discovery.clearFilters")}
          </AppButton>}
        </div>
      ) : (
        <>
          <ul className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {clubs.data.items.map((club) => (
              <li key={club.id} className="group relative flex min-h-72 flex-col overflow-hidden rounded-2xl border border-border-app bg-bg-app shadow-md transition duration-200 hover:-translate-y-1 hover:shadow-xl">
                <Link to={`/clubs/${club.id}`} aria-label={t("discovery.viewClubLabel", { club: club.name })}
                  className="focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring-app">
                  <ClubCover name={club.name} logoUrl={club.logoUrl} />
                </Link>
                <ClubLogo name={club.name} logoUrl={club.logoUrl} size={72}
                  className="absolute top-19 left-1/2 -translate-x-1/2 rounded-full border-2 border-bg-app shadow-sm" />
                <div className="flex flex-1 flex-col items-center px-4 pt-11 pb-5 text-center">
                  <Link to={`/clubs/${club.id}`} title={club.name}
                    className="line-clamp-1 font-heading text-lg font-bold text-primary-app hover:underline focus-visible:outline-2 focus-visible:outline-ring-app">
                    {club.name}
                  </Link>
                  <span className="mt-1 line-clamp-1 w-full text-xs text-muted-app" title={club.contactEmail ?? club.code}>
                    {club.contactEmail ?? club.code}
                  </span>
                  {club.state === "Suspended" && (
                    <AppBadge tone="warning" className="mt-3">{t("discovery.suspended")}</AppBadge>
                  )}
                  {club.openCampaignId && (
                    <Link to={`/workspace/recruitment/${club.openCampaignId}`}
                      className="mt-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-recruitment-app px-4 pt-0.5 text-sm font-semibold text-on-recruitment-app shadow-[0_4px_14px_var(--color-recruitment-glow-app)] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-recruitment-app">
                      <AppIcon name="users" className="size-4" />{t("discovery.recruitingNow")}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <AppPagination
            className="mt-8"
            pageIndex={page - 1}
            pageCount={Math.ceil(clubs.data.total / clubs.data.pageSize)}
            onPageChange={(index) => setPage(index + 1)}
            prevLabel={t("discovery.prev")}
            nextLabel={t("discovery.next")}
            pageLabel={(number) => t("discovery.pageLabel", { page: number })}
            navLabel={t("discovery.pages")}
          />
        </>
      )}
    </section>
  );
}
