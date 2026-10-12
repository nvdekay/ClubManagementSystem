import { useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppSwitch } from "@/components/ui/switch/AppSwitch";
import { useCreatePolicy } from "@/hooks/usePolicy";
import {
  CLUB_PROFILE_FORM_FIELDS, DEFAULT_FORM_REQUIREMENTS, FOUNDING_FORM_FIELDS, PolicyConflictError,
  type ClubProfileFormField, type CreatePolicyInput, type FormRequirements, type FoundingFormField,
  type PolicyDecisionImpact, type PolicyImpactReason, type PolicyVersion,
} from "@/services/policy";
import { cn } from "@/utils/cn";

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
  minFoundingMembers: string;
  formRequirements: FormRequirements;
  reportDeadlines: DeadlineForm[];
  conflictThresholdMinutes: string;
  feedbackWindowHours: string;
  feedbackMinRespondents: string;
  allowOverbooking: boolean;
  enforceOverdueReportBlock: boolean;
  academicCalendar: SemesterForm[];
  effectiveFrom: string;
  reason: string;
}

export type PolicySection = "founding" | "profile" | "events" | "calendar" | "reports";
const sections: readonly PolicySection[] = ["founding", "profile", "events", "calendar", "reports"];

type DeadlineNumberField = Exclude<keyof DeadlineForm, "reportType">;
const deadlineNumberFields: readonly DeadlineNumberField[] = [
  "dueDaysAfterPeriodEnd", "remindBeforeDays", "overdueAfterDays", "escalateAfterDays",
];

export function sectionTitleKey(section: PolicySection) {
  switch (section) {
    case "founding": return "policy.sectionFounding" as const;
    case "profile": return "policy.sectionProfile" as const;
    case "events": return "policy.sectionEvents" as const;
    case "calendar": return "policy.sectionCalendar" as const;
    case "reports": return "policy.sectionReports" as const;
  }
}

export function sectionAppliesKey(section: PolicySection) {
  switch (section) {
    case "founding": return "policy.appliesFounding" as const;
    case "profile": return "policy.appliesProfile" as const;
    case "events": return "policy.appliesEvents" as const;
    case "calendar": return "policy.appliesCalendar" as const;
    case "reports": return "policy.appliesReports" as const;
  }
}

export function foundingFieldKey(field: FoundingFormField) {
  switch (field) {
    case "summary": return "policy.fieldSummary" as const;
    case "objectives": return "policy.fieldObjectives" as const;
    case "proposal": return "policy.fieldProposal" as const;
    case "logo": return "policy.fieldLogo" as const;
    case "fanpageUrl": return "policy.fieldFanpage" as const;
    case "contactEmail": return "policy.fieldFoundingEmail" as const;
  }
}

export function profileFieldKey(field: ClubProfileFormField) {
  switch (field) {
    case "description": return "policy.fieldDescription" as const;
    case "contactEmail": return "policy.fieldProfileEmail" as const;
    case "contactPhone": return "policy.fieldPhone" as const;
    case "charterUrl": return "policy.fieldCharter" as const;
    case "channels": return "policy.fieldChannels" as const;
    case "operatingScope": return "policy.fieldScope" as const;
  }
}

export function deadlineLabelKey(field: DeadlineNumberField) {
  switch (field) {
    case "dueDaysAfterPeriodEnd": return "policy.dueDays" as const;
    case "remindBeforeDays": return "policy.remindBefore" as const;
    case "overdueAfterDays": return "policy.overdueAfter" as const;
    case "escalateAfterDays": return "policy.escalateAfter" as const;
  }
}

function localDateTime(value: string): string {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function initialForm(latest?: PolicyVersion): PolicyForm {
  const requirements = latest?.formRequirements ?? DEFAULT_FORM_REQUIREMENTS;
  return {
    minFoundingMembers: latest ? String(latest.minFoundingMembers) : "",
    formRequirements: { clubFounding: { ...requirements.clubFounding },
      clubProfile: { ...requirements.clubProfile } },
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
    allowOverbooking: latest?.allowOverbooking ?? false,
    enforceOverdueReportBlock: latest?.enforceOverdueReportBlock ?? false,
    academicCalendar: latest?.academicCalendar.map((item) => ({
      code: item.code, startAt: localDateTime(item.startAt), endAt: localDateTime(item.endAt),
    })) ?? [{ code: "", startAt: "", endAt: "" }],
    effectiveFrom: "", reason: "",
  };
}

/** Thrown with the section that holds the bad value, so the editor can switch to it. */
class SectionError extends Error {
  constructor(readonly section: PolicySection) {
    super(section);
  }
}

function whole(value: string, min: number, section: PolicySection): number {
  const number = Number(value);
  if (!value.trim() || !Number.isInteger(number) || number < min) throw new SectionError(section);
  return number;
}

function isoDate(value: string, section: PolicySection): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new SectionError(section);
  return date.toISOString();
}

function payload(form: PolicyForm): CreatePolicyInput {
  return {
    minFoundingMembers: whole(form.minFoundingMembers, 1, "founding"),
    formRequirements: form.formRequirements,
    reportDeadlines: form.reportDeadlines.map((item) => {
      if (!item.reportType.trim()) throw new SectionError("reports");
      return {
        reportType: item.reportType.trim(),
        dueDaysAfterPeriodEnd: whole(item.dueDaysAfterPeriodEnd, 0, "reports"),
        remindBeforeDays: whole(item.remindBeforeDays, 0, "reports"),
        overdueAfterDays: whole(item.overdueAfterDays, 0, "reports"),
        escalateAfterDays: whole(item.escalateAfterDays, 0, "reports"),
      };
    }),
    conflictThresholdMinutes: whole(form.conflictThresholdMinutes, 0, "events"),
    feedbackWindowHours: whole(form.feedbackWindowHours, 1, "events"),
    feedbackMinRespondents: whole(form.feedbackMinRespondents, 2, "events"),
    allowOverbooking: form.allowOverbooking,
    enforceOverdueReportBlock: form.enforceOverdueReportBlock,
    academicCalendar: form.academicCalendar.map((item) => {
      if (!item.code.trim()) throw new SectionError("calendar");
      return { code: item.code.trim(), startAt: isoDate(item.startAt, "calendar"),
        endAt: isoDate(item.endAt, "calendar") };
    }),
    ...(form.effectiveFrom ? { effectiveFrom: new Date(form.effectiveFrom).toISOString() } : {}),
    ...(form.reason.trim() ? { reason: form.reason.trim() } : {}),
  };
}

function impactReasonKey(reason: PolicyImpactReason) {
  switch (reason) {
    case "EVENT_OUTSIDE_ACADEMIC_CALENDAR": return "policy.impactEventCalendar" as const;
    case "BOOKING_OUTSIDE_ACADEMIC_CALENDAR": return "policy.impactBookingCalendar" as const;
    case "DISSOLUTION_SEMESTER_REMOVED": return "policy.impactDissolutionSemester" as const;
    case "APPROVED_OVERBOOKING_DISALLOWED": return "policy.impactOverbooking" as const;
  }
}

function impactEntityKey(entityType: PolicyDecisionImpact["entityType"]) {
  switch (entityType) {
    case "Event": return "policy.impactEntityEvent" as const;
    case "PropertyBooking": return "policy.impactEntityBooking" as const;
    case "Club": return "policy.impactEntityClub" as const;
  }
}

interface ToggleRowProps {
  label: string;
  checked: boolean;
  locked?: boolean;
  hint?: string;
  onChange?: (checked: boolean) => void;
}

/** One "is this required / is this allowed" row: plain label, switch, and its current meaning. */
function ToggleRow({ label, checked, locked, hint, onChange }: ToggleRowProps) {
  const { t } = useTranslation();
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-app">{hint}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("text-xs text-muted-app", { "font-semibold text-primary-app": checked })}>
          {locked ? t("policy.alwaysRequired") : checked ? t("policy.required") : t("policy.optional")}
        </span>
        <AppSwitch checked={checked} disabled={locked} aria-label={label}
          onChange={(value) => onChange?.(value)} />
      </div>
    </li>
  );
}

function NumberSentence({ label, value, min, onChange }: {
  label: string; value: string; min: number; onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
      <span className="min-w-0 flex-1">{label}</span>
      <AppInput className="w-28" type="number" min={min} value={value}
        onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function PolicyEditor({ latest, csrfToken }: PolicyEditorProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<PolicyForm>(() => initialForm(latest));
  const [section, setSection] = useState<PolicySection>("founding");
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

  function setFounding(field: FoundingFormField, value: boolean) {
    setForm((current) => ({ ...current, formRequirements: { ...current.formRequirements,
      clubFounding: { ...current.formRequirements.clubFounding, [field]: value } } }));
  }

  function setProfile(field: ClubProfileFormField, value: boolean) {
    setForm((current) => ({ ...current, formRequirements: { ...current.formRequirements,
      clubProfile: { ...current.formRequirements.clubProfile, [field]: value } } }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    let input: CreatePolicyInput;
    try { input = payload(form); }
    catch (error) {
      if (error instanceof SectionError) setSection(error.section);
      setLocalError(t("policy.invalidForm"));
      return;
    }
    try { await create.mutateAsync({ input, csrfToken }); }
    catch { /* Mutation error is shown below. */ }
  }

  let body: ReactNode;
  if (section === "founding") {
    body = (
      <>
        <label className="flex flex-wrap items-center gap-2 text-sm">
          <span>{t("policy.minFoundersBefore")}</span>
          <AppInput className="w-24" type="number" min="1" aria-label={t("policy.minFounders")}
            value={form.minFoundingMembers}
            onChange={(event) => setForm({ ...form, minFoundingMembers: event.target.value })} />
          <span>{t("policy.minFoundersAfter")}</span>
        </label>
        <div>
          <h4 className="font-heading font-semibold">{t("policy.foundingFieldsTitle")}</h4>
          <p className="mt-1 text-xs text-muted-app">{t("policy.foundingFieldsHint")}</p>
          <ul className="mt-2 divide-y divide-border-app">
            <ToggleRow label={t("policy.fieldClubName")} checked locked />
            <ToggleRow label={t("policy.fieldClubField")} checked locked />
            {FOUNDING_FORM_FIELDS.map((field) => (
              <ToggleRow key={field} label={t(foundingFieldKey(field))}
                checked={form.formRequirements.clubFounding[field]}
                onChange={(value) => setFounding(field, value)} />
            ))}
          </ul>
        </div>
      </>
    );
  } else if (section === "profile") {
    body = (
      <div>
        <p className="text-xs text-muted-app">{t("policy.profileFieldsHint")}</p>
        <ul className="mt-2 divide-y divide-border-app">
          {CLUB_PROFILE_FORM_FIELDS.map((field) => (
            <ToggleRow key={field} label={t(profileFieldKey(field))}
              checked={form.formRequirements.clubProfile[field]}
              onChange={(value) => setProfile(field, value)} />
          ))}
        </ul>
      </div>
    );
  } else if (section === "events") {
    body = (
      <ul className="divide-y divide-border-app">
        <li><NumberSentence label={t("policy.feedbackWindow")} min={1} value={form.feedbackWindowHours}
          onChange={(value) => setForm({ ...form, feedbackWindowHours: value })} /></li>
        <li><NumberSentence label={t("policy.feedbackMinimum")} min={2} value={form.feedbackMinRespondents}
          onChange={(value) => setForm({ ...form, feedbackMinRespondents: value })} /></li>
        <li><NumberSentence label={t("policy.conflictMinutes")} min={0} value={form.conflictThresholdMinutes}
          onChange={(value) => setForm({ ...form, conflictThresholdMinutes: value })} /></li>
        <ToggleRow label={t("policy.overbooking")} hint={t("policy.overbookingHint")}
          checked={form.allowOverbooking}
          onChange={(value) => setForm({ ...form, allowOverbooking: value })} />
      </ul>
    );
  } else if (section === "calendar") {
    body = (
      <div className="space-y-4">
        {form.academicCalendar.map((item, index) => (
          <div key={index} className="grid items-end gap-3 rounded-2xl bg-surface-app p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm">{t("policy.semesterCode")}
              <AppInput className="mt-1 block w-full" value={item.code}
                onChange={(event) => updateSemester(index, "code", event.target.value)} />
            </label>
            <label className="text-sm">{t("policy.semesterStart")}
              <AppInput className="mt-1 block w-full" type="datetime-local" value={item.startAt}
                onChange={(event) => updateSemester(index, "startAt", event.target.value)} />
            </label>
            <label className="text-sm">{t("policy.semesterEnd")}
              <AppInput className="mt-1 block w-full" type="datetime-local" value={item.endAt}
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
          <AppIcon name="plus" className="size-4" />{t("policy.addSemester")}
        </AppButton>
      </div>
    );
  } else {
    body = (
      <div className="space-y-4">
        {form.reportDeadlines.map((item, index) => (
          <div key={index} className="grid items-end gap-3 rounded-2xl bg-surface-app p-4 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">{t("policy.reportType")}
              <AppInput className="mt-1 block w-full" value={item.reportType}
                onChange={(event) => updateDeadline(index, "reportType", event.target.value)} />
            </label>
            {deadlineNumberFields.map((field) => (
              <label key={field} className="text-sm">{t(deadlineLabelKey(field))}
                <AppInput className="mt-1 block w-full" type="number" min="0"
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
          <AppIcon name="plus" className="size-4" />{t("policy.addDeadline")}
        </AppButton>
        <ul className="divide-y divide-border-app">
          <ToggleRow label={t("policy.overdueBlock")} checked={form.enforceOverdueReportBlock}
            onChange={(value) => setForm({ ...form, enforceOverdueReportBlock: value })} />
        </ul>
      </div>
    );
  }

  return (
    <form className="space-y-6 border-t border-border-app pt-8" onSubmit={(event) => void submit(event)}>
      <div>
        <h2 className="font-heading text-xl font-bold">{t("policy.formTitle")}</h2>
        <p className="mt-1 text-sm text-muted-app">{t("policy.formDescription")}</p>
      </div>

      <div role="tablist" aria-label={t("policy.formTitle")} className="flex flex-wrap gap-2">
        {sections.map((item) => (
          <button key={item} type="button" role="tab" aria-selected={section === item}
            onClick={() => setSection(item)}
            className={cn("min-h-10 rounded-full border border-border-app px-4 text-sm font-medium text-muted-app",
              { "border-primary-app bg-primary-soft-app text-primary-app": section === item })}>
            {t(sectionTitleKey(item))}
          </button>
        ))}
      </div>

      <section role="tabpanel" className="space-y-5 rounded-2xl border border-border-app p-5">
        <div>
          <h3 className="font-heading text-lg font-semibold">{t(sectionTitleKey(section))}</h3>
          <p className="mt-1 text-sm text-muted-app">
            {t("policy.appliesTo", { flows: t(sectionAppliesKey(section)) })}
          </p>
        </div>
        {body}
      </section>

      <div className="grid gap-5 border-t border-border-app pt-6 sm:grid-cols-2">
        <h3 className="font-heading font-semibold sm:col-span-2">{t("policy.saveSection")}</h3>
        <label className="text-sm">{t("policy.effectiveFrom")}
          <AppInput className="mt-2 block w-full" type="datetime-local" value={form.effectiveFrom}
            onChange={(event) => setForm({ ...form, effectiveFrom: event.target.value })} />
          <span className="mt-1 block text-xs text-muted-app">{t("policy.effectiveHint")}</span>
        </label>
        <label className="text-sm">{t("policy.reason")}
          <AppInput className="mt-2 block w-full" maxLength={1000} value={form.reason}
            onChange={(event) => setForm({ ...form, reason: event.target.value })} />
        </label>
      </div>
      {localError && <p role="alert" className="text-sm text-danger-app">{localError}</p>}
      {create.isError && create.error instanceof PolicyConflictError ? (
        <div role="alert" className="rounded-xl border-l-4 border-danger-app bg-danger-app/10 px-4 py-3 text-sm">
          <p className="font-semibold text-danger-app">{t("policy.impactTitle")}</p>
          <p className="mt-1 text-text-app">{t("policy.impactDescription")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-text-app">
            {create.error.affectedRecords.map((record) => (
              <li key={`${record.entityType}:${record.entityId}`}>
                <span className="font-medium">{t(impactEntityKey(record.entityType))}</span> · {record.entityId}: {record.reasons
                  .map((reason) => t(impactReasonKey(reason))).join(", ")}
              </li>
            ))}
          </ul>
        </div>
      ) : create.isError ? <p role="alert" className="text-sm text-danger-app">
          {t("policy.saveError")} {create.error.message}
        </p> : null}
      {create.isSuccess && <p role="status" className="text-sm text-success-app">{t("policy.saveSuccess")}</p>}
      <AppButton type="submit" disabled={create.isPending}>
        {create.isPending ? t("policy.saving") : t("policy.save")}
      </AppButton>
    </form>
  );
}
