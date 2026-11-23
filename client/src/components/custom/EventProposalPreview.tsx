import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppLinkedText } from "@/components/ui/linked-text/AppLinkedText";
import { EventProposalContent } from "@/components/custom/EventProposalContent";
import type { ClubEventInput } from "@/services/clubEvents";
import { importEventProposal, type ProposalImport } from "@/utils/eventProposalImport";
import { cn } from "@/utils/cn";

interface EventProposalPreviewProps {
  input: ClubEventInput;
  extracted?: ProposalImport;
  file?: File;
  missing: string[];
}

// The dossier separates mapped system values from complete, ordered source content.
export function EventProposalPreview({ input, extracted, file, missing }: EventProposalPreviewProps) {
  const { t, i18n } = useTranslation();
  const [active, setActive] = useState("overview");
  const [loaded, setLoaded] = useState<{ file: File; value: ProposalImport | null } | null>(null);
  useEffect(() => {
    if (!file || extracted || !file.name.toLowerCase().endsWith(".docx")) return;
    let current = true;
    importEventProposal(file).then((value) => { if (current) setLoaded({ file, value }); })
      .catch(() => { if (current) setLoaded({ file, value: null }); });
    return () => { current = false; };
  }, [file, extracted]);
  const source = extracted ?? (loaded?.file === file ? loaded?.value : null);
  const sections = source?.sections ?? [];
  const selected = active === "all" || active === "overview" || sections.some((section) => section.id === active) ? active : "overview";
  const fields = source?.fields ?? [];
  const absent = extracted?.missing ?? missing;
  const tables = sections.flatMap((section) => section.blocks).filter((block) => block.kind === "table").length;
  const sourceSections = sections.filter((section) => section.title);
  const total = input.budgetLines.reduce((sum, line) => sum + line.amount, 0);
  const currency = new Intl.NumberFormat(i18n.language === "vi" ? "vi-VN" : "en-GB", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
  const dateFormat = new Intl.DateTimeFormat(i18n.language === "vi" ? "vi-VN" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
  const empty = t("clubEvents.importNotFound");
  function date(value: string): string { return Number.isFinite(Date.parse(value)) ? dateFormat.format(new Date(value)) : empty; }
  function raw(part: string): string { return fields.find((field) => field.label.toLocaleLowerCase("vi").includes(part))?.value ?? ""; }
  function links(value: string, label: string) { return fields.find((field) => field.value === value && field.label.toLocaleLowerCase("vi").includes(label))?.links; }
  const facts = [
    { key: "start", value: date(input.startAt) }, { key: "end", value: date(input.endAt) },
    { key: "venue", value: input.venueText || empty, links: links(input.venueText || "", "địa điểm") },
    { key: "audience", value: raw("đối tượng") || (absent.includes("audience") ? empty : t(`clubEvents.${input.audienceScope}`)), links: links(raw("đối tượng"), "đối tượng") },
    { key: "capacity", value: input.capacity > 0 ? String(input.capacity) : raw("số lượng") || empty, links: input.capacity > 0 ? undefined : links(raw("số lượng"), "số lượng") },
  ] as const;
  const narrative = fields.filter((field) => !["tên sự kiện", "địa điểm", "đối tượng", "số lượng", "mức độ rủi ro", "mức rủi ro"]
    .some((label) => field.label.toLocaleLowerCase("vi").startsWith(label)));
  const sourceLoading = Boolean(file && !extracted && file.name.toLowerCase().endsWith(".docx") && loaded?.file !== file);

  return <section aria-label={t("clubEvents.documentExtractedFields")} className="min-w-0 overflow-hidden rounded-2xl border border-border-app bg-bg-app shadow-xs">
    <header className="space-y-5 border-b border-border-app bg-primary-app/5 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 basis-64 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide text-primary-app">
            <AppIcon name="file" className="size-4" /><span>{t("clubEvents.extractedKicker")}</span>
          </div>
          <h2 className="break-words font-heading text-xl font-semibold leading-snug sm:text-2xl"><AppLinkedText text={input.title || t("clubEvents.importPreview")} links={links(input.title, "tên sự kiện")} /></h2>
          <p className="max-w-3xl text-sm leading-6 text-muted-app">{t("clubEvents.extractedDescription")}</p>
        </div>
        <AppBadge tone={absent.length ? "warning" : "info"}>{t(absent.length ? "clubEvents.extractedMissingCount" : "clubEvents.extractedReadOnly", { count: absent.length })}</AppBadge>
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border-app bg-bg-app p-4">
          <dt className="text-xs font-medium text-muted-app">{t("clubEvents.extractedCoverage")}</dt>
          <dd className="mt-2 font-heading text-lg font-semibold">{t("clubEvents.extractedSectionCount", { count: sourceSections.length })}</dd>
          <dd className="mt-1 text-xs text-muted-app">{t("clubEvents.extractedTableCount", { count: tables })}</dd>
        </div>
        <div className="rounded-xl border border-border-app bg-bg-app p-4">
          <dt className="text-xs font-medium text-muted-app">{t("clubEvents.requestedTotal")}</dt>
          <dd className="mt-2 break-words font-heading text-lg font-semibold text-primary-app">{currency.format(total)}</dd>
          <dd className="mt-1 text-xs text-muted-app">{t("clubEvents.extractedBudgetCount", { count: input.budgetLines.length })}</dd>
        </div>
        <div className="rounded-xl border border-border-app bg-bg-app p-4">
          <dt className="text-xs font-medium text-muted-app">{t("clubEvents.extractedSource")}</dt>
          <dd className="mt-2 break-words text-sm font-semibold">{file?.name || t("clubEvents.extractedSavedData")}</dd>
          <dd className="mt-1 text-xs text-muted-app">{t("clubEvents.extractedCorrection")}</dd>
        </div>
      </dl>
      {absent.length > 0 && <div className="rounded-xl border border-warning-app/30 bg-warning-app/5 p-4 text-sm" role="status">
        <p className="font-medium">{t("clubEvents.extractedAttention")}</p>
        <div className="mt-2 flex flex-wrap gap-2">{absent.map((key) => <AppBadge key={key} tone="warning">{t(`clubEvents.${key}`, { defaultValue: key })}</AppBadge>)}</div>
      </div>}
    </header>

    <nav aria-label={t("clubEvents.extractedNavigation")} className="flex flex-wrap gap-2 border-b border-border-app p-4 sm:px-7">
      {[{ id: "overview", title: t("clubEvents.extractedOverview") }, ...sourceSections.map((section) => ({ id: section.id, title: section.title })),
        ...(sections.length ? [{ id: "all", title: t("clubEvents.extractedAll") }] : [])].map((item) => <button key={item.id} type="button"
          aria-pressed={selected === item.id} onClick={() => setActive(item.id)}
          className={cn("min-h-10 rounded-lg border border-border-app px-3 py-2 text-left text-xs font-medium leading-5 text-muted-app transition-colors hover:bg-surface-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-app", {
            "border-primary-app/30 bg-primary-app/10 text-primary-app": selected === item.id,
          })}>{item.title}</button>)}
    </nav>

    <div className="min-w-0 p-5 sm:p-7" aria-live="polite">
      {sourceLoading && <p role="status" className="mb-5 text-sm text-muted-app">{t("clubEvents.extractedLoading")}</p>}
      {!sourceLoading && !source && <p className="mb-5 rounded-lg bg-surface-app p-4 text-sm text-muted-app">{t("clubEvents.extractedSourceUnavailable")}</p>}
      {selected === "overview" ? <div className="space-y-7">
        <div>
          <h3 className="mb-4 font-heading text-base font-semibold">{t("clubEvents.extractedKeyFacts")}</h3>
          <dl className="grid gap-px overflow-hidden rounded-xl border border-border-app bg-border-app sm:grid-cols-2 lg:grid-cols-3">
            {facts.map((fact) => <div key={fact.key} className="min-w-0 bg-bg-app p-4">
              <dt className="text-xs font-medium text-muted-app">{t(`clubEvents.${fact.key}`)}</dt>
              <dd className="mt-2 whitespace-pre-wrap break-words text-sm font-medium leading-6"><AppLinkedText text={fact.value} links={"links" in fact ? fact.links : undefined} /></dd>
              {absent.includes(fact.key) && <dd className="mt-2 text-xs text-muted-app">{t("clubEvents.extractedNeedsClarification")}</dd>}
            </div>)}
          </dl>
        </div>
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          {(narrative.length ? narrative : [{ label: t("clubEvents.objective"), value: input.objective }, { label: t("clubEvents.plan"), value: input.plan }]).map((field, index) =>
            <section key={index} className={cn("min-w-0 rounded-xl border border-border-app p-5", { "md:col-span-2": field.value.length > 180 })}>
              <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-semibold"><span className="size-1.5 shrink-0 rounded-full bg-primary-app" aria-hidden="true" />{field.label}</h3>
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-text-app"><AppLinkedText text={field.value || empty} links={"links" in field ? field.links : undefined} /></p>
            </section>)}
        </div>
        <section className="overflow-hidden rounded-xl border border-border-app">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-app bg-surface-app px-5 py-4">
            <h3 className="font-heading text-sm font-semibold">{t("clubEvents.budget")}</h3>
            <span className="text-sm font-semibold text-primary-app">{currency.format(total)}</span>
          </div>
          {input.budgetLines.length > 0 ? <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="border-b border-border-app text-xs text-muted-app"><tr><th className="px-5 py-3">{t("clubEvents.category")}</th><th className="px-5 py-3">{t("clubEvents.planItems")}</th><th className="px-5 py-3 text-right">{t("clubEvents.amount")}</th></tr></thead>
            <tbody className="divide-y divide-border-app">{input.budgetLines.map((line, index) => <tr key={index} className="even:bg-surface-app/40">
              <td className="min-w-40 px-5 py-4 align-top font-medium"><AppLinkedText text={line.category} /></td>
              <td className="min-w-48 px-5 py-4 align-top whitespace-pre-wrap break-words leading-6 text-muted-app"><AppLinkedText text={line.plannedItems || line.purpose} /></td>
              <td className="min-w-36 px-5 py-4 text-right align-top font-medium tabular-nums">{currency.format(line.amount)}</td>
            </tr>)}</tbody>
          </table></div> : <p className="p-5 text-sm text-muted-app">{t("clubEvents.noBudgetRequested")}</p>}
        </section>
        {input.facilityNeeds && <section className="rounded-xl border border-border-app p-5"><h3 className="mb-3 font-heading text-sm font-semibold">{t("clubEvents.facilityNeeds")}</h3><p className="whitespace-pre-wrap break-words text-sm leading-7"><AppLinkedText text={input.facilityNeeds} /></p></section>}
      </div> : <EventProposalContent sections={selected === "all" ? sections : sections.filter((section) => section.id === selected)} />}
    </div>
  </section>;
}
