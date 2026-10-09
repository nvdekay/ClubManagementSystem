import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";

import { ClubLogo } from "@/components/custom/ClubLogo";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { AppPagination } from "@/components/ui/pagination/AppPagination";
import { AppSearchInput } from "@/components/ui/search-input/AppSearchInput";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useClubs } from "@/hooks/useDiscovery";

export function ClubDirectory() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [field, setField] = useState(() => searchParams.get("field") ?? "");
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
        <h1 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">{t("discovery.clubsTitle")}</h1>
        <p className="mt-3 text-muted-app">{t("discovery.clubsDescription")}</p>
      </div>
      <div className="mt-8 flex flex-wrap items-end gap-3 rounded-3xl bg-surface-app p-3">
        <AppSearchInput
          key={searchKey}
          className="min-w-56 flex-1"
          defaultValue={search}
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
          <ul className="mt-8 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.data.items.map((club) => (
              <li key={club.id}>
                <Link to={`/clubs/${club.id}`} className="group flex h-full gap-4 rounded-2xl p-4 transition-colors hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
                  <ClubLogo name={club.name} logoUrl={club.logoUrl} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold tracking-wider text-mint-app uppercase">{club.field}</span>
                      <AppBadge tone={club.state === "Suspended" ? "warning" : "success"}>
                        {club.state === "Suspended" ? t("discovery.suspended") : t("discovery.active")}
                      </AppBadge>
                    </span>
                    <span className="mt-1 font-heading text-lg font-bold text-text-app group-hover:text-primary-app">{club.name}</span>
                    <span className="text-xs text-muted-app">{club.code}</span>
                    <span className="mt-2 line-clamp-2 text-sm text-muted-app">{club.description}</span>
                    <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-accent-app">
                      {t("discovery.viewClub")}<AppIcon name="chevronRight" className="size-4" />
                    </span>
                  </span>
                </Link>
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
