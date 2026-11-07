import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { appToast } from "@/components/ui/toast/AppToast";
import { useRoutingAction, useRoutingRuleSets, useRoutingSimulation } from "@/hooks/useApprovalRouting";
import { useAuth } from "@/hooks/useAuth";
import { useConfirm } from "@/hooks/useConfirm";
import type { RiskCategory, RoutedPropertyType, RoutedRequestType, RoutingRule, RoutingRuleSet } from "@/services/approvalRouting";

const TYPES: RoutedRequestType[] = ["CLUB_APPLICATION", "EVENT_PROPOSAL", "PROPERTY_BOOKING"];
const RISKS: RiskCategory[] = ["LOW", "MEDIUM", "HIGH"];
const PROPERTY_TYPES: RoutedPropertyType[] = ["HALL", "OUTDOOR", "STAGE", "EQUIPMENT"];

function typeKey(value: RoutedRequestType) {
  switch (value) {
    case "CLUB_APPLICATION": return "routing.type_CLUB_APPLICATION" as const;
    case "EVENT_PROPOSAL": return "routing.type_EVENT_PROPOSAL" as const;
    case "PROPERTY_BOOKING": return "routing.type_PROPERTY_BOOKING" as const;
  }
}
function riskKey(value: RiskCategory) {
  switch (value) {
    case "LOW": return "routing.risk_LOW" as const;
    case "MEDIUM": return "routing.risk_MEDIUM" as const;
    case "HIGH": return "routing.risk_HIGH" as const;
  }
}
function propertyKey(value: RoutedPropertyType) {
  switch (value) {
    case "HALL": return "routing.property_HALL" as const;
    case "OUTDOOR": return "routing.property_OUTDOOR" as const;
    case "STAGE": return "routing.property_STAGE" as const;
    case "EQUIPMENT": return "routing.property_EQUIPMENT" as const;
  }
}
function optionalNumber(value: string): number | undefined {
  return value.trim() === "" ? undefined : Math.max(0, Math.floor(Number(value)));
}
function toggle<T>(list: T[] | undefined, value: T): T[] | undefined {
  const next = list?.includes(value) ? list.filter((item) => item !== value) : [...(list ?? []), value];
  return next.length ? next : undefined;
}

/** UC05: ICPDP officers read the routing rules; only the ICPDP head edits, simulates and activates them. */
export function RoutingRulesPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const sets = useRoutingRuleSets(Boolean(auth.data));
  const isHead = Boolean(auth.data?.systemRoles.includes("ICPDP_HEAD"));
  if (sets.isPending) return <><PageHeader title={t("routing.title")} description={t("routing.description")} /><AppSkeleton className="h-48 w-full" /></>;
  if (sets.isError) return <><PageHeader title={t("routing.title")} description={t("routing.description")} />
    <AppNotice tone="danger" role="alert" title={t("routing.loadError")}><p>{sets.error.message}</p>
      <AppButton variant="secondary" onClick={() => void sets.refetch()}>{t("routing.retry")}</AppButton></AppNotice></>;
  const active = sets.data.find((item) => item.state === "Active");
  const draft = sets.data.find((item) => item.state === "Draft");
  const older = sets.data.filter((item) => item.state === "Superseded");
  return (
    <>
      <PageHeader title={t("routing.title")} description={t("routing.description")} />
      {!isHead && <AppNotice className="mb-4">{t("routing.readOnly")}</AppNotice>}
      <div className="space-y-8">
        <section aria-labelledby="routing-active">
          <h2 id="routing-active" className="font-heading text-xl font-bold">
            {active ? t("routing.active", { version: active.versionNo }) : t("routing.noActive")}</h2>
          {active && <RuleList rules={active.rules} />}
          {active && <Simulation set={active} />}
        </section>
        {isHead && <DraftEditor key={draft?.id ?? "none"} draft={draft} base={active} />}
        {older.length > 0 && <section aria-labelledby="routing-history">
          <h2 id="routing-history" className="font-heading text-lg font-bold">{t("routing.history")}</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-app">{older.map((item) => <li key={item.id}>
            v{item.versionNo} · {item.rules.length}</li>)}</ul>
        </section>}
      </div>
    </>
  );
}

function RuleList({ rules }: { rules: RoutingRule[] }) {
  const { t } = useTranslation();
  if (!rules.length) return <p className="mt-2 text-sm text-muted-app">{t("routing.noRules")}</p>;
  return <ul className="mt-3 space-y-2">{rules.map((rule) => <li key={rule.id} className="rounded-xl border border-border-app p-3 text-sm">
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-semibold">{rule.id}</span><AppBadge>{t(typeKey(rule.requestType))}</AppBadge>
      <AppBadge tone={rule.requiredLevel === 2 ? "warning" : "neutral"}>{rule.requiredLevel === 2 ? t("routing.level_2") : t("routing.level_1")}</AppBadge>
      <span className="text-muted-app">{t("routing.sla")}: {rule.slaHours}</span>
    </div>
    <p className="mt-1 text-muted-app break-words">{[
      rule.minAmount !== undefined && `${t("routing.minAmount")}: ${rule.minAmount.toLocaleString()}`,
      rule.maxAmount !== undefined && `${t("routing.maxAmount")}: ${rule.maxAmount.toLocaleString()}`,
      rule.riskCategories && `${t("routing.risks")}: ${rule.riskCategories.map((risk) => t(riskKey(risk))).join(", ")}`,
      rule.propertyTypes && `${t("routing.propertyTypes")}: ${rule.propertyTypes.map((type) => t(propertyKey(type))).join(", ")}`,
      rule.minOpenViolations !== undefined && `${t("routing.minViolations")}: ${rule.minOpenViolations}`,
      rule.maxOpenViolations !== undefined && `${t("routing.maxViolations")}: ${rule.maxOpenViolations}`,
    ].filter(Boolean).join(" · ")}</p>
  </li>)}</ul>;
}

function Simulation({ set }: { set: RoutingRuleSet }) {
  const { t } = useTranslation();
  const [run, setRun] = useState(false);
  const simulation = useRoutingSimulation(set.id, 50, run);
  if (!run) return <AppButton className="mt-3" variant="secondary" onClick={() => setRun(true)}>{t("routing.simulate")}</AppButton>;
  if (simulation.isPending) return <AppSkeleton className="mt-3 h-20 w-full" />;
  if (simulation.isError) return <AppNotice className="mt-3" tone="danger">{simulation.error.message}</AppNotice>;
  if (!simulation.data.total) return <p className="mt-3 text-sm text-muted-app">{t("routing.simulationEmpty")}</p>;
  return <div className="mt-3 rounded-xl bg-surface-app p-3 text-sm">
    <p className="font-semibold">{t("routing.simulationTitle", { second: simulation.data.secondLevel, total: simulation.data.total })}</p>
    <ul className="mt-2 space-y-1">{simulation.data.items.filter((item) => item.requiredLevel === 2).map((item) =>
      <li key={item.entityId} className="break-words">{t(typeKey(item.entityType))}: {item.title} ({item.ruleId})</li>)}</ul>
  </div>;
}

function DraftEditor({ draft, base }: { draft?: RoutingRuleSet; base?: RoutingRuleSet }) {
  const { t } = useTranslation();
  const auth = useAuth();
  const confirm = useConfirm();
  const action = useRoutingAction();
  const [rules, setRules] = useState<RoutingRule[]>(draft?.rules ?? base?.rules ?? []);
  function update(index: number, patch: Partial<RoutingRule>) {
    setRules((list) => list.map((rule, at) => (at === index ? { ...rule, ...patch } : rule)));
  }
  async function run(kind: "save" | "activate") {
    if (!auth.data) return;
    try {
      if (kind === "activate") {
        if (!draft || !(await confirm(t("routing.activateConfirm")))) return;
        await action.mutateAsync({ kind: "save", id: draft.id, rules, csrfToken: auth.data.csrfToken });
        await action.mutateAsync({ kind: "activate", id: draft.id, csrfToken: auth.data.csrfToken });
        appToast.success(t("routing.activated"));
      } else {
        await action.mutateAsync(draft ? { kind: "save", id: draft.id, rules, csrfToken: auth.data.csrfToken }
          : { kind: "create", rules, csrfToken: auth.data.csrfToken });
        appToast.success(t("routing.saved"));
      }
    } catch (error) {
      appToast.danger(error instanceof Error ? error.message : t("routing.loadError"));
    }
  }
  return (
    <section aria-labelledby="routing-draft" className="rounded-3xl bg-surface-app p-4 sm:p-6">
      <h2 id="routing-draft" className="font-heading text-xl font-bold">{draft ? t("routing.draft", { version: draft.versionNo }) : t("routing.newDraft")}</h2>
      <ul className="mt-4 space-y-4">{rules.map((rule, index) => <li key={index} className="space-y-3 rounded-2xl border border-border-app bg-bg-app p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm font-semibold">{t("routing.ruleId")}
            <AppInput className="mt-1 block w-full font-normal" value={rule.id} maxLength={40} onChange={(event) => update(index, { id: event.target.value })} /></label>
          <div className="min-w-0 text-sm font-semibold">{t("routing.requestType")}<AppSelect label={t("routing.requestType")} value={rule.requestType} className="mt-1 w-full font-normal"
            onChange={(value) => update(index, { requestType: value as RoutedRequestType, riskCategories: undefined, propertyTypes: undefined,
              minAmount: undefined, maxAmount: undefined })}
            options={TYPES.map((value) => ({ value, label: t(typeKey(value)) }))} /></div>
          <div className="min-w-0 text-sm font-semibold">{t("routing.level")}<AppSelect label={t("routing.level")} value={String(rule.requiredLevel)} className="mt-1 w-full font-normal"
            onChange={(value) => update(index, { requiredLevel: value === "2" ? 2 : 1 })}
            options={[{ value: "1", label: t("routing.level_1") }, { value: "2", label: t("routing.level_2") }]} /></div>
          <label className="block text-sm font-semibold">{t("routing.sla")}
            <AppInput className="mt-1 block w-full font-normal" type="number" min={1} max={1440} value={rule.slaHours}
              onChange={(event) => update(index, { slaHours: Math.max(1, Math.floor(Number(event.target.value) || 1)) })} /></label>
        </div>
        {rule.requestType === "EVENT_PROPOSAL" && <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">{t("routing.minAmount")}
            <AppInput className="mt-1 block w-full font-normal" type="number" min={0} value={rule.minAmount ?? ""} placeholder={t("routing.anyValue")}
              onChange={(event) => update(index, { minAmount: optionalNumber(event.target.value) })} /></label>
          <label className="block text-sm font-semibold">{t("routing.maxAmount")}
            <AppInput className="mt-1 block w-full font-normal" type="number" min={0} value={rule.maxAmount ?? ""} placeholder={t("routing.anyValue")}
              onChange={(event) => update(index, { maxAmount: optionalNumber(event.target.value) })} /></label>
        </div>}
        {rule.requestType === "EVENT_PROPOSAL" && <fieldset className="flex flex-wrap items-center gap-3 text-sm">
          <legend className="mb-1 font-semibold">{t("routing.risks")}</legend>
          {RISKS.map((risk) => <label key={risk} className="inline-flex min-h-11 items-center gap-2">
            <input type="checkbox" className="size-4 accent-primary-app" checked={Boolean(rule.riskCategories?.includes(risk))}
              onChange={() => update(index, { riskCategories: toggle(rule.riskCategories, risk) })} />{t(riskKey(risk))}</label>)}
        </fieldset>}
        {rule.requestType === "PROPERTY_BOOKING" && <fieldset className="flex flex-wrap items-center gap-3 text-sm">
          <legend className="mb-1 font-semibold">{t("routing.propertyTypes")}</legend>
          {PROPERTY_TYPES.map((type) => <label key={type} className="inline-flex min-h-11 items-center gap-2">
            <input type="checkbox" className="size-4 accent-primary-app" checked={Boolean(rule.propertyTypes?.includes(type))}
              onChange={() => update(index, { propertyTypes: toggle(rule.propertyTypes, type) })} />{t(propertyKey(type))}</label>)}
        </fieldset>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">{t("routing.minViolations")}
            <AppInput className="mt-1 block w-full font-normal" type="number" min={0} value={rule.minOpenViolations ?? ""} placeholder={t("routing.anyValue")}
              onChange={(event) => update(index, { minOpenViolations: optionalNumber(event.target.value) })} /></label>
          <label className="block text-sm font-semibold">{t("routing.maxViolations")}
            <AppInput className="mt-1 block w-full font-normal" type="number" min={0} value={rule.maxOpenViolations ?? ""} placeholder={t("routing.anyValue")}
              onChange={(event) => update(index, { maxOpenViolations: optionalNumber(event.target.value) })} /></label>
        </div>
        <AppButton variant="secondary" onClick={() => setRules((list) => list.filter((_rule, at) => at !== index))}>{t("routing.removeRule")}</AppButton>
      </li>)}</ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <AppButton variant="secondary" onClick={() => setRules((list) => [...list,
          { id: `rule-${list.length + 1}`, requestType: "EVENT_PROPOSAL", requiredLevel: 2, slaHours: 72 }])}>{t("routing.addRule")}</AppButton>
        <AppButton disabled={action.isPending} onClick={() => void run("save")}>{t("routing.saveDraft")}</AppButton>
        {draft && <AppButton disabled={action.isPending} onClick={() => void run("activate")}>{t("routing.activate")}</AppButton>}
      </div>
    </section>
  );
}
