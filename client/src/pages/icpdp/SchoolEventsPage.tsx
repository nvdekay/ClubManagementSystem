import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useClubLifecycles } from "@/hooks/useClubLifecycle";
import { useProperties } from "@/hooks/useProperties";
import {
  useCreateSchoolEvent, useScheduleConflicts, useSchoolEvent, useSchoolEventAction, useSchoolEvents,
} from "@/hooks/useSchoolEvents";
import type { InvitationStatus, ScheduleConflict } from "@/services/schoolEvents";
import { cn } from "@/utils/cn";
import { useConfirm } from "@/hooks/useConfirm";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { AppFieldError } from "@/components/ui/field/AppFieldError";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";

function stateLabel(t: TFunction, state: string): string {
  switch (state) {
    case "Approved": return t("schoolEvents.stateApproved");
    case "Upcoming": return t("schoolEvents.stateUpcoming");
    case "Ongoing": return t("schoolEvents.stateOngoing");
    case "Completed": return t("schoolEvents.stateCompleted");
    case "Cancelled": return t("schoolEvents.stateCancelled");
    default: return state;
  }
}

function stateTone(state: string): AppBadgeTone {
  return state === "Approved" ? "warning" : state === "Upcoming" || state === "Ongoing" ? "success"
    : state === "Cancelled" ? "danger" : "neutral";
}

function statusLabel(t: TFunction, status: InvitationStatus): string {
  switch (status) {
    case "Accepted": return t("schoolEvents.statusAccepted");
    case "Declined": return t("schoolEvents.statusDeclined");
    case "Expired": return t("schoolEvents.statusExpired");
    case "Withdrawn": return t("schoolEvents.statusWithdrawn");
    default: return t("schoolEvents.statusPending");
  }
}

function statusTone(status: InvitationStatus): AppBadgeTone {
  return status === "Accepted" ? "success" : status === "Declined" ? "danger" : status === "Pending" ? "info" : "neutral";
}

/** `datetime-local` value → ISO string, or undefined when empty or invalid. */
function iso(value: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function details(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  return Object.values(value as Record<string, unknown>).filter((item) => ["string", "number"].includes(typeof item)).map(String);
}

function Gate({ children }: { children: (csrfToken: string) => ReactNode }) {
  const { t } = useTranslation();
  const auth = useAuth();
  if (auth.isPending) return <div className="space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-20 w-full" />)}</div>;
  if (!auth.data) return <AppNotice>
    <p>{t("schoolEvents.signIn")}</p>
    <Link className="inline-block font-semibold text-primary-app hover:underline"
      to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>{t("schoolEvents.signInLink")}</Link>
  </AppNotice>;
  if (!auth.data.systemRoles.includes("ICPDP_OFFICER")) {
    return <AppNotice tone="danger" role="alert">{t("schoolEvents.unauthorized")}</AppNotice>;
  }
  return <>{children(auth.data.csrfToken)}</>;
}

/** Active clubs as checkboxes, with a shortcut for all of them. */
function ClubPicker({ all, onAll, chosen, onChosen, exclude = [] }: { all: boolean; onAll: (value: boolean) => void;
  chosen: string[]; onChosen: (value: string[]) => void; exclude?: string[] }) {
  const { t } = useTranslation();
  const clubs = useClubLifecycles(true);
  const active = (clubs.data?.clubs ?? []).filter((club) => club.state === "Active" && !exclude.includes(club.id));
  return (
    <fieldset>
      <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-text-app">
        <input type="checkbox" checked={all} onChange={(e) => onAll(e.target.checked)} className="size-4 accent-primary-app" />
        {t("schoolEvents.allActive")}</label>
      {!all && <>
        <p className="mt-1 text-xs text-muted-app">{t("schoolEvents.clubsSelected", { count: chosen.length })}</p>
        {/* Nothing left to pick (every active club already invited): no empty bordered box. */}
        {clubs.isPending ? <AppSkeleton className="mt-2 h-24 w-full" /> : active.length > 0 && (
          <div className="mt-2 grid max-h-56 gap-1 overflow-y-auto rounded-xl border border-border-app p-2 sm:grid-cols-2">{active.map((club) =>
            <label key={club.id} className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm hover:bg-surface-app">
              <input type="checkbox" checked={chosen.includes(club.id)} className="size-4 accent-primary-app"
                onChange={() => onChosen(chosen.includes(club.id) ? chosen.filter((item) => item !== club.id) : [...chosen, club.id])} />
              <span className="min-w-0 break-words">{club.name}</span></label>)}</div>
        )}
      </>}
    </fieldset>
  );
}

function ConflictList({ items }: { items: ScheduleConflict[] }) {
  const { t, i18n } = useTranslation();
  const format = new Intl.DateTimeFormat(i18n.language, { dateStyle: "short", timeStyle: "short" });
  return <ul className="mt-2 space-y-1 text-sm">{items.map((item, index) =>
    <li key={index} className="break-words">{item.kind === "booking" ? t("schoolEvents.conflictKindBooking") : t("schoolEvents.conflictKindEvent")}:
      {" "}<span className="font-medium">{item.title}</span> · {format.format(new Date(item.startAt))} – {format.format(new Date(item.endAt))}</li>)}</ul>;
}

function CreateForm({ csrfToken, onCancel }: { csrfToken: string; onCancel: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const properties = useProperties(true);
  const create = useCreateSchoolEvent();
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [coordination, setCoordination] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [useRoom, setUseRoom] = useState(false);
  const [propertyId, setPropertyId] = useState("");
  const [venueText, setVenueText] = useState("");
  const [capacity, setCapacity] = useState("100");
  const [all, setAll] = useState(true);
  const [chosen, setChosen] = useState<string[]>([]);
  const [deadline, setDeadline] = useState("");
  const start = iso(startAt);
  const end = iso(endAt);
  const conflicts = useScheduleConflicts(useRoom && propertyId && start && end && end > start
    ? { propertyId, startAt: start, endAt: end } : null);
  const places = Number(capacity);
  const field = useFieldValidation({
    title: title.trim() ? null : t("common.fieldRequired"),
    startAt: !start ? t("common.fieldRequired") : new Date(start) <= new Date() ? t("common.dateNotPast") : null,
    endAt: !end ? t("common.fieldRequired") : start && end <= start ? t("common.endAfterStart") : null,
    propertyId: useRoom && !propertyId ? t("common.chooseRequired") : null,
    venueText: !useRoom && !venueText.trim() ? t("common.fieldRequired") : null,
    capacity: !capacity.trim() ? t("common.fieldRequired") : !Number.isInteger(places) ? t("common.invalidNumber")
      : places < 1 ? t("common.numberMin", { min: 1 }) : places > 100_000 ? t("common.numberMax", { max: 100_000 }) : null,
  });

  async function submit() {
    // start/end are re-checked only so TypeScript knows they are set.
    if (!field.touchAll() || !start || !end) return;
    try {
      const result = await create.mutateAsync({ csrfToken, input: { title: title.trim(), objective: objective.trim() || undefined,
        coordination: coordination.trim() || undefined, startAt: start, endAt: end,
        ...(useRoom ? { propertyId } : { venueText: venueText.trim() }), capacity: places,
        invitationDeadline: iso(deadline), ...(all ? { allActiveClubs: true } : { clubIds: chosen }) } });
      navigate(`/workspace/school-events/${result.detail.id}`, { state: { skipped: result.outcome.skipped.length } });
    } catch { /* Mutation state is rendered below. */ }
  }

  return (
    <section className="mb-8 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
      <h2 className="font-heading text-base font-semibold">{t("schoolEvents.create")}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block text-sm md:col-span-2 font-medium text-text-app">{t("schoolEvents.name")}<AppRequiredMark />
          <AppInput className="mt-1.5 w-full font-normal" value={title} maxLength={200} {...field.control("title")} onChange={(e) => setTitle(e.target.value)} />
          <AppFieldError message={field.error("title")} /></label>
        <label className="block text-sm md:col-span-2 font-medium text-text-app">{t("schoolEvents.objective")}
          <AppTextarea className="mt-1.5 min-h-20 w-full font-normal" value={objective} maxLength={5000} onChange={(e) => setObjective(e.target.value)} /></label>
        <label className="block text-sm md:col-span-2 font-medium text-text-app">{t("schoolEvents.coordination")}
          <AppTextarea className="mt-1.5 min-h-20 w-full font-normal" value={coordination} maxLength={5000}
            placeholder={t("schoolEvents.coordinationHint")} onChange={(e) => setCoordination(e.target.value)} /></label>
        <label className="block text-sm font-medium text-text-app">{t("schoolEvents.startAt")}<AppRequiredMark />
          <AppInput type="datetime-local" className="mt-1.5 w-full font-normal" value={startAt} {...field.control("startAt")}
            onChange={(e) => setStartAt(e.target.value)} />
          <AppFieldError message={field.error("startAt")} /></label>
        <label className="block text-sm font-medium text-text-app">{t("schoolEvents.endAt")}<AppRequiredMark />
          <AppInput type="datetime-local" className="mt-1.5 w-full font-normal" value={endAt} min={startAt} {...field.control("endAt")}
            onChange={(e) => setEndAt(e.target.value)} />
          <AppFieldError message={field.error("endAt")} /></label>
        <div className="block text-sm font-medium text-text-app md:col-span-2">{t("schoolEvents.venue")}<AppRequiredMark />
          <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg border border-border-app bg-surface-app p-1">{[false, true].map((value) =>
            <button key={String(value)} type="button" aria-pressed={useRoom === value} onClick={() => setUseRoom(value)}
              className={cn("min-h-11 rounded-md px-2 text-xs font-medium text-muted-app transition-colors hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app sm:min-h-9", {
                "bg-segment-app text-text-app shadow-xs hover:text-text-app": useRoom === value,
              })}>{value ? t("schoolEvents.venueRoom") : t("schoolEvents.venueText")}</button>)}</div>
          {useRoom ? <AppSelect className="mt-1.5 w-full" label={t("schoolEvents.venueRoom")} value={propertyId}
            required invalid={Boolean(field.error("propertyId"))} onChange={(value) => { setPropertyId(value); field.touch("propertyId"); }}
            options={[{ value: "", label: t("schoolEvents.chooseRoom") }, ...(properties.data ?? []).filter((item) => item.isActive && item.type !== "EQUIPMENT")
              .map((item) => ({ value: item.id, label: `${item.code} · ${item.name}${item.capacity ? ` (${item.capacity})` : ""}` }))]} />
            : <AppInput aria-label={t("schoolEvents.venueText")} className="mt-1.5 w-full font-normal" value={venueText} maxLength={200}
              placeholder={t("schoolEvents.venuePlaceholder")} {...field.control("venueText")} onChange={(e) => setVenueText(e.target.value)} />}
          <AppFieldError message={field.error(useRoom ? "propertyId" : "venueText")} />
          {conflicts.isFetching ? <p className="mt-2 text-xs font-normal text-muted-app">{t("schoolEvents.conflictChecking")}</p>
            : conflicts.data && (conflicts.data.length ? <div className="mt-2 rounded-lg border-l-4 border-warning-app bg-warning-app/10 p-3 font-normal text-warning-app">
              <p className="text-sm font-semibold">{t("schoolEvents.conflictWarning")}</p><ConflictList items={conflicts.data} /></div>
              : <p className="mt-2 text-xs font-normal text-success-app">{t("schoolEvents.conflictNone")}</p>)}
        </div>
        <label className="block text-sm font-medium text-text-app">{t("schoolEvents.capacity")}<AppRequiredMark />
          <AppInput type="number" min={1} inputMode="numeric" className="mt-1.5 w-full font-normal" value={capacity} {...field.control("capacity")}
            onChange={(e) => setCapacity(e.target.value)} />
          <AppFieldError message={field.error("capacity")} /></label>
        <label className="block text-sm font-medium text-text-app">{t("schoolEvents.deadline")}
          <AppInput type="datetime-local" className="mt-1.5 w-full font-normal" value={deadline} max={startAt} onChange={(e) => setDeadline(e.target.value)} />
          <span className="mt-1 block text-xs font-normal text-muted-app">{t("schoolEvents.deadlineHint")}</span></label>
        <div className="md:col-span-2"><p className="mb-1.5 text-sm font-medium text-text-app">{t("schoolEvents.invite")}</p>
          <ClubPicker all={all} onAll={setAll} chosen={chosen} onChosen={setChosen} /></div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <AppButton disabled={create.isPending} onClick={() => void submit()}>{create.isPending ? t("schoolEvents.saving") : t("schoolEvents.submit")}</AppButton>
        <AppButton variant="secondary" onClick={onCancel}>{t("schoolEvents.cancel")}</AppButton>
      </div>
      {create.isError && <p role="alert" className="mt-3 text-sm text-danger-app">{create.error.message}</p>}
    </section>
  );
}

function SchoolEventList({ csrfToken }: { csrfToken: string }) {
  const { t, i18n } = useTranslation();
  const list = useSchoolEvents(true);
  const [creating, setCreating] = useState(false);
  function date(value: string) {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }
  return (
    <>
      {creating ? <CreateForm csrfToken={csrfToken} onCancel={() => setCreating(false)} />
        : <AppButton className="mb-6" onClick={() => setCreating(true)}><AppIcon name="plus" className="size-4" />{t("schoolEvents.create")}</AppButton>}
      {list.isPending ? <div className="space-y-2">{[0, 1].map((item) => <AppSkeleton key={item} className="h-24 w-full" />)}</div>
        : list.isError ? <AppNotice tone="danger" role="alert" title={list.error.message || t("schoolEvents.loadError")}>
          <AppButton variant="secondary" onClick={() => void list.refetch()}>{t("schoolEvents.retry")}</AppButton></AppNotice>
          : list.data.length ? <ul className="divide-y divide-border-app overflow-hidden rounded-2xl border border-border-app bg-bg-app shadow-xs">{list.data.map((event) =>
            <li key={event.id}>
              <Link to={`/workspace/school-events/${event.id}`}
                className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 hover:bg-surface-app focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring-app">
                <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border-app bg-bg-app text-muted-app">
                  <AppIcon name="calendar" /></span>
                <span className="min-w-0 flex-1 basis-64">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-base font-semibold break-words">{event.title}</span>
                    <AppBadge tone={stateTone(event.state)}>{stateLabel(t, event.state)}</AppBadge>
                  </span>
                  <span className="mt-1 block text-sm text-muted-app">{date(event.startAt)} · {event.property ? `${event.property.code} · ${event.property.name}` : event.venueText}</span>
                  <span className="mt-2 flex flex-wrap gap-2">
                    <AppBadge tone="success">{t("schoolEvents.countAccepted", { count: event.counts.accepted })}</AppBadge>
                    {event.counts.pending > 0 && <AppBadge tone="info">{t("schoolEvents.countPending", { count: event.counts.pending })}</AppBadge>}
                    {event.counts.declined > 0 && <AppBadge tone="danger">{t("schoolEvents.countDeclined", { count: event.counts.declined })}</AppBadge>}
                    {event.publishedAt && <AppBadge>{t("schoolEvents.places", { registered: event.confirmedRegistrationCount, capacity: event.capacity })}</AppBadge>}
                  </span>
                </span>
                <AppIcon name="chevronRight" className="size-4 text-muted-app" />
              </Link>
            </li>)}</ul>
            : <div className="rounded-xl border border-dashed border-border-app px-4 py-12 text-center">
              <span aria-hidden="true" className="mx-auto flex size-12 items-center justify-center rounded-xl border border-border-app bg-bg-app text-muted-app"><AppIcon name="sparkles" className="size-6" /></span>
              <h2 className="mt-4 font-heading text-base font-semibold">{t("schoolEvents.none")}</h2>
              <p className="mt-2 text-sm text-muted-app">{t("schoolEvents.noneHint")}</p>
            </div>}
    </>
  );
}

export function SchoolEventsPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t("schoolEvents.title")} description={t("schoolEvents.description")} />
      <Gate>{(csrfToken) => <SchoolEventList csrfToken={csrfToken} />}</Gate>
    </>
  );
}

function SchoolEventDetailView({ id, csrfToken }: { id: string; csrfToken: string }) {
  const { t, i18n } = useTranslation();
  const askConfirm = useConfirm();
  const query = useSchoolEvent(id, true);
  const action = useSchoolEventAction();
  const [all, setAll] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [deadline, setDeadline] = useState("");
  const field = useFieldValidation({
    clubs: all || chosen.length ? null : t("schoolEvents.inviteRequired"),
  });
  const skipped = (useLocation().state as { skipped?: number } | null)?.skipped ?? 0;
  function date(value: string) {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }
  const back = { to: "/workspace/school-events", label: t("schoolEvents.back") };
  if (query.isPending) return <div className="space-y-4"><AppSkeleton className="h-10 w-1/2" /><AppSkeleton className="h-96 w-full" /></div>;
  if (query.isError) return <>
    <PageHeader title={t("schoolEvents.event")} back={back} />
    <AppNotice tone="danger" role="alert" title={query.error.message || t("schoolEvents.loadError")}>
      <AppButton variant="secondary" onClick={() => void query.refetch()}>{t("schoolEvents.retry")}</AppButton></AppNotice>
  </>;
  const event = query.data;
  const open = event.state === "Approved" || event.state === "Upcoming";
  const label = "text-xs text-muted-app";
  const blocking = event.invitations.filter((item) => !["Withdrawn", "Expired"].includes(item.status)).map((item) => item.clubId);

  async function invite() {
    if (!field.touchAll()) return;
    try {
      await action.mutateAsync({ kind: "invite", id, csrfToken, input: { ...(all ? { allActiveClubs: true } : { clubIds: chosen }),
        deadline: iso(deadline) } });
      setChosen([]); setAll(false); field.reset();
    } catch { /* Mutation state is rendered below. */ }
  }

  return (
    <>
      <PageHeader title={event.title} back={back} description={t("schoolEvents.semester", { code: event.semesterCode })}
        actions={<AppBadge tone={stateTone(event.state)}>{stateLabel(t, event.state)}</AppBadge>} />
      {skipped > 0 && <AppNotice className="mb-6">{t("schoolEvents.createdSkipped", { count: skipped })}</AppNotice>}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-5">
          <dl className="grid gap-5 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs sm:grid-cols-2">
            <div><dt className={label}>{t("schoolEvents.when")}</dt><dd className="mt-1 font-medium">{date(event.startAt)} – {date(event.endAt)}</dd></div>
            <div><dt className={label}>{t("schoolEvents.where")}</dt><dd className="mt-1 font-medium break-words">
              {event.property ? `${event.property.code} · ${event.property.name}` : event.venueText}</dd></div>
            <div><dt className={label}>{t("schoolEvents.capacity")}</dt><dd className="mt-1 font-medium">
              {t("schoolEvents.places", { registered: event.confirmedRegistrationCount, capacity: event.capacity })}</dd></div>
            {event.checkInCode && <div><dt className={label}>{t("schoolEvents.checkInCode")}</dt>
              <dd className="mt-1 font-heading text-xl font-semibold tracking-widest tabular-nums">{event.checkInCode}</dd></div>}
            {event.objective && <div className="sm:col-span-2"><dt className={label}>{t("schoolEvents.objective")}</dt>
              <dd className="mt-2 leading-7 break-words whitespace-pre-wrap">{event.objective}</dd></div>}
            {event.coordination && <div className="sm:col-span-2"><dt className={label}>{t("schoolEvents.coordination")}</dt>
              <dd className="mt-2 leading-7 break-words whitespace-pre-wrap">{event.coordination}</dd></div>}
          </dl>
          {event.conflicts.length > 0 && <div className="rounded-xl border-l-4 border-warning-app bg-warning-app/10 p-4 text-warning-app">
            <p className="text-sm font-semibold">{t("schoolEvents.conflicts")}</p><ConflictList items={event.conflicts} /></div>}

          <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-heading text-base font-semibold">{t("schoolEvents.invitations")}</h2>
              <div className="flex flex-wrap gap-2">
                <AppBadge tone="success">{t("schoolEvents.countAccepted", { count: event.counts.accepted })}</AppBadge>
                <AppBadge tone="info">{t("schoolEvents.countPending", { count: event.counts.pending })}</AppBadge>
                <AppBadge tone="danger">{t("schoolEvents.countDeclined", { count: event.counts.declined })}</AppBadge>
                {event.counts.expired > 0 && <AppBadge>{t("schoolEvents.countExpired", { count: event.counts.expired })}</AppBadge>}
              </div>
            </div>
            {event.invitations.length ? <ul className="mt-3 divide-y divide-border-app">{event.invitations.map((item) =>
              <li key={item.id} className="flex flex-wrap items-start gap-3 py-3">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-medium break-words">{item.clubName}</p>
                  <p className="text-xs text-muted-app">{t("schoolEvents.replyBy", { date: date(item.deadline) })}</p>
                  {item.responseNote && <p className="mt-1 text-sm break-words">{item.responseNote}</p>}
                  {details(item.responseDetails).length > 0 && <p className="mt-1 text-sm break-words text-muted-app">
                    {t("schoolEvents.responseDetails")}: {details(item.responseDetails).join(" · ")}</p>}
                </div>
                <AppBadge tone={statusTone(item.status)}>{statusLabel(t, item.status)}</AppBadge>
                {item.status === "Pending" && new Date(item.deadline) > new Date() && <AppButton variant="secondary" disabled={action.isPending}
                  onClick={async () => { if (await askConfirm(t("schoolEvents.confirmWithdraw", { club: item.clubName }))) {
                    action.mutate({ kind: "withdraw", id, invitationId: item.id, csrfToken }); } }}>{t("schoolEvents.withdraw")}</AppButton>}
              </li>)}</ul> : <div className="mt-3"><AppEmptyState message={t("schoolEvents.noInvitations")} /></div>}
          </section>
        </div>

        <aside className="min-w-0 space-y-6 lg:sticky lg:top-24">
          {event.state === "Approved" && <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
            <h2 className="font-heading text-base font-semibold">{t("schoolEvents.publish")}</h2>
            <p className="mt-1 text-sm text-muted-app">{t("schoolEvents.publishHint")}</p>
            <AppButton className="mt-4 w-full" disabled={action.isPending}
              onClick={async () => { if (await askConfirm(t("schoolEvents.confirmPublish"))) action.mutate({ kind: "publish", id, csrfToken }); }}>
              {t("schoolEvents.publish")}</AppButton>
          </section>}
          {event.publishedAt && <AppNotice role="status">{t("schoolEvents.published", { date: date(event.publishedAt) })}</AppNotice>}
          {open && <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
            <h2 className="font-heading text-base font-semibold">{t("schoolEvents.inviteMore")}<AppRequiredMark /></h2>
            <p className="mt-1 mb-3 text-sm text-muted-app">{t("schoolEvents.inviteHint")}</p>
            <ClubPicker all={all} onAll={(value) => { setAll(value); field.touch("clubs"); }} chosen={chosen}
              onChosen={(value) => { setChosen(value); field.touch("clubs"); }} exclude={blocking} />
            <AppFieldError message={field.error("clubs")} />
            <label className="mt-4 block text-sm font-medium text-text-app">{t("schoolEvents.deadline")}
              <AppInput type="datetime-local" className="mt-1.5 w-full font-normal" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              <span className="mt-1 block text-xs font-normal text-muted-app">{t("schoolEvents.deadlineHint")}</span></label>
            <AppButton className="mt-4 w-full" disabled={action.isPending} onClick={() => void invite()}>{t("schoolEvents.sendInvites")}</AppButton>
          </section>}
          {action.isError && <p role="alert" className="text-sm text-danger-app">{action.error.message}</p>}
          {action.isSuccess && <AppNotice role="status">{t("schoolEvents.success")}</AppNotice>}
        </aside>
      </div>
    </>
  );
}

export function SchoolEventDetailPage() {
  const { id } = useParams();
  return <Gate>{(csrfToken) => id ? <SchoolEventDetailView id={id} csrfToken={csrfToken} /> : null}</Gate>;
}
