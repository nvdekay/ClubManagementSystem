import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppDialog } from "@/components/ui/dialog/AppDialog";
import { AppFieldError } from "@/components/ui/field/AppFieldError";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { appToast } from "@/components/ui/toast/AppToast";
import { useAuth } from "@/hooks/useAuth";
import { useClubEvent, useClubEventMutation, useClubEventOptions } from "@/hooks/useClubEvents";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { ClubEventErrorMessage } from "@/pages/club/ClubEventErrorMessage";
import { bookingsScheduleError, iso, localTime, numberError, stateLabel, stateTones } from "@/pages/club/clubEventFormat";
import type { ClubEvent, ClubEventOptions, InternalClubEventInput, InternalCreateMode } from "@/services/clubEvents";

const sectionCardClass = "space-y-4 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs sm:p-6";
const NOTICE_MS = 24 * 3600_000;

// Giá trị mặc định cho sự kiện nội bộ mới
function freshEvent(): InternalClubEventInput {
  const start = new Date(Date.now() + 3 * 86400000);
  start.setUTCMinutes(0, 0, 0);
  return { title: "", objective: "", plan: "", startAt: start.toISOString(), endAt: new Date(start.getTime() + 2 * 3600000).toISOString(),
    venueText: "", capacity: 40, riskCategory: "LOW", bookingIds: [] };
}

// Chuyển sự kiện nội bộ đã lưu thành dữ liệu form
function inputFromEvent(event: ClubEvent): InternalClubEventInput {
  return { title: event.title, objective: event.objective, plan: event.plan, startAt: event.startAt, endAt: event.endAt, venueText: event.venueText ?? "",
    propertyId: event.propertyId, capacity: event.capacity, riskCategory: event.riskCategory, bookingIds: event.bookingIds };
}

// Khung nhãn kèm dấu bắt buộc và lỗi cho một ô nhập
function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string | null; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm">
      <span className="font-medium text-text-app">{label}{required && <AppRequiredMark />}</span>
      {children}
      <AppFieldError message={error} />
    </label>
  );
}

interface InternalEventFormProps {
  clubId: string;
  csrfToken: string;
  permissions: string[];
  existing?: ClubEvent;
  options?: ClubEventOptions;
  optionsError?: unknown;
}

// Form tạo, sửa và publish sự kiện nội bộ của CLB
function InternalEventForm({ clubId, csrfToken, permissions, existing, options, optionsError }: InternalEventFormProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const mutation = useClubEventMutation(clubId);
  const [draft, setDraft] = useState<InternalClubEventInput>(() => (existing ? inputFromEvent(existing) : freshEvent()));
  const [now, setNow] = useState(() => Date.now());
  // The 24-hour notice applies to create/publish and to schedule edits of a CREATED event, never to a draft save.
  const [strict, setStrict] = useState(false);
  const [formError, setFormError] = useState<unknown>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [noRegistration, setNoRegistration] = useState(false);
  const [walkIn, setWalkIn] = useState(false);
  const [waitlist, setWaitlist] = useState(true);
  const [notifyMembers, setNotifyMembers] = useState(true);
  const [registrationOpen, setRegistrationOpen] = useState("");
  const [registrationClose, setRegistrationClose] = useState("");
  const [checkOpen, setCheckOpen] = useState("");
  const [checkClose, setCheckClose] = useState("");

  const eventsListUrl = `/club/${encodeURIComponent(clubId)}/events`;
  const isCreated = existing?.state === "CREATED";
  const scheduleChanged = !existing || draft.startAt !== existing.startAt || draft.endAt !== existing.endAt;
  const format = new Intl.DateTimeFormat(i18n.language === "vi" ? "vi-VN" : "en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

  // Báo lỗi nếu lịch mới bắt đầu sớm hơn thời hạn báo trước 24 giờ
  function noticeError(at: number) {
    return scheduleChanged && Date.parse(draft.startAt) - at < NOTICE_MS ? t("clubEvents.notice24h") : null;
  }

  const required = t("common.fieldRequired");
  const eventField = useFieldValidation({
    title: draft.title.trim() ? null : required,
    objective: draft.objective.trim() ? null : required,
    plan: draft.plan.trim() ? null : required,
    startAt: Date.parse(draft.startAt) > now ? null : t("common.dateNotPast"),
    endAt: Date.parse(draft.endAt) > Date.parse(draft.startAt) ? null : t("common.endAfterStart"),
    venue: draft.venueText?.trim() || draft.propertyId ? null : t("clubEvents.venueRequired"),
    capacity: numberError(t, draft.capacity, 1, 100000),
    bookings: bookingsScheduleError(
      t,
      draft.bookingIds,
      options?.bookings,
      draft.propertyId,
      [{ startAt: draft.startAt, endAt: draft.endAt }],
    ),
  });
  const startError = eventField.error("startAt") ?? (strict || isCreated ? noticeError(now) : null);

  const publishing = !noRegistration;
  const publishField = useFieldValidation({
    registrationOpen: publishing && !registrationOpen ? required : null,
    registrationClose: !publishing ? null : !registrationClose ? required : registrationOpen && registrationClose <= registrationOpen ? t("common.endAfterStart") : null,
    checkOpen: !checkOpen ? required : null,
    checkClose: !checkClose ? required : checkClose <= checkOpen ? t("common.endAfterStart") : null,
  });

  const linkableBookings = (options?.bookings ?? []).filter((b) => b.propertyId === draft.propertyId || b.propertyType === "EQUIPMENT");
  const roomOptions = [{ value: "", label: t("clubEvents.none") }, ...(options?.properties ?? []).map((p) => ({ value: p.id, label: p.name }))];

  // Kiểm tra form, tùy chọn kiểm tra thêm thời hạn báo trước
  /** Validates the form; `notice` adds the 24-hour rule. Returns false and reveals errors when invalid. */
  function validate(notice: boolean) {
    const at = Date.now();
    setNow(at);
    setStrict(notice);
    const valid = eventField.touchAll();
    return valid && !(notice && noticeError(at));
  }

  // Lưu sự kiện nội bộ (nháp, tạo hoặc publish) hoặc cập nhật bản đang sửa
  async function save(mode: InternalCreateMode | "edit") {
    setFormError(null);
    try {
      const result = mode === "edit"
        ? await mutation.mutateAsync({ kind: "internal-save", id: existing!.id, input: draft, expectedVersion: existing!.version, csrfToken })
        : await mutation.mutateAsync({ kind: "internal-create", input: draft, mode, csrfToken, ...(mode === "publish" ? { publishInput: {
          ...(!noRegistration ? { registrationOpenAt: iso(registrationOpen), registrationCloseAt: iso(registrationClose) } : {}),
          checkInOpenAt: iso(checkOpen), checkInCloseAt: iso(checkClose), allowWalkIn: noRegistration || walkIn, waitlistEnabled: !noRegistration && waitlist, notifyMembers,
        } } : {}) });
      setPublishOpen(false);
      appToast.success(t(mode === "create" ? "clubEvents.internalCreated" : mode === "publish" ? "clubEvents.internalPublished" : "clubEvents.success"));
      navigate(`${eventsListUrl}?event=${encodeURIComponent(result.event.id)}`);
    } catch (error) {
      setFormError(error);
    }
  }

  // Submit form: lưu thay đổi hoặc lưu nháp sau khi kiểm tra
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (existing) { if (validate(isCreated)) void save("edit"); }
    else if (validate(false)) void save("draft");
  }

  // Mở hộp thoại publish với giá trị mặc định cho đăng ký và check-in
  function openPublish() {
    if (!validate(true)) return;
    publishField.reset();
    setNotifyMembers(true);
    setRegistrationOpen(localTime(new Date().toISOString())); setRegistrationClose(localTime(draft.startAt));
    setCheckOpen(localTime(draft.startAt)); setCheckClose(localTime(draft.endAt));
    setPublishOpen(true);
  }

  // Xác nhận publish sự kiện sau khi kiểm tra form publish
  function confirmPublish(event: FormEvent) {
    event.preventDefault();
    if (publishField.touchAll()) void save("publish");
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={t(existing ? "clubEvents.editInternal" : "clubEvents.createInternal")}
        description={t("clubEvents.internalNotice")}
        back={{ to: eventsListUrl, label: t("clubEvents.back") }}
        actions={<div className="flex flex-wrap gap-2">
          <AppBadge tone="info">{t("clubEvents.internalBadge")}</AppBadge>
          {existing && <AppBadge tone={stateTones[existing.state] ?? "neutral"}>{stateLabel(t, existing.state)}</AppBadge>}
        </div>}
      />

      <form noValidate onSubmit={handleSubmit} className="space-y-6">
        <section className={sectionCardClass}>
          <h2 className="font-heading text-base font-semibold">{t("clubEvents.basicInfo")}</h2>
          <Field label={t("clubEvents.titleField")} required error={eventField.error("title")}>
            <AppInput {...eventField.control("title")} maxLength={200} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </Field>
          <Field label={t("clubEvents.objective")} required error={eventField.error("objective")}>
            <AppTextarea {...eventField.control("objective")} maxLength={5000} value={draft.objective} onChange={(e) => setDraft({ ...draft, objective: e.target.value })} />
          </Field>
          <Field label={t("clubEvents.plan")} required error={eventField.error("plan")}>
            <AppTextarea {...eventField.control("plan")} maxLength={20000} rows={5} value={draft.plan} onChange={(e) => setDraft({ ...draft, plan: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("clubEvents.maxParticipants")} required error={eventField.error("capacity")}>
              <AppInput {...eventField.control("capacity")} type="number" min={1} max={100000} value={draft.capacity}
                onChange={(e) => setDraft({ ...draft, capacity: Number(e.target.value) })} />
            </Field>
            <Field label={t("clubEvents.risk")}>
              <AppSelect label={t("clubEvents.risk")} value={draft.riskCategory}
                options={(["LOW", "MEDIUM", "HIGH"] as const).map((v) => ({ value: v, label: t(`clubEvents.${v}`) }))}
                onChange={(value) => setDraft({ ...draft, riskCategory: value })} />
            </Field>
          </div>
        </section>

        <section className={sectionCardClass}>
          <h2 className="font-heading text-base font-semibold">{t("clubEvents.scheduleVenue")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("clubEvents.startTime")} required error={startError}>
              <AppInput {...eventField.control("startAt")} aria-invalid={startError ? true : undefined} type="datetime-local" value={localTime(draft.startAt)}
                onChange={(e) => { if (e.target.value) setDraft({ ...draft, startAt: iso(e.target.value) }); }} />
            </Field>
            <Field label={t("clubEvents.endTime")} required error={eventField.error("endAt")}>
              <AppInput {...eventField.control("endAt")} type="datetime-local" value={localTime(draft.endAt)}
                onChange={(e) => { if (e.target.value) setDraft({ ...draft, endAt: iso(e.target.value) }); }} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("clubEvents.property")}>
              <AppSelect label={t("clubEvents.property")} value={draft.propertyId ?? ""} options={roomOptions}
                onChange={(value) => setDraft({ ...draft, propertyId: value || undefined, bookingIds: [] })} />
            </Field>
            <Field label={t("clubEvents.venue")} required={!draft.propertyId} error={eventField.error("venue")}>
              <AppInput {...eventField.control("venue", !draft.propertyId)} maxLength={300} value={draft.venueText ?? ""}
                onChange={(e) => setDraft({ ...draft, venueText: e.target.value })} />
            </Field>
          </div>
          <div className="space-y-2 border-t border-border-app pt-4">
            <h3 className="text-sm font-semibold">{t("clubEvents.bookings")}</h3>
            {!permissions.includes("club.booking.manage") && <p className="text-sm text-muted-app">{t("clubEvents.bookingPermissionHint")}</p>}
            {!linkableBookings.length && <p className="text-sm text-muted-app">{t("clubEvents.bookingsEmpty")}</p>}
            {linkableBookings.map((b) => (
              <label key={b.id} className="flex items-start gap-2.5 text-sm">
                <input type="checkbox" className="mt-1 accent-primary-app" checked={draft.bookingIds.includes(b.id)} disabled={!permissions.includes("club.booking.manage")}
                  onChange={(e) => {
                    eventField.touch("bookings");
                    setDraft({ ...draft, bookingIds: e.target.checked ? [...draft.bookingIds, b.id] : draft.bookingIds.filter((id) => id !== b.id) });
                  }} />
                <span>{b.title} · {format.format(new Date(b.startAt))} – {format.format(new Date(b.endAt))}</span>
              </label>
            ))}
            <AppFieldError message={eventField.error("bookings")} />
          </div>
        </section>

        {(Boolean(formError) || Boolean(optionsError)) && (
          <AppNotice tone="danger"><ClubEventErrorMessage error={formError ?? optionsError} /></AppNotice>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Link to={eventsListUrl}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border-app bg-bg-app px-3.5 font-heading text-sm font-medium text-text-app shadow-xs transition-colors hover:bg-surface-app focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app focus-visible:outline-none sm:min-h-9">
            {t("clubEvents.cancelForm")}
          </Link>
          {existing ? <AppButton type="submit" disabled={mutation.isPending}>{t("clubEvents.saveChanges")}</AppButton> : <>
            <AppButton type="submit" variant="secondary" disabled={mutation.isPending}>{t("clubEvents.save")}</AppButton>
            <AppButton type="button" variant="secondary" disabled={mutation.isPending} onClick={() => { if (validate(true)) void save("create"); }}>{t("clubEvents.createInternalAction")}</AppButton>
            <AppButton type="button" disabled={mutation.isPending} onClick={openPublish}>{t("clubEvents.createAndPublish")}</AppButton>
          </>}
        </div>
      </form>

      <AppDialog open={publishOpen} title={t("clubEvents.createAndPublish")} closeLabel={t("clubEvents.close")} onClose={() => { if (!mutation.isPending) setPublishOpen(false); }}
        footer={<AppButton type="submit" form="internal-event-publish-form" disabled={mutation.isPending}>{t("clubEvents.confirm")}</AppButton>}>
        <form id="internal-event-publish-form" noValidate onSubmit={confirmPublish} className="space-y-4">
          <ClubEventErrorMessage error={formError} />
          <label className="flex items-center gap-2"><input type="checkbox" checked={noRegistration} onChange={(e) => setNoRegistration(e.target.checked)} />{t("clubEvents.noRegistration")}</label>
          {!noRegistration && <>
            <Field label={t("clubEvents.registrationOpen")} required error={publishField.error("registrationOpen")}><AppInput {...publishField.control("registrationOpen")} type="datetime-local" value={registrationOpen} onChange={(e) => setRegistrationOpen(e.target.value)} /></Field>
            <Field label={t("clubEvents.registrationClose")} required error={publishField.error("registrationClose")}><AppInput {...publishField.control("registrationClose")} type="datetime-local" value={registrationClose} onChange={(e) => setRegistrationClose(e.target.value)} /></Field>
          </>}
          <Field label={t("clubEvents.checkInOpen")} required error={publishField.error("checkOpen")}><AppInput {...publishField.control("checkOpen")} type="datetime-local" value={checkOpen} onChange={(e) => setCheckOpen(e.target.value)} /></Field>
          <Field label={t("clubEvents.checkInClose")} required error={publishField.error("checkClose")}><AppInput {...publishField.control("checkClose")} type="datetime-local" value={checkClose} onChange={(e) => setCheckClose(e.target.value)} /></Field>
          <AppSelect label={t("clubEvents.notifyMembersLabel")} value={notifyMembers ? "yes" : "no"}
            onChange={(value) => setNotifyMembers(value === "yes")}
            options={[{ value: "yes", label: t("clubEvents.notifyMembersYes") }, { value: "no", label: t("clubEvents.notifyMembersNo") }]} />
          <label className="flex items-center gap-2"><input type="checkbox" checked={noRegistration || walkIn} disabled={noRegistration} onChange={(e) => setWalkIn(e.target.checked)} />{t("clubEvents.walkIn")}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={waitlist} onChange={(e) => setWaitlist(e.target.checked)} />{t("clubEvents.waitlist")}</label>
        </form>
      </AppDialog>
    </div>
  );
}

// Trang tạo hoặc sửa sự kiện nội bộ của CLB
/** Self-funded members-only event: create (DRAFT / CREATED / PUBLIC) or edit while DRAFT or CREATED. */
export function InternalClubEventPage() {
  const { clubId = "", eventId } = useParams();
  const { t } = useTranslation();
  const auth = useAuth();
  const permissions = auth.data?.workspaces.find((w) => w.kind === "club" && w.clubId === clubId)?.permissions ?? [];
  const allowed = permissions.includes("club.event.manage");
  const detail = useClubEvent(clubId, eventId ?? "", allowed && Boolean(eventId));
  const options = useClubEventOptions(clubId, allowed);
  const eventsListUrl = `/club/${encodeURIComponent(clubId)}/events`;

  if (auth.isPending || (eventId && allowed && detail.isPending)) {
    return <div className="max-w-4xl space-y-4"><AppSkeleton className="h-12 w-2/3" /><AppSkeleton className="h-72 w-full" /></div>;
  }
  if (!allowed || !auth.data) return <AppNotice tone="danger" role="alert">{t("clubEvents.noAccess")}</AppNotice>;
  if (eventId && (detail.isError || !detail.data)) {
    return (
      <div className="max-w-4xl">
        <PageHeader title={t("clubEvents.editInternal")} back={{ to: eventsListUrl, label: t("clubEvents.back") }} />
        <AppNotice tone="danger">{detail.error ? <ClubEventErrorMessage error={detail.error} /> : <p>{t("clubEvents.internalNotFound")}</p>}</AppNotice>
      </div>
    );
  }
  const existing = eventId ? detail.data?.event : undefined;
  if (existing && !["DRAFT", "CREATED"].includes(existing.state)) {
    return (
      <div className="max-w-4xl">
        <PageHeader title={existing.title} back={{ to: eventsListUrl, label: t("clubEvents.back") }}
          actions={<AppBadge tone={stateTones[existing.state] ?? "neutral"}>{stateLabel(t, existing.state)}</AppBadge>} />
        <AppNotice tone="warning">{t("clubEvents.internalNotEditable")}</AppNotice>
      </div>
    );
  }
  return <InternalEventForm key={eventId ?? "new"} clubId={clubId} csrfToken={auth.data.csrfToken} permissions={permissions}
    existing={existing} options={options.data} optionsError={options.error} />;
}
