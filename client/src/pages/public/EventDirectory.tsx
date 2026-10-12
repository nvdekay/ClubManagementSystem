import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { PublicEventCard } from "@/components/custom/PublicEventCard";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { AppPagination } from "@/components/ui/pagination/AppPagination";
import { AppSearchInput } from "@/components/ui/search-input/AppSearchInput";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useEvents } from "@/hooks/useDiscovery";
import type { PublicEventFilter } from "@/services/discovery";

export function EventDirectory() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PublicEventFilter>("all");
  const [search, setSearch] = useState("");
  const events = useEvents(page, status, search);
  const statusOptions: Array<{ value: PublicEventFilter; label: string }> = [
    { value: "all", label: t("discovery.statusAll") },
    { value: "ongoing", label: t("discovery.statusOngoing") },
    { value: "upcoming", label: t("discovery.statusUpcoming") },
    { value: "ended", label: t("discovery.statusEnded") },
  ];

  function changeStatus(value: PublicEventFilter) {
    setStatus(value);
    setPage(1);
  }
  const changeSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const from = events.data ? (events.data.page - 1) * events.data.pageSize + 1 : 0;
  const to = events.data ? from + events.data.items.length - 1 : 0;

  return (
    <section>
      <h1 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">{t("discovery.allEventsTitle")}</h1>
      <p className="mt-2 text-muted-app">{t("discovery.allEventsDescription")}</p>

      <div className="mt-8 grid grid-cols-1 items-end gap-3 rounded-3xl bg-surface-app p-3 sm:p-4 md:grid-cols-[14rem_minmax(0,1fr)]">
        <div>
          <span className="mb-1.5 block px-1 text-sm font-medium">{t("discovery.eventStatusLabel")}</span>
          <AppSelect label={t("discovery.eventStatusLabel")} value={status} options={statusOptions} onChange={changeStatus} />
        </div>
        <div role="search" className="min-w-0">
          <label htmlFor="event-search" className="mb-1.5 block px-1 text-sm font-medium">{t("discovery.eventSearchLabel")}</label>
          <AppSearchInput id="event-search" onSearch={changeSearch}
            placeholder={t("discovery.eventSearchPlaceholder")} maxLength={100} className="w-full" />
        </div>
      </div>

      {events.isPending ? (
        <div role="status" className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          <span className="sr-only">{t("discovery.loading")}</span>
          {[0, 1, 2, 3].map((item) => <AppSkeleton key={item} className="h-96 w-full" />)}
        </div>
      ) : events.isError ? (
        <div role="alert" className="mt-8 space-y-3">
          <p className="text-danger-app">{t("discovery.loadError")}</p>
          <AppButton onClick={() => void events.refetch()}>{t("discovery.retry")}</AppButton>
        </div>
      ) : events.data.items.length === 0 ? (
        <div className="mt-10">
          <AppEmptyState message={search || status !== "all" ? t("discovery.noEventsFound") : t("discovery.noEvents")} />
        </div>
      ) : (
        <>
          <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {events.data.items.map((event) => <li key={event.id} className="min-w-0"><PublicEventCard event={event} /></li>)}
          </ul>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border-app pt-6">
            <p className="text-sm text-muted-app italic">
              {t("discovery.eventsShowing", { from, to, total: events.data.total })}
            </p>
            <AppPagination
              pageIndex={page - 1}
              pageCount={Math.ceil(events.data.total / events.data.pageSize)}
              onPageChange={(index) => setPage(index + 1)}
              prevLabel={t("discovery.prev")}
              nextLabel={t("discovery.next")}
              pageLabel={(number) => t("discovery.pageLabel", { page: number })}
              navLabel={t("discovery.pages")}
            />
          </div>
        </>
      )}
    </section>
  );
}
