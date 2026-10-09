import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useClubLifecycles } from "@/hooks/useClubLifecycle";
import { cn } from "@/utils/cn";

import { ClubLifecyclePanel } from "./ClubLifecyclePanel";

const filters = ["", "Active", "Suspended", "Dissolving", "Dissolved"] as const;
const tones: Record<string, AppBadgeTone> = { Active: "success", Suspended: "warning", Dissolving: "danger", Dissolved: "neutral" };

export function ClubLifecyclePage() {
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const isOfficer = auth.data?.systemRoles.includes("ICPDP_OFFICER") ?? false;
  const clubs = useClubLifecycles(isOfficer);
  const [search, setSearch] = useState("");
  const [state, setState] = useState<(typeof filters)[number]>("");
  const [open, setOpen] = useState<string | null>(null);

  function stateLabel(value: string): string {
    switch (value) {
      case "Active": return t("clubLifecycle.state_Active");
      case "Suspended": return t("clubLifecycle.state_Suspended");
      case "Dissolving": return t("clubLifecycle.state_Dissolving");
      case "Dissolved": return t("clubLifecycle.state_Dissolved");
      case "Pending Setup": return t("clubLifecycle.state_Pending Setup");
      case "": return t("clubLifecycle.filterAll");
      default: return value;
    }
  }

  function date(value: string): string {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(value));
  }

  const term = search.trim().toLocaleLowerCase("vi-VN");
  const visible = (clubs.data?.clubs ?? []).filter((club) => (!state || club.state === state)
    && (!term || `${club.name} ${club.code}`.toLocaleLowerCase("vi-VN").includes(term)));

  return (
    <>
      <PageHeader title={t("clubLifecycle.title")} description={t("clubLifecycle.description")} />
      {auth.isPending ? <AppSkeleton className="h-44 w-full" />
        : !auth.data ? <AppNotice>
          <p>{t("clubLifecycle.signIn")}</p>
          <Link className="font-semibold text-accent-app" to="/login?returnTo=%2Fworkspace%2Fclub-lifecycle">{t("clubLifecycle.signInLink")}</Link>
        </AppNotice>
          : !isOfficer ? <AppNotice tone="danger" role="alert">{t("clubLifecycle.forbidden")}</AppNotice>
            : clubs.isPending ? <AppSkeleton className="h-44 w-full" />
              : clubs.isError ? <AppNotice tone="danger" role="alert" title={`${t("clubLifecycle.loadError")} ${clubs.error.message}`}>
                <AppButton onClick={() => void clubs.refetch()}>{t("clubLifecycle.retry")}</AppButton>
              </AppNotice> : <div className="space-y-6">
                {clubs.data.expiringSuspensions.length > 0 && <AppNotice tone="warning" title={t("clubLifecycle.expiringTitle")}>
                  <p>{t("clubLifecycle.expiringHint")}</p>
                  <ul className="mt-2 space-y-1">{clubs.data.expiringSuspensions.map((club) => <li key={club.id}>
                    <button type="button" className="font-semibold text-accent-app" onClick={() => setOpen(club.id)}>{club.name}</button>
                    {" "}· {club.suspension?.until ? t("clubLifecycle.until", { date: date(club.suspension.until) }) : ""}</li>)}</ul>
                </AppNotice>}
                <div className="flex flex-wrap items-center gap-3">
                  <AppInput className="min-w-0 flex-1 basis-60" placeholder={t("clubLifecycle.search")} aria-label={t("clubLifecycle.search")}
                    value={search} onChange={(event) => setSearch(event.target.value)} />
                  <div className="flex flex-wrap gap-2">{filters.map((value) => (
                    <button key={value || "all"} type="button" aria-pressed={state === value} onClick={() => setState(value)}
                      className={cn("min-h-10 rounded-full border border-border-app px-4 text-sm text-muted-app",
                        { "border-primary-app bg-primary-soft-app text-primary-app": state === value })}>{stateLabel(value)}</button>))}
                  </div>
                </div>
                {visible.length === 0 ? <AppNotice>{t("clubLifecycle.empty")}</AppNotice>
                  : <ul className="space-y-3">{visible.map((club) => (
                    <li key={club.id} className="rounded-2xl border border-border-app p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0 flex-1 basis-60">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm text-muted-app">{club.code}</span>
                            <h2 className="font-heading font-bold break-words">{club.name}</h2>
                            <AppBadge tone={tones[club.state] ?? "info"}>{stateLabel(club.state)}</AppBadge>
                          </div>
                          <p className="mt-1 text-sm text-muted-app">{club.field} · {t("clubLifecycle.members", { count: club.activeMembers })}
                            {club.suspension && ` · ${club.suspension.until ? t("clubLifecycle.until", { date: date(club.suspension.until) })
                              : t("clubLifecycle.indefinite")}`}</p>
                        </div>
                        <AppButton variant="secondary" onClick={() => setOpen(open === club.id ? null : club.id)}>
                          {open === club.id ? t("clubLifecycle.close") : t("clubLifecycle.open")}</AppButton>
                      </div>
                      {open === club.id && <ClubLifecyclePanel clubId={club.id} csrfToken={auth.data!.csrfToken}
                        onClose={() => setOpen(null)} />}
                    </li>))}</ul>}
              </div>}
    </>
  );
}
