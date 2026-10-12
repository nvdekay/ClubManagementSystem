import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { ClubCover } from "@/components/custom/ClubCover";
import { ClubLogo } from "@/components/custom/ClubLogo";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppPagination } from "@/components/ui/pagination/AppPagination";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useClubLifecycles } from "@/hooks/useClubLifecycle";

import { ClubManageDialog } from "./ClubManageDialog";

const PAGE_SIZE = 20;
const tones: Record<string, AppBadgeTone> = {
  Active: "success", Suspended: "warning", Dissolving: "danger", Dissolved: "neutral", "Pending Setup": "info",
};

/**
 * ICPDP's club screen: the public directory's look, over every club in any state, with the UC15
 * lifecycle actions one click away.
 */
export function IcpdpClubsPage() {
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const isOfficer = auth.data?.systemRoles.includes("ICPDP_OFFICER") ?? false;
  const clubs = useClubLifecycles(isOfficer);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [field, setField] = useState("");
  const [state, setState] = useState("");
  const [page, setPage] = useState(1);
  const [managing, setManaging] = useState<string | null>(null);

  function stateLabel(value: string): string {
    switch (value) {
      case "Active": return t("clubLifecycle.state_Active");
      case "Suspended": return t("clubLifecycle.state_Suspended");
      case "Dissolving": return t("clubLifecycle.state_Dissolving");
      case "Dissolved": return t("clubLifecycle.state_Dissolved");
      case "Pending Setup": return t("clubLifecycle.state_Pending Setup");
      default: return value;
    }
  }

  function date(value: string): string {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(value));
  }

  function filter(update: () => void) {
    update();
    setPage(1);
  }

  if (auth.isPending) return <AppSkeleton className="h-72 w-full" />;
  if (!auth.data) return <AppNotice>
    <p>{t("clubLifecycle.signIn")}</p>
    <Link className="font-semibold text-accent-app" to="/login?returnTo=%2Ficpdp%2Fclubs">{t("clubLifecycle.signInLink")}</Link>
  </AppNotice>;
  if (!isOfficer) return <AppNotice tone="danger" role="alert">{t("clubLifecycle.forbidden")}</AppNotice>;

  const all = clubs.data?.clubs ?? [];
  const term = search.toLocaleLowerCase("vi-VN");
  const visible = all.filter((club) => (!field || club.field === field) && (!state || club.state === state)
    && (!term || `${club.name} ${club.code} ${club.contactEmail ?? ""}`.toLocaleLowerCase("vi-VN").includes(term)));
  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const fields = [...new Set(all.map((club) => club.field).filter(Boolean))].sort((left, right) => left.localeCompare(right, "vi"));
  const states = [...new Set(all.map((club) => club.state))];
  const selected = all.find((club) => club.id === managing);

  return (
    <section>
      <div className="text-center">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-text-app sm:text-4xl">{t("discovery.clubsTitle")}</h1>
        <p className="mt-3 text-muted-app">
          {t("discovery.clubsCountPrefix")} <strong className="font-bold text-recruitment-app">{visible.length}</strong> {t("discovery.clubsCountSuffix")}
        </p>
      </div>

      {clubs.data && clubs.data.expiringSuspensions.length > 0 && (
        <AppNotice tone="warning" className="mt-6" title={t("clubLifecycle.expiringTitle")}>
          <p>{t("clubLifecycle.expiringHint")}</p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{clubs.data.expiringSuspensions.map((club) => <li key={club.id}>
            <button type="button" className="font-semibold text-accent-app hover:underline" onClick={() => setManaging(club.id)}>
              {club.name}</button>{club.suspension?.until ? ` · ${t("clubLifecycle.until", { date: date(club.suspension.until) })}` : ""}</li>)}</ul>
        </AppNotice>
      )}

      <div className="mt-7 rounded-xl bg-surface-app p-3">
        <form onSubmit={(event) => { event.preventDefault(); filter(() => setSearch(query.trim())); }} className="flex">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
            aria-label={t("discovery.searchPlaceholder")} placeholder={t("discovery.searchPlaceholder")}
            className="min-h-11 min-w-0 flex-1 rounded-l-lg border border-r-0 border-border-app bg-bg-app px-4 text-text-app placeholder:text-muted-app focus:border-recruitment-app focus:ring-2 focus:ring-recruitment-soft-app focus:outline-none" />
          <button type="submit" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-r-lg bg-recruitment-app px-4 font-semibold text-on-recruitment-app transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-recruitment-app sm:px-6">
            <AppIcon name="search" className="size-5" />
            <span className="hidden sm:inline">{t("discovery.searchAction")}</span>
          </button>
        </form>
        <div className="mt-3 flex flex-wrap justify-end gap-3">
          <AppSelect className="w-full sm:w-56" label={t("clubLifecycle.stateFilter")} value={state}
            options={[{ value: "", label: t("clubLifecycle.allStates") }, ...states.map((value) => ({ value, label: stateLabel(value) }))]}
            onChange={(value) => filter(() => setState(value))} />
          <AppSelect className="w-full sm:w-56" label={t("discovery.fields")} value={field}
            options={[{ value: "", label: t("discovery.allFields") }, ...fields.map((value) => ({ value, label: value }))]}
            onChange={(value) => filter(() => setField(value))} />
        </div>
      </div>

      {clubs.isPending ? (
        <div role="status" className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <span className="sr-only">{t("discovery.loading")}</span>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((item) => <AppSkeleton key={item} className="h-72 w-full rounded-2xl" />)}
        </div>
      ) : clubs.isError ? (
        <div role="alert" className="mt-8 space-y-3">
          <p className="text-danger-app">{t("clubLifecycle.loadError")}</p>
          <AppButton onClick={() => void clubs.refetch()}>{t("clubLifecycle.retry")}</AppButton>
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-8 space-y-4">
          <AppEmptyState message={t("discovery.noClubs")} />
          {(search || field || state) && <AppButton variant="secondary" onClick={() => filter(() => {
            setSearch(""); setQuery(""); setField(""); setState("");
          })}>{t("discovery.clearFilters")}</AppButton>}
        </div>
      ) : (
        <>
          <ul className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {pageItems.map((club) => (
              <li key={club.id} className="group relative flex min-h-72 flex-col overflow-hidden rounded-2xl border border-border-app bg-bg-app shadow-md transition duration-200 hover:-translate-y-1 hover:shadow-xl">
                <button type="button" onClick={() => setManaging(club.id)} aria-label={t("clubLifecycle.manageLabel", { club: club.name })}
                  className="focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring-app">
                  <ClubCover name={club.name} logoUrl={club.logoUrl} />
                </button>
                <ClubLogo name={club.name} logoUrl={club.logoUrl} size={72}
                  className="absolute top-19 left-1/2 -translate-x-1/2 rounded-full border-2 border-bg-app shadow-sm" />
                <div className="flex flex-1 flex-col items-center px-4 pt-11 pb-5 text-center">
                  <span title={club.name} className="line-clamp-1 font-heading text-lg font-bold text-primary-app">{club.name}</span>
                  <span className="mt-1 line-clamp-1 w-full text-xs text-muted-app" title={club.contactEmail ?? club.code}>
                    {club.contactEmail ?? club.code}
                  </span>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <AppBadge tone={tones[club.state] ?? "info"}>{stateLabel(club.state)}</AppBadge>
                    {club.dissolution && club.state !== "Dissolved" && <AppBadge tone="danger">
                      {t("clubLifecycle.dissolvingFrom", { semester: club.dissolution.effectiveSemester })}</AppBadge>}
                  </div>
                  <span className="mt-2 text-xs text-muted-app">{t("clubLifecycle.members", { count: club.activeMembers })}
                    {club.suspension ? ` · ${club.suspension.until ? t("clubLifecycle.until", { date: date(club.suspension.until) })
                      : t("clubLifecycle.indefinite")}` : ""}</span>
                  <AppButton className="mt-auto" variant="secondary" onClick={() => setManaging(club.id)}>
                    <AppIcon name="settings" className="size-4" />{t("clubLifecycle.open")}</AppButton>
                </div>
              </li>
            ))}
          </ul>
          <AppPagination className="mt-8" pageIndex={page - 1} pageCount={Math.ceil(visible.length / PAGE_SIZE)}
            onPageChange={(index) => setPage(index + 1)} prevLabel={t("discovery.prev")} nextLabel={t("discovery.next")}
            pageLabel={(number) => t("discovery.pageLabel", { page: number })} navLabel={t("discovery.pages")} />
        </>
      )}

      {selected && <ClubManageDialog key={selected.id} club={selected} stateLabel={stateLabel(selected.state)}
        stateTone={tones[selected.state] ?? "info"} csrfToken={auth.data.csrfToken} onClose={() => setManaging(null)} />}
    </section>
  );
}
