import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { ClubBoardHistory } from "@/components/custom/ClubBoardHistory";
import { ClubLogo } from "@/components/custom/ClubLogo";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import type { ClubLifecycleSummary } from "@/services/clubLifecycle";

import { ClubLifecyclePanel } from "./ClubLifecyclePanel";

interface ClubManageDialogProps {
  club: ClubLifecycleSummary;
  stateLabel: string;
  stateTone: AppBadgeTone;
  csrfToken: string;
  onClose: () => void;
}

/** Native modal dialog: focus trapping, Esc to close and the backdrop come from the browser. */
export function ClubManageDialog({ club, stateLabel, stateTone, csrfToken, onClose }: ClubManageDialogProps) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);

  // No close() on cleanup: under StrictMode it would fire onClose and dismiss the dialog right after
  // opening it. Removing the element from the DOM closes it anyway.
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby="club-manage-title" onClose={onClose}
      className="m-auto max-h-[90vh] w-[min(56rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-border-app bg-bg-app p-0 text-text-app shadow-xl backdrop:bg-backdrop-app transition-[opacity,scale] duration-200 ease-out starting:open:scale-[0.97] starting:open:opacity-0 backdrop:transition-opacity backdrop:duration-200 starting:open:backdrop:opacity-0">
      {/* Same frame as AppDialog: header pinned on top, close action pinned at the bottom. */}
      <header className="sticky top-0 z-10 flex items-start gap-4 border-b border-border-app bg-bg-app px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
          <ClubLogo name={club.name} logoUrl={club.logoUrl} size={56} className="shrink-0 rounded-full border border-border-app" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="club-manage-title" className="font-heading text-base font-semibold break-words">{club.name}</h2>
              <AppBadge tone={stateTone}>{stateLabel}</AppBadge>
            </div>
            <p className="mt-1 text-sm text-muted-app">{club.code} · {club.field} · {t("clubLifecycle.members", { count: club.activeMembers })}</p>
            {["Active", "Suspended"].includes(club.state) && <Link to={`/clubs/${club.id}`}
              className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary-app hover:underline">
              {t("clubLifecycle.viewPublic")}<AppIcon name="external" className="size-3.5" /></Link>}
          </div>
          <button type="button" aria-label={t("clubLifecycle.close")} onClick={onClose}
            className="-mt-1 -mr-1 flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-app hover:bg-surface-app hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app">
            <AppIcon name="close" className="size-5" /></button>
      </header>
      <div className="px-5 pb-6 sm:px-6">
        <ClubLifecyclePanel clubId={club.id} csrfToken={csrfToken} />
        <section aria-labelledby="club-history-title" className="mt-8 border-t border-border-app pt-6">
          <h2 id="club-history-title" className="font-heading text-base font-semibold">{t("clubOversight.historyTitle")}</h2>
          <p className="mt-1 mb-4 text-sm text-muted-app">{t("clubOversight.historyDescription")}</p>
          <ClubBoardHistory clubId={club.id} headingClassName="text-sm" />
        </section>
      </div>
      <div className="sticky bottom-0 flex justify-end border-t border-border-app bg-bg-app px-5 py-4 sm:px-6">
        <AppButton variant="secondary" onClick={onClose}>{t("clubLifecycle.close")}</AppButton>
      </div>
    </dialog>
  );
}
