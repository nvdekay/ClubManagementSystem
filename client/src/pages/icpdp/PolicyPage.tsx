import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { AppButton } from "@/components/ui/button/AppButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { usePolicies } from "@/hooks/usePolicy";
import {
  CLUB_PROFILE_FORM_FIELDS, FOUNDING_FORM_FIELDS, type PolicyVersion,
} from "@/services/policy";
import {
  PolicyEditor, deadlineLabelKey, foundingFieldKey, profileFieldKey, sectionTitleKey,
} from "./PolicyEditor";

const deadlineFields = [
  "dueDaysAfterPeriodEnd", "remindBeforeDays", "overdueAfterDays", "escalateAfterDays",
] as const;

function formatDate(value: string, language: string): string {
  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-US", {
    dateStyle: "medium", timeStyle: "short",
  }).format(new Date(value));
}

function PolicyDetails({ version, language }: { version: PolicyVersion; language: string }) {
  const { t } = useTranslation();
  function booleanLabel(value: boolean): string {
    return t(value ? "policy.yes" : "policy.no");
  }
  function requiredLabel(value: boolean): string {
    return t(value ? "policy.required" : "policy.optional");
  }
  return (
    <div className="mt-4 space-y-6 text-sm">
      <div>
        <h3 className="font-heading font-semibold">{t(sectionTitleKey("founding"))}</h3>
        <dl className="mt-2 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <div><dt className="text-muted-app">{t("policy.minFounders")}</dt>
            <dd className="mt-1">{version.minFoundingMembers}</dd></div>
          {FOUNDING_FORM_FIELDS.map((field) => (
            <div key={field}><dt className="text-muted-app">{t(foundingFieldKey(field))}</dt>
              <dd className="mt-1">{requiredLabel(version.formRequirements.clubFounding[field])}</dd></div>
          ))}
        </dl>
      </div>
      <div>
        <h3 className="font-heading font-semibold">{t(sectionTitleKey("profile"))}</h3>
        <dl className="mt-2 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {CLUB_PROFILE_FORM_FIELDS.map((field) => (
            <div key={field}><dt className="text-muted-app">{t(profileFieldKey(field))}</dt>
              <dd className="mt-1">{requiredLabel(version.formRequirements.clubProfile[field])}</dd></div>
          ))}
        </dl>
      </div>
      <div>
        <h3 className="font-heading font-semibold">{t(sectionTitleKey("events"))}</h3>
        <dl className="mt-2 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <div><dt className="text-muted-app">{t("policy.feedbackWindow")}</dt>
            <dd className="mt-1">{version.feedbackWindowHours}</dd></div>
          <div><dt className="text-muted-app">{t("policy.feedbackMinimum")}</dt>
            <dd className="mt-1">{version.feedbackMinRespondents}</dd></div>
          <div><dt className="text-muted-app">{t("policy.conflictMinutes")}</dt>
            <dd className="mt-1">{version.conflictThresholdMinutes}</dd></div>
          <div><dt className="text-muted-app">{t("policy.overbooking")}</dt>
            <dd className="mt-1">{booleanLabel(version.allowOverbooking)}</dd></div>
        </dl>
      </div>
      <div>
        <h3 className="font-heading font-semibold">{t(sectionTitleKey("calendar"))}</h3>
        <ul className="mt-2 divide-y divide-border-app border-y border-border-app">
          {version.academicCalendar.map((item) => (
            <li key={item.code} className="flex flex-wrap gap-x-3 gap-y-1 py-3">
              <span className="font-medium">{item.code}</span>
              <span className="text-muted-app">
                {formatDate(item.startAt, language)} – {formatDate(item.endAt, language)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-heading font-semibold">{t(sectionTitleKey("reports"))}</h3>
        <ul className="mt-2 divide-y divide-border-app border-y border-border-app">
          {version.reportDeadlines.map((item) => (
            <li key={item.reportType} className="py-3">
              <span className="font-medium">{item.reportType}</span>
              <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                {deadlineFields.map((field) => (
                  <div key={field}><dt className="text-muted-app">{t(deadlineLabelKey(field))}</dt>
                    <dd>{item[field]}</dd></div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
        <p className="mt-3"><span className="text-muted-app">{t("policy.overdueBlock")}: </span>
          {booleanLabel(version.enforceOverdueReportBlock)}</p>
      </div>
    </div>
  );
}

export function PolicyPage() {
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const isOfficer = auth.data?.systemRoles.includes("ICPDP_OFFICER") ?? false;
  const policies = usePolicies(isOfficer);
  function date(value: string): string {
    return formatDate(value, i18n.language);
  }

  return (
    <>
      <PageHeader title={t("policy.title")} description={t("policy.description")} />

      {auth.isPending ? (
        <AppSkeleton className="h-44 w-full" />
      ) : auth.isError ? (
        <AppNotice tone="danger" role="alert" title={auth.error.message}>
          <AppButton onClick={() => void auth.refetch()}>{t("policy.retry")}</AppButton>
        </AppNotice>
      ) : !auth.data ? (
        <AppNotice>
          <p>{t("policy.signIn")}</p>
          <Link className="font-semibold text-accent-app"
            to="/login?returnTo=%2Fworkspace%2Fpolicy">{t("policy.signInLink")}</Link>
        </AppNotice>
      ) : !isOfficer ? (
        <AppNotice tone="danger" role="alert">{t("policy.forbidden")}</AppNotice>
      ) : policies.isPending ? (
        <AppSkeleton className="h-44 w-full" />
      ) : policies.isError ? (
        <AppNotice tone="danger" role="alert" title={`${t("policy.loadError")} ${policies.error.message}`}>
          <AppButton onClick={() => void policies.refetch()}>{t("policy.retry")}</AppButton>
        </AppNotice>
      ) : (
        <div className="space-y-10">
          <section className="rounded-2xl bg-primary-soft-app p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <AppIcon name="shield" className="text-primary-app" />
              <h2 className="font-heading text-lg font-bold">{t("policy.current")}</h2>
            </div>
            {policies.data.current ? (
              <div className="mt-2 text-sm">
                <p className="text-muted-app">{t("policy.currentFrom", { date: date(policies.data.current.effectiveFrom) })}</p>
                <PolicyDetails version={policies.data.current} language={i18n.language} />
              </div>
            ) : <p className="mt-3 text-sm text-muted-app">{t("policy.noCurrent")}</p>}
          </section>

          <PolicyEditor key={policies.data.versions[0]?.id ?? "first"}
            latest={policies.data.versions[0]} csrfToken={auth.data.csrfToken} />

          <section className="border-t border-border-app pt-8">
            <h2 className="font-heading text-xl font-bold">{t("policy.history")}</h2>
            {policies.data.versions.length === 0 ? (
              <p className="mt-3 text-sm text-muted-app">{t("policy.noHistory")}</p>
            ) : (
              <ul className="mt-4 divide-y divide-border-app border-y border-border-app">
                {policies.data.versions.map((version) => (
                  <li key={version.id} className="flex flex-wrap items-start justify-between gap-3 px-2 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{date(version.effectiveFrom)}</p>
                      <p className="mt-1 text-sm break-words text-muted-app">
                        {t("policy.minFounders")}: {version.minFoundingMembers}
                      </p>
                      <p className="mt-1 text-xs text-muted-app">{t("policy.created", { date: date(version.createdAt) })}</p>
                      <details className="mt-2">
                        <summary className="inline-flex min-h-10 items-center text-sm font-semibold text-accent-app">{t("policy.showDetails")}</summary>
                        <PolicyDetails version={version} language={i18n.language} />
                      </details>
                    </div>
                    <AppBadge tone={new Date(version.effectiveFrom) > new Date() ? "info" : "success"}>
                      {new Date(version.effectiveFrom) > new Date() ? t("policy.scheduled") : t("policy.effective")}
                    </AppBadge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}
