import { useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppCard } from "@/components/ui/card/AppCard";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useRecruitmentCampaignAction, useRecruitmentCampaigns } from "@/hooks/useRecruitmentCampaigns";
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

  if (auth.isPending) return <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
    <AppSkeleton className="h-[42rem] w-full" /><AppSkeleton className="h-80 w-full" />
  </div>;
  if (!auth.data) return <AppCard className="mx-auto max-w-2xl"><p>{t("recruitmentCampaigns.signIn")}</p></AppCard>;
  if (!canManage) return <AppCard className="mx-auto max-w-2xl"><p role="alert" className="text-danger-app">
    {t("recruitmentCampaigns.permissionDenied")}</p></AppCard>;
  if (campaigns.isPending) return <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
    <AppSkeleton className="h-[42rem] w-full" /><AppSkeleton className="h-80 w-full" />
  </div>;
  if (campaigns.isError || !campaigns.data) return <AppCard className="mx-auto max-w-2xl space-y-4">
    <p role="alert" className="text-danger-app">{campaigns.error?.message ?? t("recruitmentCampaigns.loadError")}</p>
    <AppButton variant="secondary" onClick={() => void campaigns.refetch()}>{t("recruitmentCampaigns.retry")}</AppButton>
  </AppCard>;

  const current = campaigns.data.find((item) => item.id === selectedId);
  const stateLabel: Record<RecruitmentCampaign["state"], string> = {
    Draft: t("recruitmentCampaigns.stateDraft"), Published: t("recruitmentCampaigns.statePublished"),
    "Accepting Applications": t("recruitmentCampaigns.stateAccepting"),
    Screening: t("recruitmentCampaigns.stateScreening"), Completed: t("recruitmentCampaigns.stateCompleted"),
    Cancelled: t("recruitmentCampaigns.stateCancelled"),
  };

  return <div className="mx-auto max-w-7xl">
    <Link to={`/club/${clubId ?? ""}`} className="text-sm font-semibold text-accent-app">{t("recruitmentCampaigns.back")}</Link>
    <header className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b border-border-app pb-6">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-app">{t("recruitmentCampaigns.eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-bold font-heading sm:text-4xl">{t("recruitmentCampaigns.title")}</h1>
        <p className="mt-3 text-muted-app">{t("recruitmentCampaigns.description")}</p>
      </div>
      <AppButton variant="secondary" onClick={beginNew}>{t("recruitmentCampaigns.create")}</AppButton>
    </header>

    {notice && <p role="status" className="mt-5 rounded-lg bg-success-app/10 p-4 text-success-app">{notice}</p>}
    {pageError && <p role="alert" className="mt-5 rounded-lg bg-danger-app/10 p-4 text-danger-app">{pageError}</p>}

    {overlaps.length > 0 && <section className="mt-6 rounded-xl border border-warning-app/40 bg-warning-app/10 p-5" aria-live="polite">
      <h2 className="font-bold font-heading">{t("recruitmentCampaigns.overlapTitle")}</h2>
      <p className="mt-2 text-sm text-muted-app">{t("recruitmentCampaigns.overlapDescription")}</p>
      <ul className="mt-3 space-y-2">{overlaps.map((overlap) => <li key={overlap.id} className="rounded-lg border border-border-app bg-surface-app p-3">
        <span className="text-xs font-semibold uppercase text-muted-app">{t("recruitmentCampaigns.overlapWith")}</span>
        <p className="mt-1 font-semibold">{overlap.title}</p>
        <p className="mt-1 text-sm text-muted-app">{overlap.positions.join(", ")} · {dateLabel(overlap.windowStart)} – {dateLabel(overlap.windowEnd)}</p>
      </li>)}</ul>
      <div className="mt-4 flex flex-wrap gap-3">
        <AppButton disabled={action.isPending || !selectedId} onClick={() => void publish(true)}>
          {action.isPending ? t("recruitmentCampaigns.publishing") : t("recruitmentCampaigns.confirmPublish")}
        </AppButton>
        <AppButton variant="secondary" onClick={() => setOverlaps([])}>{t("recruitmentCampaigns.dismiss")}</AppButton>
      </div>
    </section>}

    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.8fr)]">
      <AppCard className="p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-wide text-accent-app">{t("recruitmentCampaigns.formTitle")}</p>
            <h2 className="mt-1 text-xl font-bold font-heading">{current ? t("recruitmentCampaigns.edit") : t("recruitmentCampaigns.create")}</h2></div>
          {current && <span className="rounded-full border border-border-app px-3 py-1 text-sm">{stateLabel[current.state]}</span>}
        </div>
        <div className="mt-5 grid gap-4">
          <label className="text-sm font-semibold">{t("recruitmentCampaigns.campaignName")}
            <AppInput className="mt-2 w-full" value={form.title} maxLength={150}
              onChange={(event) => field("title", event.target.value)} /></label>
          <label className="text-sm font-semibold">{t("recruitmentCampaigns.positions")}
            <AppTextarea className="mt-2 min-h-24 w-full" value={form.positions}
              onChange={(event) => field("positions", event.target.value)} />
            <span className="mt-1 block text-xs font-normal text-muted-app">{t("recruitmentCampaigns.positionsHint")}</span></label>
          <label className="text-sm font-semibold">{t("recruitmentCampaigns.criteria")}
            <AppTextarea className="mt-2 min-h-24 w-full" value={form.criteria} maxLength={10_000}
              onChange={(event) => field("criteria", event.target.value)} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">{t("recruitmentCampaigns.start")}
              <AppInput className="mt-2 w-full" type="datetime-local" value={form.windowStart}
                onChange={(event) => field("windowStart", event.target.value)} /></label>
            <label className="text-sm font-semibold">{t("recruitmentCampaigns.end")}
              <AppInput className="mt-2 w-full" type="datetime-local" value={form.windowEnd}
                onChange={(event) => field("windowEnd", event.target.value)} /></label>
          </div>
          <label className="max-w-xs text-sm font-semibold">{t("recruitmentCampaigns.capacity")}
            <AppInput className="mt-2 w-full" type="number" min={1} max={10000} value={form.capacity}
              onChange={(event) => field("capacity", event.target.value)} /></label>
          <label className="text-sm font-semibold">{t("recruitmentCampaigns.rounds")}
            <AppTextarea className="mt-2 min-h-24 w-full" value={form.steps}
              onChange={(event) => field("steps", event.target.value)} />
            <span className="mt-1 block text-xs font-normal text-muted-app">{t("recruitmentCampaigns.roundsHint")}</span></label>
        </div>

        <section className="mt-8 border-t border-border-app pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold font-heading">{t("recruitmentCampaigns.applicationForm")}</h3>
            <AppButton variant="secondary" onClick={addField}>{t("recruitmentCampaigns.addField")}</AppButton></div>
          {!form.fields.length && <p className="mt-3 text-sm text-muted-app">{t("recruitmentCampaigns.optional")}</p>}
          <div className="mt-4 space-y-4">{form.fields.map((item, index) => <div key={`${item.key}-${index}`} className="grid gap-3 rounded-xl border border-border-app p-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-muted-app">{t("recruitmentCampaigns.fieldKey")}
              <AppInput className="mt-1 w-full text-sm" value={item.key} onChange={(event) => updateField(index, { key: event.target.value })} /></label>
            <label className="text-xs font-semibold text-muted-app">{t("recruitmentCampaigns.fieldLabel")}
              <AppInput className="mt-1 w-full text-sm" value={item.label} onChange={(event) => updateField(index, { label: event.target.value })} /></label>
            <label className="text-xs font-semibold text-muted-app">{t("recruitmentCampaigns.fieldType")}
              <select className="mt-1 min-h-11 w-full rounded-lg border border-border-app bg-surface-app px-3 text-sm" value={item.type}
                onChange={(event) => updateField(index, { type: event.target.value as RecruitmentFormField["type"], options: undefined })}>
                {(["text", "textarea", "url", "select", "multiselect", "file"] as const).map((type) => <option key={type} value={type}>{t(`recruitmentCampaigns.${type}`)}</option>)}
              </select></label>
            {(["select", "multiselect"] as string[]).includes(item.type) && <label className="text-xs font-semibold text-muted-app">{t("recruitmentCampaigns.options")}
              <AppInput className="mt-1 w-full text-sm" value={item.options?.join(", ") ?? ""}
                onChange={(event) => updateField(index, { options: event.target.value.split(",").map((option) => option.trim()).filter(Boolean) })} /></label>}
            <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.required}
                onChange={(event) => updateField(index, { required: event.target.checked })} />{t("recruitmentCampaigns.required")}</label>
              <AppButton variant="secondary" onClick={() => field("fields", form.fields.filter((_, itemIndex) => itemIndex !== index))}>{t("recruitmentCampaigns.remove")}</AppButton>
            </div>
          </div>)}</div>
        </section>

        <section className="mt-8 border-t border-border-app pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold font-heading">{t("recruitmentCampaigns.rubric")}</h3>
            <AppButton variant="secondary" onClick={addRubric}>{t("recruitmentCampaigns.addCriterion")}</AppButton></div>
          {!form.rubric.length && <p className="mt-3 text-sm text-muted-app">{t("recruitmentCampaigns.noRubric")}</p>}
          <div className="mt-4 space-y-3">{form.rubric.map((item, index) => <div key={`${item.key}-${index}`} className="grid gap-3 rounded-xl border border-border-app p-4 sm:grid-cols-[0.7fr_1.5fr_0.5fr_auto] sm:items-end">
            <label className="text-xs font-semibold text-muted-app">{t("recruitmentCampaigns.criterionKey")}
              <AppInput className="mt-1 w-full text-sm" value={item.key} onChange={(event) => updateRubric(index, { key: event.target.value })} /></label>
            <label className="text-xs font-semibold text-muted-app">{t("recruitmentCampaigns.criterionLabel")}
              <AppInput className="mt-1 w-full text-sm" value={item.label} onChange={(event) => updateRubric(index, { label: event.target.value })} /></label>
            <label className="text-xs font-semibold text-muted-app">{t("recruitmentCampaigns.maxScore")}
              <AppInput className="mt-1 w-full text-sm" type="number" min={1} max={100} value={item.maxScore}
                onChange={(event) => updateRubric(index, { maxScore: Number(event.target.value) })} /></label>
            <AppButton variant="secondary" onClick={() => field("rubric", form.rubric.filter((_, itemIndex) => itemIndex !== index))}>{t("recruitmentCampaigns.remove")}</AppButton>
          </div>)}</div>
        </section>

        <div className="mt-8 flex flex-wrap gap-3 border-t border-border-app pt-6">
          <AppButton disabled={action.isPending} onClick={() => void saveDraft()}>
            {action.isPending ? t("recruitmentCampaigns.saving") : t("recruitmentCampaigns.saveDraft")}</AppButton>
          {current?.state === "Draft" && <AppButton variant="secondary" disabled={action.isPending}
            onClick={() => void publish(false)}>{action.isPending ? t("recruitmentCampaigns.publishing") : t("recruitmentCampaigns.publish")}</AppButton>}
        </div>
      </AppCard>

      <section className="space-y-4">
        <h2 className="px-1 text-lg font-bold font-heading">{t("recruitmentCampaigns.campaignList")}</h2>
        {!campaigns.data.length ? <AppCard className="p-6">
          <p className="font-semibold">{t("recruitmentCampaigns.empty")}</p>
          <p className="mt-2 text-sm text-muted-app">{t("recruitmentCampaigns.emptyHint")}</p>
        </AppCard> : campaigns.data.map((campaign) => <AppCard key={campaign.id}
          className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            {campaign.state === "Draft" ? <button className="min-w-0 text-left" onClick={() => selectCampaign(campaign)}>
              <span className="block break-words font-bold font-heading">{campaign.title}</span>
              <span className="mt-1 block text-sm text-muted-app">{campaign.positions.join(" · ")}</span>
            </button> : <div className="min-w-0">
              <span className="block break-words font-bold font-heading">{campaign.title}</span>
              <span className="mt-1 block text-sm text-muted-app">{campaign.positions.join(" · ")}</span>
            </div>}
            <span className="shrink-0 rounded-full border border-border-app px-3 py-1 text-xs font-semibold">{stateLabel[campaign.state]}</span>
          </div>
          <p className="mt-4 text-sm text-muted-app">{t("recruitmentCampaigns.openWindow")}</p>
          <p className="mt-1 text-sm font-semibold">{dateLabel(campaign.windowStart)} – {dateLabel(campaign.windowEnd)}</p>
          <p className="mt-2 text-sm text-muted-app">{campaign.capacity} {t("recruitmentCampaigns.places")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {campaign.state === "Draft" && <AppButton variant="secondary" onClick={() => selectCampaign(campaign)}>{t("recruitmentCampaigns.edit")}</AppButton>}
            {!( ["Draft", "Cancelled"].includes(campaign.state)) && <Link className="inline-flex min-h-10 items-center rounded-lg border border-border-app px-4 text-sm font-semibold hover:bg-surface-app"
              to={`/club/${clubId}/recruitment/${campaign.id}/review`}>{t("recruitmentCampaigns.reviewApplications")}</Link>}
            {!(["Cancelled", "Completed"].includes(campaign.state)) && <AppButton variant="secondary"
              disabled={action.isPending} onClick={() => void cancel(campaign)}>{t("recruitmentCampaigns.cancelCampaign")}</AppButton>}
          </div>
        </AppCard>)}
      </section>
    </div>
  </div>;
}
