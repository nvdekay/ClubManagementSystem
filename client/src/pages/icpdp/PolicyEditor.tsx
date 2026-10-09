import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppCard } from "@/components/ui/card/AppCard";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useCreatePolicy } from "@/hooks/usePolicy";
import type { CreatePolicyInput, PolicyVersion } from "@/services/policy";

interface PolicyEditorProps {
  latest?: PolicyVersion;
  csrfToken: string;
}

interface DeadlineForm {
  reportType: string;
  dueDaysAfterPeriodEnd: string;
  remindBeforeDays: string;
  overdueAfterDays: string;
  escalateAfterDays: string;
}

interface SemesterForm {
  code: string;
  startAt: string;
  endAt: string;
}

interface PolicyForm {
  allowedEmailDomains: string;
  minFoundingMembers: string;
  mandatoryApplicationDocuments: string;
  reportDeadlines: DeadlineForm[];
  conflictThresholdMinutes: string;
  feedbackWindowHours: string;
  feedbackMinRespondents: string;
  allowOverbooking: boolean | "";
  enforceOverdueReportBlock: boolean | "";
  academicCalendar: SemesterForm[];
  effectiveFrom: string;
  reason: string;
}

type DeadlineNumberField = Exclude<keyof DeadlineForm, "reportType">;
const deadlineNumberFields: readonly DeadlineNumberField[] = [
  "dueDaysAfterPeriodEnd", "remindBeforeDays", "overdueAfterDays", "escalateAfterDays",
];

function deadlineLabelKey(field: DeadlineNumberField):
  "policy.dueDays" | "policy.remindBefore" | "policy.overdueAfter" | "policy.escalateAfter" {
  switch (field) {
    case "dueDaysAfterPeriodEnd": return "policy.dueDays";
    case "remindBeforeDays": return "policy.remindBefore";
    case "overdueAfterDays": return "policy.overdueAfter";
    case "escalateAfterDays": return "policy.escalateAfter";
  }
}

function localDateTime(value: string): string {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function initialForm(latest?: PolicyVersion): PolicyForm {
  return {
    allowedEmailDomains: latest?.allowedEmailDomains.join("\n") ?? "",
    minFoundingMembers: latest ? String(latest.minFoundingMembers) : "",
    mandatoryApplicationDocuments: latest?.mandatoryApplicationDocuments.join("\n") ?? "",
    reportDeadlines: latest?.reportDeadlines.map((item) => ({
      reportType: item.reportType,
      dueDaysAfterPeriodEnd: String(item.dueDaysAfterPeriodEnd),
      remindBeforeDays: String(item.remindBeforeDays),
      overdueAfterDays: String(item.overdueAfterDays),
      escalateAfterDays: String(item.escalateAfterDays),
    })) ?? [{ reportType: "", dueDaysAfterPeriodEnd: "", remindBeforeDays: "",
      overdueAfterDays: "", escalateAfterDays: "" }],
    conflictThresholdMinutes: latest ? String(latest.conflictThresholdMinutes) : "",
    feedbackWindowHours: latest ? String(latest.feedbackWindowHours) : "",
    feedbackMinRespondents: latest ? String(latest.feedbackMinRespondents) : "",
    allowOverbooking: latest?.allowOverbooking ?? "",
    enforceOverdueReportBlock: latest?.enforceOverdueReportBlock ?? "",
    academicCalendar: latest?.academicCalendar.map((item) => ({
      code: item.code, startAt: localDateTime(item.startAt), endAt: localDateTime(item.endAt),
    })) ?? [{ code: "", startAt: "", endAt: "" }],
    effectiveFrom: "", reason: "",
  };
}

function lines(value: string): string[] {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

function isoDate(value: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new Error("invalid date");
  return date.toISOString();
}

function payload(form: PolicyForm): CreatePolicyInput {
  if (typeof form.allowOverbooking !== "boolean" ||
    typeof form.enforceOverdueReportBlock !== "boolean") throw new Error("policy choice required");
  return {
    allowedEmailDomains: lines(form.allowedEmailDomains),
    minFoundingMembers: Number(form.minFoundingMembers),
    mandatoryApplicationDocuments: lines(form.mandatoryApplicationDocuments),
    reportDeadlines: form.reportDeadlines.map((item) => ({
      reportType: item.reportType.trim(),
      dueDaysAfterPeriodEnd: Number(item.dueDaysAfterPeriodEnd),
      remindBeforeDays: Number(item.remindBeforeDays),
      overdueAfterDays: Number(item.overdueAfterDays),
      escalateAfterDays: Number(item.escalateAfterDays),
    })),
    conflictThresholdMinutes: Number(form.conflictThresholdMinutes),
    feedbackWindowHours: Number(form.feedbackWindowHours),
    feedbackMinRespondents: Number(form.feedbackMinRespondents),
    allowOverbooking: form.allowOverbooking,
    enforceOverdueReportBlock: form.enforceOverdueReportBlock,
    academicCalendar: form.academicCalendar.map((item) => ({
      code: item.code.trim(), startAt: isoDate(item.startAt), endAt: isoDate(item.endAt),
    })),
    ...(form.effectiveFrom ? { effectiveFrom: isoDate(form.effectiveFrom) } : {}),
    ...(form.reason.trim() ? { reason: form.reason.trim() } : {}),
  };
}

export function PolicyEditor({ latest, csrfToken }: PolicyEditorProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<PolicyForm>(() => initialForm(latest));
  const [localError, setLocalError] = useState<string | null>(null);
  const create = useCreatePolicy();

  function updateDeadline(index: number, field: keyof DeadlineForm, value: string) {
    setForm((current) => ({ ...current, reportDeadlines: current.reportDeadlines.map((item, position) =>
      position === index ? { ...item, [field]: value } : item) }));
  }

  function updateSemester(index: number, field: keyof SemesterForm, value: string) {
    setForm((current) => ({ ...current, academicCalendar: current.academicCalendar.map((item, position) =>
      position === index ? { ...item, [field]: value } : item) }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    let input: CreatePolicyInput;
    try { input = payload(form); }
    catch { setLocalError(t("policy.invalidForm")); return; }
    try { await create.mutateAsync({ input, csrfToken }); }
    catch { /* Mutation error is shown below. */ }
  }

  return (
    <form className="mt-8 space-y-6" onSubmit={(event) => void submit(event)}>
      <div>
        <h2 className="text-xl font-semibold font-heading">{t("policy.formTitle")}</h2>
        <p className="mt-1 text-sm text-muted-app">{t("policy.formDescription")}</p>
      </div>
      <AppCard className="grid gap-5 p-5 sm:grid-cols-2">
        <label className="block text-sm font-medium sm:col-span-2">
          {t("policy.domains")}
          <AppTextarea className="mt-2 block w-full" value={form.allowedEmailDomains} required
            onChange={(event) => setForm({ ...form, allowedEmailDomains: event.target.value })} />
          <span className="mt-1 block text-xs font-normal text-muted-app">{t("policy.domainsHint")}</span>
        </label>
        <label className="block text-sm font-medium">
          {t("policy.minFounders")}
          <AppInput className="mt-2 block w-full" type="number" min="1" required
            value={form.minFoundingMembers}
            onChange={(event) => setForm({ ...form, minFoundingMembers: event.target.value })} />
        </label>
        <label className="block text-sm font-medium sm:col-span-2">
          {t("policy.documents")}
          <AppTextarea className="mt-2 block w-full" value={form.mandatoryApplicationDocuments}
            onChange={(event) => setForm({ ...form, mandatoryApplicationDocuments: event.target.value })} />
          <span className="mt-1 block text-xs font-normal text-muted-app">{t("policy.documentsHint")}</span>
        </label>
      </AppCard>

      <AppCard className="space-y-5 p-5">
        <h3 className="font-semibold font-heading">{t("policy.reportDeadlines")}</h3>
        {form.reportDeadlines.map((item, index) => (
          <div key={index} className="grid gap-3 rounded-md border border-border-app p-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">{t("policy.reportType")}
              <AppInput className="mt-1 block w-full" required value={item.reportType}
                onChange={(event) => updateDeadline(index, "reportType", event.target.value)} />
            </label>
            {deadlineNumberFields.map((field) => (
                <label key={field} className="text-sm">{t(deadlineLabelKey(field))}
                  <AppInput className="mt-1 block w-full" type="number" min="0" required
                    value={item[field]} onChange={(event) => updateDeadline(index, field, event.target.value)} />
                </label>
              ))}
            <AppButton type="button" variant="secondary" disabled={form.reportDeadlines.length === 1}
              onClick={() => setForm({ ...form,
                reportDeadlines: form.reportDeadlines.filter((_, position) => position !== index) })}>
              {t("policy.removeDeadline")}
            </AppButton>
          </div>
        ))}
        <AppButton type="button" variant="secondary" onClick={() => setForm({ ...form,
          reportDeadlines: [...form.reportDeadlines, { reportType: "", dueDaysAfterPeriodEnd: "",
            remindBeforeDays: "", overdueAfterDays: "", escalateAfterDays: "" }] })}>
          {t("policy.addDeadline")}
        </AppButton>
      </AppCard>

      <AppCard className="grid gap-5 p-5 sm:grid-cols-2">
        <label className="text-sm">{t("policy.conflictMinutes")}
          <AppInput className="mt-2 block w-full" type="number" min="0" required
            value={form.conflictThresholdMinutes}
            onChange={(event) => setForm({ ...form, conflictThresholdMinutes: event.target.value })} />
        </label>
        <label className="text-sm">{t("policy.feedbackWindow")}
          <AppInput className="mt-2 block w-full" type="number" min="1" required
            value={form.feedbackWindowHours}
            onChange={(event) => setForm({ ...form, feedbackWindowHours: event.target.value })} />
        </label>
        <label className="text-sm">{t("policy.feedbackMinimum")}
          <AppInput className="mt-2 block w-full" type="number" min="2" required
            value={form.feedbackMinRespondents}
            onChange={(event) => setForm({ ...form, feedbackMinRespondents: event.target.value })} />
        </label>
        <div className="grid gap-5 sm:col-span-2 sm:grid-cols-2">
          <label className="text-sm">{t("policy.overbooking")}
            <AppSelect className="mt-2 block w-full"
              value={form.allowOverbooking === "" ? "" : String(form.allowOverbooking)}
              label={t("policy.overbooking")}
              options={[{ value: "", label: t("policy.chooseValue") },
                { value: "true", label: t("policy.yes") },
                { value: "false", label: t("policy.no") }]}
              onChange={(value) => setForm({ ...form, allowOverbooking: value === ""
                ? "" : value === "true" })} />
          </label>
          <label className="text-sm">{t("policy.overdueBlock")}
            <AppSelect className="mt-2 block w-full"
              value={form.enforceOverdueReportBlock === "" ? "" : String(form.enforceOverdueReportBlock)}
              label={t("policy.overdueBlock")}
              options={[{ value: "", label: t("policy.chooseValue") },
                { value: "true", label: t("policy.yes") },
                { value: "false", label: t("policy.no") }]}
              onChange={(value) => setForm({ ...form, enforceOverdueReportBlock: value === ""
                ? "" : value === "true" })} />
          </label>
        </div>
      </AppCard>

      <AppCard className="space-y-5 p-5">
        <h3 className="font-semibold font-heading">{t("policy.calendar")}</h3>
        {form.academicCalendar.map((item, index) => (
          <div key={index} className="grid gap-3 rounded-md border border-border-app p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm">{t("policy.semesterCode")}
              <AppInput className="mt-1 block w-full" required value={item.code}
                onChange={(event) => updateSemester(index, "code", event.target.value)} />
            </label>
            <label className="text-sm">{t("policy.semesterStart")}
              <AppInput className="mt-1 block w-full" type="datetime-local" required value={item.startAt}
                onChange={(event) => updateSemester(index, "startAt", event.target.value)} />
            </label>
            <label className="text-sm">{t("policy.semesterEnd")}
              <AppInput className="mt-1 block w-full" type="datetime-local" required value={item.endAt}
                onChange={(event) => updateSemester(index, "endAt", event.target.value)} />
            </label>
            <AppButton type="button" variant="secondary" disabled={form.academicCalendar.length === 1}
              onClick={() => setForm({ ...form,
                academicCalendar: form.academicCalendar.filter((_, position) => position !== index) })}>
              {t("policy.removeSemester")}
            </AppButton>
          </div>
        ))}
        <AppButton type="button" variant="secondary" onClick={() => setForm({ ...form,
          academicCalendar: [...form.academicCalendar, { code: "", startAt: "", endAt: "" }] })}>
          {t("policy.addSemester")}
        </AppButton>
      </AppCard>

      <AppCard className="grid gap-5 p-5 sm:grid-cols-2">
        <label className="text-sm">{t("policy.effectiveFrom")}
          <AppInput className="mt-2 block w-full" type="datetime-local" value={form.effectiveFrom}
            onChange={(event) => setForm({ ...form, effectiveFrom: event.target.value })} />
          <span className="mt-1 block text-xs text-muted-app">{t("policy.effectiveHint")}</span>
        </label>
        <label className="text-sm">{t("policy.reason")}
          <AppInput className="mt-2 block w-full" maxLength={1000} value={form.reason}
            onChange={(event) => setForm({ ...form, reason: event.target.value })} />
        </label>
      </AppCard>
      {localError && <p role="alert" className="text-sm text-danger-app">{localError}</p>}
      {create.isError && <p role="alert" className="text-sm text-danger-app">
        {t("policy.saveError")} {create.error.message}
      </p>}
      {create.isSuccess && <p role="status" className="text-sm text-success-app">{t("policy.saveSuccess")}</p>}
      <AppButton type="submit" disabled={create.isPending}>
        {create.isPending ? t("policy.saving") : t("policy.save")}
      </AppButton>
    </form>
  );
}
