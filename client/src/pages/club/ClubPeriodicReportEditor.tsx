import { useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppFieldError } from "@/components/ui/field/AppFieldError";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { useChangePeriodicReport } from "@/hooks/useClubPeriodicReports";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import type {
  PeriodicAchievementEntry,
  PeriodicCustomAnswer,
  PeriodicEventEntry,
  PeriodicMemberEntry,
  PeriodicReportDetail,
  ReturnSection,
} from "@/services/periodicReports";
import { formatMoney } from "@/utils/formatMoney";

interface Props {
  clubId: string;
  csrfToken: string;
  report: PeriodicReportDetail;
}

function readImageDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function sectionNameKey(section: ReturnSection) {
  switch (section) {
    case "members": return "periodicReports.sectionMembers" as const;
    case "events": return "periodicReports.sectionEvents" as const;
    case "achievements": return "periodicReports.sectionAchievements" as const;
    case "customFields": return "periodicReports.sectionCustomFields" as const;
    case "narrative": return "periodicReports.sectionNarrative" as const;
    case "nextPlan": return "periodicReports.sectionNextPlan" as const;
    case "figures": return "periodicReports.sectionFigures" as const;
    case "evidence": return "periodicReports.sectionEvidence" as const;
    default: return "periodicReports.sectionOther" as const;
  }
}

export function ClubPeriodicReportEditor({ clubId, csrfToken, report }: Props) {
  const { t, i18n } = useTranslation();
  const action = useChangePeriodicReport(clubId);

  const initialMembers = report.members ?? report.systemData?.members ?? [];
  const initialEvents = report.events ?? report.systemData?.events ?? [];
  const initialAchievements = report.achievements ?? [];
  const initialAnswers = report.customAnswers ?? [];

  const [members, setMembers] = useState<PeriodicMemberEntry[]>(initialMembers);
  const [events, setEvents] = useState<PeriodicEventEntry[]>(initialEvents);
  const [achievements, setAchievements] = useState<PeriodicAchievementEntry[]>(initialAchievements);
  const [customAnswers, setCustomAnswers] = useState<PeriodicCustomAnswer[]>(initialAnswers);

  const customFields = report.campaign?.customFields ?? [];
  const editable = ["Draft", "Returned for correction"].includes(report.state);
  const now = new Date();
  const effectiveDueAt = report.state === "Returned for correction" && report.resubmitDueAt
    ? new Date(report.resubmitDueAt)
    : report.state === "Draft"
      ? new Date(report.campaign?.dueAt ?? report.dueAt)
      : null;
  const deadlinePassed = effectiveDueAt ? now > effectiveDueAt : false;
  const campaignClosed = report.campaign ? !report.campaign.isOpen && report.state === "Draft" : false;
  const canSubmit = editable && !deadlinePassed && !campaignClosed;

  const figures = editable || !report.preloadedFigures.capturedAt ? report.live : report.preloadedFigures;

  const dirty =
    JSON.stringify(members) !== JSON.stringify(initialMembers) ||
    JSON.stringify(events) !== JSON.stringify(initialEvents) ||
    JSON.stringify(achievements) !== JSON.stringify(initialAchievements) ||
    JSON.stringify(customAnswers) !== JSON.stringify(initialAnswers);

  const membersValid = members.length > 0 && members.every((m) =>
    Boolean(m.fullName.trim()) &&
    Boolean(m.studentCode.trim()) &&
    Boolean(m.email.trim()) &&
    Number.isFinite(m.activityScore) &&
    m.activityScore >= 0 &&
    m.activityScore <= 10,
  );
  const eventsValid = events.every((ev) =>
    Boolean(ev.title.trim()) &&
    Boolean(ev.description.trim()) &&
    Boolean(ev.heldAt.trim()) &&
    Number.isInteger(ev.participantCount) &&
    ev.participantCount >= 0 &&
    Boolean(ev.evidenceUrl?.trim()),
  );
  const achievementsValid = achievements.every((ach) =>
    Boolean(ach.title.trim()) &&
    Boolean(ach.description.trim()) &&
    Boolean(ach.evidenceUrl?.trim()),
  );
  const customValid = customFields.every((cf) => {
    if (!cf.required) return true;
    const ans = customAnswers.find((a) => a.fieldId === cf.id);
    if (cf.type === "text") return Boolean(ans?.textValue?.trim());
    if (cf.type === "number") return ans?.numberValue !== undefined && Number.isFinite(ans.numberValue);
    return Boolean(ans?.evidenceUrl?.trim());
  });

  const field = useFieldValidation({
    members: membersValid ? null : t("clubPeriodicReports.validationMembersRequired"),
    events: eventsValid ? null : t("clubPeriodicReports.validationEventsInvalid"),
    achievements: achievementsValid ? null : t("clubPeriodicReports.validationAchievementsInvalid"),
    customAnswers: customValid ? null : t("clubPeriodicReports.validationCustomRequired"),
  });

  function updateMember(index: number, patch: Partial<PeriodicMemberEntry>) {
    setMembers((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  }

  function updateEvent(index: number, patch: Partial<PeriodicEventEntry>) {
    setEvents((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  }

  function updateAchievement(index: number, patch: Partial<PeriodicAchievementEntry>) {
    setAchievements((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  }

  function updateCustomAnswer(fieldId: string, label: string, type: "text" | "number" | "evidence", patch: Partial<PeriodicCustomAnswer>) {
    setCustomAnswers((prev) => {
      const existing = prev.find((a) => a.fieldId === fieldId);
      if (existing) {
        return prev.map((a) => (a.fieldId === fieldId ? { ...a, label, type, ...patch } : a));
      }
      return [...prev, { fieldId, label, type, ...patch }];
    });
  }

  async function handleEventImageUpload(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await readImageDataUrl(file);
    updateEvent(index, { evidenceUrl: dataUrl });
  }

  async function handleAchievementImageUpload(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await readImageDataUrl(file);
    updateAchievement(index, { evidenceUrl: dataUrl });
  }

  async function handleCustomImageUpload(fieldId: string, label: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await readImageDataUrl(file);
    updateCustomAnswer(fieldId, label, "evidence", { evidenceUrl: dataUrl });
  }

  async function change(kind: "save" | "submit") {
    if (kind === "submit" && !field.touchAll()) return;
    try {
      await action.mutateAsync({
        csrfToken,
        action: kind === "submit"
          ? { kind, id: report.id, revision: report.revision ?? 0 }
          : {
              kind,
              id: report.id,
              revision: report.revision ?? 0,
              input: {
                members,
                events,
                achievements,
                customAnswers,
              },
            },
      });
    } catch { /* The mutation error is displayed below. */ }
  }

  const status = report.state as "Draft" | "Submitted" | "Accepted" | "Returned for correction";
  const inputBase = "block min-h-10 w-full rounded-xl border border-border-app bg-bg-app px-3 py-2 text-sm text-text-app disabled:cursor-not-allowed disabled:opacity-70";

  return (
    <section className="space-y-6 rounded-2xl border border-border-app bg-surface-app p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{report.periodCode}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <AppBadge tone={status === "Accepted" ? "success" : status === "Submitted" ? "info" : status === "Returned for correction" ? "warning" : "neutral"}>
            {t(`clubPeriodicReports.${status}`)}
          </AppBadge>
          <span className="text-sm text-muted-app">{t("clubPeriodicReports.version")} {report.versionNo}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-muted-app">
        <span>{t("clubPeriodicReports.deadline")}: {new Date(report.campaign?.dueAt ?? report.dueAt).toLocaleString(i18n.language)}</span>
        {report.resubmitDueAt && (
          <span className="font-semibold text-warning-app">
            {t("clubPeriodicReports.resubmitDeadline")}: {new Date(report.resubmitDueAt).toLocaleString(i18n.language)}
          </span>
        )}
        {report.lateFlag && <AppBadge tone="warning">{t("clubPeriodicReports.late")}</AppBadge>}
      </div>

      {report.campaign?.announcement && (
        <AppNotice title={t("clubPeriodicReports.announcementTitle")}>
          <p className="whitespace-pre-wrap break-words">{report.campaign.announcement}</p>
        </AppNotice>
      )}

      {editable && (deadlinePassed || campaignClosed) && (
        <AppNotice tone="danger" role="alert">
          {t("clubPeriodicReports.deadlinePassedBlocked")}
        </AppNotice>
      )}

      {report.decision && (
        <AppNotice tone={report.decision.outcome === "Return" ? "warning" : "info"}>
          <p className="whitespace-pre-wrap break-words">{report.decision.reason ?? report.decision.observation}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {report.decision.sections.map((s) => (
              <AppBadge key={s} tone="warning">{t(sectionNameKey(s))}</AppBadge>
            ))}
          </div>
        </AppNotice>
      )}

      {/* 1. Active Members */}
      <div className="space-y-3 border-t border-border-app pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold">{t("clubPeriodicReports.membersTitle")}<AppRequiredMark /></h3>
            <p className="text-xs text-muted-app">{t("clubPeriodicReports.membersHint")}</p>
          </div>
          {editable && (
            <div className="flex flex-wrap gap-2">
              {report.systemData?.members && (
                <AppButton variant="secondary" disabled={action.isPending} onClick={() => setMembers(report.systemData!.members)}>
                  {t("clubPeriodicReports.resetMembers")}
                </AppButton>
              )}
              <AppButton
                variant="secondary"
                disabled={action.isPending}
                onClick={() => setMembers((prev) => [...prev, { fullName: "", studentCode: "", email: "", activityScore: 8, source: "MANUAL" }])}
              >
                {t("clubPeriodicReports.addMember")}
              </AppButton>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {members.map((member, idx) => (
            <div key={idx} className="grid gap-3 rounded-xl border border-border-app bg-bg-app p-3 sm:grid-cols-2 lg:grid-cols-[1fr_9rem_1fr_8rem_auto]">
              <label className="block text-xs font-semibold">
                {t("clubPeriodicReports.memberName")}
                <input
                  className={inputBase}
                  value={member.fullName}
                  disabled={!editable || action.isPending}
                  onChange={(e) => updateMember(idx, { fullName: e.target.value })}
                />
              </label>
              <label className="block text-xs font-semibold">
                {t("clubPeriodicReports.memberCode")}
                <input
                  className={inputBase}
                  value={member.studentCode}
                  disabled={!editable || action.isPending}
                  onChange={(e) => updateMember(idx, { studentCode: e.target.value })}
                />
              </label>
              <label className="block text-xs font-semibold">
                {t("clubPeriodicReports.memberEmail")}
                <input
                  type="email"
                  className={inputBase}
                  value={member.email}
                  disabled={!editable || action.isPending}
                  onChange={(e) => updateMember(idx, { email: e.target.value })}
                />
              </label>
              <label className="block text-xs font-semibold">
                {t("clubPeriodicReports.memberScore")}
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  className={inputBase}
                  value={member.activityScore}
                  disabled={!editable || action.isPending}
                  onChange={(e) => updateMember(idx, { activityScore: Number(e.target.value) })}
                />
              </label>
              {editable && (
                <div className="flex items-end">
                  <AppButton
                    variant="secondary"
                    disabled={action.isPending}
                    onClick={() => setMembers((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    {t("clubPeriodicReports.remove")}
                  </AppButton>
                </div>
              )}
            </div>
          ))}
        </div>
        <AppFieldError message={field.error("members")} />
      </div>

      {/* 2. Organized Events */}
      <div className="space-y-3 border-t border-border-app pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold">{t("clubPeriodicReports.eventsTitle")}</h3>
            <p className="text-xs text-muted-app">{t("clubPeriodicReports.eventsHint")}</p>
          </div>
          {editable && (
            <div className="flex flex-wrap gap-2">
              {report.systemData?.events && (
                <AppButton variant="secondary" disabled={action.isPending} onClick={() => setEvents(report.systemData!.events)}>
                  {t("clubPeriodicReports.resetEvents")}
                </AppButton>
              )}
              <AppButton
                variant="secondary"
                disabled={action.isPending}
                onClick={() => setEvents((prev) => [...prev, { title: "", description: "", heldAt: new Date().toISOString().slice(0, 10), participantCount: 0, evidenceUrl: "", source: "MANUAL" }])}
              >
                {t("clubPeriodicReports.addEvent")}
              </AppButton>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {events.map((ev, idx) => (
            <div key={idx} className="space-y-3 rounded-xl border border-border-app bg-bg-app p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-xs font-semibold sm:col-span-1">
                  {t("clubPeriodicReports.eventTitle")}<AppRequiredMark />
                  <input
                    className={inputBase}
                    value={ev.title}
                    disabled={!editable || action.isPending}
                    onChange={(e) => updateEvent(idx, { title: e.target.value })}
                  />
                </label>
                <label className="block text-xs font-semibold">
                  {t("clubPeriodicReports.eventHeldAt")}<AppRequiredMark />
                  <input
                    type="date"
                    className={inputBase}
                    value={ev.heldAt.slice(0, 10)}
                    disabled={!editable || action.isPending}
                    onChange={(e) => updateEvent(idx, { heldAt: e.target.value })}
                  />
                </label>
                <label className="block text-xs font-semibold">
                  {t("clubPeriodicReports.eventParticipants")}<AppRequiredMark />
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={inputBase}
                    value={ev.participantCount}
                    disabled={!editable || action.isPending}
                    onChange={(e) => updateEvent(idx, { participantCount: Number(e.target.value) })}
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold">
                {t("clubPeriodicReports.eventDescription")}<AppRequiredMark />
                <textarea
                  className="mt-1 block min-h-20 w-full rounded-xl border border-border-app bg-surface-app p-3 text-sm text-text-app disabled:cursor-not-allowed disabled:opacity-70"
                  value={ev.description}
                  disabled={!editable || action.isPending}
                  onChange={(e) => updateEvent(idx, { description: e.target.value })}
                />
              </label>
              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-64 flex-1 text-xs font-semibold">
                  {t("clubPeriodicReports.eventEvidenceUrl")}<AppRequiredMark />
                  <input
                    placeholder="https://..."
                    className={inputBase}
                    value={ev.evidenceUrl?.startsWith("data:image/") ? "" : (ev.evidenceUrl ?? "")}
                    disabled={!editable || action.isPending}
                    onChange={(e) => updateEvent(idx, { evidenceUrl: e.target.value })}
                  />
                </label>
                {editable && (
                  <label className="inline-flex min-h-10 items-center rounded-xl border border-border-app bg-surface-app px-3 py-2 text-xs font-semibold">
                    {t("clubPeriodicReports.uploadImage")}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={action.isPending}
                      onChange={(e) => void handleEventImageUpload(idx, e)}
                    />
                  </label>
                )}
                {editable && (
                  <AppButton
                    variant="secondary"
                    disabled={action.isPending}
                    onClick={() => setEvents((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    {t("clubPeriodicReports.remove")}
                  </AppButton>
                )}
              </div>
              {ev.evidenceUrl && (
                <div className="pt-1">
                  {ev.evidenceUrl.startsWith("data:image/") ? (
                    <img src={ev.evidenceUrl} alt={ev.title} className="max-h-36 rounded-lg border border-border-app object-contain" />
                  ) : (
                    <a href={ev.evidenceUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-accent-app break-all">
                      {ev.evidenceUrl}
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <AppFieldError message={field.error("events")} />
      </div>

      {/* 3. Achievements */}
      <div className="space-y-3 border-t border-border-app pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold">{t("clubPeriodicReports.achievementsTitle")}</h3>
            <p className="text-xs text-muted-app">{t("clubPeriodicReports.achievementsHint")}</p>
          </div>
          {editable && (
            <AppButton
              variant="secondary"
              disabled={action.isPending}
              onClick={() => setAchievements((prev) => [...prev, { title: "", description: "", evidenceUrl: "" }])}
            >
              {t("clubPeriodicReports.addAchievement")}
            </AppButton>
          )}
        </div>

        <div className="space-y-4">
          {achievements.map((ach, idx) => (
            <div key={idx} className="space-y-3 rounded-xl border border-border-app bg-bg-app p-4">
              <label className="block text-xs font-semibold">
                {t("clubPeriodicReports.achievementTitle")}<AppRequiredMark />
                <input
                  className={inputBase}
                  value={ach.title}
                  disabled={!editable || action.isPending}
                  onChange={(e) => updateAchievement(idx, { title: e.target.value })}
                />
              </label>
              <label className="block text-xs font-semibold">
                {t("clubPeriodicReports.achievementDescription")}<AppRequiredMark />
                <textarea
                  className="mt-1 block min-h-20 w-full rounded-xl border border-border-app bg-surface-app p-3 text-sm text-text-app disabled:cursor-not-allowed disabled:opacity-70"
                  value={ach.description}
                  disabled={!editable || action.isPending}
                  onChange={(e) => updateAchievement(idx, { description: e.target.value })}
                />
              </label>
              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-64 flex-1 text-xs font-semibold">
                  {t("clubPeriodicReports.achievementEvidenceUrl")}<AppRequiredMark />
                  <input
                    placeholder="https://..."
                    className={inputBase}
                    value={ach.evidenceUrl?.startsWith("data:image/") ? "" : (ach.evidenceUrl ?? "")}
                    disabled={!editable || action.isPending}
                    onChange={(e) => updateAchievement(idx, { evidenceUrl: e.target.value })}
                  />
                </label>
                {editable && (
                  <label className="inline-flex min-h-10 items-center rounded-xl border border-border-app bg-surface-app px-3 py-2 text-xs font-semibold">
                    {t("clubPeriodicReports.uploadImage")}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={action.isPending}
                      onChange={(e) => void handleAchievementImageUpload(idx, e)}
                    />
                  </label>
                )}
                {editable && (
                  <AppButton
                    variant="secondary"
                    disabled={action.isPending}
                    onClick={() => setAchievements((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    {t("clubPeriodicReports.remove")}
                  </AppButton>
                )}
              </div>
              {ach.evidenceUrl && (
                <div className="pt-1">
                  {ach.evidenceUrl.startsWith("data:image/") ? (
                    <img src={ach.evidenceUrl} alt={ach.title} className="max-h-36 rounded-lg border border-border-app object-contain" />
                  ) : (
                    <a href={ach.evidenceUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-accent-app break-all">
                      {ach.evidenceUrl}
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <AppFieldError message={field.error("achievements")} />
      </div>

      {/* 4. Additional ICPDP Custom Fields */}
      {customFields.length > 0 && (
        <div className="space-y-4 border-t border-border-app pt-5">
          <h3 className="text-base font-bold">{t("clubPeriodicReports.customFieldsTitle")}</h3>
          {customFields.map((cf) => {
            const answer = customAnswers.find((a) => a.fieldId === cf.id);
            return (
              <div key={cf.id} className="space-y-1.5 rounded-xl border border-border-app bg-bg-app p-4">
                <label className="block text-sm font-semibold">
                  {cf.label}
                  {cf.required && <AppRequiredMark />}
                </label>
                {cf.description && <p className="text-xs text-muted-app">{cf.description}</p>}
                {cf.type === "text" && (
                  <textarea
                    className="mt-1 block min-h-20 w-full rounded-xl border border-border-app bg-surface-app p-3 text-sm text-text-app disabled:cursor-not-allowed disabled:opacity-70"
                    value={answer?.textValue ?? ""}
                    disabled={!editable || action.isPending}
                    onChange={(e) => updateCustomAnswer(cf.id, cf.label, "text", { textValue: e.target.value })}
                  />
                )}
                {cf.type === "number" && (
                  <input
                    type="number"
                    className={inputBase}
                    value={answer?.numberValue ?? ""}
                    disabled={!editable || action.isPending}
                    onChange={(e) => updateCustomAnswer(cf.id, cf.label, "number", {
                      numberValue: e.target.value === "" ? undefined : Number(e.target.value),
                    })}
                  />
                )}
                {cf.type === "evidence" && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        placeholder="https://..."
                        className="min-h-10 min-w-64 flex-1 rounded-xl border border-border-app bg-surface-app px-3 py-2 text-sm text-text-app"
                        value={answer?.evidenceUrl?.startsWith("data:image/") ? "" : (answer?.evidenceUrl ?? "")}
                        disabled={!editable || action.isPending}
                        onChange={(e) => updateCustomAnswer(cf.id, cf.label, "evidence", { evidenceUrl: e.target.value })}
                      />
                      {editable && (
                        <label className="inline-flex min-h-10 items-center rounded-xl border border-border-app bg-surface-app px-3 py-2 text-xs font-semibold">
                          {t("clubPeriodicReports.uploadImage")}
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            disabled={action.isPending}
                            onChange={(e) => void handleCustomImageUpload(cf.id, cf.label, e)}
                          />
                        </label>
                      )}
                    </div>
                    {answer?.evidenceUrl && (
                      answer.evidenceUrl.startsWith("data:image/") ? (
                        <img src={answer.evidenceUrl} alt={cf.label} className="max-h-36 rounded-lg border border-border-app object-contain" />
                      ) : (
                        <a href={answer.evidenceUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-accent-app break-all">
                          {answer.evidenceUrl}
                        </a>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <AppFieldError message={field.error("customAnswers")} />
        </div>
      )}

      {editable && (
        <div className="flex flex-wrap gap-3 border-t border-border-app pt-4">
          <AppButton disabled={action.isPending || !dirty} onClick={() => void change("save")}>
            {t("clubPeriodicReports.save")}
          </AppButton>
          <AppButton variant="secondary" disabled={action.isPending || dirty || !canSubmit} onClick={() => void change("submit")}>
            {t("clubPeriodicReports.submit")}
          </AppButton>
        </div>
      )}
      {action.isError && <AppNotice tone="danger" role="alert">{action.error.message}</AppNotice>}

      <details className="border-t border-border-app pt-4">
        <summary className="font-semibold">{t("clubPeriodicReports.figures")}</summary>
        <p className="mt-3 text-sm text-muted-app">
          {editable || !figures.capturedAt
            ? t("clubPeriodicReports.figuresLive")
            : t("clubPeriodicReports.figuresFrozen", { date: new Date(figures.capturedAt).toLocaleString(i18n.language) })}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt>{t("periodicReports.eventsHeld")}</dt><dd>{figures.events?.completed ?? 0}</dd>
          <dt>{t("periodicReports.eventsCancelled")}</dt><dd>{figures.events?.cancelled ?? 0}</dd>
          <dt>{t("periodicReports.activeMembers")}</dt><dd>{figures.members?.active ?? 0}</dd>
          <dt>{t("periodicReports.attendance")}</dt><dd>{figures.attendance?.total ?? 0}</dd>
          <dt>{t("periodicReports.budgets")}</dt><dd>{figures.finance?.budgets ?? 0}</dd>
          <dt>{t("periodicReports.approvedTotal")}</dt><dd>{formatMoney(figures.finance?.approvedTotal ?? 0, i18n.language)}</dd>
          <dt>{t("periodicReports.disbursedTotal")}</dt><dd>{formatMoney(figures.finance?.disbursedTotal ?? 0, i18n.language)}</dd>
        </dl>
      </details>

      <details className="border-t border-border-app pt-4">
        <summary className="font-semibold">{t("clubPeriodicReports.history")}</summary>
        <div className="space-y-4 pt-3">
          {report.versions?.map((v) => (
            <article key={v.versionNo} className="space-y-2 border-t border-border-app pt-3 text-sm">
              <h3 className="font-semibold">
                {t("clubPeriodicReports.version")} {v.versionNo} · {new Date(v.submittedAt).toLocaleString(i18n.language)}
              </h3>
              <p className="text-muted-app">
                {t("periodicReports.sectionMembers")}: {v.members?.length ?? 0} · {t("periodicReports.sectionEvents")}: {v.events?.length ?? 0} · {t("periodicReports.sectionAchievements")}: {v.achievements?.length ?? 0}
              </p>
              {v.narrative && <p className="whitespace-pre-wrap break-words">{v.narrative}</p>}
              {v.decision && (
                <p className="whitespace-pre-wrap break-words font-medium">
                  {v.decision.outcome === "Accept"
                    ? t("clubPeriodicReports.Accepted")
                    : t("clubPeriodicReports.Returned for correction")}: {v.decision.reason ?? v.decision.observation}
                </p>
              )}
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}
