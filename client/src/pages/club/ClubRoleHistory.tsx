import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppSelect } from "@/components/ui/select/AppSelect";
import type { Locale } from "@/i18n";
import type { ClubRoleStructureVersion } from "@/services/clubRoles";
import { formatDate } from "@/utils/formatDate";
import { permissionLabel } from "./clubRolePermissions";

const sourceKeys = {
  APPLICATION: "clubRoles.sourceAPPLICATION",
  TRANSITION: "clubRoles.sourceTRANSITION",
  ROLE_MANAGEMENT: "clubRoles.sourceROLE_MANAGEMENT",
} as const;

/** A5: roles added, removed or changed between two structure versions, matched by position. */
function diffVersions(from: ClubRoleStructureVersion, to: ClubRoleStructureVersion) {
  const before = new Map(from.roles.map((role) => [role.positionId, role]));
  const after = new Map(to.roles.map((role) => [role.positionId, role]));
  const added = to.roles.filter((role) => !before.has(role.positionId));
  const removed = from.roles.filter((role) => !after.has(role.positionId));
  const changed = to.roles.flatMap((role) => {
    const old = before.get(role.positionId);
    if (!old) return [];
    const granted = role.permissionCodes.filter((code) => !old.permissionCodes.includes(code));
    const dropped = old.permissionCodes.filter((code) => !role.permissionCodes.includes(code));
    const renamed = old.name !== role.name ? old.name : undefined;
    const unitChanged = (old.unit ?? "") !== (role.unit ?? "");
    const holderModeChanged = old.isSingleHolder !== role.isSingleHolder;
    return granted.length || dropped.length || renamed || unitChanged || holderModeChanged
      ? [{ role, old, granted, dropped, renamed, unitChanged, holderModeChanged }] : [];
  });
  return { added, removed, changed };
}

export function ClubRoleHistory({ versions }: { versions: ClubRoleStructureVersion[] }) {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === "vi" ? "vi" : "en";
  const ordered = [...versions].sort((a, b) => b.versionNo - a.versionNo);
  const [compare, setCompare] = useState<{ from?: number; to?: number }>({});
  const fromVersion = ordered.find((version) => version.versionNo === (compare.from ?? ordered[1]?.versionNo));
  const toVersion = ordered.find((version) => version.versionNo === (compare.to ?? ordered[0]?.versionNo));
  const diff = fromVersion && toVersion ? diffVersions(fromVersion, toVersion) : null;
  const options = ordered.map((version) => ({ value: version.versionNo, label: t("clubRoles.version", { no: version.versionNo }) }));
  const noUnit = t("clubRoles.noUnit");
  function holderMode(single: boolean) { return single ? t("clubRoles.singleHolder") : t("clubRoles.multiHolder"); }

  return (
    <div className="grid items-start gap-x-10 gap-y-8 lg:grid-cols-[1fr_1.3fr]">
      <section>
        <h2 className="font-heading text-lg font-bold">{t("clubRoles.history")}</h2>
        <p className="mt-1 text-sm text-muted-app">{t("clubRoles.historyHint")}</p>
        <ol className="mt-4 space-y-4 border-l-2 border-border-app pl-5">{ordered.map((version, index) => (
          <li key={version.id} className="relative">
            <span aria-hidden="true" className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-primary-app ring-4 ring-bg-app" />
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold">{t("clubRoles.version", { no: version.versionNo })}</span>
              {index === 0 && <AppBadge tone="info">{t("clubRoles.latest")}</AppBadge>}
              <AppBadge>{version.source in sourceKeys ? t(sourceKeys[version.source as keyof typeof sourceKeys]) : version.source}</AppBadge>
            </div>
            <p className="mt-1 text-xs text-muted-app">{formatDate(version.effectiveFrom, locale)}</p>
            {version.reason && <p className="mt-1 text-sm break-words">{version.reason}</p>}
          </li>
        ))}</ol>
      </section>

      <section className="min-w-0 rounded-2xl bg-surface-app p-4 sm:p-6">
        <h2 className="font-heading text-lg font-bold">{t("clubRoles.compare")}</h2>
        {!fromVersion || !toVersion || !diff ? <p className="mt-2 text-sm text-muted-app">{t("clubRoles.compareNeedsTwo")}</p> : <>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="text-sm font-semibold">{t("clubRoles.compareFrom")}<AppSelect className="mt-2 block w-full" label={t("clubRoles.compareFrom")}
              value={fromVersion.versionNo} options={options} onChange={(from) => setCompare((current) => ({ ...current, from }))} /></div>
            <div className="text-sm font-semibold">{t("clubRoles.compareTo")}<AppSelect className="mt-2 block w-full" label={t("clubRoles.compareTo")}
              value={toVersion.versionNo} options={options} onChange={(to) => setCompare((current) => ({ ...current, to }))} /></div>
          </div>
          {!diff.added.length && !diff.removed.length && !diff.changed.length
            ? <p className="mt-4 text-sm text-muted-app">{t("clubRoles.unchanged")}</p>
            : <ul className="mt-4 divide-y divide-border-app text-sm">
              {diff.added.map((role) => <li key={`a-${role.positionId}`} className="space-y-2 py-3">
                <div className="flex flex-wrap items-center gap-2"><AppBadge tone="success">{t("clubRoles.added")}</AppBadge><span className="font-semibold break-words">{role.name}</span></div>
                {role.permissionCodes.length > 0 && <div className="flex flex-wrap gap-1.5">{role.permissionCodes.map((code) =>
                  <span key={code} className="rounded-full bg-mint-soft-app px-2 py-0.5 text-xs text-success-app">+ {permissionLabel(t, code)}</span>)}</div>}
              </li>)}
              {diff.removed.map((role) => <li key={`r-${role.positionId}`} className="flex flex-wrap items-center gap-2 py-3">
                <AppBadge tone="danger">{t("clubRoles.removed")}</AppBadge><span className="font-semibold break-words line-through">{role.name}</span></li>)}
              {diff.changed.map(({ role, old, granted, dropped, renamed, unitChanged, holderModeChanged }) => <li key={`c-${role.positionId}`} className="space-y-2 py-3">
                <div className="flex flex-wrap items-center gap-2"><AppBadge tone="warning">{t("clubRoles.changed")}</AppBadge>
                  <span className="font-semibold break-words">{renamed ? `${renamed} → ${role.name}` : role.name}</span></div>
                {unitChanged && <p className="text-xs text-muted-app">{t("clubRoles.unitChanged", { from: old.unit || noUnit, to: role.unit || noUnit })}</p>}
                {holderModeChanged && <p className="text-xs text-muted-app">{t("clubRoles.holderModeChanged", { from: holderMode(old.isSingleHolder), to: holderMode(role.isSingleHolder) })}</p>}
                {(granted.length > 0 || dropped.length > 0) && <div className="flex flex-wrap gap-1.5">
                  {granted.map((code) => <span key={`+${code}`} className="rounded-full bg-mint-soft-app px-2 py-0.5 text-xs text-success-app">+ {permissionLabel(t, code)}</span>)}
                  {dropped.map((code) => <span key={`-${code}`} className="rounded-full bg-danger-app/10 px-2 py-0.5 text-xs text-danger-app">− {permissionLabel(t, code)}</span>)}
                </div>}
              </li>)}
            </ul>}
        </>}
      </section>
    </div>
  );
}
