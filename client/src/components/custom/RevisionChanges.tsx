import { useTranslation } from "react-i18next";

import { AppBadge } from "@/components/ui/badge/AppBadge";
import type { FieldChange } from "@/utils/revisionDiff";

/**
 * What a resubmitted version changed against the one before it, next to the parts ICPDP asked to
 * revise, so the reviewer sees at a glance whether the requested fixes were made.
 */
export function RevisionChanges({ previousNumber, changes, requestedSections = [], reason }: {
  previousNumber: number;
  changes: FieldChange[];
  requestedSections?: string[];
  reason?: string;
}) {
  const { t } = useTranslation();
  return <section className="rounded-2xl border border-warning-app/40 bg-warning-app/5 p-5">
    <h2 className="font-heading text-lg font-bold">{t("common.revisionChangesTitle", { number: previousNumber })}</h2>
    {(requestedSections.length > 0 || reason) && <div className="mt-3 text-sm">
      <p className="font-semibold">{t("common.revisionRequested")}</p>
      {requestedSections.length > 0 && <ul className="mt-2 flex flex-wrap gap-2">{requestedSections.map((section) =>
        <li key={section}><AppBadge tone="warning">{section}</AppBadge></li>)}</ul>}
      {reason && <p className="mt-2 whitespace-pre-wrap break-words text-muted-app">{reason}</p>}
    </div>}
    {changes.length ? <ul className="mt-4 space-y-3">{changes.map((change) =>
      <li key={change.key} className="rounded-xl bg-bg-app p-3 text-sm">
        <p className="font-semibold">{change.label}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div className="min-w-0"><p className="text-xs font-semibold text-muted-app">{t("common.revisionBefore")}</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-muted-app line-through">{change.before || "—"}</p></div>
          <div className="min-w-0"><p className="text-xs font-semibold text-success-app">{t("common.revisionAfter")}</p>
            <p className="mt-1 whitespace-pre-wrap break-words">{change.after || "—"}</p></div>
        </div>
      </li>)}</ul>
      : <p className="mt-4 text-sm text-muted-app">{t("common.revisionNoChanges", { number: previousNumber })}</p>}
  </section>;
}
