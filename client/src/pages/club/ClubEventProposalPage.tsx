import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppFieldError } from "@/components/ui/field/AppFieldError";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppMoneyInput } from "@/components/ui/money-input/AppMoneyInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { appToast } from "@/components/ui/toast/AppToast";
import { useAuth } from "@/hooks/useAuth";
import { useClubEvent, useClubEventMutation, useClubEventOptions } from "@/hooks/useClubEvents";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { ClubEventErrorMessage } from "@/pages/club/ClubEventErrorMessage";
import { iso, localTime, numberError, sectionLabel, stateTones, type DecisionComments } from "@/pages/club/clubEventFormat";
import type { ClubEvent, ClubEventDetail, ClubEventInput, ClubEventOptions } from "@/services/clubEvents";

const sectionCardClass = "space-y-4 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs sm:p-6";

function freshEvent(): ClubEventInput {
  const start = new Date(Date.now() + 10 * 86400000);
  start.setUTCMinutes(0, 0, 0);
  return {
    title: "",
    objective: "",
    plan: "",
    startAt: start.toISOString(),
    endAt: new Date(start.getTime() + 2 * 3600000).toISOString(),
    venueText: "",
    audienceScope: "PUBLIC",
    capacity: 40,
    riskCategory: "LOW",
    budgetLines: [],
    bookingIds: [],
    registrationForm: [],
    occurrences: [],
  };
}

function inputFromEvent(event: ClubEvent): ClubEventInput {
  return {
    title: event.title,
    objective: event.objective,
    plan: event.plan,
    startAt: event.startAt,
    endAt: event.endAt,
    venueText: event.venueText,
    propertyId: event.propertyId,
    audienceScope: event.audienceScope,
    capacity: event.capacity,
    riskCategory: event.riskCategory,
    riskNote: event.riskNote,
    facilityNeeds: event.facilityNeeds,
    occurrences: event.occurrences ?? [],
    budgetLines: event.budgetLines,
    bookingIds: event.bookingIds,
    registrationForm: event.registrationForm ?? [],
  };
}

function Field({
  label,
  required,
  error,
  flagged,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  flagged?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm">
      <span className="flex flex-wrap items-center gap-2 font-medium text-text-app">
        <span>
          {label}
          {required && <AppRequiredMark />}
        </span>
        {flagged && <AppBadge tone="warning">{flagged}</AppBadge>}
      </span>
      {children}
      <AppFieldError message={error} />
    </label>
  );
}

interface ProposalFormProps {
  clubId: string;
  csrfToken: string;
  permissions: string[];
  detail?: ClubEventDetail;
  options?: ClubEventOptions;
  optionsError?: unknown;
}

function ProposalForm({ clubId, csrfToken, permissions, detail, options, optionsError }: ProposalFormProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const mutation = useClubEventMutation(clubId);
  const existing = detail?.event;
  const [draft, setDraft] = useState<ClubEventInput>(() => (existing ? inputFromEvent(existing) : freshEvent()));
  const [editorOpenedAt] = useState(() => Date.now());
  const [createdDraft, setCreatedDraft] = useState<{ id: string; version: number } | null>(null);
  const [formError, setFormError] = useState<unknown>(null);

  const eventsListUrl = `/club/${encodeURIComponent(clubId)}/events`;
  const isNew = !existing && !createdDraft;
  const activeId = existing?.id ?? createdDraft?.id;
  const activeVersion = existing?.version ?? createdDraft?.version ?? 0;

  const revisionRequest = [...(detail?.decisions ?? [])].reverse().find((d) => d.outcome === "Request revision");
  const revisionSections =
    existing?.state === "Revision Requested"
      ? (revisionRequest?.comments as DecisionComments | undefined)?.sections ?? []
      : [];

  function flag(...parts: string[]) {
    return existing && parts.some((part) => revisionSections.includes(part)) ? t("common.revisionFlagged") : undefined;
  }

  const format = new Intl.DateTimeFormat(i18n.language === "vi" ? "vi-VN" : "en-GB", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  });

  const required = t("common.fieldRequired");
  const eventErrors: Record<string, string | null> = {
    title: draft.title.trim() ? null : required,
    objective: draft.objective.trim() ? null : required,
    plan: draft.plan.trim() ? null : required,
    startAt: new Date(draft.startAt).getTime() > editorOpenedAt ? null : t("common.dateNotPast"),
    endAt: Date.parse(draft.endAt) > Date.parse(draft.startAt) ? null : t("common.endAfterStart"),
    venue: draft.venueText?.trim() || draft.propertyId ? null : t("clubEvents.venueRequired"),
    capacity: numberError(t, draft.capacity, 1, 100000),
  };
  draft.budgetLines.forEach((line, index) => {
    eventErrors[`budget.${index}.category`] = line.category.trim() ? null : required;
    eventErrors[`budget.${index}.purpose`] = line.purpose.trim() ? null : required;
    eventErrors[`budget.${index}.amount`] = numberError(t, line.amount, 1, 1000000000000);
  });
  draft.registrationForm?.forEach((field, index) => {
    eventErrors[`form.${index}.label`] = field.label.trim() ? null : required;
    eventErrors[`form.${index}.options`] =
      ["select", "radio", "checkbox"].includes(field.type) && !field.options?.some((option) => option.trim())
        ? required
        : null;
  });
  draft.occurrences?.forEach((occurrence, index) => {
    eventErrors[`occurrence.${index}.endAt`] =
      Date.parse(occurrence.endAt) > Date.parse(occurrence.startAt) ? null : t("common.endAfterStart");
  });
  const eventField = useFieldValidation(eventErrors);

  const linkableBookings = (options?.bookings ?? []).filter(
    (b) => b.propertyId === draft.propertyId || b.propertyType === "EQUIPMENT",
  );
  const roomOptions = [{ value: "", label: t("clubEvents.none") }, ...(options?.properties ?? []).map((p) => ({ value: p.id, label: p.name }))];

  async function persist(shouldSubmit: boolean) {
    if (!eventField.touchAll()) return;
    setFormError(null);
    let savedEvent: ClubEvent;
    try {
      const result = activeId
        ? await mutation.mutateAsync({
            kind: "action",
            id: activeId,
            action: "save",
            body: { ...draft, expectedVersion: activeVersion },
            csrfToken,
          })
        : await mutation.mutateAsync({
            kind: "create",
            input: draft,
            csrfToken,
          });
      savedEvent = result.event;
      setCreatedDraft({ id: savedEvent.id, version: savedEvent.version });
    } catch (error) {
      setFormError(error);
      return;
    }

    if (!shouldSubmit) {
      appToast.success(t("clubEvents.success"));
      navigate(`${eventsListUrl}?selected=${encodeURIComponent(savedEvent.id)}`);
      return;
    }

    try {
      const submitted = await mutation.mutateAsync({
        kind: "action",
        id: savedEvent.id,
        action: "submit",
        body: { expectedVersion: savedEvent.version },
        csrfToken,
      });
      appToast.success(t("clubEvents.submittedSuccess"));
      navigate(`${eventsListUrl}?selected=${encodeURIComponent(submitted.event.id)}`);
    } catch (error) {
      setFormError(error);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void persist(false);
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={t(existing ? "clubEvents.edit" : "clubEvents.create")}
        description={t("clubEvents.notice")}
        back={{ to: eventsListUrl, label: t("clubEvents.back") }}
        actions={
          existing && (
            <AppBadge tone={stateTones[existing.state] ?? "neutral"}>
              {t(`clubEvents.${existing.state}`, { defaultValue: existing.state })}
            </AppBadge>
          )
        }
      />

      <form noValidate onSubmit={handleSubmit} className="space-y-6">
        {!isNew && revisionSections.length > 0 && (
          <div role="status" className="rounded-xl border-l-4 border-warning-app bg-warning-app/10 px-4 py-3 text-sm">
            <p className="font-semibold">
              {t("clubEvents.revisionSections")}: {revisionSections.map((s) => sectionLabel(t, s)).join(", ")}
            </p>
            {revisionRequest?.reason && <p className="mt-1 whitespace-pre-wrap break-words">{revisionRequest.reason}</p>}
          </div>
        )}

        {(Boolean(formError) || Boolean(optionsError)) && (
          <AppNotice tone="danger">
            <ClubEventErrorMessage error={formError ?? optionsError} />
          </AppNotice>
        )}

        <section className={sectionCardClass}>
          <h2 className="font-heading text-base font-semibold">{t("clubEvents.basicInfo")}</h2>
          <Field flagged={flag("content")} label={t("clubEvents.titleField")} required error={eventField.error("title")}>
            <AppInput
              {...eventField.control("title")}
              maxLength={200}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </Field>
          <Field flagged={flag("content")} label={t("clubEvents.objective")} required error={eventField.error("objective")}>
            <AppTextarea
              {...eventField.control("objective")}
              maxLength={5000}
              value={draft.objective}
              onChange={(e) => setDraft({ ...draft, objective: e.target.value })}
            />
          </Field>
          <Field flagged={flag("content")} label={t("clubEvents.plan")} required error={eventField.error("plan")}>
            <AppTextarea
              {...eventField.control("plan")}
              maxLength={20000}
              rows={5}
              value={draft.plan}
              onChange={(e) => setDraft({ ...draft, plan: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field flagged={flag("content")} label={t("clubEvents.scope")}>
              <AppSelect
                label={t("clubEvents.scope")}
                value={draft.audienceScope}
                options={(["PUBLIC", "MEMBERS_ONLY"] as const).map((v) => ({ value: v, label: t(`clubEvents.${v}`) }))}
                onChange={(value) => setDraft({ ...draft, audienceScope: value })}
              />
            </Field>
            <Field flagged={flag("content")} label={t("clubEvents.capacity")} required error={eventField.error("capacity")}>
              <AppInput
                {...eventField.control("capacity")}
                type="number"
                min={1}
                max={100000}
                value={draft.capacity}
                onChange={(e) => setDraft({ ...draft, capacity: Number(e.target.value) })}
              />
            </Field>
          </div>
        </section>

        <section className={sectionCardClass}>
          <h2 className="font-heading text-base font-semibold">{t("clubEvents.scheduleVenue")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field flagged={flag("schedule")} label={t("clubEvents.start")} required error={eventField.error("startAt")}>
              <AppInput
                {...eventField.control("startAt")}
                type="datetime-local"
                value={localTime(draft.startAt)}
                onChange={(e) => {
                  if (e.target.value) setDraft({ ...draft, startAt: iso(e.target.value) });
                }}
              />
            </Field>
            <Field flagged={flag("schedule")} label={t("clubEvents.end")} required error={eventField.error("endAt")}>
              <AppInput
                {...eventField.control("endAt")}
                type="datetime-local"
                value={localTime(draft.endAt)}
                onChange={(e) => {
                  if (e.target.value) setDraft({ ...draft, endAt: iso(e.target.value) });
                }}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field flagged={flag("venue")} label={t("clubEvents.property")}>
              <AppSelect
                label={t("clubEvents.property")}
                value={draft.propertyId ?? ""}
                options={roomOptions}
                onChange={(value) => setDraft({ ...draft, propertyId: value || undefined, bookingIds: [] })}
              />
            </Field>
            <Field flagged={flag("venue")} label={t("clubEvents.venue")} required={!draft.propertyId} error={eventField.error("venue")}>
              <AppInput
                {...eventField.control("venue", !draft.propertyId)}
                value={draft.venueText ?? ""}
                onChange={(e) => setDraft({ ...draft, venueText: e.target.value })}
              />
            </Field>
          </div>
          <Field flagged={flag("venue")} label={t("clubEvents.facilityNeeds")}>
            <AppTextarea value={draft.facilityNeeds ?? ""} onChange={(e) => setDraft({ ...draft, facilityNeeds: e.target.value })} />
          </Field>

          <div className="space-y-3 border-t border-border-app pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  <span>{t("clubEvents.occurrences")}</span>
                  {flag("schedule") && <AppBadge tone="warning">{flag("schedule")}</AppBadge>}
                </h3>
                <p className="mt-1 text-sm text-muted-app">{t("clubEvents.occurrencesHint")}</p>
              </div>
              <AppButton
                type="button"
                variant="secondary"
                onClick={() =>
                  setDraft({
                    ...draft,
                    occurrences: [...(draft.occurrences ?? []), { startAt: draft.startAt, endAt: draft.endAt }],
                  })
                }
              >
                <AppIcon name="plus" className="size-4" />
                {t("clubEvents.addOccurrence")}
              </AppButton>
            </div>
            {(draft.occurrences ?? []).map((o, index) => (
              <div key={index} className="space-y-3 rounded-xl border border-border-app bg-surface-app p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {(["startAt", "endAt"] as const).map((key) => (
                    <Field
                      key={key}
                      label={t(`clubEvents.${key === "startAt" ? "start" : "end"}`)}
                      required
                      error={eventField.error(`occurrence.${index}.${key}`)}
                    >
                      <AppInput
                        {...eventField.control(`occurrence.${index}.${key}`)}
                        type="datetime-local"
                        value={localTime(o[key])}
                        onChange={(e) => {
                          if (e.target.value) {
                            setDraft({
                              ...draft,
                              occurrences: draft.occurrences?.map((item, i) =>
                                i === index ? { ...item, [key]: iso(e.target.value) } : item,
                              ),
                            });
                          }
                        }}
                      />
                    </Field>
                  ))}
                </div>
                <AppButton
                  type="button"
                  variant="ghost"
                  onClick={() => setDraft({ ...draft, occurrences: draft.occurrences?.filter((_, i) => i !== index) })}
                >
                  {t("clubEvents.remove")}
                </AppButton>
              </div>
            ))}
          </div>
        </section>

        <section className={sectionCardClass}>
          <h2 className="font-heading text-base font-semibold">{t("clubEvents.riskSection")}</h2>
          <Field flagged={flag("risk")} label={t("clubEvents.risk")}>
            <AppSelect
              label={t("clubEvents.risk")}
              value={draft.riskCategory}
              options={(["LOW", "MEDIUM", "HIGH"] as const).map((v) => ({ value: v, label: t(`clubEvents.${v}`) }))}
              onChange={(value) => setDraft({ ...draft, riskCategory: value })}
            />
          </Field>
          <Field flagged={flag("risk")} label={t("clubEvents.riskNote")}>
            <AppTextarea value={draft.riskNote ?? ""} onChange={(e) => setDraft({ ...draft, riskNote: e.target.value })} />
          </Field>
        </section>

        <section className={sectionCardClass}>
          <div>
            <h2 className="flex flex-wrap items-center gap-2 font-heading text-base font-semibold">
              <span>{t("clubEvents.bookings")}</span>
              {flag("venue") && <AppBadge tone="warning">{flag("venue")}</AppBadge>}
            </h2>
            <p className="mt-1 text-sm text-muted-app">{t("clubEvents.bookingsHint")}</p>
            {!permissions.includes("club.booking.manage") && (
              <p className="mt-1 text-sm text-muted-app">{t("clubEvents.bookingPermissionHint")}</p>
            )}
          </div>
          <div className="space-y-2">
            {!linkableBookings.length && <p className="text-sm text-muted-app">{t("clubEvents.bookingsEmpty")}</p>}
            {linkableBookings.map((b) => (
              <label key={b.id} className="flex items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 accent-primary-app"
                  checked={draft.bookingIds.includes(b.id)}
                  disabled={!permissions.includes("club.booking.manage")}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      bookingIds: e.target.checked ? [...draft.bookingIds, b.id] : draft.bookingIds.filter((id) => id !== b.id),
                    })
                  }
                />
                <span>
                  {b.title} · {format.format(new Date(b.startAt))}
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className={sectionCardClass}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="flex flex-wrap items-center gap-2 font-heading text-base font-semibold">
                <span>{t("clubEvents.budget")}</span>
                {flag("budget") && <AppBadge tone="warning">{flag("budget")}</AppBadge>}
              </h2>
              <p className="mt-1 text-sm text-muted-app">{t("clubEvents.budgetHint")}</p>
            </div>
            <AppButton
              type="button"
              variant="secondary"
              onClick={() => setDraft({ ...draft, budgetLines: [...draft.budgetLines, { category: "", purpose: "", amount: 0 }] })}
            >
              <AppIcon name="plus" className="size-4" />
              {t("clubEvents.addLine")}
            </AppButton>
          </div>
          <div className="space-y-4">
            {draft.budgetLines.map((line, index) => (
              <div key={index} className="space-y-3 rounded-xl border border-border-app bg-surface-app p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {(["category", "purpose"] as const).map((key) => (
                    <Field
                      key={key}
                      label={t(`clubEvents.${key}`)}
                      required
                      error={eventField.error(`budget.${index}.${key}`)}
                    >
                      <AppInput
                        {...eventField.control(`budget.${index}.${key}`)}
                        value={line[key]}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            budgetLines: draft.budgetLines.map((l, i) => (i === index ? { ...l, [key]: e.target.value } : l)),
                          })
                        }
                      />
                    </Field>
                  ))}
                </div>
                <Field label={t("clubEvents.planItems")}>
                  <AppTextarea
                    value={line.plannedItems ?? ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        budgetLines: draft.budgetLines.map((l, i) => (i === index ? { ...l, plannedItems: e.target.value } : l)),
                      })
                    }
                  />
                </Field>
                <Field label={t("clubEvents.amount")} required error={eventField.error(`budget.${index}.amount`)}>
                  <AppMoneyInput
                    {...eventField.control(`budget.${index}.amount`)}
                    value={line.amount ? line.amount : ""}
                    onValueChange={(digits) =>
                      setDraft({
                        ...draft,
                        budgetLines: draft.budgetLines.map((l, i) => (i === index ? { ...l, amount: Number(digits) } : l)),
                      })
                    }
                  />
                </Field>
                <AppButton
                  type="button"
                  variant="ghost"
                  onClick={() => setDraft({ ...draft, budgetLines: draft.budgetLines.filter((_, i) => i !== index) })}
                >
                  {t("clubEvents.remove")}
                </AppButton>
              </div>
            ))}
          </div>
        </section>

        <section className={sectionCardClass}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-heading text-base font-semibold">{t("clubEvents.form")}</h2>
              <p className="mt-1 text-sm text-muted-app">{t("clubEvents.formHint")}</p>
            </div>
            <AppButton
              type="button"
              variant="secondary"
              onClick={() =>
                setDraft({
                  ...draft,
                  registrationForm: [
                    ...(draft.registrationForm ?? []),
                    { key: `field_${crypto.randomUUID().replaceAll("-", "")}`, label: "", type: "text", required: true },
                  ],
                })
              }
            >
              <AppIcon name="plus" className="size-4" />
              {t("clubEvents.addField")}
            </AppButton>
          </div>
          <div className="space-y-4">
            {draft.registrationForm?.map((field, index) => (
              <div key={field.key} className="space-y-3 rounded-xl border border-border-app bg-surface-app p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={t("clubEvents.question")}
                    required
                    error={eventField.error(`form.${index}.label`)}
                  >
                    <AppInput
                      {...eventField.control(`form.${index}.label`)}
                      value={field.label}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          registrationForm: draft.registrationForm?.map((f, i) =>
                            i === index ? { ...f, label: e.target.value } : f,
                          ),
                        })
                      }
                    />
                  </Field>
                  <Field label={t("clubEvents.type")}>
                    <AppSelect
                      label={t("clubEvents.type")}
                      value={field.type}
                      options={(["text", "textarea", "select", "radio", "checkbox"] as const).map((v) => ({
                        value: v,
                        label: t(`clubEvents.${v}`),
                      }))}
                      onChange={(value) =>
                        setDraft({
                          ...draft,
                          registrationForm: draft.registrationForm?.map((f, i) => (i === index ? { ...f, type: value } : f)),
                        })
                      }
                    />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="accent-primary-app"
                    checked={field.required}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        registrationForm: draft.registrationForm?.map((f, i) =>
                          i === index ? { ...f, required: e.target.checked } : f,
                        ),
                      })
                    }
                  />
                  {t("clubEvents.required")}
                </label>
                {["select", "radio", "checkbox"].includes(field.type) && (
                  <Field label={t("clubEvents.options")} required error={eventField.error(`form.${index}.options`)}>
                    <AppTextarea
                      {...eventField.control(`form.${index}.options`)}
                      value={field.options?.join("\n") ?? ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          registrationForm: draft.registrationForm?.map((f, i) =>
                            i === index ? { ...f, options: e.target.value.split("\n") } : f,
                          ),
                        })
                      }
                    />
                  </Field>
                )}
                <AppButton
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setDraft({ ...draft, registrationForm: draft.registrationForm?.filter((_, i) => i !== index) })
                  }
                >
                  {t("clubEvents.remove")}
                </AppButton>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={eventsListUrl}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border-app bg-bg-app px-3.5 font-heading text-sm font-medium text-text-app shadow-xs transition-colors hover:bg-surface-app focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app focus-visible:outline-none sm:min-h-9"
          >
            {t("clubEvents.cancelForm")}
          </Link>
          <AppButton type="submit" variant="secondary" disabled={mutation.isPending}>
            {t("clubEvents.save")}
          </AppButton>
          <AppButton type="button" disabled={mutation.isPending} onClick={() => void persist(true)}>
            <AppIcon name="send" className="size-4" />
            {t("clubEvents.saveAndSubmit")}
          </AppButton>
        </div>
      </form>
    </div>
  );
}

/** Dedicated page for creating or editing a club event proposal (UC25). */
export function ClubEventProposalPage() {
  const { clubId = "", eventId } = useParams();
  const { t } = useTranslation();
  const auth = useAuth();
  const permissions = auth.data?.workspaces.find((w) => w.kind === "club" && w.clubId === clubId)?.permissions ?? [];
  const allowed = permissions.includes("club.event.manage");
  const detail = useClubEvent(clubId, eventId ?? "", allowed && Boolean(eventId));
  const options = useClubEventOptions(clubId, allowed);
  const eventsListUrl = `/club/${encodeURIComponent(clubId)}/events`;

  if (auth.isPending || (eventId && allowed && detail.isPending)) {
    return (
      <div className="max-w-4xl space-y-4">
        <AppSkeleton className="h-12 w-2/3" />
        <AppSkeleton className="h-72 w-full" />
      </div>
    );
  }
  if (!allowed || !auth.data) {
    return <AppNotice tone="danger" role="alert">{t("clubEvents.noAccess")}</AppNotice>;
  }
  if (eventId && (detail.isError || !detail.data)) {
    return (
      <div className="max-w-4xl">
        <PageHeader title={t("clubEvents.edit")} back={{ to: eventsListUrl, label: t("clubEvents.back") }} />
        <AppNotice tone="danger">
          {detail.error ? <ClubEventErrorMessage error={detail.error} /> : <p>{t("clubEvents.notFound")}</p>}
        </AppNotice>
      </div>
    );
  }
  if (eventId && detail.data && !["Draft", "Revision Requested"].includes(detail.data.event.state)) {
    return (
      <div className="max-w-4xl">
        <PageHeader
          title={detail.data.event.title}
          back={{ to: eventsListUrl, label: t("clubEvents.back") }}
          actions={
            <AppBadge tone={stateTones[detail.data.event.state] ?? "neutral"}>
              {t(`clubEvents.${detail.data.event.state}`, { defaultValue: detail.data.event.state })}
            </AppBadge>
          }
        />
        <AppNotice tone="warning">{t("clubEvents.notEditable")}</AppNotice>
      </div>
    );
  }

  return (
    <ProposalForm
      key={eventId ?? "new"}
      clubId={clubId}
      csrfToken={auth.data.csrfToken}
      permissions={permissions}
      detail={eventId ? detail.data : undefined}
      options={options.data}
      optionsError={options.error}
    />
  );
}
