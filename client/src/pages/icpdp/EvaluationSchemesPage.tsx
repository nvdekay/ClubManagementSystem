import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { appToast } from "@/components/ui/toast/AppToast";
import { useAuth } from "@/hooks/useAuth";
import { useEvaluationSchemeAction, useEvaluationSchemes } from "@/hooks/useEvaluationSchemes";
import { SchemeRequestError, type EvaluationScheme, type SchemeSettings } from "@/services/evaluationSchemes";

import { SchemeEditor } from "./SchemeEditor";

export function EvaluationSchemesPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const isOfficer = auth.data?.systemRoles.includes("ICPDP_OFFICER") ?? false;
  const catalogue = useEvaluationSchemes(isOfficer);
  const action = useEvaluationSchemeAction();
  const [period, setPeriod] = useState("");
  const [copyFrom, setCopyFrom] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; text: string } | null>(null);
  const csrfToken = auth.data?.csrfToken ?? "";

  function message(failure: unknown): string {
    if (failure instanceof SchemeRequestError) {
      if (failure.issues.length) return failure.issues.map((issue) => t(`evaluationSchemes.issue_${issue}`)).join(" ");
      if (failure.field) return t(`evaluationSchemes.invalid_${failure.field}`, { defaultValue: failure.message });
    }
    return `${t("evaluationSchemes.failed")} ${(failure as Error).message}`;
  }

  async function create(periodCode: string, copyFromId?: string) {
    setError(null);
    try {
      const created = await action.mutateAsync({ kind: "create", periodCode, copyFromId, csrfToken });
      if ("id" in created) setOpen(created.id);
      appToast.success(t("evaluationSchemes.created"));
    } catch (failure) {
      setError({ id: "new", text: message(failure) });
    }
  }

  async function run(scheme: EvaluationScheme, kind: "activate" | "delete") {
    setError(null);
    if (kind === "activate" && !window.confirm(t("evaluationSchemes.confirmActivate", { period: scheme.periodCode }))) return;
    if (kind === "delete" && !window.confirm(t("evaluationSchemes.confirmDelete"))) return;
    try {
      await action.mutateAsync({ kind, id: scheme.id, csrfToken });
      appToast.success(t(kind === "activate" ? "evaluationSchemes.activated" : "evaluationSchemes.deleted"));
      if (kind === "delete") setOpen(null);
    } catch (failure) {
      setError({ id: scheme.id, text: message(failure) });
    }
  }

  async function save(scheme: EvaluationScheme, settings: SchemeSettings) {
    setError(null);
    try {
      await action.mutateAsync({ kind: "update", id: scheme.id, settings, csrfToken });
      appToast.success(t("evaluationSchemes.saved"));
    } catch (failure) {
      setError({ id: scheme.id, text: message(failure) });
    }
  }

  const stateTone = { Draft: "warning", Active: "success", Superseded: "neutral" } as const;
  const data = catalogue.data;
  const periodCode = period || data?.periods.at(-1)?.code || "";

  return (
    <>
      <PageHeader title={t("evaluationSchemes.title")} description={t("evaluationSchemes.description")} />
      {auth.isPending ? <AppSkeleton className="h-44 w-full" />
        : !auth.data ? <AppNotice>
          <p>{t("evaluationSchemes.signIn")}</p>
          <Link className="font-semibold text-accent-app" to="/login?returnTo=%2Fworkspace%2Fevaluation-schemes">
            {t("evaluationSchemes.signInLink")}</Link>
        </AppNotice>
          : !isOfficer ? <AppNotice tone="danger" role="alert">{t("evaluationSchemes.forbidden")}</AppNotice>
            : catalogue.isPending ? <AppSkeleton className="h-44 w-full" />
              : catalogue.isError || !data ? <AppNotice tone="danger" role="alert"
                title={`${t("evaluationSchemes.loadError")} ${catalogue.error?.message ?? ""}`}>
                <AppButton onClick={() => void catalogue.refetch()}>{t("evaluationSchemes.retry")}</AppButton>
              </AppNotice> : <div className="space-y-6">
                <section className="space-y-3 rounded-2xl bg-surface-app p-4 sm:p-5">
                  <h2 className="font-heading font-semibold">{t("evaluationSchemes.createTitle")}</h2>
                  {data.periods.length === 0 ? <AppNotice tone="warning">{t("evaluationSchemes.noPeriods")}</AppNotice>
                    : <div className="flex flex-wrap items-end gap-3">
                      <div className="text-sm">{t("evaluationSchemes.period")}
                        <AppSelect className="mt-1 w-40" label={t("evaluationSchemes.period")} value={periodCode}
                          onChange={setPeriod} options={data.periods.map((item) => ({ value: item.code, label: item.code }))} />
                      </div>
                      <div className="min-w-0 flex-1 basis-56 text-sm">{t("evaluationSchemes.copyFrom")}
                        <AppSelect className="mt-1 w-full" label={t("evaluationSchemes.copyFrom")} value={copyFrom}
                          onChange={setCopyFrom} options={[{ value: "", label: t("evaluationSchemes.copyDefault") },
                            ...data.schemes.map((scheme) => ({ value: scheme.id,
                              label: t("evaluationSchemes.copyOption", { period: scheme.periodCode, version: scheme.version }) }))]} />
                      </div>
                      <AppButton disabled={action.isPending || !periodCode}
                        onClick={() => void create(periodCode, copyFrom || undefined)}>
                        <AppIcon name="plus" className="size-4" />
                        {action.isPending ? t("evaluationSchemes.creating") : t("evaluationSchemes.create")}</AppButton>
                    </div>}
                  {error?.id === "new" && <p role="alert" className="text-sm text-danger-app">{error.text}</p>}
                </section>

                {data.schemes.length === 0 ? <AppNotice>{t("evaluationSchemes.empty")}</AppNotice>
                  : <ul className="space-y-4">{data.schemes.map((scheme) => {
                    const draft = scheme.state === "Draft";
                    return <li key={scheme.id} className="rounded-2xl border border-border-app p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 basis-64">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-heading font-bold">{scheme.periodCode}</h2>
                            <span className="text-sm text-muted-app">{t("evaluationSchemes.version", { number: scheme.version })}</span>
                            <AppBadge tone={stateTone[scheme.state]}>{t(`evaluationSchemes.state${scheme.state}`)}</AppBadge>
                          </div>
                          <p className="mt-1 text-sm text-muted-app">
                            {scheme.dimensions.map((dimension) => `${dimension.code} ${dimension.weight}%`).join(" · ")}</p>
                          <p className="mt-1 text-xs text-muted-app">{t("evaluationSchemes.summaryBands", { ...scheme.thresholds })}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <AppButton variant="secondary" onClick={() => setOpen(open === scheme.id ? null : scheme.id)}>
                            {draft ? t("evaluationSchemes.edit") : t("evaluationSchemes.view")}</AppButton>
                          {draft ? <>
                            <AppButton disabled={action.isPending} onClick={() => void run(scheme, "activate")}>
                              {t("evaluationSchemes.activate")}</AppButton>
                            <AppButton variant="ghost" disabled={action.isPending} onClick={() => void run(scheme, "delete")}>
                              {t("evaluationSchemes.delete")}</AppButton>
                          </> : <AppButton variant="secondary" disabled={action.isPending}
                            onClick={() => void create(scheme.periodCode, scheme.id)}>{t("evaluationSchemes.revise")}</AppButton>}
                        </div>
                      </div>
                      {error?.id === scheme.id && open !== scheme.id && <p role="alert" className="mt-3 text-sm text-danger-app">{error.text}</p>}
                      {open === scheme.id && <SchemeEditor key={`${scheme.id}-${scheme.totalWeight}-${scheme.dimensions.length}`}
                        scheme={scheme} catalogue={data.dimensions} readOnly={!draft} pending={action.isPending}
                        error={error?.id === scheme.id ? error.text : null}
                        onSave={(settings) => void save(scheme, settings)} onClose={() => setOpen(null)} />}
                    </li>;
                  })}</ul>}
              </div>}
    </>
  );
}
