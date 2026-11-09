import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppDialog } from "@/components/ui/dialog/AppDialog";
import { AppFieldError } from "@/components/ui/field/AppFieldError";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useConfirm } from "@/hooks/useConfirm";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import {
  useDecidePeriodicReport,
  usePeriodicOverview,
  usePeriodicReport,
  useRecordMissingPeriodicReport,
  useSavePeriodicCampaign,
} from "@/hooks/usePeriodicReports";
import {
  RETURN_SECTIONS,
  type CustomFieldType,
  type PeriodicCampaign,
  type PeriodicCustomField,
  type PeriodicOutcome,
  type PeriodicReportRow,
  type ReturnSection,
  type Severity,
} from "@/services/periodicReports";
import { cn } from "@/utils/cn";
import { formatMoney } from "@/utils/formatMoney";

const filters = ["all", "waiting", "overdue", "accepted"] as const;
type Filter = (typeof filters)[number];
const severities: Severity[] = ["MINOR", "MODERATE", "SERIOUS"];
const fieldTypes: CustomFieldType[] = ["text", "number", "evidence"];

function matches(filter: Filter, row: PeriodicReportRow): boolean {
  switch (filter) {
    case "waiting": return row.state === "Submitted";
    case "overdue": return row.overdue;
    case "accepted": return row.state === "Accepted";
    default: return true;
  }
}

function filterLabel(t: TFunction, filter: Filter): string {
  return filter === "waiting" ? t("periodicReports.filterWaiting") : filter === "overdue" ? t("periodicReports.filterOverdue")
    : filter === "accepted" ? t("periodicReports.filterAccepted") : t("periodicReports.filterAll");
}

function stateLabel(t: TFunction, state: string | undefined): string {
  switch (state) {
    case "Draft": return t("periodicReports.stateDraft");
    case "Submitted": return t("periodicReports.stateSubmitted");
    case "Accepted": return t("periodicReports.stateAccepted");
    case "Returned for correction": return t("periodicReports.stateReturned");
    case undefined: return t("periodicReports.notSubmitted");
    default: return state;
  }
}

function stateTone(state: string | undefined): AppBadgeTone {
  return state === "Accepted" ? "success" : state === "Submitted" ? "info" : state === "Returned for correction" ? "warning" : "neutral";
}

function sectionLabel(t: TFunction, section: ReturnSection): string {
  switch (section) {
    case "members": return t("periodicReports.sectionMembers");
    case "events": return t("periodicReports.sectionEvents");
    case "achievements": return t("periodicReports.sectionAchievements");
    case "customFields": return t("periodicReports.sectionCustomFields");
    case "narrative": return t("periodicReports.sectionNarrative");
    case "nextPlan": return t("periodicReports.sectionNextPlan");
    case "figures": return t("periodicReports.sectionFigures");
    case "evidence": return t("periodicReports.sectionEvidence");
    default: return t("periodicReports.sectionOther");
  }
}

function severityLabel(t: TFunction, value: Severity): string {
  return value === "MINOR" ? t("violations.severityMINOR") : value === "MODERATE" ? t("violations.severityMODERATE")
    : t("violations.severitySERIOUS");
}

function useDay() {
  const { i18n } = useTranslation();
  return function day(value: string) {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(value));
  };
}

function Gate({ children }: { children: (csrfToken: string) => ReactNode }) {
  const { t } = useTranslation();
  const auth = useAuth();
  if (auth.isPending) return <div className="space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-20 w-full" />)}</div>;
  if (!auth.data) return <AppNotice>
    <p>{t("periodicReports.signIn")}</p>
    <Link className="inline-block font-semibold text-accent-app"
      to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>{t("periodicReports.signInLink")}</Link>
  </AppNotice>;
  if (!auth.data.systemRoles.includes("ICPDP_OFFICER")) {
    return <AppNotice tone="danger" role="alert">{t("periodicReports.unauthorized")}</AppNotice>;
  }
  return <>{children(auth.data.csrfToken)}</>;
}

function CampaignPanel({
  periodCode,
  defaultDueAt,
  campaign,
  csrfToken,
}: {
  periodCode: string;
  defaultDueAt?: string;
  campaign?: PeriodicCampaign;
  csrfToken: string;
}) {
  const { t } = useTranslation();
  const save = useSavePeriodicCampaign();
  const [expanded, setExpanded] = useState(false);
  const [isOpen, setIsOpen] = useState(campaign?.isOpen ?? false);
  const [dueAt, setDueAt] = useState((campaign?.dueAt ?? defaultDueAt ?? new Date().toISOString()).slice(0, 10));
  const [announcement, setAnnouncement] = useState(campaign?.announcement ?? "");
  const [customFields, setCustomFields] = useState<PeriodicCustomField[]>(campaign?.customFields ?? []);

  function updateField(index: number, patch: Partial<PeriodicCustomField>) {
    setCustomFields((prev) => prev.map((f, idx) => (idx === index ? { ...f, ...patch } : f)));
  }

  async function handleSave() {
    try {
      await save.mutateAsync({
        csrfToken,
        input: {
          periodCode,
          isOpen,
          dueAt: new Date(`${dueAt}T23:59:59.000Z`).toISOString(),
          announcement: announcement.trim() || undefined,
          customFields: customFields.filter((f) => f.label.trim()),
        },
      });
      setExpanded(false);
    } catch { /* Rendered below. */ }
  }

  return (
    <div className="mb-6 rounded-2xl border border-border-app bg-surface-app p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-heading text-base font-bold">{t("periodicReports.campaignTitle")}</h2>
          <AppBadge tone={campaign?.isOpen ? "success" : "neutral"}>
            {campaign?.isOpen ? t("periodicReports.campaignOpen") : t("periodicReports.campaignClosed")}
          </AppBadge>
        </div>
        <AppButton variant="secondary" onClick={() => setExpanded((prev) => !prev)}>
          {t("periodicReports.campaignConfigure")}
        </AppButton>
      </div>
      {campaign?.announcement && !expanded && (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-app">{campaign.announcement}</p>
      )}
      {expanded && (
        <div className="mt-4 space-y-4 border-t border-border-app pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2.5 text-sm font-semibold">
              <input
                type="checkbox"
                checked={isOpen}
                onChange={(e) => setIsOpen(e.target.checked)}
                className="size-4 rounded border-border-app"
              />
              {t("periodicReports.campaignOpen")}
            </label>
            <label className="block text-sm font-semibold">
              {t("periodicReports.campaignDeadline")}<AppRequiredMark />
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="mt-1 block min-h-10 w-full rounded-xl border border-border-app bg-bg-app px-3 py-2 text-sm text-text-app"
              />
            </label>
          </div>

          <label className="block text-sm font-semibold">
            {t("periodicReports.campaignAnnouncement")}
            <AppTextarea
              className="mt-1 min-h-20 w-full font-normal"
              value={announcement}
              maxLength={5000}
              placeholder={t("periodicReports.campaignAnnouncementPlaceholder")}
              onChange={(e) => setAnnouncement(e.target.value)}
            />
          </label>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold">{t("periodicReports.customFieldsTitle")}</span>
              <AppButton
                variant="secondary"
                onClick={() =>
                  setCustomFields((prev) => [
                    ...prev,
                    { id: `field_${Date.now()}_${prev.length + 1}`, label: "", type: "text", required: false },
                  ])
                }
              >
                {t("periodicReports.addCustomField")}
              </AppButton>
            </div>
            {customFields.map((field, idx) => (
              <div key={field.id} className="grid gap-3 rounded-xl border border-border-app bg-bg-app p-3 sm:grid-cols-[1fr_1fr_10rem_auto_auto]">
                <input
                  placeholder={t("periodicReports.fieldLabel")}
                  value={field.label}
                  onChange={(e) => updateField(idx, { label: e.target.value })}
                  className="min-h-10 rounded-xl border border-border-app bg-surface-app px-3 py-2 text-sm text-text-app"
                />
                <input
                  placeholder={t("periodicReports.fieldDescription")}
                  value={field.description ?? ""}
                  onChange={(e) => updateField(idx, { description: e.target.value })}
                  className="min-h-10 rounded-xl border border-border-app bg-surface-app px-3 py-2 text-sm text-text-app"
                />
                <select
                  value={field.type}
                  onChange={(e) => updateField(idx, { type: e.target.value as CustomFieldType })}
                  className="min-h-10 rounded-xl border border-border-app bg-surface-app px-3 py-2 text-sm text-text-app"
                >
                  {fieldTypes.map((ft) => (
                    <option key={ft} value={ft}>
                      {ft === "text" ? t("periodicReports.fieldTypeText") : ft === "number" ? t("periodicReports.fieldTypeNumber") : t("periodicReports.fieldTypeEvidence")}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(idx, { required: e.target.checked })}
                  />
                  {t("periodicReports.fieldRequired")}
                </label>
                <AppButton variant="secondary" onClick={() => setCustomFields((prev) => prev.filter((_, i) => i !== idx))}>
                  {t("periodicReports.removeField")}
                </AppButton>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <AppButton disabled={save.isPending || !dueAt} onClick={() => void handleSave()}>
              {save.isPending ? t("periodicReports.savingCampaign") : t("periodicReports.saveCampaign")}
            </AppButton>
            <AppButton variant="secondary" onClick={() => setExpanded(false)}>
              {t("periodicReports.cancel")}
            </AppButton>
          </div>
          {save.isError && <p role="alert" className="text-sm text-danger-app">{save.error.message}</p>}
        </div>
      )}
      {save.isSuccess && !expanded && <p role="status" className="mt-2 text-xs text-mint-app">{t("periodicReports.campaignSaved")}</p>}
    </div>
  );
}

function Row({ row, periodCode, csrfToken }: { row: PeriodicReportRow; periodCode: string; csrfToken: string }) {
  const { t } = useTranslation();
  const day = useDay();
  const record = useRecordMissingPeriodicReport();
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState<Severity>("MINOR");
  const [note, setNote] = useState("");

  async function submit() {
    try {
      await record.mutateAsync({ csrfToken, input: { clubId: row.clubId, periodCode, severity, note: note.trim() || undefined } });
      setOpen(false);
    } catch { /* Mutation state is rendered below. */ }
  }

  return (
    <li className="px-2 py-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft-app text-primary-app">
          <AppIcon name="file" />
        </span>
        <div className="min-w-0 flex-1 basis-64">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-lg font-bold break-words">{row.clubName}</h2>
            <AppBadge tone={stateTone(row.state)}>{stateLabel(t, row.state)}</AppBadge>
            {row.overdue && <AppBadge tone="danger">{t("periodicReports.overdue")}</AppBadge>}
            {row.lateFlag && <AppBadge tone="warning">{t("periodicReports.late")}</AppBadge>}
          </div>
          <p className="mt-1 text-sm text-muted-app">{t("periodicReports.dueOn", { date: day(row.dueAt) })}
            {row.submittedAt && ` · ${t("periodicReports.submittedOn", { date: day(row.submittedAt) })}`}
            {row.versionNo && row.versionNo > 1 && ` · ${t("periodicReports.version", { number: row.versionNo })}`}</p>
        </div>
        {row.reportId && row.state !== "Draft" ? (
          <Link to={`/workspace/periodic-reports/${row.reportId}`} className="inline-flex items-center gap-1 font-semibold text-primary-app">
            {row.state === "Submitted" ? t("periodicReports.open") : t("periodicReports.view")}<AppIcon name="chevronRight" className="size-4" />
          </Link>
        ) : row.violationId ? (
          <Link className="font-semibold text-accent-app" to={`/workspace/violations/${row.violationId}`}>
            {t("periodicReports.recorded")} · {t("periodicReports.viewCase")}</Link>
        ) : row.overdue && !open && <AppButton variant="secondary" onClick={() => setOpen(true)}>{t("periodicReports.recordMissing")}</AppButton>}
      </div>
      {open && !row.violationId && (
        <div className="mt-4 rounded-2xl bg-surface-app p-4">
          <p className="text-sm text-muted-app">{t("periodicReports.missingHint")}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <AppSelect className="w-full" label={t("periodicReports.severity")} value={severity} onChange={setSeverity}
              options={severities.map((value) => ({ value, label: severityLabel(t, value) }))} />
            <AppInput value={note} maxLength={2000} aria-label={t("periodicReports.note")} placeholder={t("periodicReports.notePlaceholder")}
              onChange={(e) => setNote(e.target.value)} className="w-full" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <AppButton disabled={record.isPending} onClick={() => void submit()}>{t("periodicReports.confirmMissing")}</AppButton>
            <AppButton variant="secondary" onClick={() => setOpen(false)}>{t("periodicReports.cancel")}</AppButton>
          </div>
          {record.isError && <p role="alert" className="mt-3 text-sm text-danger-app">{record.error.message}</p>}
        </div>
      )}
    </li>
  );
}

function Overview({ csrfToken }: { csrfToken: string }) {
  const { t } = useTranslation();
  const day = useDay();
  const [period, setPeriod] = useState<string | undefined>(undefined);
  const [filter, setFilter] = useState<Filter>("all");
  const overview = usePeriodicOverview(period, true);

  if (overview.isPending) return <div className="space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-20 w-full" />)}</div>;
  if (overview.isError) return <AppNotice tone="danger" role="alert" title={overview.error.message || t("periodicReports.loadError")}>
    <AppButton variant="secondary" onClick={() => void overview.refetch()}>{t("periodicReports.retry")}</AppButton>
  </AppNotice>;
  const data = overview.data;
  if (!data.periodCode) return <AppNotice>{t("periodicReports.noCalendar")}</AppNotice>;
  const periodCode = data.periodCode;
  const shown = data.rows.filter((row) => matches(filter, row));
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <AppSelect className="w-56" label={t("periodicReports.period")} value={periodCode} onChange={setPeriod}
          options={data.periods.map((item) => ({ value: item.code, label: item.code }))} />
        {data.dueAt && <span className="text-sm text-muted-app">{t("periodicReports.dueOn", { date: day(data.dueAt) })}</span>}
      </div>
      <CampaignPanel
        key={`${periodCode}:${data.campaign?.updatedAt ?? ""}`}
        periodCode={periodCode}
        defaultDueAt={data.dueAt}
        campaign={data.campaign}
        csrfToken={csrfToken}
      />
      <div role="group" aria-label={t("periodicReports.title")} className="mb-6 flex flex-wrap gap-2">{filters.map((value) =>
        <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}
          className={cn("min-h-11 rounded-full border border-border-app px-4 text-sm font-semibold text-muted-app transition-colors hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app", {
            "border-primary-app bg-primary-soft-app text-primary-app hover:text-primary-app": filter === value,
          })}>{filterLabel(t, value)} · {data.rows.filter((row) => matches(value, row)).length}</button>)}</div>
      {shown.length ? <ul className="divide-y divide-border-app border-y border-border-app">
        {shown.map((row) => <Row key={row.clubId} row={row} periodCode={periodCode} csrfToken={csrfToken} />)}</ul>
        : <div className="py-16 text-center">
          <span aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-mint-soft-app text-mint-app"><AppIcon name="sparkles" className="size-7" /></span>
          <h2 className="mt-4 font-heading text-xl font-bold">{t("periodicReports.none")}</h2>
          <p className="mt-2 text-sm text-muted-app">{t("periodicReports.noneHint")}</p>
        </div>}
    </>
  );
}

export function PeriodicReportsPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t("periodicReports.title")} description={t("periodicReports.description")} />
      <Gate>{(csrfToken) => <Overview csrfToken={csrfToken} />}</Gate>
    </>
  );
}

function Figure({ label, frozen, live }: { label: string; frozen: ReactNode; live: ReactNode }) {
  const differs = frozen !== undefined && live !== undefined && frozen !== live;
  return (
    <tr className="align-top">
      <th scope="row" className="py-2.5 pr-3 text-left font-medium">{label}</th>
      <td className={cn("py-2.5 pr-3 text-right tabular-nums", { "font-semibold text-warning-app": differs })}>{frozen ?? "—"}</td>
      <td className="py-2.5 text-right tabular-nums">{live ?? "—"}</td>
    </tr>
  );
}

function safeFileName(title: string, url: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "evidence-image";
  const match = url.match(/^data:image\/([a-z0-9.+-]+);base64,/i);
  const rawExt = match?.[1]?.toLowerCase() ?? "png";
  const ext = rawExt === "jpeg" ? "jpg" : rawExt === "svg+xml" ? "svg" : rawExt;
  return `${base}.${ext}`;
}

async function saveEvidenceImage(url: string, title: string) {
  const filename = safeFileName(title, url);
  if (url.startsWith("data:image/")) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function EvidenceDisplay({
  url,
  title,
  onPreview,
}: {
  url: string;
  title: string;
  onPreview: (url: string, title: string) => void;
}) {
  const { t } = useTranslation();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const isUploaded = url.startsWith("data:image/");
  const imgFailed = failedUrl === url;

  return (
    <div className="mt-2 flex flex-wrap items-start gap-3 rounded-xl border border-border-app bg-bg-app p-3">
      {!imgFailed ? (
        <img
          src={url}
          alt={title}
          onError={() => setFailedUrl(url)}
          className="max-h-44 rounded-lg border border-border-app object-contain"
        />
      ) : (
        <a href={url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-accent-app break-all">
          {url}
        </a>
      )}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <AppBadge tone={isUploaded ? "success" : "info"}>
            {isUploaded ? t("periodicReports.uploadedImageBadge") : t("periodicReports.linkedEvidenceBadge")}
          </AppBadge>
        </div>
        <div className="flex flex-wrap gap-2">
          {!imgFailed && (
            <>
              <AppButton variant="secondary" onClick={() => onPreview(url, title)}>
                {t("periodicReports.viewImage")}
              </AppButton>
              <AppButton variant="secondary" onClick={() => void saveEvidenceImage(url, title)}>
                {t("periodicReports.saveImage")}
              </AppButton>
            </>
          )}
          {!isUploaded && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center rounded-xl border border-border-app bg-surface-app px-3 py-1.5 text-xs font-semibold text-accent-app"
            >
              {t("periodicReports.openOriginalLink")}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Review({ id, csrfToken }: { id: string; csrfToken: string }) {
  const { t, i18n } = useTranslation();
  const askConfirm = useConfirm();
  const day = useDay();
  const report = usePeriodicReport(id, true);
  const decide = useDecidePeriodicReport();
  const [outcome, setOutcome] = useState<PeriodicOutcome>("Accept");
  const [observation, setObservation] = useState("");
  const [reason, setReason] = useState("");
  const [sections, setSections] = useState<ReturnSection[]>([]);
  const [resubmitDueAt, setResubmitDueAt] = useState("");
  const [compareVersionNo, setCompareVersionNo] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const field = useFieldValidation(outcome === "Return" ? {
    reason: reason.trim() ? null : t("periodicReports.reasonMissing"),
    sections: sections.length ? null : t("periodicReports.sectionsMissing"),
  } : {});
  const back = { to: "/workspace/periodic-reports", label: t("periodicReports.back") };

  function money(value: number | undefined) {
    return value === undefined ? undefined : formatMoney(value, i18n.language);
  }

  if (report.isPending) return <div className="space-y-4"><AppSkeleton className="h-10 w-1/2" /><AppSkeleton className="h-96 w-full" /></div>;
  if (report.isError) return <>
    <PageHeader title={t("periodicReports.report")} back={back} />
    <AppNotice tone="danger" role="alert" title={report.error.message || t("periodicReports.loadError")}>
      <AppButton variant="secondary" onClick={() => void report.refetch()}>{t("periodicReports.retry")}</AppButton>
    </AppNotice>
  </>;

  const data = report.data;
  const { preloadedFigures: frozen, live } = data;
  const sysMembers = data.systemData?.members ?? [];
  const clubMembers = data.members ?? [];
  const sysEvents = data.systemData?.events ?? [];
  const clubEvents = data.events ?? [];
  const achievements = data.achievements ?? [];
  const customAnswers = data.customAnswers ?? [];
  const customFields = data.campaign?.customFields ?? [];

  const removedMembers = sysMembers.filter((sm) =>
    !clubMembers.some((cm) =>
      (sm.userId && cm.userId === sm.userId) ||
      cm.studentCode.toLowerCase() === sm.studentCode.toLowerCase() ||
      cm.email.toLowerCase() === sm.email.toLowerCase(),
    ),
  );

  const removedEvents = sysEvents.filter((se) =>
    !clubEvents.some((ce) => (se.eventId && ce.eventId === se.eventId) || ce.title.toLowerCase() === se.title.toLowerCase()),
  );

  const versions = data.versions ?? [];
  const compareVersion = versions.find((v) => v.versionNo === (compareVersionNo ?? (versions.length > 1 ? versions[versions.length - 1]?.versionNo : undefined)));

  function toggle(section: ReturnSection) {
    setSections((current) => current.includes(section) ? current.filter((item) => item !== section) : [...current, section]);
    field.touch("sections");
  }

  async function submit() {
    if (!field.touchAll() || !(await askConfirm(outcome === "Accept" ? t("periodicReports.confirmAccept") : t("periodicReports.confirmReturn")))) return;
    try {
      await decide.mutateAsync({
        id,
        csrfToken,
        input: outcome === "Accept"
          ? { outcome, observation: observation.trim() || undefined }
          : {
              outcome,
              reason: reason.trim(),
              sections,
              ...(resubmitDueAt ? { resubmitDueAt: new Date(`${resubmitDueAt}T23:59:59.000Z`).toISOString() } : {}),
            },
      });
    } catch { /* Mutation state is rendered below. */ }
  }

  return (
    <>
      <PageHeader title={`${data.clubName} · ${data.periodCode}`} back={back}
        description={`${t("periodicReports.dueOn", { date: day(data.dueAt) })}${data.submittedAt
          ? ` · ${t("periodicReports.submittedOn", { date: day(data.submittedAt) })}` : ""} · ${t("periodicReports.version", { number: data.versionNo })}`}
        actions={<span className="flex flex-wrap gap-2">
          {data.lateFlag && <AppBadge tone="warning">{t("periodicReports.late")}</AppBadge>}
          <AppBadge tone={stateTone(data.state)}>{stateLabel(t, data.state)}</AppBadge></span>} />
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-10">
          {/* Overview Figures */}
          <section>
            <h2 className="font-heading text-xl font-bold">{t("periodicReports.figures")}</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[26rem] text-sm">
                <thead><tr className="border-b border-border-app text-muted-app">
                  <th scope="col" className="py-2 pr-3 text-left font-semibold"><span className="sr-only">{t("periodicReports.figures")}</span></th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">{t("periodicReports.frozen")}</th>
                  <th scope="col" className="py-2 text-right font-semibold">{t("periodicReports.system")}</th>
                </tr></thead>
                <tbody className="divide-y divide-border-app">
                  <Figure label={t("periodicReports.eventsHeld")} frozen={frozen.events?.completed} live={live.events?.completed} />
                  <Figure label={t("periodicReports.eventsCancelled")} frozen={frozen.events?.cancelled} live={live.events?.cancelled} />
                  <Figure label={t("periodicReports.attendance")} frozen={frozen.attendance?.total} live={live.attendance?.total} />
                  <Figure label={t("periodicReports.activeMembers")} frozen={frozen.members?.active} live={live.members?.active} />
                  <Figure label={t("periodicReports.budgets")} frozen={frozen.finance?.budgets} live={live.finance?.budgets} />
                  <Figure label={t("periodicReports.approvedTotal")} frozen={money(frozen.finance?.approvedTotal)} live={money(live.finance?.approvedTotal)} />
                  <Figure label={t("periodicReports.disbursedTotal")} frozen={money(frozen.finance?.disbursedTotal)} live={money(live.finance?.disbursedTotal)} />
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-app">{t("periodicReports.activeMembersHint")}</p>
          </section>

          {/* 1. Active Members & System Comparison */}
          <section className="border-t border-border-app pt-8">
            <h2 className="font-heading text-xl font-bold">{t("periodicReports.membersSection")} ({clubMembers.length})</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="border-b border-border-app text-left text-muted-app">
                    <th className="py-2 pr-3 font-semibold">{t("periodicReports.memberName")}</th>
                    <th className="py-2 pr-3 font-semibold">{t("periodicReports.memberCode")}</th>
                    <th className="py-2 pr-3 font-semibold">{t("periodicReports.memberEmail")}</th>
                    <th className="py-2 pr-3 text-right font-semibold">{t("periodicReports.memberScore")}</th>
                    <th className="py-2 text-right font-semibold">{t("periodicReports.memberSource")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-app">
                  {clubMembers.map((m, idx) => {
                    const matchedSys = sysMembers.find(
                      (sm) =>
                        (sm.userId && m.userId === sm.userId) ||
                        sm.studentCode.toLowerCase() === m.studentCode.toLowerCase() ||
                        sm.email.toLowerCase() === m.email.toLowerCase(),
                    );
                    return (
                      <tr key={idx}>
                        <td className="py-2.5 pr-3 font-medium">{m.fullName}</td>
                        <td className="py-2.5 pr-3 tabular-nums">{m.studentCode}</td>
                        <td className="py-2.5 pr-3 break-all">{m.email}</td>
                        <td className="py-2.5 pr-3 text-right font-bold tabular-nums">{m.activityScore}</td>
                        <td className="py-2.5 text-right">
                          <AppBadge tone={matchedSys ? "info" : "warning"}>
                            {matchedSys ? t("periodicReports.sourceSystem") : t("periodicReports.sourceManual")}
                          </AppBadge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {removedMembers.length > 0 && (
              <div className="mt-4 rounded-xl border border-border-app bg-surface-app p-4">
                <p className="text-xs font-bold text-warning-app">
                  {t("periodicReports.removedMembersTitle", { count: removedMembers.length })}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-muted-app">
                  {removedMembers.map((rm, idx) => (
                    <li key={idx} className="flex flex-wrap items-center gap-2">
                      <AppBadge tone="danger">{t("periodicReports.sourceRemoved")}</AppBadge>
                      <span>{rm.fullName} · {rm.studentCode} · {rm.email}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* 2. Events Organized & System Comparison */}
          <section className="border-t border-border-app pt-8">
            <h2 className="font-heading text-xl font-bold">{t("periodicReports.eventsSection")} ({clubEvents.length})</h2>
            <div className="mt-4 space-y-4">
              {clubEvents.map((ev, idx) => {
                const matchedSys = sysEvents.find(
                  (se) => (se.eventId && ev.eventId === se.eventId) || se.title.toLowerCase() === ev.title.toLowerCase(),
                );
                const modified = Boolean(
                  matchedSys &&
                  (matchedSys.title !== ev.title ||
                    matchedSys.heldAt.slice(0, 10) !== ev.heldAt.slice(0, 10) ||
                    matchedSys.participantCount !== ev.participantCount),
                );
                return (
                  <div key={idx} className="space-y-2 rounded-2xl border border-border-app bg-surface-app p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold">{ev.title}</h3>
                      <div className="flex flex-wrap gap-2">
                        <AppBadge tone={matchedSys ? "info" : "warning"}>
                          {matchedSys ? t("periodicReports.sourceSystem") : t("periodicReports.sourceManual")}
                        </AppBadge>
                        {modified && <AppBadge tone="warning">{t("periodicReports.sourceModified")}</AppBadge>}
                      </div>
                    </div>
                    <p className="text-xs text-muted-app">
                      {t("periodicReports.eventHeldAt")}: {ev.heldAt} · {t("periodicReports.eventParticipants")}: {ev.participantCount}
                      {matchedSys && matchedSys.participantCount !== ev.participantCount && (
                        <span className="ml-2 font-semibold text-warning-app">
                          ({t("periodicReports.systemValue", { value: matchedSys.participantCount })})
                        </span>
                      )}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm">{ev.description}</p>
                    {ev.evidenceUrl && (
                      <EvidenceDisplay
                        url={ev.evidenceUrl}
                        title={ev.title}
                        onPreview={(url, title) => setPreviewImage({ url, title })}
                      />
                    )}
                  </div>
                );
              })}
              {removedEvents.length > 0 && (
                <div className="rounded-xl border border-border-app bg-surface-app p-4">
                  <p className="text-xs font-bold text-warning-app">
                    {t("periodicReports.removedEventsTitle", { count: removedEvents.length })}
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-app">
                    {removedEvents.map((re, idx) => (
                      <li key={idx} className="flex flex-wrap items-center gap-2">
                        <AppBadge tone="danger">{t("periodicReports.sourceRemoved")}</AppBadge>
                        <span>{re.title} · {re.heldAt} · {re.participantCount}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* 3. Achievements */}
          <section className="border-t border-border-app pt-8">
            <h2 className="font-heading text-xl font-bold">{t("periodicReports.achievementsSection")} ({achievements.length})</h2>
            {achievements.length ? (
              <div className="mt-4 space-y-4">
                {achievements.map((ach, idx) => (
                  <div key={idx} className="space-y-2 rounded-2xl border border-border-app bg-surface-app p-4">
                    <h3 className="font-bold">{ach.title}</h3>
                    <p className="whitespace-pre-wrap break-words text-sm">{ach.description}</p>
                    {ach.evidenceUrl && (
                      <EvidenceDisplay
                        url={ach.evidenceUrl}
                        title={ach.title}
                        onPreview={(url, title) => setPreviewImage({ url, title })}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-app">{t("periodicReports.noAchievements")}</p>
            )}
          </section>

          {/* 4. Additional ICPDP Custom Fields */}
          {(customFields.length > 0 || customAnswers.length > 0) && (
            <section className="border-t border-border-app pt-8">
              <h2 className="font-heading text-xl font-bold">{t("periodicReports.customFieldsSection")}</h2>
              <dl className="mt-4 space-y-4">
                {(customFields.length
                  ? customFields.map((cf) => ({
                      id: cf.id,
                      label: cf.label,
                      answer: customAnswers.find((a) => a.fieldId === cf.id),
                    }))
                  : customAnswers.map((a) => ({ id: a.fieldId, label: a.label ?? a.fieldId, answer: a }))
                ).map((item) => (
                  <div key={item.id} className="rounded-xl border border-border-app bg-surface-app p-4">
                    <dt className="text-xs font-semibold uppercase text-muted-app">{item.label}</dt>
                    <dd className="mt-1 text-sm">
                      {item.answer?.textValue && <p className="whitespace-pre-wrap break-words">{item.answer.textValue}</p>}
                      {item.answer?.numberValue !== undefined && <p className="font-bold tabular-nums">{item.answer.numberValue}</p>}
                      {item.answer?.evidenceUrl && (
                        <EvidenceDisplay
                          url={item.answer.evidenceUrl}
                          title={item.label}
                          onPreview={(url, title) => setPreviewImage({ url, title })}
                        />
                      )}
                      {!item.answer?.textValue && item.answer?.numberValue === undefined && !item.answer?.evidenceUrl && (
                        <span className="text-muted-app">{t("periodicReports.empty")}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* Legacy narrative/nextPlan fallback if present */}
          {(data.narrative || data.nextPlan || data.evidence.length > 0) && (
            <section className="border-t border-border-app pt-8">
              <h2 className="font-heading text-xl font-bold">{t("periodicReports.content")}</h2>
              <dl className="mt-4 space-y-5">
                {data.narrative && (
                  <div>
                    <dt className="text-xs font-semibold uppercase text-muted-app">{t("periodicReports.narrative")}</dt>
                    <dd className="mt-1 whitespace-pre-line break-words">{data.narrative}</dd>
                  </div>
                )}
                {data.nextPlan && (
                  <div>
                    <dt className="text-xs font-semibold uppercase text-muted-app">{t("periodicReports.nextPlan")}</dt>
                    <dd className="mt-1 whitespace-pre-line break-words">{data.nextPlan}</dd>
                  </div>
                )}
                {data.evidence.length > 0 && (
                  <div>
                    <dt className="text-xs font-semibold uppercase text-muted-app">{t("periodicReports.evidence")}</dt>
                    <dd className="mt-1">
                      <ul className="space-y-1">
                        {data.evidence.map((item, index) => (
                          <li key={index} className="break-words">
                            {item.url ? <a className="font-semibold text-accent-app" href={item.url} target="_blank" rel="noreferrer">{item.note || item.url}</a> : item.note}
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* Version History & Comparison */}
          <section className="border-t border-border-app pt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-heading text-xl font-bold">{t("periodicReports.versionCompareTitle")}</h2>
              {versions.length > 1 && (
                <select
                  value={compareVersion?.versionNo ?? ""}
                  onChange={(e) => setCompareVersionNo(Number(e.target.value))}
                  aria-label={t("periodicReports.versionSelectBase")}
                  className="min-h-10 rounded-xl border border-border-app bg-surface-app px-3 py-2 text-sm text-text-app"
                >
                  {versions.map((v) => (
                    <option key={v.versionNo} value={v.versionNo}>
                      {t("periodicReports.version", { number: v.versionNo })} ({day(v.submittedAt)})
                    </option>
                  ))}
                </select>
              )}
            </div>
            {compareVersion && versions.length > 1 && (
              <div className="mt-4 rounded-2xl border border-border-app bg-surface-app p-4 text-sm">
                <p className="font-semibold">
                  {t("periodicReports.versionDiffSummary", {
                    current: data.versionNo,
                    prev: compareVersion.versionNo,
                    memberDiff: `${compareVersion.members?.length ?? 0} → ${clubMembers.length}`,
                    eventDiff: `${compareVersion.events?.length ?? 0} → ${clubEvents.length}`,
                    achievementDiff: `${compareVersion.achievements?.length ?? 0} → ${achievements.length}`,
                  })}
                </p>
                {compareVersion.decision && (
                  <p className="mt-2 text-xs text-muted-app">
                    {compareVersion.decision.outcome}: {compareVersion.decision.reason ?? compareVersion.decision.observation}
                  </p>
                )}
              </div>
            )}
            {data.history.length ? <ol className="mt-5 space-y-4 border-l-2 border-border-app pl-5">{data.history.map((item, index) =>
              <li key={index} className="relative">
                <span aria-hidden="true" className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-primary-app" />
                <p className="font-semibold">{item.action === "PERIODIC_REPORT_ACCEPTED" ? t("periodicReports.actionAccepted")
                  : item.action === "PERIODIC_REPORT_RETURNED" ? t("periodicReports.actionReturned") : item.action}</p>
                <p className="text-sm text-muted-app">{day(item.at)}{item.actorName && ` · ${item.actorName}`}</p>
                {item.reason && <p className="mt-1 text-sm break-words">{item.reason}</p>}
              </li>)}</ol>
              : <p className="mt-3 text-sm text-muted-app">{t("periodicReports.noHistory")}</p>}
          </section>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-6">
          {data.state === "Submitted" ? (
            <section className="rounded-2xl bg-surface-app p-5">
              <h2 className="font-heading text-lg font-bold">{t("periodicReports.decide")}</h2>
              <div role="radiogroup" aria-label={t("periodicReports.decide")} className="mt-4 grid gap-2">
                {(["Accept", "Return"] as const).map((value) => <button key={value} type="button" role="radio" aria-checked={outcome === value}
                  onClick={() => setOutcome(value)}
                  className={cn("min-h-11 rounded-xl border border-border-app px-4 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring-app", {
                    "border-primary-app bg-primary-soft-app text-primary-app": outcome === value,
                  })}>{value === "Accept" ? t("periodicReports.outcomeAccept") : t("periodicReports.outcomeReturn")}</button>)}
              </div>
              {outcome === "Accept" ? (
                <label className="mt-5 block text-sm font-semibold">{t("periodicReports.observation")}
                  <AppTextarea className="mt-2 min-h-20 w-full font-normal" value={observation} maxLength={2000}
                    onChange={(e) => setObservation(e.target.value)} />
                  <span className="mt-1 block text-xs font-normal text-muted-app">{t("periodicReports.observationHint")}</span></label>
              ) : <>
                <fieldset className="mt-5">
                  <legend className="text-sm font-semibold">{t("periodicReports.sections")}<AppRequiredMark /></legend>
                  <div className="mt-2 flex flex-wrap gap-2">{RETURN_SECTIONS.map((section) =>
                    <button key={section} type="button" aria-pressed={sections.includes(section)} onClick={() => toggle(section)}
                      className={cn("min-h-11 rounded-full border border-border-app px-4 text-sm font-semibold text-muted-app transition-colors focus-visible:outline-2 focus-visible:outline-ring-app", {
                        "border-primary-app bg-primary-soft-app text-primary-app": sections.includes(section),
                      })}>{sectionLabel(t, section)}</button>)}</div>
                  <AppFieldError message={field.error("sections")} />
                </fieldset>
                <label className="mt-5 block text-sm font-semibold">{t("periodicReports.resubmitDueAt")}
                  <input
                    type="date"
                    value={resubmitDueAt}
                    onChange={(e) => setResubmitDueAt(e.target.value)}
                    className="mt-2 block min-h-10 w-full rounded-xl border border-border-app bg-bg-app px-3 py-2 text-sm font-normal text-text-app"
                  />
                  <span className="mt-1 block text-xs font-normal text-muted-app">{t("periodicReports.resubmitDueAtHint")}</span>
                </label>
                <label className="mt-5 block text-sm font-semibold">{t("periodicReports.reason")}<AppRequiredMark />
                  <AppTextarea className="mt-2 min-h-24 w-full font-normal" value={reason} maxLength={5000}
                    {...field.control("reason")} onChange={(e) => setReason(e.target.value)} />
                  <AppFieldError message={field.error("reason")} />
                  <span className="mt-1 block text-xs font-normal text-muted-app">{t("periodicReports.reasonHint")}</span></label>
              </>}
              <AppButton className="mt-6 w-full" disabled={decide.isPending} onClick={() => void submit()}>
                {decide.isPending ? t("periodicReports.submitting") : t("periodicReports.submit")}</AppButton>
              {decide.isError && <p role="alert" className="mt-3 text-sm text-danger-app">{decide.error.message}</p>}
            </section>
          ) : data.decision ? (
            <section className="rounded-2xl bg-surface-app p-5">
              <h2 className="font-heading text-lg font-bold">{data.decision.outcome === "Accept" ? t("periodicReports.outcomeAccept")
                : t("periodicReports.outcomeReturn")}</h2>
              <p className="mt-1 text-sm text-muted-app">{t("periodicReports.decisionBy", { name: data.decision.decidedByName ?? "—",
                date: day(data.decision.decidedAt) })}</p>
              {data.decision.sections.length > 0 && <div className="mt-3 flex flex-wrap gap-2">
                {data.decision.sections.map((section) => <AppBadge key={section} tone="warning">{sectionLabel(t, section)}</AppBadge>)}</div>}
              {(data.decision.reason ?? data.decision.observation) && <p className="mt-3 text-sm break-words">
                {data.decision.reason ?? data.decision.observation}</p>}
            </section>
          ) : <AppNotice>{t("periodicReports.notWaiting")}</AppNotice>}
          {decide.isSuccess && <AppNotice role="status" className="mt-4">{t("periodicReports.decided")}</AppNotice>}
        </aside>
      </div>

      <AppDialog
        open={Boolean(previewImage)}
        title={previewImage?.title ?? ""}
        closeLabel={t("periodicReports.closeImagePreview")}
        onClose={() => setPreviewImage(null)}
        className="w-[min(100%-2rem,56rem)]"
      >
        {previewImage && (
          <div className="space-y-4">
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="max-h-[70dvh] w-full rounded-xl border border-border-app bg-surface-app object-contain"
            />
            <div className="flex flex-wrap justify-end gap-2">
              <AppButton variant="secondary" onClick={() => void saveEvidenceImage(previewImage.url, previewImage.title)}>
                {t("periodicReports.saveImage")}
              </AppButton>
            </div>
          </div>
        )}
      </AppDialog>
    </>
  );
}

export function PeriodicReportReviewPage() {
  const { id } = useParams();
  return <Gate>{(csrfToken) => id ? <Review id={id} csrfToken={csrfToken} /> : null}</Gate>;
}
