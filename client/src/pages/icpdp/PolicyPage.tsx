import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppCard } from "@/components/ui/card/AppCard";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { usePolicies } from "@/hooks/usePolicy";
import type { PolicyVersion } from "@/services/policy";
import { PolicyEditor } from "./PolicyEditor";

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
  return (
    <div className="mt-4 space-y-5 text-sm">
      <dl className="grid gap-4 sm:grid-cols-2">
        <div><dt className="text-muted-app">{t("policy.domains")}</dt>
          <dd className="mt-1 break-words">{version.allowedEmailDomains.join(", ")}</dd></div>
        <div><dt className="text-muted-app">{t("policy.minFounders")}</dt>
          <dd className="mt-1">{version.minFoundingMembers}</dd></div>
        <div><dt className="text-muted-app">{t("policy.documents")}</dt>
          <dd className="mt-1 break-words">{version.mandatoryApplicationDocuments.join(", ") || "—"}</dd></div>
        <div><dt className="text-muted-app">{t("policy.conflictMinutes")}</dt>
          <dd className="mt-1">{version.conflictThresholdMinutes}</dd></div>
        <div><dt className="text-muted-app">{t("policy.feedbackWindow")}</dt>
          <dd className="mt-1">{version.feedbackWindowHours}</dd></div>
        <div><dt className="text-muted-app">{t("policy.feedbackMinimum")}</dt>
          <dd className="mt-1">{version.feedbackMinRespondents}</dd></div>
        <div><dt className="text-muted-app">{t("policy.overbooking")}</dt>
          <dd className="mt-1">{booleanLabel(version.allowOverbooking)}</dd></div>
        <div><dt className="text-muted-app">{t("policy.overdueBlock")}</dt>
          <dd className="mt-1">{booleanLabel(version.enforceOverdueReportBlock)}</dd></div>
      </dl>
      <div>
        <h3 className="font-semibold font-heading">{t("policy.reportDeadlines")}</h3>
        <ul className="mt-2 space-y-2">
          {version.reportDeadlines.map((item) => (
            <li key={item.reportType} className="rounded-md border border-border-app p-3">
              <span className="font-medium">{item.reportType}</span>
              <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                <div><dt className="text-muted-app">{t("policy.dueDays")}</dt><dd>{item.dueDaysAfterPeriodEnd}</dd></div>
                <div><dt className="text-muted-app">{t("policy.remindBefore")}</dt><dd>{item.remindBeforeDays}</dd></div>
                <div><dt className="text-muted-app">{t("policy.overdueAfter")}</dt><dd>{item.overdueAfterDays}</dd></div>
                <div><dt className="text-muted-app">{t("policy.escalateAfter")}</dt><dd>{item.escalateAfterDays}</dd></div>
              </dl>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-semibold font-heading">{t("policy.calendar")}</h3>
        <ul className="mt-2 space-y-2">
          {version.academicCalendar.map((item) => (
            <li key={item.code} className="rounded-md border border-border-app p-3">
              <span className="font-medium">{item.code}</span>
              <span className="ml-2 text-muted-app">
                {formatDate(item.startAt, language)} – {formatDate(item.endAt, language)}
              </span>
            </li>
          ))}
        </ul>
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
    <div className="mx-auto max-w-4xl">
      <Link to="/workspace" className="text-sm font-semibold text-accent-app">{t("policy.back")}</Link>
      <h1 className="mt-4 text-3xl font-bold font-heading">{t("policy.title")}</h1>
      <p className="mt-2 text-muted-app">{t("policy.description")}</p>

      {auth.isPending ? (
        <AppSkeleton className="mt-8 h-44 w-full" />
      ) : auth.isError ? (
        <AppCard className="mt-8 space-y-3">
          <p role="alert" className="text-danger-app">{auth.error.message}</p>
          <AppButton onClick={() => void auth.refetch()}>{t("policy.retry")}</AppButton>
        </AppCard>
      ) : !auth.data ? (
        <AppCard className="mt-8 space-y-3">
          <p>{t("policy.signIn")}</p>
          <Link className="font-semibold text-accent-app"
            to="/login?returnTo=%2Fworkspace%2Fpolicy">{t("policy.signInLink")}</Link>
        </AppCard>
      ) : !isOfficer ? (
        <AppCard className="mt-8"><p role="alert">{t("policy.forbidden")}</p></AppCard>
      ) : policies.isPending ? (
        <AppSkeleton className="mt-8 h-44 w-full" />
      ) : policies.isError ? (
        <AppCard className="mt-8 space-y-3">
          <p role="alert" className="text-danger-app">
            {t("policy.loadError")} {policies.error.message}
          </p>
          <AppButton onClick={() => void policies.refetch()}>{t("policy.retry")}</AppButton>
        </AppCard>
      ) : (
        <>
          <AppCard className="mt-8 p-5">
            <h2 className="text-lg font-semibold font-heading">{t("policy.current")}</h2>
            {policies.data.current ? (
              <div className="mt-3 text-sm">
                <p>{t("policy.currentFrom", { date: date(policies.data.current.effectiveFrom) })}</p>
                <PolicyDetails version={policies.data.current} language={i18n.language} />
              </div>
            ) : <p className="mt-3 text-sm text-muted-app">{t("policy.noCurrent")}</p>}
          </AppCard>

          <PolicyEditor key={policies.data.versions[0]?.id ?? "first"}
            latest={policies.data.versions[0]} csrfToken={auth.data.csrfToken} />

          <section className="mt-10">
            <h2 className="text-xl font-semibold font-heading">{t("policy.history")}</h2>
            {policies.data.versions.length === 0 ? (
              <p className="mt-3 text-sm text-muted-app">{t("policy.noHistory")}</p>
            ) : (
              <div className="mt-4 space-y-3">
                {policies.data.versions.map((version) => (
                  <AppCard key={version.id} className="flex-row flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{date(version.effectiveFrom)}</p>
                      <p className="mt-1 text-sm text-muted-app">
                        {version.allowedEmailDomains.join(", ")} · {t("policy.minFounders")}: {version.minFoundingMembers}
                      </p>
                      <p className="mt-1 text-xs text-muted-app">{t("policy.created", { date: date(version.createdAt) })}</p>
                      <details className="mt-3">
                        <summary className="font-medium text-accent-app">{t("policy.showDetails")}</summary>
                        <PolicyDetails version={version} language={i18n.language} />
                      </details>
                    </div>
                    <span className="rounded-full border border-border-app px-3 py-1 text-xs font-semibold">
                      {new Date(version.effectiveFrom) > new Date() ? t("policy.scheduled") : t("policy.effective")}
                    </span>
                  </AppCard>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
