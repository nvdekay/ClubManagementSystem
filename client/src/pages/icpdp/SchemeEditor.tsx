import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppSwitch } from "@/components/ui/switch/AppSwitch";
import type {
  DimensionCode, DimensionInfo, EvaluationScheme, SchemeSettings, SchemeThresholds,
} from "@/services/evaluationSchemes";
import { cn } from "@/utils/cn";

interface Row {
  included: boolean;
  weight: string;
  allowsManual: boolean;
}

interface SchemeEditorProps {
  scheme: EvaluationScheme;
  catalogue: DimensionInfo[];
  readOnly: boolean;
  pending: boolean;
  error: string | null;
  onSave: (settings: SchemeSettings) => void;
  onClose: () => void;
}

export function SchemeEditor({ scheme, catalogue, readOnly, pending, error, onSave, onClose }: SchemeEditorProps) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Record<string, Row>>(Object.fromEntries(catalogue.map((dimension) => {
    const current = scheme.dimensions.find((item) => item.code === dimension.code);
    return [dimension.code, { included: Boolean(current), weight: current ? String(current.weight) : "0",
      allowsManual: current?.allowsManual ?? !dimension.core }];
  })));
  const [bands, setBands] = useState<Record<keyof SchemeThresholds, string>>({
    excellent: String(scheme.thresholds.excellent), good: String(scheme.thresholds.good),
    fair: String(scheme.thresholds.fair) });
  const included = catalogue.filter((dimension) => rows[dimension.code]!.included);
  const total = included.reduce((sum, dimension) => sum + (Number(rows[dimension.code]!.weight) || 0), 0);

  function patch(code: DimensionCode, update: Partial<Row>) {
    setRows({ ...rows, [code]: { ...rows[code]!, ...update } });
  }

  /** Whole percents: the remainder goes to the first criteria so the total is exactly 100. */
  function spread() {
    const share = Math.floor(100 / included.length);
    const remainder = 100 - share * included.length;
    setRows(Object.fromEntries(catalogue.map((dimension) => {
      const index = included.findIndex((item) => item.code === dimension.code);
      return [dimension.code, { ...rows[dimension.code]!,
        weight: index < 0 ? rows[dimension.code]!.weight : String(share + (index < remainder ? 1 : 0)) }];
    })));
  }

  function save() {
    onSave({
      dimensions: included.map((dimension) => ({ code: dimension.code,
        weight: Number(rows[dimension.code]!.weight), allowsManual: rows[dimension.code]!.allowsManual })),
      thresholds: { excellent: Number(bands.excellent), good: Number(bands.good), fair: Number(bands.fair) },
    });
  }

  return (
    <div className="mt-4 space-y-6 border-t border-border-app pt-4">
      {readOnly && <p className="text-sm text-muted-app">{t("evaluationSchemes.lockedHint")}</p>}
      <fieldset disabled={readOnly} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <legend className="font-heading font-bold">{t("evaluationSchemes.criteria")}</legend>
          <div className="flex flex-wrap items-center gap-3">
            <span className={cn("text-sm font-semibold text-success-app", { "text-danger-app": total !== 100 })}>
              {t("evaluationSchemes.total", { total })}</span>
            {!readOnly && <AppButton type="button" variant="secondary" onClick={spread}>{t("evaluationSchemes.spread")}</AppButton>}
          </div>
        </div>
        <ul className="divide-y divide-border-app rounded-xl border border-border-app">{catalogue.map((dimension) => {
          const row = rows[dimension.code]!;
          const name = t(`evaluationSchemes.dim_${dimension.code}`);
          return <li key={dimension.code} className={cn("flex flex-wrap items-center gap-4 px-3 py-3", { "opacity-60": !row.included })}>
            <div className="flex min-w-0 flex-1 basis-64 items-start gap-3">
              {dimension.core ? <span className="mt-0.5 w-9 shrink-0" />
                : <AppSwitch className="mt-0.5 shrink-0" checked={row.included} aria-label={t("evaluationSchemes.include", { name })}
                  onChange={(value) => patch(dimension.code, { included: value })} />}
              <div className="min-w-0">
                <p className="font-semibold"><span className="font-mono text-muted-app">{dimension.code}</span> {name}</p>
                <p className="mt-0.5 text-xs text-muted-app">{t("evaluationSchemes.measures")}: {t(`evaluationSchemes.measure_${dimension.code}`)}</p>
                {dimension.core && <p className="mt-0.5 text-xs text-primary-app">{t("evaluationSchemes.coreHint")}</p>}
              </div>
            </div>
            {row.included && <div className="flex flex-wrap items-center gap-4">
              <label className="text-sm">{t("evaluationSchemes.weight")}
                <AppInput className="mt-1 block w-24" type="number" min="0" max="100" step="1" value={row.weight}
                  onChange={(event) => patch(dimension.code, { weight: event.target.value })} />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <AppSwitch checked={row.allowsManual} onChange={(value) => patch(dimension.code, { allowsManual: value })} />
                {t("evaluationSchemes.manual")}
              </label>
            </div>}
          </li>;
        })}</ul>
        <p className={cn("text-sm text-muted-app", { "text-danger-app": total !== 100 })}>
          {total === 100 ? t("evaluationSchemes.totalOk") : t("evaluationSchemes.totalBad")}</p>
      </fieldset>

      <fieldset disabled={readOnly} className="space-y-3">
        <legend className="font-heading font-bold">{t("evaluationSchemes.bands")}</legend>
        <div className="flex flex-wrap gap-4">
          {(["excellent", "good", "fair"] as const).map((band) => <label key={band} className="text-sm">
            {t(`evaluationSchemes.${band}`)}
            <AppInput className="mt-1 block w-24" type="number" min="1" max="100" step="1" value={bands[band]}
              onChange={(event) => setBands({ ...bands, [band]: event.target.value })} />
          </label>)}
        </div>
        <p className="text-sm text-muted-app">{t("evaluationSchemes.needsImprovement", { score: bands.fair })}</p>
      </fieldset>

      {error && <p role="alert" className="text-sm text-danger-app">{error}</p>}
      <div className="flex flex-wrap gap-3">
        {!readOnly && <AppButton type="button" disabled={pending} onClick={save}>
          {pending ? t("evaluationSchemes.saving") : t("evaluationSchemes.save")}</AppButton>}
        <AppButton type="button" variant="ghost" onClick={onClose}>{t("evaluationSchemes.close")}</AppButton>
      </div>
    </div>
  );
}
