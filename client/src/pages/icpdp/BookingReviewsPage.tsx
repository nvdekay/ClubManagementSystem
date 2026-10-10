import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useBooking, useBookingAction, useBookingQueue } from "@/hooks/useBookingReviews";
import { useProperties } from "@/hooks/useProperties";
import type { BookingReviewOutcome, ClubObligation } from "@/services/bookingReviews";
import { cn } from "@/utils/cn";

const outcomes: BookingReviewOutcome[] = ["Approve", "Request revision", "Reject"];

function stateLabel(t: TFunction, state: string): string {
  switch (state) {
    case "Requested": return t("bookings.stateRequested");
    case "Under Review": return t("bookings.stateUnderReview");
    case "Revision Requested": return t("bookings.stateRevisionRequested");
    case "Approved": return t("bookings.stateApproved");
    case "Rejected": return t("bookings.stateRejected");
    case "In Use": return t("bookings.stateInUse");
    case "Completed": return t("bookings.stateCompleted");
    case "Cancelled": return t("bookings.stateCancelled");
    case "Released": return t("bookings.stateReleased");
    default: return state;
  }
}

function stateTone(state: string): AppBadgeTone {
  return state === "Approved" ? "success" : state === "Rejected" ? "danger" : state === "Revision Requested" ? "warning"
    : state === "Under Review" ? "info" : "neutral";
}

function outcomeLabel(t: TFunction, outcome: BookingReviewOutcome): string {
  return outcome === "Approve" ? t("bookings.outcomeApprove") : outcome === "Reject" ? t("bookings.outcomeReject")
    : t("bookings.outcomeRevision");
}

function obligationLabel(t: TFunction, obligation: ClubObligation): string {
  return obligation === "overdueSettlement" ? t("bookings.obligationOverdueSettlement")
    : obligation === "overdueRefund" ? t("bookings.obligationOverdueRefund") : t("bookings.obligationOverdueReport");
}

function useFormat() {
  const { i18n } = useTranslation();
  function when(value: string) {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }
  function slot(startAt: string, endAt: string) {
    const time = new Intl.DateTimeFormat(i18n.language, { timeStyle: "short" });
    return `${when(startAt)} – ${time.format(new Date(endAt))}`;
  }
  return { when, slot };
}

/** Sign-in and role gate shared by both booking pages. */
function Gate({ children }: { children: (csrfToken: string, userId: string) => ReactNode }) {
  const { t } = useTranslation();
  const auth = useAuth();
  if (auth.isPending) return <div className="space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-20 w-full" />)}</div>;
  if (!auth.data) return <AppNotice>
    <p>{t("bookings.signIn")}</p>
    <Link className="inline-block font-semibold text-accent-app"
      to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>{t("bookings.signInLink")}</Link>
  </AppNotice>;
  if (!auth.data.systemRoles.includes("ICPDP_OFFICER")) {
    return <AppNotice tone="danger" role="alert">{t("bookings.unauthorized")}</AppNotice>;
  }
  return <>{children(auth.data.csrfToken, auth.data.user.id)}</>;
}

function Queue({ csrfToken, userId }: { csrfToken: string; userId: string }) {
  const { t } = useTranslation();
  const { when, slot } = useFormat();
  const navigate = useNavigate();
  const queue = useBookingQueue(true);
  const action = useBookingAction();

  async function open(id: string, takenElsewhere: boolean) {
    if (!takenElsewhere) {
      try {
        await action.mutateAsync({ kind: "claim", id, csrfToken });
      } catch {
        return; // The error is shown under the list.
      }
    }
    navigate(`/workspace/bookings/${id}`);
  }

  if (queue.isPending) return <div className="space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-24 w-full" />)}</div>;
  if (queue.isError) return <AppNotice tone="danger" role="alert" title={queue.error.message || t("bookings.loadError")}>
    <AppButton variant="secondary" onClick={() => void queue.refetch()}>{t("bookings.retry")}</AppButton>
  </AppNotice>;
  if (!queue.data.length) return (
    <div className="py-16 text-center">
      <span aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-mint-soft-app text-mint-app"><AppIcon name="sparkles" className="size-7" /></span>
      <h2 className="mt-4 font-heading text-xl font-bold">{t("bookings.none")}</h2>
      <p className="mt-2 text-sm text-muted-app">{t("bookings.noneHint")}</p>
    </div>
  );
  return (
    <>
      <ul className="divide-y divide-border-app border-y border-border-app">
        {queue.data.map(({ task, booking }) => {
          const mine = task.assigneeId === userId;
          const takenElsewhere = Boolean(task.assigneeId && !mine);
          const over = booking.headcount !== undefined && booking.property.capacity !== undefined
            && booking.headcount > booking.property.capacity;
          return (
            <li key={task.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 px-2 py-5">
              <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft-app text-primary-app">
                <AppIcon name="mapPin" />
              </span>
              <div className="min-w-0 flex-1 basis-64">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-heading text-lg font-bold break-words">{booking.property.code} · {booking.property.name}</h2>
                  <AppBadge tone={mine ? "success" : takenElsewhere ? "danger" : "neutral"}>
                    {mine ? t("bookings.assignedToYou") : takenElsewhere ? t("bookings.assigned") : t("bookings.unassigned")}
                  </AppBadge>
                </div>
                <p className="mt-1 text-sm break-words text-muted-app">{booking.clubName} · {booking.purpose}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <AppBadge tone="info">{slot(booking.startAt, booking.endAt)}</AppBadge>
                  {booking.headcount !== undefined && <AppBadge tone={over ? "warning" : "neutral"}>
                    {t("bookings.headcount", { count: booking.headcount })}{over && ` · ${t("bookings.overCapacity")}`}</AppBadge>}
                  <span className="text-xs text-muted-app">{t("bookings.waitingSince", { date: when(task.openedAt) })}</span>
                </div>
              </div>
              <AppButton variant={takenElsewhere ? "secondary" : "primary"} disabled={action.isPending}
                onClick={() => void open(booking.id, takenElsewhere)}>
                {action.isPending && action.variables?.id === booking.id ? t("bookings.claiming") : t("bookings.open")}
                <AppIcon name="chevronRight" className="size-4" />
              </AppButton>
            </li>
          );
        })}
      </ul>
      {action.isError && <AppNotice tone="danger" role="alert" className="mt-4">{action.error.message}</AppNotice>}
    </>
  );
}

export function BookingQueuePage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const queue = useBookingQueue(Boolean(auth.data?.systemRoles.includes("ICPDP_OFFICER")));
  return (
    <>
      <PageHeader title={t("bookings.title")} description={t("bookings.description")}
        actions={queue.data && <AppBadge tone="info">{t("bookings.openCount", { count: queue.data.length })}</AppBadge>} />
      <Gate>{(csrfToken, userId) => <Queue csrfToken={csrfToken} userId={userId} />}</Gate>
    </>
  );
}

function localInput(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

function Review({ id, csrfToken, userId }: { id: string; csrfToken: string; userId: string }) {
  const { t } = useTranslation();
  const { when, slot } = useFormat();
  const detail = useBooking(id, true);
  const properties = useProperties(true);
  const action = useBookingAction();
  const [outcome, setOutcome] = useState<BookingReviewOutcome>("Approve");
  const [reason, setReason] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [altProperty, setAltProperty] = useState("");
  const [altStart, setAltStart] = useState("");
  const [altEnd, setAltEnd] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const back = { to: "/workspace/bookings", label: t("bookings.back") };

  if (detail.isPending) return <div className="space-y-4"><AppSkeleton className="h-10 w-1/2" /><AppSkeleton className="h-96 w-full" /></div>;
  if (detail.isError) return <>
    <PageHeader title={t("bookings.request")} back={back} />
    <AppNotice tone="danger" role="alert" title={detail.error.message || t("bookings.loadError")}>
      <AppButton variant="secondary" onClick={() => void detail.refetch()}>{t("bookings.retry")}</AppButton>
    </AppNotice>
  </>;

  const { booking, club, conflicts, task, decisions } = detail.data;
  const blocking = detail.data.allowOverbooking ? [] : conflicts.filter((item) => item.blocking);
  const over = booking.headcount !== undefined && booking.property.capacity !== undefined
    && booking.headcount > booking.property.capacity;
  const decidable = booking.state === "Under Review" && task.state === "Open" && task.assigneeId === userId;
  const approveBlocked = blocking.length > 0 || club.state !== "Active";
  const chosen = approveBlocked && outcome === "Approve" ? "Request revision" : outcome;
  const label = "text-xs font-semibold tracking-wide text-muted-app uppercase";
  const propertyOptions = [{ value: "", label: t("bookings.sameProperty") },
    ...(properties.data ?? []).filter((item) => item.isActive && item.id !== booking.property.id)
      .map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))];

  async function submit() {
    const startAt = localInput(altStart);
    const endAt = localInput(altEnd);
    const invalid = chosen !== "Approve" && !reason.trim() ? t("bookings.reasonMissing")
      : chosen === "Request revision" && (Boolean(startAt) !== Boolean(endAt)
        || (startAt && endAt && (endAt <= startAt || new Date(startAt) <= new Date()))) ? t("bookings.alternativeInvalid") : null;
    setFormError(invalid);
    if (invalid) return;
    const question = chosen === "Approve" ? t("bookings.confirmApprove") : chosen === "Reject" ? t("bookings.confirmReject")
      : t("bookings.confirmRevision");
    if (!window.confirm(question)) return;
    const alternative = chosen === "Request revision" && (altProperty || startAt)
      ? { ...(altProperty ? { propertyId: altProperty } : {}), ...(startAt ? { startAt, endAt } : {}) } : undefined;
    try {
      await action.mutateAsync({ kind: "decide", id, csrfToken, input: { outcome: chosen,
        reason: reason.trim() || undefined, reviewNote: reviewNote.trim() || undefined, alternative } });
    } catch { /* Mutation state is rendered below. */ }
  }

  return (
    <>
      <PageHeader title={`${booking.property.code} · ${booking.property.name}`} back={back}
        description={`${booking.clubName} · ${t("bookings.version", { number: booking.currentVersionNo })}`}
        actions={<AppBadge tone={stateTone(booking.state)}>{stateLabel(t, booking.state)}</AppBadge>} />
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-10">
          <dl className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2"><dt className={label}>{t("bookings.purpose")}</dt><dd className="mt-1 break-words">{booking.purpose}</dd></div>
            <div><dt className={label}>{t("bookings.slot")}</dt><dd className="mt-1 font-medium">{slot(booking.startAt, booking.endAt)}</dd></div>
            <div><dt className={label}>{t("bookings.location")}</dt><dd className="mt-1">{booking.property.location || "—"}
              {booking.property.capacity !== undefined && <span className="text-muted-app"> · {t("bookings.capacityValue", { count: booking.property.capacity })}</span>}</dd></div>
            {booking.headcount !== undefined && <div><dt className={label}>{t("bookings.headcount", { count: booking.headcount })}</dt>
              <dd className="mt-1">{over ? <AppBadge tone="warning">{t("bookings.overCapacity")}</AppBadge> : "—"}</dd></div>}
            {booking.event && <div><dt className={label}>{t("bookings.linkedEvent")}</dt><dd className="mt-1 break-words">{booking.event.title}</dd></div>}
            <div><dt className={label}>{t("bookings.clubState")}</dt><dd className="mt-1">{club.state}</dd></div>
            <div><dt className={label}>{t("bookings.obligations")}</dt><dd className="mt-1 flex flex-wrap gap-2">{club.obligations.length
              ? club.obligations.map((item) => <AppBadge key={item} tone="danger">{obligationLabel(t, item)}</AppBadge>)
              : t("bookings.noObligations")}</dd></div>
          </dl>

          <div className="space-y-3">
            {club.state !== "Active" && <AppNotice tone="danger">{t("bookings.clubNotActive")}</AppNotice>}
            {blocking.length > 0 && <AppNotice tone="danger">{t("bookings.blockingNotice")}</AppNotice>}
            {detail.data.allowOverbooking && conflicts.some((item) => item.blocking) && <AppNotice>{t("bookings.overbookingAllowed")}</AppNotice>}
            {over && <AppNotice tone="warning">{t("bookings.overCapacityNotice", { headcount: booking.headcount, capacity: booking.property.capacity })}</AppNotice>}
            {detail.data.outsideHours && <AppNotice tone="warning">{t("bookings.outsideHours")}</AppNotice>}
          </div>

          <section className="border-t border-border-app pt-8">
            <h2 className="font-heading text-xl font-bold">{t("bookings.conflicts")}</h2>
            {conflicts.length ? <ul className="mt-4 divide-y divide-border-app">{conflicts.map((item) =>
              <li key={`${item.kind}-${item.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="min-w-0">
                  <span className="block font-medium break-words">{item.title}</span>
                  <span className="text-sm text-muted-app">{item.kind === "event" ? t("bookings.conflictEvent") : t("bookings.conflictBooking")} · {slot(item.startAt, item.endAt)}</span>
                </span>
                <AppBadge tone={item.blocking ? "danger" : "warning"}>{item.blocking ? t("bookings.blocking") : t("bookings.warning")}</AppBadge>
              </li>)}</ul>
              : <p className="mt-3 text-sm text-muted-app">{t("bookings.noConflicts")}</p>}
          </section>

          <section className="border-t border-border-app pt-8">
            <h2 className="font-heading text-xl font-bold">{t("bookings.history")}</h2>
            {decisions.length ? <ol className="mt-5 space-y-4 border-l-2 border-border-app pl-5">{decisions.map((item) =>
              <li key={item.id} className="relative">
                <span aria-hidden="true" className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-primary-app" />
                <p className="font-semibold">{outcomeLabel(t, item.outcome)}
                  {item.versionNo && <span className="font-normal text-muted-app"> · {t("bookings.version", { number: item.versionNo })}</span>}</p>
                <p className="text-sm text-muted-app">{when(item.at)}</p>
                {item.reason && <p className="mt-1 text-sm break-words">{item.reason}</p>}
                {item.alternative && <p className="mt-1 text-sm text-muted-app">{t("bookings.outcomeAlternative", { value: [
                  item.alternative.propertyLabel,
                  item.alternative.startAt && item.alternative.endAt ? slot(item.alternative.startAt, item.alternative.endAt) : undefined,
                ].filter(Boolean).join(" · ") })}</p>}
              </li>)}</ol>
              : <p className="mt-3 text-sm text-muted-app">{t("bookings.noHistory")}</p>}
          </section>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-6">
          {decidable ? (
            <section className="rounded-2xl bg-surface-app p-5">
              <h2 className="font-heading text-lg font-bold">{t("bookings.decide")}</h2>
              <div role="radiogroup" aria-label={t("bookings.decide")} className="mt-4 grid gap-2">{outcomes.map((value) => {
                const disabled = value === "Approve" && approveBlocked;
                return <button key={value} type="button" role="radio" aria-checked={chosen === value} disabled={disabled}
                  onClick={() => setOutcome(value)}
                  className={cn("min-h-11 rounded-xl border border-border-app px-4 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring-app disabled:cursor-not-allowed disabled:opacity-50", {
                    "border-primary-app bg-primary-soft-app text-primary-app": chosen === value,
                  })}>{outcomeLabel(t, value)}</button>;
              })}</div>
              <label className="mt-5 block text-sm font-semibold">{t("bookings.reason")}
                <AppTextarea className="mt-2 min-h-24 w-full font-normal" value={reason} maxLength={5000}
                  onChange={(e) => setReason(e.target.value)} />
                <span className="mt-1 block text-xs font-normal text-muted-app">
                  {chosen === "Approve" ? t("bookings.reasonOptional") : t("bookings.reasonRequired")}</span></label>
              {chosen === "Request revision" && <fieldset className="mt-5">
                <legend className="text-sm font-semibold">{t("bookings.alternative")}</legend>
                <p className="mt-1 text-xs text-muted-app">{t("bookings.alternativeHint")}</p>
                <AppSelect className="mt-3 w-full" label={t("bookings.alternativeProperty")} value={altProperty}
                  onChange={setAltProperty} options={propertyOptions} />
                <label className="mt-3 block text-sm font-semibold">{t("bookings.alternativeStart")}
                  <AppInput type="datetime-local" value={altStart} onChange={(e) => setAltStart(e.target.value)} className="mt-2 w-full font-normal" /></label>
                <label className="mt-3 block text-sm font-semibold">{t("bookings.alternativeEnd")}
                  <AppInput type="datetime-local" value={altEnd} onChange={(e) => setAltEnd(e.target.value)} className="mt-2 w-full font-normal" /></label>
              </fieldset>}
              <label className="mt-5 block text-sm font-semibold">{t("bookings.reviewNote")}
                <AppTextarea className="mt-2 min-h-20 w-full font-normal" value={reviewNote} maxLength={5000}
                  onChange={(e) => setReviewNote(e.target.value)} />
                <span className="mt-1 block text-xs font-normal text-muted-app">{t("bookings.reviewNoteHint")}</span></label>
              <AppButton className="mt-6 w-full" disabled={action.isPending} onClick={() => void submit()}>
                {action.isPending ? t("bookings.submitting") : t("bookings.submit")}</AppButton>
              {formError && <p role="alert" className="mt-3 text-sm text-danger-app">{formError}</p>}
              {action.isError && <p role="alert" className="mt-3 text-sm text-danger-app">{action.error.message}</p>}
            </section>
          ) : (
            <AppNotice>{booking.state === "Under Review" && task.state === "Open" ? t("bookings.notYours") : t("bookings.notReviewable")}</AppNotice>
          )}
          {action.isSuccess && !decidable && <AppNotice role="status" className="mt-4">{t("bookings.decided")}</AppNotice>}
        </aside>
      </div>
    </>
  );
}

export function BookingReviewPage() {
  const { id } = useParams();
  return <Gate>{(csrfToken, userId) => id ? <Review id={id} csrfToken={csrfToken} userId={userId} /> : null}</Gate>;
}
