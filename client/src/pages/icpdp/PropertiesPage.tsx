import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { appToast } from "@/components/ui/toast/AppToast";
import { useAuth } from "@/hooks/useAuth";
import { useProperties, usePropertyAction } from "@/hooks/useProperties";
import { PropertyRequestError, type Property, type PropertyDetails, type PropertyType } from "@/services/properties";

import { PropertyEditor, dayKeys } from "./PropertyEditor";

export function PropertiesPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const isOfficer = auth.data?.systemRoles.includes("ICPDP_OFFICER") ?? false;
  const properties = useProperties(isOfficer);
  const action = usePropertyAction();
  // "new" opens the create form; a property id opens that property's editor.
  const [editing, setEditing] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; text: string } | null>(null);
  const csrfToken = auth.data?.csrfToken ?? "";

  function message(error: unknown): string {
    if (error instanceof PropertyRequestError && error.field) {
      return t(`properties.invalid_${error.field}`, { defaultValue: error.message });
    }
    return `${t("properties.failed")} ${(error as Error).message}`;
  }

  async function save(property: Property | undefined, value: PropertyDetails & { type: PropertyType }) {
    setFormError(null);
    try {
      if (property) {
        const { type: _type, ...details } = value;
        await action.mutateAsync({ kind: "update", id: property.id, details, csrfToken });
        appToast.success(t("properties.updated"));
      } else {
        const created = await action.mutateAsync({ kind: "create", input: value, csrfToken });
        appToast.success(t("properties.created", { code: "code" in created ? created.code : "" }));
      }
      setEditing(null);
    } catch (error) {
      setFormError(message(error));
    }
  }

  async function run(property: Property, kind: "activation" | "delete") {
    setRowError(null);
    if (kind === "delete" && !window.confirm(t("properties.confirmDelete", { name: property.name }))) return;
    try {
      if (kind === "delete") {
        await action.mutateAsync({ kind, id: property.id, csrfToken });
        appToast.success(t("properties.deleted"));
      } else {
        await action.mutateAsync({ kind, id: property.id, isActive: !property.isActive, csrfToken });
        appToast.success(t(property.isActive ? "properties.deactivated" : "properties.activated"));
      }
    } catch (error) {
      setRowError({ id: property.id, text: error instanceof PropertyRequestError && error.status === 409
        ? t("properties.deleteBooked") : message(error) });
    }
  }

  function hoursSummary(property: Property): string {
    return property.bookableHours.map((window) => `${t(dayKeys[window.day - 1]!)} ${window.open}–${window.close}`)
      .join(" · ");
  }

  return (
    <>
      <PageHeader title={t("properties.title")} description={t("properties.description")}
        actions={isOfficer && editing !== "new" && <AppButton onClick={() => { setEditing("new"); setFormError(null); }}>
          <AppIcon name="plus" className="size-4" />{t("properties.add")}</AppButton>} />
      {auth.isPending ? <AppSkeleton className="h-44 w-full" />
        : !auth.data ? <AppNotice>
          <p>{t("properties.signIn")}</p>
          <Link className="font-semibold text-accent-app" to="/login?returnTo=%2Fworkspace%2Fproperties">
            {t("properties.signInLink")}</Link>
        </AppNotice>
          : !isOfficer ? <AppNotice tone="danger" role="alert">{t("properties.forbidden")}</AppNotice>
            : properties.isPending ? <AppSkeleton className="h-44 w-full" />
              : properties.isError ? <AppNotice tone="danger" role="alert"
                title={`${t("properties.loadError")} ${properties.error.message}`}>
                <AppButton onClick={() => void properties.refetch()}>{t("properties.retry")}</AppButton>
              </AppNotice> : <div className="space-y-6">
                {editing === "new" && <PropertyEditor pending={action.isPending} error={formError}
                  onSubmit={(value) => void save(undefined, value)} onCancel={() => setEditing(null)} />}
                {properties.data.length === 0 && editing !== "new" && <AppNotice>{t("properties.empty")}</AppNotice>}
                <ul className="space-y-4">{properties.data.map((property) => (
                  <li key={property.id}>
                    {editing === property.id ? <PropertyEditor property={property} pending={action.isPending}
                      error={formError} onSubmit={(value) => void save(property, value)} onCancel={() => setEditing(null)} />
                      : <article className="rounded-2xl border border-border-app p-4 sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 basis-64">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-sm text-muted-app">{property.code}</span>
                              <h2 className="font-heading font-bold break-words">{property.name}</h2>
                              <AppBadge tone="info">{t(`properties.type${property.type}`)}</AppBadge>
                              <AppBadge tone={property.isActive ? "success" : "neutral"}>
                                {property.isActive ? t("properties.active") : t("properties.inactive")}</AppBadge>
                            </div>
                            <p className="mt-1 text-sm text-muted-app">{property.location}
                              {property.capacity ? ` · ${t("properties.capacityShort", { count: property.capacity })}` : ""}</p>
                            <p className="mt-2 text-sm">{property.equipment.length ? property.equipment.join(", ")
                              : t("properties.noEquipment")}</p>
                            <p className="mt-1 text-xs text-muted-app">{hoursSummary(property)}</p>
                            {property.blackouts.length > 0 && <p className="mt-1 text-xs text-warning-app">
                              {t("properties.blackouts")}: {property.blackouts.length}</p>}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <AppButton variant="secondary" onClick={() => { setEditing(property.id); setFormError(null); }}>
                              {t("properties.edit")}</AppButton>
                            <AppButton variant="secondary" disabled={action.isPending}
                              title={property.isActive ? t("properties.deactivateHint") : undefined}
                              onClick={() => void run(property, "activation")}>
                              {property.isActive ? t("properties.deactivate") : t("properties.activate")}</AppButton>
                            <AppButton variant="ghost" disabled={action.isPending}
                              onClick={() => void run(property, "delete")}>{t("properties.delete")}</AppButton>
                          </div>
                        </div>
                        {rowError?.id === property.id && <p role="alert" className="mt-3 text-sm text-danger-app">
                          {rowError.text}</p>}
                      </article>}
                  </li>
                ))}</ul>
              </div>}
    </>
  );
}
