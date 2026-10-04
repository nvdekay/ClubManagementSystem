import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PublicEventCard } from "@/components/custom/PublicEventCard";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { AppPagination } from "@/components/ui/pagination/AppPagination";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useEvents } from "@/hooks/useDiscovery";

export function EventDirectory() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const events = useEvents(page);
  return (
    <section>
      <h1 className="text-3xl font-bold sm:text-4xl">{t("discovery.eventsTitle")}</h1>
      <p className="mt-3 max-w-2xl text-muted-app">{t("discovery.eventsDescription")}</p>
      {events.isPending ? (
        <div role="status" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <span className="sr-only">{t("discovery.loading")}</span>
          <AppSkeleton className="h-48 w-full" />
          <AppSkeleton className="h-48 w-full" />
          <AppSkeleton className="h-48 w-full" />
        </div>
      ) : events.isError ? (
        <div role="alert" className="mt-8 space-y-3">
          <p className="text-danger-app">{t("discovery.loadError")}</p>
          <AppButton onClick={() => void events.refetch()}>{t("discovery.retry")}</AppButton>
        </div>
      ) : events.data.items.length === 0 ? (
        <div className="mt-8"><AppEmptyState message={t("discovery.noEvents")} /></div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.data.items.map((event) => <PublicEventCard key={event.id} event={event} />)}
          </div>
          <AppPagination
            className="mt-8"
            pageIndex={page - 1}
            pageCount={Math.ceil(events.data.total / events.data.pageSize)}
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
