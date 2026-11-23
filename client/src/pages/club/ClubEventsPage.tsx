import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { createColumnHelper, useTable } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useParams, useSearchParams } from "react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppDialog } from "@/components/ui/dialog/AppDialog";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppPagination } from "@/components/ui/pagination/AppPagination";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTable, appTableFeatures, type AppTableFeatures } from "@/components/ui/table/AppTable";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useClubEventDefense, useEventDefenseActions } from "@/hooks/useEventDefense";
import { useClubEvent, useClubEventFeedback, useClubEventMutation, useClubEventOptions, useClubEvents, useEventParticipants, useEventProposalDocumentAccess } from "@/hooks/useClubEvents";
import { formatBytes } from "@/utils/proposalFile";
import type { ClubEvent, EventParticipant } from "@/services/clubEvents";
import { useConfirm } from "@/hooks/useConfirm";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { AppFieldError } from "@/components/ui/field/AppFieldError";
import { cn } from "@/utils/cn";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";
import { ClubEventErrorMessage } from "@/pages/club/ClubEventErrorMessage";
import { iso, localTime, numberError, sectionLabel, stateLabel, stateTones, type DecisionComments } from "@/pages/club/clubEventFormat";

const eventsEmpty: ClubEvent[] = [];
const tabClass = "inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium text-muted-app hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app";
const activeTabClass = "bg-segment-app text-text-app shadow-xs";
const participantsEmpty: EventParticipant[] = [];
const eventColumns = createColumnHelper<AppTableFeatures, ClubEvent>();
const participantColumns = createColumnHelper<AppTableFeatures, EventParticipant>();
// Khung nhãn kèm dấu bắt buộc và lỗi cho một ô nhập
function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string | null; children: ReactNode }) {
  return <label className="flex min-w-0 flex-col gap-1.5 text-sm"><span className="flex flex-wrap items-center gap-2 font-medium text-text-app"><span>{label}{required && <AppRequiredMark />}</span></span>{children}<AppFieldError message={error} /></label>;
}
// Thanh phân trang cho bảng của trang sự kiện
function TablePager({ pageIndex, pageCount, onChange }: { pageIndex: number; pageCount: number; onChange: (value: number) => void }) {
  const { t } = useTranslation();
  return <AppPagination pageIndex={pageIndex} pageCount={pageCount} onPageChange={onChange} prevLabel={t("clubEvents.previous")} nextLabel={t("clubEvents.next")}
    pageLabel={(page) => t("clubEvents.page", { page })} navLabel={t("clubEvents.pagination")} />;
}

// Trang quản lý sự kiện, điểm danh và phản hồi của CLB theo mode
export function ClubEventsPage({ mode = "events" }: { mode?: "events" | "attendance" | "feedback" }) {
  const { clubId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const askConfirm = useConfirm();
  const auth = useAuth();
  const workspace = auth.data?.workspaces.find((w) => w.kind === "club" && w.clubId === clubId);
  const canManageEvents = Boolean(workspace?.permissions.includes("club.event.manage"));
  const canManageAttendance = Boolean(workspace?.permissions.includes("club.attendance.manage"));
  const canViewFeedback = Boolean(workspace?.permissions.includes("club.feedback.view"));
  const allowed = mode === "events" ? canManageEvents : mode === "attendance" ? canManageAttendance : canViewFeedback;
  const events = useClubEvents(clubId, allowed);
  const mutation = useClubEventMutation(clubId);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const selected = searchParams.get("event") ?? searchParams.get("selected") ?? "";
  const setSelected = useCallback((id: string) => setSearchParams((previous) => {
    const next = new URLSearchParams(previous);
    next.delete("selected");
    if (id) next.set("event", id); else next.delete("event");
    return next;
  }, { replace: true }), [setSearchParams]);
  // Cuộn tới khung chi tiết sự kiện đang chọn
  // Khung chi tiết nằm dưới bảng, ngoài màn hình trên hầu hết laptop; cuộn nó vào vùng nhìn thấy khi chọn.
  function revealDetail() {
    requestAnimationFrame(() => document.getElementById("club-event-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  const [compare, setCompare] = useState<string[]>([]);
  const [operation, setOperation] = useState<"publish" | "cancel" | "reschedule" | "capacity" | "check-in" | "correct" | "unlock" | null>(null);
  const [target, setTarget] = useState<EventParticipant | null>(null);
  const [reason, setReason] = useState("");
  const [studentId, setStudentId] = useState("");
  const [capacity, setCapacity] = useState(40);
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [venue, setVenue] = useState("");
  const [property, setProperty] = useState("");
  const [noRegistration, setNoRegistration] = useState(false);
  const [walkIn, setWalkIn] = useState(false);
  const [waitlist, setWaitlist] = useState(true);
  const [registrationOpen, setRegistrationOpen] = useState("");
  const [registrationClose, setRegistrationClose] = useState("");
  const [checkOpen, setCheckOpen] = useState("");
  const [checkClose, setCheckClose] = useState("");
  const [corrected, setCorrected] = useState("");
  const [absent, setAbsent] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState<unknown>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [renderedAt] = useState(() => Date.now());
  const [clockMs, setClockMs] = useState(() => Date.now());
  useEffect(() => {
    if (mode !== "attendance" || canManageEvents) return;
    const timer = window.setInterval(() => setClockMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [mode, canManageEvents]);
  const detail = useClubEvent(clubId, selected, allowed && mode === "events");
  const defense = useClubEventDefense(clubId, selected || undefined, allowed && mode === "events" && Boolean(selected));
  const defenseAction = useEventDefenseActions();
  const options = useClubEventOptions(clubId, allowed && mode === "events");
  const documentAccess = useEventProposalDocumentAccess(clubId);
  const participants = useEventParticipants(clubId, selected, allowed && mode === "attendance");
  const feedback = useClubEventFeedback(clubId, compare, allowed && mode === "feedback");
  const rows = events.data ?? eventsEmpty;
  const active = mode === "events" ? detail.data?.event : rows.find((e) => e.id === selected);
  // Yêu cầu chỉnh sửa mới nhất trên đề xuất đang mở: những phần ICPDP yêu cầu CLB sửa.
  const revisionRequest = [...(detail.data?.decisions ?? [])].reverse().find((d) => d.outcome === "Request revision");
  const revisionSections = active?.state === "Revision Requested" ? (revisionRequest?.comments as DecisionComments | undefined)?.sections ?? [] : [];
  const format = useMemo(() => new Intl.DateTimeFormat(i18n.language === "vi" ? "vi-VN" : "en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }), [i18n.language]);
  const filtered = useMemo(() => rows.filter((e) => (!filter || e.state === filter) && e.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())), [rows, filter, search]);
  const columns = useMemo(() => eventColumns.columns([
    eventColumns.accessor("title", { header: t("clubEvents.titleField"), cell: (info) => <button type="button" className="text-left font-medium text-text-app hover:text-primary-app" onClick={() => { setSelected(info.row.original.id); mutation.reset(); setSuccess(false); revealDetail(); }}>{info.getValue()}</button> }),
    eventColumns.accessor("state", { header: t("clubEvents.state"), cell: (info) => <span className="inline-flex flex-wrap items-center gap-1.5"><AppBadge tone={stateTones[info.getValue()] ?? "neutral"}>{stateLabel(t, info.getValue())}</AppBadge>{info.row.original.cancellationRequest?.state === "Pending" && <AppBadge tone="warning">{t("clubEvents.requestCancel")}</AppBadge>}</span> }),
    eventColumns.accessor("startAt", { header: t("clubEvents.startTime"), cell: (info) => format.format(new Date(info.getValue())) }),
    eventColumns.accessor("capacity", { header: t("clubEvents.maxParticipants"), cell: (info) => `${info.row.original.confirmedRegistrationCount} / ${info.getValue()}` }),
  ]), [t, format, mutation, setSelected]);
  const table = useTable({ features: appTableFeatures, columns, data: filtered, initialState: { pagination: { pageIndex: 0, pageSize: 10 } } });
  const people = participants.data ?? participantsEmpty;
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | "checked" | "missing">("all");
  // Điểm danh mở khi sự kiện đã công khai và đang diễn ra, cho đến khi chốt danh sách tham dự (UC31, UC32).
  // Sự kiện nội bộ tương ứng với đề xuất: PUBLIC ↔ Upcoming, ONGOING ↔ Ongoing, FINISH ↔ Completed.
  const published = Boolean(active && ["Upcoming", "PUBLIC"].includes(active.state));
  const finished = Boolean(active && ["Completed", "FINISH"].includes(active.state));
  const canCheckIn = Boolean(active && !active.attendanceFinalized && ["Upcoming", "Ongoing", "Completed", "PUBLIC", "ONGOING", "FINISH"].includes(active.state));
  const checkInStartsAt = active ? Date.parse(active.checkInOpenAt ?? active.startAt) : NaN;
  const checkInEndsAt = active ? Date.parse(active.checkInCloseAt ?? active.endAt) : NaN;
  const withinCheckInWindow = Boolean(
    active && Number.isFinite(checkInStartsAt) && Number.isFinite(checkInEndsAt)
    && clockMs >= checkInStartsAt && clockMs < checkInEndsAt,
  );
  const actorCanCheckIn = canCheckIn && (canManageEvents || withinCheckInWindow);
  const confirmedPeople = people.filter((p) => p.state === "Confirmed" || p.attendanceId);
  const checkedCount = people.filter((p) => p.attendanceId && !p.abnormalFlags.includes("no-show")).length;
  const shownPeople = attendanceFilter === "all" ? people
    : attendanceFilter === "checked" ? people.filter((p) => p.attendanceId && !p.abnormalFlags.includes("no-show"))
      : people.filter((p) => p.state === "Confirmed" && (!p.attendanceId || p.abnormalFlags.includes("no-show")));


  const runAction = useCallback(async function runAction(action: string, body: object) {
    if (!auth.data || !selected) return;
    setSuccess(false); setFormError(null);
    try { await mutation.mutateAsync({ kind: "action", id: selected, action, body, csrfToken: auth.data.csrfToken }); setSuccess(true); setOperation(null); }
    catch (error) { setFormError(error); }
  }, [auth.data, selected, mutation, setSuccess, setFormError, setOperation]);
  // Mở tài liệu đề xuất sự kiện (tải về hoặc xem) qua URL có chữ ký
  async function downloadDocument(id: string, revisionNo?: number, inline = false) {
    try { window.open((await documentAccess.mutateAsync({ id, revisionNo, inline })).url, "_blank", "noopener,noreferrer"); }
    catch { /* Lỗi của mutation được hiển thị cạnh tệp. */ }
  }
  // Xác nhận sự kiện nội bộ chuyển từ DRAFT sang CREATED, yêu cầu báo trước 24 giờ

  // Mở form thao tác (publish, hủy, dời lịch, check-in...) và nạp giá trị mặc định
  const openOperation = useCallback(function openOperation(kind: NonNullable<typeof operation>, participant: EventParticipant | null = null) {
    if (!active) return;
    mutation.reset(); setFormError(null); setSuccess(false); setOperation(kind); setReason(""); setTarget(participant); setCorrected(""); setAbsent(participant?.abnormalFlags.includes("no-show") ?? false);
    setCapacity(active.capacity); setNewStart(localTime(active.startAt)); setNewEnd(localTime(active.endAt)); setVenue(active.venueText ?? ""); setProperty(active.propertyId ?? "");
    setRegistrationOpen(localTime(new Date().toISOString())); setRegistrationClose(localTime(active.startAt)); setCheckOpen(localTime(active.checkInOpenAt ?? active.startAt)); setCheckClose(localTime(active.checkInCloseAt ?? active.endAt));
    setWalkIn(active.allowWalkIn); setWaitlist(active.waitlistEnabled); setNoRegistration(false); setStudentId(participant?.studentId ?? "");
  }, [active, mutation, setOperation, setFormError, setSuccess, setReason, setTarget, setCorrected, setAbsent, setCapacity, setNewStart, setNewEnd, setVenue, setProperty, setRegistrationOpen, setRegistrationClose, setCheckOpen, setCheckClose, setWalkIn, setWaitlist, setNoRegistration, setStudentId]);
  const pcolumns = useMemo(() => participantColumns.columns([
    participantColumns.accessor("name", { header: t("clubEvents.name"), cell: (info) => <span className="block min-w-40 font-medium break-words">{info.getValue()}<span className="block text-xs font-normal whitespace-nowrap text-muted-app">{info.row.original.email}</span></span> }),
    participantColumns.accessor("state", { header: t("clubEvents.state"), cell: (info) => <span>{info.getValue() ? t(`clubEvents.${info.getValue()}`, { defaultValue: info.getValue() ?? "" }) : "—"}{info.row.original.waitlistPosition ? ` #${info.row.original.waitlistPosition}` : ""}</span> }),
    participantColumns.accessor("checkedInAt", { header: t("clubEvents.checkInColumn"), cell: (info) => {
      const row = info.row.original;
      if (!row.attendanceId) return <span className="text-muted-app">{t("clubEvents.notCheckedIn")}</span>;
      if (row.abnormalFlags.includes("no-show")) return <span className="text-danger-app">{t("clubEvents.noShow")}</span>;
      return <span className="text-success-app">{row.checkedInAt ? format.format(new Date(row.checkedInAt)) : "✓"}
        <br /><span className="text-muted-app">{row.method === "self" ? t("clubEvents.methodSelf") : t("clubEvents.methodManual")}</span></span>;
    } }),
    participantColumns.accessor("abnormalFlags", { header: t("clubEvents.flags"), cell: (info) => <div className="flex flex-col gap-1">{info.getValue().map((flag) => <span key={flag}>{t(`clubEvents.${flag}`, { defaultValue: flag })}</span>)}{info.row.original.correctionReason && <p className="text-muted-app">{info.row.original.correctionReason}</p>}</div> }),
    participantColumns.display({ id: "actions", header: t("clubEvents.action"), cell: (info) => <div className="flex flex-wrap gap-2">
      {actorCanCheckIn && info.row.original.state === "Confirmed" && !info.row.original.attendanceId && <AppButton onClick={() => openOperation("check-in", info.row.original)}>{t("clubEvents.checkInRow")}</AppButton>}
      {canManageEvents && info.row.original.state === "Waitlisted" && published && <AppButton disabled={mutation.isPending} onClick={() => void runAction("promote", { registrationId: info.row.original.registrationId })}>{t("clubEvents.promote")}</AppButton>}
      {canManageEvents && finished && !active?.attendanceFinalized && <AppButton onClick={() => openOperation("correct", info.row.original)}>{t("clubEvents.correct")}</AppButton>}
    </div> }),
  ]), [t, active, mutation.isPending, runAction, openOperation, actorCanCheckIn, canManageEvents, published, finished, format]);
  const ptable = useTable({ features: appTableFeatures, columns: pcolumns, data: shownPeople, initialState: { pagination: { pageIndex: 0, pageSize: 10 } } });
  // Gửi thao tác đang chọn lên server sau khi kiểm tra form
  async function execute(event: FormEvent) {
    event.preventDefault(); if (!active || !operation || !opField.touchAll()) return;
    opField.reset(); // đã hợp lệ; lỗi về sau là lỗi từ server, hiển thị phía trên form
    try {
      const version = { expectedVersion: active.version };
      if (operation === "publish") await runAction("publish", { ...version, ...(!noRegistration ? { registrationOpenAt: iso(registrationOpen), registrationCloseAt: iso(registrationClose) } : {}),
        checkInOpenAt: iso(checkOpen), checkInCloseAt: iso(checkClose), allowWalkIn: noRegistration || walkIn, waitlistEnabled: !noRegistration && waitlist,
        });
      else if (operation === "reschedule") await runAction("reschedule", { ...version, reason, startAt: iso(newStart), endAt: iso(newEnd), venueText: venue, ...(property ? { propertyId: property } : {}) });
      else if (operation === "cancel") await runAction("cancel", { ...version, reason });
      else if (operation === "capacity") await runAction("capacity", { capacity });
      else if (operation === "check-in") await runAction("check-ins", { studentId, ...(reason.trim() ? { reason } : {}) });
      else if (operation === "correct") await runAction("attendance/correct", { studentId: target!.studentId, reason, absent, ...(corrected ? { checkedInAt: iso(corrected) } : {}) });
      else await runAction("attendance/unlock", { reason });
    } catch (error) { setFormError(error); }
  }
  const required = t("common.fieldRequired");
  const publishing = operation === "publish" && !noRegistration;
  const opField = useFieldValidation({
    registrationOpen: publishing && !registrationOpen ? required : null,
    registrationClose: !publishing ? null : !registrationClose ? required : registrationOpen && registrationClose <= registrationOpen ? t("common.endAfterStart") : null,
    checkOpen: operation === "publish" && !checkOpen ? required : null,
    checkClose: operation !== "publish" ? null : !checkClose ? required : checkOpen && checkClose <= checkOpen ? t("common.endAfterStart") : null,
    newStart: operation !== "reschedule" ? null : !newStart ? required
      : active?.state === "CREATED" && iso(newStart) !== active.startAt && Date.parse(iso(newStart)) - renderedAt < 24 * 3600_000 ? t("clubEvents.notice24h") : null,
    newEnd: operation !== "reschedule" ? null : !newEnd ? required : newStart && newEnd <= newStart ? t("common.endAfterStart") : null,
    capacity: operation === "capacity" ? numberError(t, capacity, 1, 100000) : null,
    studentId: operation === "check-in" && !studentId ? t("common.chooseRequired") : null,
    reason: ["cancel", "reschedule", "unlock", "correct"].includes(operation ?? "") && !reason.trim() ? required : null,
  });
  // Đóng form thao tác và xóa trạng thái kiểm tra
  function closeOperation() { setOperation(null); opField.reset(); }
  const roomOptions = [{ value: "", label: t("clubEvents.none") }, ...(options.data?.properties ?? []).map((p) => ({ value: p.id, label: p.name }))];
  if (auth.isPending) return <AppSkeleton className="h-40 w-full" />;
  if (!allowed) return <p role="alert">{t("clubEvents.noAccess")}</p>;
  return <>
    <PageHeader title={t(`clubEvents.${mode === "events" ? "title" : mode}`)} description={t("clubEvents.description")} />
    <nav aria-label={t("clubEvents.title")} className="mb-5 inline-flex flex-wrap gap-1 rounded-lg border border-border-app bg-surface-app p-1">
      {canManageEvents && <NavLink end className={({ isActive }) => cn(tabClass, { [activeTabClass]: isActive })} to={`/club/${clubId}/events${selected ? `?event=${encodeURIComponent(selected)}` : ""}`}>{t("clubEvents.title")}</NavLink>}
      {canManageAttendance && <NavLink end className={({ isActive }) => cn(tabClass, { [activeTabClass]: isActive })} to={`/club/${clubId}/event-attendance${selected ? `?event=${encodeURIComponent(selected)}` : ""}`}>{t("clubEvents.attendance")}</NavLink>}
      {canViewFeedback && <NavLink end className={({ isActive }) => cn(tabClass, { [activeTabClass]: isActive })} to={`/club/${clubId}/event-feedback${selected ? `?event=${encodeURIComponent(selected)}` : ""}`}>{t("clubEvents.feedback")}</NavLink>}
    </nav>
    <ClubEventErrorMessage error={events.error ?? formError} />
    {success && <p role="status" className="mb-3 text-success-app">{t("clubEvents.success")}</p>}
    {mode !== "feedback" && <>
      <div className="mb-4 flex flex-wrap items-center gap-3"><AppInput aria-label={t("clubEvents.search")} placeholder={t("clubEvents.search")} value={search} onChange={(e) => { setSearch(e.target.value); table.setPageIndex(0); }} />
        <AppSelect label={t("clubEvents.state")} value={filter} onChange={(v) => { setFilter(v); table.setPageIndex(0); }} options={[{ value: "", label: t("clubEvents.all") }, ...[...new Set(rows.map((e) => e.state))].map((s) => ({ value: s, label: stateLabel(t, s) }))]} />
        {mode === "events" &&
          <Link
            to={`/club/${encodeURIComponent(clubId)}/events/new`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-app px-3.5 font-heading text-sm font-medium text-on-primary-app shadow-xs transition-[opacity,scale] duration-200 hover:opacity-90 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app focus-visible:outline-none sm:min-h-9"
          >
            <AppIcon name="plus" className="size-4" />
            {t("clubEvents.proposeIcpdp")}
          </Link>
        }
      </div>
      <AppTable table={table} emptyMessage={t("clubEvents.empty")} loading={events.isPending} />
      <TablePager pageIndex={table.state.pagination.pageIndex} pageCount={table.getPageCount()} onChange={(v) => table.setPageIndex(v)} />
    </>}
    {mode === "events" && selected && <section id="club-event-detail" className="mt-6 scroll-mt-24 rounded-2xl border border-border-app bg-bg-app p-5 text-sm shadow-xs">
      <ClubEventErrorMessage error={detail.error} />
      {detail.isPending ? <AppSkeleton className="h-48" /> : detail.data && active && <>
        <h2 className="mb-2 font-heading text-base font-semibold break-words">{active.title}</h2><p className="flex flex-wrap items-center gap-2 text-sm text-muted-app"><AppBadge tone={stateTones[active.state] ?? "neutral"}>{stateLabel(t, active.state)}</AppBadge> {format.format(new Date(active.startAt))} – {format.format(new Date(active.endAt))}</p>
        <p className="mt-2 break-words">{active.objective}</p><p className="mt-2 whitespace-pre-wrap break-words">{active.plan}</p>
        <p className="mt-2">{t("clubEvents.venue")}: {active.venueText || (options.data?.properties.find((p) => p.id === active.propertyId)?.name ?? "—")} · {t("clubEvents.PUBLIC")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-medium">{t("clubEvents.proposalDocumentSection")}:</span>
          {active.proposalDocument ? <>
            <span className="min-w-0 break-words">{active.proposalDocument.fileName} · {formatBytes(active.proposalDocument.bytes)}</span>
            <AppButton variant="secondary" disabled={documentAccess.isPending} onClick={() => void downloadDocument(active.id)}>
              <AppIcon name="download" className="size-4" />{t("clubEvents.proposalDocumentDownload")}</AppButton>
          </> : <span className="text-muted-app">{t("clubEvents.proposalDocumentNone")}</span>}
          {documentAccess.isError && <ClubEventErrorMessage error={documentAccess.error} />}
        </div>
        {active.state === "Revision Requested" && revisionRequest ? <div role="status" className="mt-4 rounded-xl border-l-4 border-warning-app bg-warning-app/10 px-4 py-3 text-sm">
          <p className="font-semibold">{t("clubEvents.revisionTitle")}</p>
          {revisionSections.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-2"><span>{t("clubEvents.revisionSections")}:</span>
            {revisionSections.map((section) => <AppBadge key={section} tone="warning">{sectionLabel(t, section)}</AppBadge>)}</div>}
          {revisionRequest.reason && <p className="mt-2 whitespace-pre-wrap break-words">{revisionRequest.reason}</p>}
          {active.revisionDeadlineAt && <p className="mt-2"><span className="font-semibold">{t("clubEvents.revisionDeadline")}:</span> {format.format(new Date(active.revisionDeadlineAt))}</p>}
          <p className="mt-2 text-muted-app">{t("clubEvents.revisionHint")}</p>
        </div> : active.revisionDeadlineAt && <p className="mt-2">{t("clubEvents.revisionDeadline")}: {format.format(new Date(active.revisionDeadlineAt))}</p>}
        {active.approvalConditions?.length > 0 && <div className="mt-3"><h3 className="font-semibold">{t("clubEvents.conditions")}</h3><ul className="mt-2 list-inside list-disc">{active.approvalConditions.map((condition, index) => <li key={index}>{condition}</li>)}</ul></div>}
        {active.conflictResult && <p className="mt-3">{t(`clubEvents.${active.conflictResult}`, { defaultValue: active.conflictResult })}</p>}
        {detail.data.budget?.id && <NavLink className="inline-flex rounded-lg border border-border-app px-4 py-2 text-sm font-medium text-primary-app hover:bg-surface-app"
          to={`/club/${clubId}/budgets?budget=${detail.data.budget.id}`}>{t("accountability.finances")}</NavLink>}
        {detail.data.budget && <p className="mt-2">{t("clubEvents.approvedBudget")}: {new Intl.NumberFormat(i18n.language === "vi" ? "vi-VN" : "en-GB", { style: "currency", currency: "VND" }).format(detail.data.budget.approvedTotal)}</p>}
        {active.state === "Re-defense Pending" && (
          <div className="mt-4">
            <AppNotice tone="info">{t("eventDefense.clubReDefenseBanner")}</AppNotice>
          </div>
        )}
        {defense.isError && (
          <div className="mt-4">
            <AppNotice tone="danger" role="alert">{t("eventDefense.loadClubDefenseFailed")}</AppNotice>
          </div>
        )}
        {defense.data?.activeSession && (() => {
          const ds = defense.data.activeSession;
          const within24h = new Date(ds.startAt).getTime() - renderedAt < 24 * 3600_000;
          return (
            <div className="mt-4 space-y-3 rounded-xl border border-border-app bg-surface-app p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-heading text-sm font-semibold">{t("eventDefense.clubCardTitle")}</h3>
                <AppBadge tone={ds.state === "CONFIRMED" || ds.state === "IN_PROGRESS" ? "success" : ds.state === "RESCHEDULE_REQUESTED" ? "warning" : ds.state === "NO_SHOW" ? "danger" : "info"}>
                  {t(`eventDefense.state_${ds.state}`)}
                </AppBadge>
              </div>
              <p className="font-medium">{ds.title}</p>
              <p className="text-muted-app">
                {format.format(new Date(ds.startAt))} · {t("eventDefense.durationValue", { minutes: ds.durationMinutes })} · {ds.propertyName}
              </p>
              {ds.note && <p className="whitespace-pre-wrap break-words text-muted-app">{ds.note}</p>}
              {ds.state === "SCHEDULED" && (
                <AppNotice tone={within24h ? "warning" : "info"}>{t("eventDefense.clubConfirmNotice")}</AppNotice>
              )}
              {ds.confirmedAt && (
                <p className="text-xs text-success-app">{t("eventDefense.clubConfirmedLabel", { time: format.format(new Date(ds.confirmedAt)) })}</p>
              )}
              {ds.state === "RESCHEDULE_REQUESTED" && ds.rescheduleReason && (
                <p className="text-xs text-muted-app">{t("eventDefense.rescheduleReasonLabel")}: {ds.rescheduleReason}</p>
              )}
              {ds.state === "NO_SHOW" && <AppNotice tone="danger">{t("eventDefense.clubNoShowBanner")}</AppNotice>}
              {defenseAction.isError && <p role="alert" className="text-danger-app">{defenseAction.error.message}</p>}
              <div className="flex flex-wrap gap-2">
                {ds.state === "SCHEDULED" && auth.data && (
                  <AppButton
                    type="button"
                    disabled={within24h || defenseAction.isPending}
                    onClick={() => {
                      defenseAction.reset();
                      void defenseAction
                        .mutateAsync({ kind: "confirmClub", clubId, eventId: active.id, csrfToken: auth.data!.csrfToken })
                        .catch((error) => console.error("[ClubEventsPage] confirm defense failed:", error));
                    }}
                  >
                    {t("eventDefense.clubConfirmButton")}
                  </AppButton>
                )}
                {(ds.state === "SCHEDULED" || ds.state === "CONFIRMED") && auth.data && (
                  <AppButton
                    type="button"
                    variant="secondary"
                    disabled={within24h || defenseAction.isPending}
                    onClick={() => { defenseAction.reset(); setRescheduleReason(""); setRescheduleOpen(true); }}
                  >
                    {t("eventDefense.clubRequestRescheduleButton")}
                  </AppButton>
                )}
              </div>
            </div>
          );
        })()}
        {active.cancellationRequest?.state === "Pending" && (
          <div className="mt-4">
            <AppNotice tone="warning" title={t("clubEvents.cancelPendingTitle")}>
              <p>{t("clubEvents.cancelPendingHint", { date: format.format(new Date(active.cancellationRequest.requestedAt)), reason: active.cancellationRequest.reason })}</p>
            </AppNotice>
          </div>
        )}
        {active.cancellationRequest?.state === "Rejected" && (
          <div className="mt-4">
            <AppNotice tone="danger" title={t("clubEvents.cancelRejectedTitle")}>
              <p>{t("clubEvents.cancelRejectedHint", { date: active.cancellationRequest.decidedAt ? format.format(new Date(active.cancellationRequest.decidedAt)) : "—", reason: active.cancellationRequest.reviewReason ?? "—" })}</p>
            </AppNotice>
          </div>
        )}
        {(() => {
          const cancellationPending = active.cancellationRequest?.state === "Pending";
          const approvedProposalEvent = ["Approved", "Upcoming", "Ongoing"].includes(active.state);
          const withinCancelCutoff = approvedProposalEvent && Date.parse(active.startAt) - renderedAt < 72 * 3600_000;
          return (
            <>
              <div className="my-4 flex flex-wrap gap-2">
                {["Draft", "Revision Requested"].includes(active.state) && (
                  <>
                    <Link
                      to={`/club/${encodeURIComponent(clubId)}/events/${encodeURIComponent(active.id)}/edit`}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-app px-3.5 font-heading text-sm font-medium text-on-primary-app shadow-xs transition-[opacity,scale] duration-200 hover:opacity-90 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app focus-visible:outline-none sm:min-h-9"
                    >
                      {t("clubEvents.edit")}
                    </Link>
                    <AppButton disabled={mutation.isPending} onClick={() => void runAction("submit", { expectedVersion: active.version })}>{t("clubEvents.submit")}</AppButton>
                  </>
                )}
                {!cancellationPending && ["Approved"].includes(active.state) && <AppButton onClick={() => openOperation("publish")}>{t("clubEvents.publish")}</AppButton>}
                {/* Sự kiện nội bộ đã công khai (PUBLIC, ONGOING) giữ nguyên lịch: chỉ được huỷ. */}
                {!cancellationPending && ["Approved", "Upcoming", "CREATED"].includes(active.state) && <AppButton onClick={() => openOperation("reschedule")}>{t("clubEvents.reschedule")}</AppButton>}
                {!cancellationPending && ["Approved", "Upcoming", "Ongoing", "DRAFT", "CREATED", "PUBLIC", "ONGOING"].includes(active.state) && !active.attendanceFinalized && (
                  <AppButton variant="ghost" disabled={withinCancelCutoff} onClick={() => openOperation("cancel")}>
                    {t(approvedProposalEvent ? "clubEvents.requestCancel" : "clubEvents.cancel")}
                  </AppButton>
                )}
              </div>
              {!cancellationPending && withinCancelCutoff && !active.attendanceFinalized && (
                <p className="mb-3 text-xs text-muted-app">{t("clubEvents.cancelCutoffNotice")}</p>
              )}
            </>
          );
        })()}
        {active.checkInCode && <p>{t("clubEvents.code")}: <strong>{active.checkInCode}</strong></p>}
        <h3 className="mt-5 text-sm font-semibold">{t("clubEvents.versions")}</h3>
        {detail.data.versions.map((v) => {
          const vp = v.payload ?? {};
          function resolveRoomName(propId?: string) {
            return propId
              ? (options.data?.properties.find((p) => p.id === propId)?.name
                ?? detail.data?.bookings.find((b) => b.propertyId === propId)?.propertyName
                ?? propId)
              : undefined;
          }
          const vStart = vp.startAt ?? active.startAt;
          const vEnd = vp.endAt ?? active.endAt;
          const vVenue = [resolveRoomName(vp.propertyId), vp.venueText].filter(Boolean).join(" · ") || "—";
          const vScope = vp.audienceScope ?? active.audienceScope;
          const vOccurrences = Array.isArray(vp.occurrences) ? vp.occurrences : [];
          const vForm = Array.isArray(vp.registrationForm) ? vp.registrationForm : [];
          const vDoc = vp.proposalDocument;
          const vBudgetTotal = v.requestedBudgetTotal ?? v.budgetLines.reduce((sum, line) => sum + line.amount, 0);
          const vSubmitter = v.submittedByName ?? v.submittedBy;
          const vConflictTone = v.conflictResult === "Blocking Conflict" ? "danger" : v.conflictResult === "Warning" ? "warning" : "success";
          return (
            <details key={v.revisionNo} className="mt-2 rounded-xl border border-border-app bg-surface-app/40 p-4">
              <summary className="font-medium">
                <span>#{v.revisionNo} · {format.format(new Date(v.submittedAt))}</span>
                {vSubmitter && <span className="ml-2 font-normal text-muted-app">· {t("clubEvents.submittedByLabel", { name: vSubmitter })}</span>}
                {v.conflictResult && (
                  <span className="ml-2 inline-flex align-middle">
                    <AppBadge tone={vConflictTone}>{t(`clubEvents.${v.conflictResult}`, { defaultValue: v.conflictResult })}</AppBadge>
                  </span>
                )}
                <span className="ml-2 font-normal text-muted-app">
                  · {vBudgetTotal > 0 ? `${vBudgetTotal.toLocaleString(i18n.language)} VND` : t("clubEvents.noBudgetRequested")}
                </span>
              </summary>
              <div className="mt-4 space-y-4 border-t border-border-app pt-4 text-sm">
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-app">{t("clubEvents.titleField")}</dt>
                    <dd className="mt-0.5 font-medium break-words">{vp.title ?? active.title}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-app">{t("clubEvents.scheduleVenue")}</dt>
                    <dd className="mt-0.5 font-medium">{format.format(new Date(vStart))} – {format.format(new Date(vEnd))}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-app">{t("clubEvents.venue")}</dt>
                    <dd className="mt-0.5 font-medium break-words">{vVenue}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-app">{t("clubEvents.scope")}</dt>
                    <dd className="mt-0.5 font-medium">{t(`clubEvents.${vScope}`)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-app">{t("clubEvents.maxParticipants")}</dt>
                    <dd className="mt-0.5 font-medium">{vp.capacity ?? active.capacity}</dd>
                  </div>

                </dl>

                {(vp.objective ?? active.objective) && (
                  <div>
                    <p className="text-xs font-medium text-muted-app">{t("clubEvents.objective")}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words">{vp.objective ?? active.objective}</p>
                  </div>
                )}

                {vp.plan && (
                  <div>
                    <p className="text-xs font-medium text-muted-app">{t("clubEvents.plan")}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words">{vp.plan}</p>
                  </div>
                )}

                {vp.riskNote && (
                  <div>
                    <p className="text-xs font-medium text-muted-app">{t("clubEvents.riskNote")}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words">{vp.riskNote}</p>
                  </div>
                )}

                {vp.facilityNeeds && (
                  <div>
                    <p className="text-xs font-medium text-muted-app">{t("clubEvents.facilityNeeds")}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words">{vp.facilityNeeds}</p>
                  </div>
                )}

                {vOccurrences.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-app">{t("clubEvents.occurrences")}</p>
                    <ul className="mt-1 list-inside list-disc space-y-1">
                      {vOccurrences.map((occ, idx) => {
                        const occLocation = [resolveRoomName(occ.propertyId), occ.venueText].filter(Boolean).join(" · ");
                        return (
                          <li key={idx}>
                            <span className="font-medium">{t("clubEvents.sessionIndex", { index: idx + 1 })}:</span>{" "}
                            {format.format(new Date(occ.startAt))} – {format.format(new Date(occ.endAt))}
                            {occLocation ? ` (${occLocation})` : ""}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {vDoc && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border-app bg-bg-app px-3 py-2">
                    <span className="font-medium">{t("clubEvents.proposalDocumentSection")}:</span>
                    <span className="min-w-0 break-words">
                      {vDoc.fileName} · {formatBytes(vDoc.bytes)} · {t("clubEvents.proposalDocumentUploaded", { date: format.format(new Date(vDoc.uploadedAt)) })}
                    </span>
                    <AppButton variant="secondary" disabled={documentAccess.isPending} onClick={() => void downloadDocument(active.id, v.revisionNo, false)}>
                      <AppIcon name="download" className="size-4" />{t("clubEvents.proposalDocumentDownload")}
                    </AppButton>
                    {vDoc.mimeType === "application/pdf" && (
                      <AppButton variant="ghost" disabled={documentAccess.isPending} onClick={() => void downloadDocument(active.id, v.revisionNo, true)}>
                        {t("clubEvents.proposalDocumentView")}
                      </AppButton>
                    )}
                  </div>
                )}

                {vForm.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-app">{t("clubEvents.form")}</p>
                    <ul className="mt-1 list-inside list-disc space-y-1">
                      {vForm.map((field, idx) => (
                        <li key={idx} className="break-words">
                          <span className="font-medium">{field.label}</span>
                          {field.required ? " *" : ""} ({t(`clubEvents.${field.type}`, { defaultValue: field.type })})
                          {field.options?.length ? `: ${field.options.join(", ")}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-muted-app">{t("clubEvents.budget")}</p>
                  {v.budgetLines.length > 0 ? (
                    <div className="mt-1.5 overflow-x-auto rounded-lg border border-border-app bg-bg-app">
                      <table className="w-full min-w-[26rem] text-left text-sm">
                        <thead className="bg-surface-app text-xs text-muted-app">
                          <tr>
                            <th scope="col" className="px-3 py-2 font-medium">{t("clubEvents.category")}</th>
                            <th scope="col" className="px-3 py-2 font-medium">{t("clubEvents.purpose")}</th>
                            <th scope="col" className="px-3 py-2 text-right font-medium">{t("clubEvents.amount")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {v.budgetLines.map((line, index) => (
                            <tr key={index} className="border-t border-border-app align-top">
                              <td className="px-3 py-2 font-medium">{line.category}</td>
                              <td className="px-3 py-2">
                                <p className="break-words">{line.purpose}</p>
                                {line.plannedItems && <p className="mt-0.5 whitespace-pre-line text-xs text-muted-app">{line.plannedItems}</p>}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">{line.amount.toLocaleString(i18n.language)} VND</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-border-app bg-surface-app font-semibold">
                            <td className="px-3 py-2" colSpan={2}>{t("clubEvents.requestedTotal")}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{vBudgetTotal.toLocaleString(i18n.language)} VND</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <p className="mt-1 text-muted-app">{t("clubEvents.noBudgetRequested")}</p>
                  )}
                </div>
              </div>
            </details>
          );
        })}
        <h3 className="mt-5 text-sm font-semibold">{t("clubEvents.decisions")}</h3>
        {detail.data.decisions.map((d, index) => <div key={index} className="mt-2"><p>{d.outcome === "Re-defense" ? t("eventDefense.outcomeReDefense") : t(`eventReviews.${d.outcome === "Approve" ? "approve" : d.outcome === "Reject" ? "reject" : "requestRevision"}`)} · {format.format(new Date(d.at))}{d.reason ? ` · ${d.reason}` : ""}</p>
          {((d.comments as DecisionComments | undefined)?.sections ?? []).length > 0 && <div className="mt-1 flex flex-wrap gap-2">{(d.comments as DecisionComments).sections!.map((section) =>
            <AppBadge key={section} tone="warning">{sectionLabel(t, section)}</AppBadge>)}</div>}</div>)}
      </>}
    </section>}
    {mode === "attendance" && active && <section id="club-event-detail" className="mt-6 scroll-mt-24 space-y-4 rounded-2xl border border-border-app bg-bg-app p-5 text-sm shadow-xs">
      <h2 className="font-heading text-base font-semibold break-words">{active.title}</h2>
      <p>{t("clubEvents.registeredOfCapacity", { count: active.confirmedRegistrationCount, capacity: active.capacity })}
        {" · "}<strong>{t("clubEvents.checkInStats", { checked: checkedCount, confirmed: confirmedPeople.length })}</strong></p>
      {active.checkInOpenAt && active.checkInCloseAt && <p className="text-sm text-muted-app">{t("clubEvents.checkInWindow")}: {format.format(new Date(active.checkInOpenAt))} – {format.format(new Date(active.checkInCloseAt))}</p>}
      {!canCheckIn && !active.attendanceFinalized && <AppNotice tone="warning">{active.state === "Approved" && active.publishedAt
        ? t("clubEvents.checkInRepublish") : t("clubEvents.checkInNotOpen")}</AppNotice>}
      {canCheckIn && !canManageEvents && !withinCheckInWindow && <AppNotice tone="info">{t("clubEvents.memberCheckInOutsideWindow")}</AppNotice>}
      {active.checkInCode && <p>{t("clubEvents.code")}: <strong>{active.checkInCode}</strong></p>}
      {active.attendanceFinalized && <p>{t("clubEvents.attendanceLocked")}</p>}
      <ClubEventErrorMessage error={participants.error} />
      <div className="flex flex-wrap gap-2">
        {canManageEvents && published && <AppButton onClick={() => openOperation("capacity")}>{t("clubEvents.maxParticipants")}</AppButton>}
        {actorCanCheckIn && <AppButton onClick={() => openOperation("check-in")}>{t("clubEvents.checkin")}</AppButton>}
        {canManageEvents && finished && !active.attendanceFinalized && <AppButton disabled={mutation.isPending} onClick={async () => { if (await askConfirm(t("clubEvents.confirmFinalize"))) void runAction("attendance/finalize", {}); }}>{t("clubEvents.finalize")}</AppButton>}
        {active.attendanceFinalized && auth.data?.systemRoles.includes("ATTENDANCE_UNLOCK") && <AppButton onClick={() => openOperation("unlock")}>{t("clubEvents.unlock")}</AppButton>}
      </div>
      <div className="w-full sm:w-64"><AppSelect label={t("clubEvents.attendanceFilter")} value={attendanceFilter}
        onChange={(value) => { setAttendanceFilter(value as typeof attendanceFilter); ptable.setPageIndex(0); }}
        options={[{ value: "all", label: t("clubEvents.filterAll") }, { value: "checked", label: t("clubEvents.filterChecked") },
          { value: "missing", label: t("clubEvents.filterMissing") }]} /></div>
      <AppTable table={ptable} emptyMessage={t("clubEvents.noParticipants")} loading={participants.isPending} />
      <TablePager pageIndex={ptable.state.pagination.pageIndex} pageCount={ptable.getPageCount()} onChange={(v) => ptable.setPageIndex(v)} />
    </section>}
    {mode === "feedback" && <section className="space-y-5">
      <div className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
      <h2 className="font-heading text-base font-semibold">{t("clubEvents.compare")}</h2>
      {events.isPending && <AppSkeleton className="mt-4 h-32" />}
      <div className="mt-4 flex flex-wrap gap-2">{rows.map((e) => <label key={e.id} className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-lg border border-border-app bg-bg-app px-3 py-1.5 text-sm break-words transition-colors hover:bg-surface-app has-checked:border-brand-app has-checked:bg-primary-soft-app has-disabled:opacity-50"><input type="checkbox" className="accent-primary-app" checked={compare.includes(e.id)} disabled={!compare.includes(e.id) && compare.length >= 20}
        onChange={(change) => setCompare(change.target.checked ? [...compare, e.id] : compare.filter((id) => id !== e.id))} /><span className="min-w-0">{e.title}</span></label>)}</div>
      {!events.isPending && !rows.length && <div className="mt-4"><AppEmptyState variant="boxed" message={t("clubEvents.empty")} /></div>}
      </div>
      <ClubEventErrorMessage error={feedback.error} />{feedback.isPending && compare.length > 0 && <AppSkeleton className="h-40" />}
      <div className="grid gap-4 md:grid-cols-2">{feedback.data?.map((f) => <article key={f.eventId} className="min-w-0 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs"><h3 className="font-heading text-base font-semibold break-words">{f.title}</h3><p className="mt-1 text-sm text-muted-app">{t("clubEvents.responses")}: {f.respondents}</p>
        {!f.visible ? <p className="mt-3 text-muted-app">{t("clubEvents.noFeedback")}</p> : <><p className="mt-3">{t("clubEvents.average")}: <strong>{f.averageRating?.toLocaleString(i18n.language)} / 5</strong></p>
          <div className="mt-3 space-y-2">{[1, 2, 3, 4, 5].map((score) => <div key={score} className="flex items-center gap-3"><span>{score} ★</span><div role="meter" aria-label={`${score} / 5`} aria-valuemin={0} aria-valuemax={f.respondents || 1} aria-valuenow={f.distribution?.[score] ?? 0} className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-app"><div className="h-full rounded-full bg-primary-app" style={{ width: `${100 * (f.distribution?.[score] ?? 0) / (f.respondents || 1)}%` }} /></div><span>{f.distribution?.[score] ?? 0}</span></div>)}</div>
          <h4 className="mt-4 text-sm font-semibold">{t("clubEvents.comments")}</h4>{f.comments?.map((c, index) => <p key={index} className="mt-2 whitespace-pre-wrap break-words text-muted-app">{c}</p>)}</>}
      </article>)}</div>
    </section>}
    <AppDialog open={operation !== null} title={t(`clubEvents.${operation === "check-in" ? "checkin" : operation === "capacity" ? "maxParticipants" : operation === "cancel" && active && ["Approved", "Upcoming", "Ongoing"].includes(active.state) ? "requestCancel" : operation ?? "details"}`)} closeLabel={t("clubEvents.close")} onClose={() => { if (!mutation.isPending) closeOperation(); }}
      footer={<AppButton type="submit" form="club-event-operation-form" disabled={mutation.isPending}>{t("clubEvents.confirm")}</AppButton>}>
      <form id="club-event-operation-form" noValidate onSubmit={(event) => void execute(event)} className="space-y-4"><ClubEventErrorMessage error={formError} />
        {operation === "cancel" && active && ["Approved", "Upcoming", "Ongoing"].includes(active.state) && (
          <AppNotice tone="info">{t("clubEvents.cancelApprovedHint")}</AppNotice>
        )}
        {operation === "publish" && <>
          <label className="flex items-center gap-2"><input type="checkbox" checked={noRegistration} onChange={(e) => setNoRegistration(e.target.checked)} />{t("clubEvents.noRegistration")}</label>
          {!noRegistration && <><Field label={t("clubEvents.registrationOpen")} required error={opField.error("registrationOpen")}><AppInput {...opField.control("registrationOpen")} type="datetime-local" value={registrationOpen} onChange={(e) => setRegistrationOpen(e.target.value)} /></Field><Field label={t("clubEvents.registrationClose")} required error={opField.error("registrationClose")}><AppInput {...opField.control("registrationClose")} type="datetime-local" value={registrationClose} onChange={(e) => setRegistrationClose(e.target.value)} /></Field></>}
          <Field label={t("clubEvents.checkInOpen")} required error={opField.error("checkOpen")}><AppInput {...opField.control("checkOpen")} type="datetime-local" value={checkOpen} onChange={(e) => setCheckOpen(e.target.value)} /></Field><Field label={t("clubEvents.checkInClose")} required error={opField.error("checkClose")}><AppInput {...opField.control("checkClose")} type="datetime-local" value={checkClose} onChange={(e) => setCheckClose(e.target.value)} /></Field>
          <label className="flex items-center gap-2"><input type="checkbox" checked={noRegistration || walkIn} disabled={noRegistration} onChange={(e) => setWalkIn(e.target.checked)} />{t("clubEvents.walkIn")}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={waitlist} onChange={(e) => setWaitlist(e.target.checked)} />{t("clubEvents.waitlist")}</label>
        </>}
        {operation === "reschedule" && <><Field label={t("clubEvents.startTime")} required error={opField.error("newStart")}><AppInput {...opField.control("newStart")} type="datetime-local" value={newStart} onChange={(e) => setNewStart(e.target.value)} /></Field><Field label={t("clubEvents.endTime")} required error={opField.error("newEnd")}><AppInput {...opField.control("newEnd")} type="datetime-local" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} /></Field>
          <AppSelect label={t("clubEvents.property")} value={property} options={roomOptions} onChange={setProperty} /><Field label={t("clubEvents.venue")}><AppInput value={venue} onChange={(e) => setVenue(e.target.value)} /></Field></>}
        {operation === "capacity" && <Field label={t("clubEvents.maxParticipants")} required error={opField.error("capacity")}><AppInput {...opField.control("capacity")} type="number" min={1} max={100000} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} /></Field>}
        {operation === "check-in" && <><Field label={t("clubEvents.studentId")} required error={opField.error("studentId")}><AppSelect required invalid={Boolean(opField.error("studentId"))} label={t("clubEvents.studentId")} value={studentId} onChange={(value) => { setStudentId(value); opField.touch("studentId"); }} options={[{ value: "", label: t("clubEvents.none") }, ...people.filter((p) => p.state === "Confirmed" && !p.attendanceId).map((p) => ({ value: p.studentId, label: `${p.name} · ${p.email}` }))]} /></Field>{canManageEvents && <p className="text-sm text-muted-app">{t("clubEvents.manualReason")}</p>}</>}
        {operation === "correct" && <><p>{target?.name}</p><label className="flex items-center gap-2"><input type="checkbox" checked={absent} disabled={Boolean(target?.attendanceId && !target.abnormalFlags.includes("no-show"))} onChange={(e) => setAbsent(e.target.checked)} />{t("clubEvents.absent")}</label>
          {!absent && <Field label={t("clubEvents.correctedTime")}><AppInput type="datetime-local" value={corrected} onChange={(e) => setCorrected(e.target.value)} /></Field>}</>}
        {["cancel", "reschedule", "unlock", "correct", ...(canManageEvents ? ["check-in"] : [])].includes(operation ?? "") && <Field label={t("clubEvents.reason")} required={operation !== "check-in"} error={opField.error("reason")}><AppTextarea {...opField.control("reason", operation !== "check-in")} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>}
      </form>
    </AppDialog>
    <AppDialog
      open={rescheduleOpen}
      title={t("eventDefense.clubRescheduleDialogTitle")}
      closeLabel={t("clubEvents.close")}
      onClose={() => { if (!defenseAction.isPending) setRescheduleOpen(false); }}
      footer={(
        <AppButton
          type="submit"
          form="club-defense-reschedule-form"
          disabled={defenseAction.isPending || !rescheduleReason.trim()}
        >
          {t("clubEvents.confirm")}
        </AppButton>
      )}
    >
      <form
        id="club-defense-reschedule-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!auth.data || !active || !rescheduleReason.trim()) return;
          defenseAction.reset();
          void defenseAction.mutateAsync({
            kind: "requestReschedule",
            clubId,
            eventId: active.id,
            reason: rescheduleReason.trim(),
            csrfToken: auth.data.csrfToken,
          })
            .then(() => setRescheduleOpen(false))
            .catch((error) => console.error("[ClubEventsPage] request reschedule failed:", error));
        }}
        className="space-y-4"
      >
        <p className="text-sm text-muted-app">{t("eventDefense.clubRescheduleDeadlineHint")}</p>
        <Field label={t("eventDefense.clubRescheduleReasonLabel")} required>
          <AppTextarea
            maxLength={2000}
            value={rescheduleReason}
            onChange={(e) => setRescheduleReason(e.target.value)}
          />
        </Field>
        {defenseAction.isError && <p role="alert" className="text-sm text-danger-app">{defenseAction.error.message}</p>}
      </form>
    </AppDialog>
  </>;
}
