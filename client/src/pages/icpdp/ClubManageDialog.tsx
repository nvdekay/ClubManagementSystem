import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { ClubLogo } from "@/components/custom/ClubLogo";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
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
      className="m-auto max-h-[90vh] w-[min(56rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-border-app bg-bg-app p-0 text-text-app shadow-xl backdrop:bg-text-app/40">
      <div className="p-5 sm:p-6">
        <header className="flex flex-wrap items-start gap-4">
          <ClubLogo name={club.name} logoUrl={club.logoUrl} size={56} className="rounded-full border border-border-app" />
          <div className="min-w-0 flex-1 basis-56">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="club-manage-title" className="font-heading text-xl font-bold break-words">{club.name}</h2>
              <AppBadge tone={stateTone}>{stateLabel}</AppBadge>
            </div>
            <p className="mt-1 text-sm text-muted-app">{club.code} · {club.field} · {t("clubLifecycle.members", { count: club.activeMembers })}</p>
            {["Active", "Suspended"].includes(club.state) && <Link to={`/clubs/${club.id}`}
              className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-accent-app hover:underline">
              {t("clubLifecycle.viewPublic")}<AppIcon name="external" className="size-3.5" /></Link>}
          </div>
          <button type="button" aria-label={t("clubLifecycle.close")} onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full text-muted-app hover:bg-surface-app">
            <AppIcon name="close" className="size-5" /></button>
        </header>
        <ClubLifecyclePanel clubId={club.id} csrfToken={csrfToken} onClose={onClose} />
      </div>
    </dialog>
  );
}
