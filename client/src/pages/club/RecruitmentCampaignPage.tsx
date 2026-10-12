import { useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useRecruitmentCampaignAction, useRecruitmentCampaigns } from "@/hooks/useRecruitmentCampaigns";
import { cn } from "@/utils/cn";
import { CampaignApiError, type OverlappingCampaign, type RecruitmentCampaign,
  type RecruitmentCampaignInput, type RecruitmentFormField, type RecruitmentRubricCriterion } from "@/services/recruitmentCampaigns";

interface CampaignForm {
  title: string;
  positions: string;
  criteria: string;
  windowStart: string;
  windowEnd: string;
  capacity: string;
  steps: string;
  fields: RecruitmentFormField[];
  rubric: RecruitmentRubricCriterion[];
}

const emptyForm: CampaignForm = {
  title: "", positions: "", criteria: "", windowStart: "", windowEnd: "",
  capacity: "10", steps: "", fields: [], rubric: [],
};

function localDateTime(value: string | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function campaignForm(campaign: RecruitmentCampaign): CampaignForm {
  return {
    title: campaign.title, positions: campaign.positions.join("\n"),
    criteria: campaign.criteria ?? "", windowStart: localDateTime(campaign.windowStart),
    windowEnd: localDateTime(campaign.windowEnd), capacity: String(campaign.capacity),
    steps: campaign.selectionSteps.map((step) => step.name).join("\n"),
    fields: campaign.formSchema.map((field) => ({ ...field, options: field.options ? [...field.options] : undefined })),
    rubric: campaign.rubric.map((item) => ({ ...item })),
  };
}

function campaignInput(form: CampaignForm): RecruitmentCampaignInput {
  return {
    title: form.title, positions: form.positions.split("\n").map((item) => item.trim()).filter(Boolean),
    ...(form.criteria.trim() ? { criteria: form.criteria.trim() } : {}),
    windowStart: new Date(form.windowStart).toISOString(),
    windowEnd: new Date(form.windowEnd).toISOString(), capacity: Number(form.capacity),
    selectionSteps: form.steps.split("\n").map((name) => name.trim()).filter(Boolean).map((name) => ({ name })),
    formSchema: form.fields.map((field) => ({ ...field,
      ...(field.options?.length ? { options: field.options } : { options: undefined }) })),
    rubric: form.rubric,
  };
}

function overlapsFrom(error: unknown): OverlappingCampaign[] {
  if (!(error instanceof CampaignApiError) || !error.details || typeof error.details !== "object") return [];
  const details = error.details as { overlaps?: unknown };
  return Array.isArray(details.overlaps) ? details.overlaps as OverlappingCampaign[] : [];
}

// The server lists the academic calendar when a window does not fit one semester.
function semestersFrom(error: unknown): Array<{ code: string; startAt: string; endAt: string }> {
  if (!(error instanceof CampaignApiError) || !error.details || typeof error.details !== "object") return [];
  const details = error.details as { field?: unknown; academicCalendar?: unknown };
  return details.field === "window" && Array.isArray(details.academicCalendar)
    ? details.academicCalendar as Array<{ code: string; startAt: string; endAt: string }> : [];
}

export function RecruitmentCampaignPage() {
  const { clubId } = useParams();
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const workspace = auth.data?.workspaces.find((item) => item.kind === "club" && item.clubId === clubId);
  const canManage = Boolean(workspace?.permissions.includes("club.recruitment.manage"));
  const campaigns = useRecruitmentCampaigns(clubId, canManage);
  const action = useRecruitmentCampaignAction();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignForm>(() => ({ ...emptyForm, steps: t("recruitmentCampaigns.defaultStep") }));
  const [overlaps, setOverlaps] = useState<OverlappingCampaign[]>([]);
  const [notice, setNotice] = useState("");
  const [pageError, setPageError] = useState("");

  function dateLabel(value: string) {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(value));
  }

  function selectCampaign(campaign: RecruitmentCampaign) {
    setSelectedId(campaign.state === "Draft" ? campaign.id : null);
    setForm(campaignForm(campaign));
    setOverlaps([]);
    setNotice("");
    setPageError("");
  }

  function beginNew() {
    setSelectedId(null);
    setForm({ ...emptyForm, steps: t("recruitmentCampaigns.defaultStep") });
    setOverlaps([]);
    setNotice("");
    setPageError("");
  }

  function field<K extends keyof CampaignForm>(key: K, value: CampaignForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function formInput(): RecruitmentCampaignInput | null {
    if (!form.windowStart || !form.windowEnd) {
      setPageError(t("recruitmentCampaigns.actionError"));
      return null;
    }
    return campaignInput(form);
  }

  async function saveDraft() {
    if (!auth.data || !clubId) return;
    const input = formInput();
    if (!input) return;
    setPageError("");
    setNotice("");
    try {
      const result = await action.mutateAsync(selectedId
        ? { kind: "update", clubId, campaignId: selectedId, input, csrfToken: auth.data.csrfToken }
        : { kind: "create", clubId, input, csrfToken: auth.data.csrfToken });
      if (!("campaign" in result)) return;
      setSelectedId(result.campaign.id);
      setForm(campaignForm(result.campaign));
      setOverlaps(result.overlaps);
      setNotice(t("recruitmentCampaigns.saved"));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("recruitmentCampaigns.actionError"));
    }
  }

  async function publish(confirmOverlap: boolean) {
    if (!auth.data || !clubId || !selectedId) return;
    setPageError("");
    setNotice("");
    try {
      await action.mutateAsync({ kind: "publish", clubId,
        campaignId: selectedId, confirmOverlap, csrfToken: auth.data.csrfToken });
      setOverlaps([]);
      setSelectedId(null);
      setForm({ ...emptyForm, steps: t("recruitmentCampaigns.defaultStep") });
      setNotice(t("recruitmentCampaigns.publishedSuccess"));
    } catch (error) {
      const found = overlapsFrom(error);
      const semesters = semestersFrom(error);
      const day = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" });
      if (found.length) setOverlaps(found);
      else if (semesters.length) setPageError(t("recruitmentCampaigns.windowOutsideSemester", {
        semesters: semesters.map((semester) => `${semester.code} (${day.format(new Date(semester.startAt))} – ${day.format(new Date(semester.endAt))})`).join("; "),
      }));
      else setPageError(error instanceof Error ? error.message : t("recruitmentCampaigns.actionError"));
    }
  }

  async function cancel(campaign: RecruitmentCampaign) {
    if (!auth.data || !clubId || !window.confirm(t("recruitmentCampaigns.cancelConfirm"))) return;
    setPageError("");
    setNotice("");
    try {
      await action.mutateAsync({ kind: "cancel", clubId, campaignId: campaign.id,
        csrfToken: auth.data.csrfToken });
      beginNew();
      setNotice(t("recruitmentCampaigns.cancelledSuccess"));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("recruitmentCampaigns.actionError"));
    }
  }

  function addField() {
    const index = form.fields.length + 1;
    field("fields", [...form.fields, { key: `question_${index}`, label: "",
      type: "text", required: false }]);
  }

  function updateField(index: number, update: Partial<RecruitmentFormField>) {
    field("fields", form.fields.map((item, fieldIndex) => fieldIndex === index
      ? { ...item, ...update } : item));
  }

  function addRubric() {
    const index = form.rubric.length + 1;
    field("rubric", [...form.rubric, { key: `criterion_${index}`, label: "", maxScore: 5 }]);
  }

  function updateRubric(index: number, update: Partial<RecruitmentRubricCriterion>) {
    field("rubric", form.rubric.map((item, itemIndex) => itemIndex === index
      ? { ...item, ...update } : item));
  }

  const loading = <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
    <AppSkeleton className="h-[42rem] w-full" /><AppSkeleton className="h-80 w-full" />
  </div>;
  if (auth.isPending) return loading;
  if (!auth.data) return <AppNotice><p>{t("recruitmentCampaigns.signIn")}</p></AppNotice>;
  if (!canManage) return <AppNotice tone="danger" role="alert">{t("recruitmentCampaigns.permissionDenied")}</AppNotice>;
  if (campaigns.isPending) return loading;
  if (campaigns.isError || !campaigns.data) return <AppNotice tone="danger" role="alert"
    title={campaigns.error?.message ?? t("recruitmentCampaigns.loadError")}>
    <AppButton variant="secondary" onClick={() => void campaigns.refetch()}>{t("recruitmentCampaigns.retry")}</AppButton>
  </AppNotice>;

  const current = campaigns.data.find((item) => item.id === selectedId);
  const stateLabel: Record<RecruitmentCampaign["state"], string> = {
    Draft: t("recruitmentCampaigns.stateDraft"), Published: t("recruitmentCampaigns.statePublished"),
    "Accepting Applications": t("recruitmentCampaigns.stateAccepting"),
    Screening: t("recruitmentCampaigns.stateScreening"), Completed: t("recruitmentCampaigns.stateCompleted"),
    Cancelled: t("recruitmentCampaigns.stateCancelled"),
  };

  const stateTone: Record<RecruitmentCampaign["state"], AppBadgeTone> = {
    Draft: "neutral", Published: "info", "Accepting Applications": "success",
    Screening: "warning", Completed: "neutral", Cancelled: "danger",
  };
  const sub = "text-xs font-semibold text-muted-app";
  const select = "mt-1 min-h-11 w-full rounded-xl border border-border-app bg-bg-app px-3.5 text-sm font-normal text-text-app transition-colors hover:border-primary-app focus-visible:border-ring-app focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:outline-none";

  return <>
    <PageHeader title={t("recruitmentCampaigns.title")} description={t("recruitmentCampaigns.description")}
      actions={<AppButton variant="secondary" onClick={beginNew}><AppIcon name="plus" className="size-4" />{t("recruitmentCampaigns.create")}</AppButton>} />

    {notice && <AppNotice tone="success" role="status" className="mb-4">{notice}</AppNotice>}
    {pageError && <AppNotice tone="danger" role="alert" className="mb-4">{pageError}</AppNotice>}

    {overlaps.length > 0 && <section className="mb-6 rounded-xl border-l-4 border-warning-app bg-warning-app/10 px-5 py-4" aria-live="polite">
      <h2 className="font-heading font-bold text-warning-app">{t("recruitmentCampaigns.overlapTitle")}</h2>
      <p className="mt-1 text-sm">{t("recruitmentCampaigns.overlapDescription")}</p>
      <ul className="mt-3 divide-y divide-border-app">{overlaps.map((overlap) => <li key={overlap.id} className="py-3">
        <span className="text-xs font-semibold text-muted-app uppercase">{t("recruitmentCampaigns.overlapWith")}</span>
        <p className="mt-1 font-semibold break-words">{overlap.title}</p>
        <p className="mt-1 text-sm text-muted-app">{overlap.positions.join(", ")} · {dateLabel(overlap.windowStart)} – {dateLabel(overlap.windowEnd)}</p>
      </li>)}</ul>
      <div className="mt-3 flex flex-wrap gap-3">
        <AppButton disabled={action.isPending || !selectedId} onClick={() => void publish(true)}>
          {action.isPending ? t("recruitmentCampaigns.publishing") : t("recruitmentCampaigns.confirmPublish")}
        </AppButton>
        <AppButton variant="secondary" onClick={() => setOverlaps([])}>{t("recruitmentCampaigns.dismiss")}</AppButton>
      </div>
    </section>}

    <div className="grid items-start gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.8fr)]">
      <section aria-label={t("recruitmentCampaigns.formTitle")} className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-bold tracking-wide text-primary-app uppercase">{t("recruitmentCampaigns.formTitle")}</p>
            <h2 className="mt-1 font-heading text-xl font-bold">{current ? t("recruitmentCampaigns.edit") : t("recruitmentCampaigns.create")}</h2></div>
          {current && <AppBadge tone={stateTone[current.state]}>{stateLabel[current.state]}</AppBadge>}
        </div>
        <div className="mt-5 grid gap-5">
          <label className="text-sm font-semibold">{t("recruitmentCampaigns.campaignName")}
            <AppInput className="mt-2 block w-full font-normal" value={form.title} maxLength={150}
              onChange={(event) => field("title", event.target.value)} /></label>
          <label className="text-sm font-semibold">{t("recruitmentCampaigns.positions")}
            <AppTextarea className="mt-2 block min-h-24 w-full font-normal" value={form.positions}
              onChange={(event) => field("positions", event.target.value)} />
            <span className="mt-1 block text-xs font-normal text-muted-app">{t("recruitmentCampaigns.positionsHint")}</span></label>
          <label className="text-sm font-semibold">{t("recruitmentCampaigns.criteria")}
            <AppTextarea className="mt-2 block min-h-24 w-full font-normal" value={form.criteria} maxLength={10_000}
              onChange={(event) => field("criteria", event.target.value)} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="min-w-0 text-sm font-semibold">{t("recruitmentCampaigns.start")}
              <AppInput className="mt-2 block w-full min-w-0 font-normal" type="datetime-local" value={form.windowStart}
                onChange={(event) => field("windowStart", event.target.value)} /></label>
            <label className="min-w-0 text-sm font-semibold">{t("recruitmentCampaigns.end")}
              <AppInput className="mt-2 block w-full min-w-0 font-normal" type="datetime-local" value={form.windowEnd}
                onChange={(event) => field("windowEnd", event.target.value)} /></label>
          </div>
          <label className="max-w-xs text-sm font-semibold">{t("recruitmentCampaigns.capacity")}
            <AppInput className="mt-2 block w-full font-normal" type="number" min={1} max={10000} value={form.capacity}
              onChange={(event) => field("capacity", event.target.value)} /></label>
          <label className="text-sm font-semibold">{t("recruitmentCampaigns.rounds")}
            <AppTextarea className="mt-2 block min-h-24 w-full font-normal" value={form.steps}
              onChange={(event) => field("steps", event.target.value)} />
            <span className="mt-1 block text-xs font-normal text-muted-app">{t("recruitmentCampaigns.roundsHint")}</span></label>
        </div>

        <section className="mt-10 border-t border-border-app pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-heading text-lg font-bold">{t("recruitmentCampaigns.applicationForm")}</h3>
            <AppButton variant="secondary" onClick={addField}><AppIcon name="plus" className="size-4" />{t("recruitmentCampaigns.addField")}</AppButton></div>
          {!form.fields.length && <p className="mt-3 text-sm text-muted-app">{t("recruitmentCampaigns.optional")}</p>}
          <div className="mt-4 space-y-3">{form.fields.map((item, index) => <div key={`${item.key}-${index}`} className="grid gap-3 rounded-2xl bg-surface-app p-4 sm:grid-cols-2">
            <label className={sub}>{t("recruitmentCampaigns.fieldKey")}
              <AppInput className="mt-1 block w-full text-sm" value={item.key} onChange={(event) => updateField(index, { key: event.target.value })} /></label>
            <label className={sub}>{t("recruitmentCampaigns.fieldLabel")}
              <AppInput className="mt-1 block w-full text-sm" value={item.label} onChange={(event) => updateField(index, { label: event.target.value })} /></label>
            <label className={sub}>{t("recruitmentCampaigns.fieldType")}
              <select className={select} value={item.type}
                onChange={(event) => updateField(index, { type: event.target.value as RecruitmentFormField["type"], options: undefined })}>
                {(["text", "textarea", "url", "select", "multiselect", "file"] as const).map((type) => <option key={type} value={type}>{t(`recruitmentCampaigns.${type}`)}</option>)}
              </select></label>
            {(["select", "multiselect"] as string[]).includes(item.type) && <label className={sub}>{t("recruitmentCampaigns.options")}
              <AppInput className="mt-1 block w-full text-sm" value={item.options?.join(", ") ?? ""}
                onChange={(event) => updateField(index, { options: event.target.value.split(",").map((option) => option.trim()).filter(Boolean) })} /></label>}
            <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary-app" checked={item.required}
                onChange={(event) => updateField(index, { required: event.target.checked })} />{t("recruitmentCampaigns.required")}</label>
              <AppButton variant="ghost" className="hover:text-danger-app" onClick={() => field("fields", form.fields.filter((_, itemIndex) => itemIndex !== index))}>{t("recruitmentCampaigns.remove")}</AppButton>
            </div>
          </div>)}</div>
        </section>

        <section className="mt-10 border-t border-border-app pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-heading text-lg font-bold">{t("recruitmentCampaigns.rubric")}</h3>
            <AppButton variant="secondary" onClick={addRubric}><AppIcon name="plus" className="size-4" />{t("recruitmentCampaigns.addCriterion")}</AppButton></div>
          {!form.rubric.length && <p className="mt-3 text-sm text-muted-app">{t("recruitmentCampaigns.noRubric")}</p>}
          <div className="mt-4 space-y-3">{form.rubric.map((item, index) => <div key={`${item.key}-${index}`} className="grid gap-3 rounded-2xl bg-surface-app p-4 sm:grid-cols-[0.7fr_1.5fr_0.5fr_auto] sm:items-end">
            <label className={sub}>{t("recruitmentCampaigns.criterionKey")}
              <AppInput className="mt-1 block w-full text-sm" value={item.key} onChange={(event) => updateRubric(index, { key: event.target.value })} /></label>
            <label className={sub}>{t("recruitmentCampaigns.criterionLabel")}
              <AppInput className="mt-1 block w-full text-sm" value={item.label} onChange={(event) => updateRubric(index, { label: event.target.value })} /></label>
            <label className={sub}>{t("recruitmentCampaigns.maxScore")}
              <AppInput className="mt-1 block w-full text-sm" type="number" min={1} max={100} value={item.maxScore}
                onChange={(event) => updateRubric(index, { maxScore: Number(event.target.value) })} /></label>
            <AppButton variant="ghost" className="hover:text-danger-app" onClick={() => field("rubric", form.rubric.filter((_, itemIndex) => itemIndex !== index))}>{t("recruitmentCampaigns.remove")}</AppButton>
          </div>)}</div>
        </section>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-border-app pt-6">
          <AppButton disabled={action.isPending} onClick={() => void saveDraft()}>
            {action.isPending ? t("recruitmentCampaigns.saving") : t("recruitmentCampaigns.saveDraft")}</AppButton>
          {current?.state === "Draft" && <AppButton variant="secondary" disabled={action.isPending}
            onClick={() => void publish(false)}>{action.isPending ? t("recruitmentCampaigns.publishing") : t("recruitmentCampaigns.publish")}</AppButton>}
        </div>
      </section>

      <section className="min-w-0 lg:sticky lg:top-6">
        <h2 className="font-heading text-lg font-bold">{t("recruitmentCampaigns.campaignList")}</h2>
        {!campaigns.data.length ? <AppNotice className="mt-4" title={t("recruitmentCampaigns.empty")}>
          <p className="text-muted-app">{t("recruitmentCampaigns.emptyHint")}</p>
        </AppNotice> : <ul className="mt-4 divide-y divide-border-app border-y border-border-app">{campaigns.data.map((campaign) => <li key={campaign.id}
          className={cn("px-1 py-4", { "bg-primary-soft-app": campaign.id === selectedId })}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            {campaign.state === "Draft" ? <button className="min-w-0 flex-1 rounded-lg text-left hover:text-primary-app focus-visible:outline-2 focus-visible:outline-ring-app" onClick={() => selectCampaign(campaign)}>
              <span className="block font-heading font-bold break-words">{campaign.title}</span>
              <span className="mt-1 block text-sm text-muted-app">{campaign.positions.join(" · ")}</span>
            </button> : <div className="min-w-0 flex-1">
              <span className="block font-heading font-bold break-words">{campaign.title}</span>
              <span className="mt-1 block text-sm text-muted-app">{campaign.positions.join(" · ")}</span>
            </div>}
            <AppBadge tone={stateTone[campaign.state]}>{stateLabel[campaign.state]}</AppBadge>
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <AppIcon name="calendar" className="size-4 text-muted-app" />
            <span className="sr-only">{t("recruitmentCampaigns.openWindow")}</span>
            <span className="font-semibold">{dateLabel(campaign.windowStart)} – {dateLabel(campaign.windowEnd)}</span>
            <span className="text-muted-app">· {campaign.capacity} {t("recruitmentCampaigns.places")}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {campaign.state === "Draft" && <AppButton variant="secondary" onClick={() => selectCampaign(campaign)}>{t("recruitmentCampaigns.edit")}</AppButton>}
            {!( ["Draft", "Cancelled"].includes(campaign.state)) && <Link className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary-app px-5 text-sm font-semibold text-on-primary-app shadow-sm transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app focus-visible:outline-none sm:min-h-10"
              to={`/club/${clubId}/recruitment/${campaign.id}/review`}>{t("recruitmentCampaigns.reviewApplications")}<AppIcon name="chevronRight" className="size-4" /></Link>}
            {!(["Cancelled", "Completed"].includes(campaign.state)) && <AppButton variant="ghost" className="hover:text-danger-app"
              disabled={action.isPending} onClick={() => void cancel(campaign)}>{t("recruitmentCampaigns.cancelCampaign")}</AppButton>}
          </div>
        </li>)}</ul>}
      </section>
    </div>
  </>;
}
