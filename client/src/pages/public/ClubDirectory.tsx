import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppCard } from "@/components/ui/card/AppCard";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { AppPagination } from "@/components/ui/pagination/AppPagination";
import { AppSearchInput } from "@/components/ui/search-input/AppSearchInput";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useClubs } from "@/hooks/useDiscovery";

export function ClubDirectory() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [field, setField] = useState("");
  const [page, setPage] = useState(1);
  const [searchKey, setSearchKey] = useState(0);
  const clubs = useClubs(search, field, page);

  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
  }
  function changeField(value: string) {
    setField(value);
    setPage(1);
  }
  function clearFilters() {
    setSearch("");
    setField("");
    setPage(1);
    setSearchKey((key) => key + 1);
  }

  return (
    <section>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold sm:text-4xl">{t("discovery.clubsTitle")}</h1>
        <p className="mt-3 text-muted-app">{t("discovery.clubsDescription")}</p>
      </div>
      <div className="mt-8 flex flex-wrap items-end gap-3">
        <AppSearchInput
          key={searchKey}
          className="min-w-56 flex-1"
          placeholder={t("discovery.searchPlaceholder")}
          aria-label={t("discovery.searchPlaceholder")}
          onSearch={changeSearch}
        />
        <AppSelect
          className="min-w-48"
          label={t("discovery.fields")}
          value={field}
          options={[
            { value: "", label: t("discovery.allFields") },
            ...(clubs.data?.fields ?? []).map((value) => ({ value, label: value })),
          ]}
          onChange={changeField}
        />
      </div>
      {clubs.isPending ? (
        <div role="status" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <span className="sr-only">{t("discovery.loading")}</span>
          <AppSkeleton className="h-48 w-full" />
          <AppSkeleton className="h-48 w-full" />
          <AppSkeleton className="h-48 w-full" />
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
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.data.items.map((club) => (
              <Link key={club.id} to={`/clubs/${club.id}`} className="block h-full">
                <AppCard className="h-full p-5 transition-colors hover:border-primary-app">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary-app">
                      {club.field}
                    </span>
                    <span className="rounded-full border border-border-app px-2 py-1 text-xs">
                      {club.state === "Suspended" ? t("discovery.suspended") : t("discovery.active")}
                    </span>
                  </div>
                  <h2 className="mt-4 text-xl font-semibold">{club.name}</h2>
                  <p className="mt-1 text-xs text-muted-app">{club.code}</p>
                  <p className="mt-3 line-clamp-3 text-sm text-muted-app">{club.description}</p>
                  <span className="mt-5 inline-block text-sm font-semibold text-accent-app">
                    {t("discovery.viewClub")} →
                  </span>
                </AppCard>
              </Link>
            ))}
          </div>
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
