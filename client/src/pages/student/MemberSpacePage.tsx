import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";

import { ClubLogo } from "@/components/custom/ClubLogo";
import { MembershipStateBadge } from "@/components/custom/MembershipStateBadge";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { isNotAMember, useMemberSpace, useMembershipAction } from "@/hooks/useMemberSpace";
import type { Locale } from "@/i18n";
import type { MemberSpace } from "@/services/memberSpace";
import { formatDate, formatDay } from "@/utils/formatDate";

const registrationLabels = { Confirmed: "memberSpace.regConfirmed", Waitlisted: "memberSpace.regWaitlisted",
  Cancelled: "memberSpace.regCancelled" } as const;

/** Today in Vietnam (the server compares leave dates by Asia/Ho_Chi_Minh calendar day). */
function todayInVietnam(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit",
    day: "2-digit" }).format(new Date());
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border-app pt-6 first:border-t-0 first:pt-0">
      <h2 className="mb-3 font-heading text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

/** UC24 member space (read-only) with UC22 leave request; links to UC29/UC31/UC48 are navigation only. */
export function MemberSpacePage() {
  const { t } = useTranslation();
  const { clubId } = useParams();
  const auth = useAuth();
  const space = useMemberSpace(clubId, Boolean(auth.data));

  if (space.isPending) {
    return <div className="space-y-4"><AppSkeleton className="h-24 w-full" /><AppSkeleton className="h-64 w-full" /></div>;
  }
  if (space.isError) {
    return isNotAMember(space.error) ? (
      <section className="mx-auto max-w-lg py-16 text-center">
        <h1 className="font-heading text-2xl font-bold">{t("memberSpace.notMemberTitle")}</h1>
        <p className="mt-2 text-muted-app">{t("memberSpace.notMemberText")}</p>
        <Link to={`/clubs/${clubId ?? ""}`} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary-app px-5 text-sm font-semibold text-on-primary-app hover:opacity-90">
          {t("memberSpace.publicPage")}</Link>
      </section>
    ) : (
      <AppNotice tone="danger" role="alert" title={t("memberSpace.loadError")}>
        <p>{space.error.message}</p>
        <AppButton variant="secondary" onClick={() => void space.refetch()}>{t("memberSpace.retry")}</AppButton>
      </AppNotice>
    );
  }
  return <MemberSpaceView space={space.data} csrfToken={auth.data!.csrfToken} />;
}

function MemberSpaceView({ space, csrfToken }: { space: MemberSpace; csrfToken: string }) {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === "vi" ? "vi" : "en";
  const navigate = useNavigate();
  const { club, membership } = space;
  const pending = membership.pendingWithdrawal;
  const hasTodo = space.feedbackToSend.length > 0 || Boolean(pending);

  return (
    <>
      <header className="mb-8 flex flex-wrap items-center gap-4">
        <ClubLogo name={club.name} logoUrl={club.logoUrl} size={64} />
        <div className="min-w-0 flex-1 basis-56">
          <h1 className="font-heading text-2xl font-bold tracking-tight break-words sm:text-3xl">{club.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <MembershipStateBadge state={membership.state} />
            <Link to={`/clubs/${club.id}`} className="text-sm font-semibold text-accent-app hover:underline">
              {t("memberSpace.publicPage")}</Link>
          </div>
        </div>
        {space.otherClubs.length > 0 && (
          <div className="w-full sm:w-64">
            <AppSelect label={t("memberSpace.switchClub")} value={club.id} className="w-full"
              onChange={(value) => { if (value !== club.id) void navigate(`/workspace/clubs/${value}`); }}
              options={[{ value: club.id, label: club.name },
                ...space.otherClubs.map((item) => ({ value: item.clubId, label: item.clubName }))]} />
          </div>
        )}
      </header>

      {membership.state === "Inactive" && <AppNotice tone="warning" className="mb-6">{t("memberSpace.inactiveNote")}</AppNotice>}

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
          <Section title={t("memberSpace.todo")}>
            {!hasTodo ? <p className="text-sm text-muted-app">{t("memberSpace.todoEmpty")}</p> : (
              <ul className="space-y-2">
                {pending && (
                  <li><AppNotice tone="warning">{pending.state === "Held" ? t("memberSpace.withdrawalHeld")
                    : t("memberSpace.withdrawalPending", { date: formatDay(pending.requestedEffectiveDate, locale) })}</AppNotice></li>
                )}
                {space.feedbackToSend.map((item) => (
                  <li key={item.eventId} className="flex flex-wrap items-center gap-3 rounded-2xl bg-primary-soft-app p-3">
                    <AppIcon name="star" className="size-5 text-primary-app" />
                    <span className="min-w-0 flex-1 text-sm break-words">
                      {t("memberSpace.feedbackOwed", { title: item.eventTitle })}
                      {item.closesAt && <span className="text-muted-app"> · {t("memberSpace.feedbackUntil", { date: formatDate(item.closesAt, locale) })}</span>}
                    </span>
                    <Link to={`/events/${item.eventId}`} className="inline-flex min-h-10 items-center rounded-full bg-primary-app px-4 text-sm font-semibold text-on-primary-app hover:opacity-90">
                      {t("memberSpace.giveFeedback")}</Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={t("memberSpace.upcoming")}>
            {space.upcomingEvents.length === 0 ? <p className="text-sm text-muted-app">{t("memberSpace.upcomingEmpty")}</p> : (
              <ul className="divide-y divide-border-app">
                {space.upcomingEvents.map((event) => (
                  <li key={event.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1 basis-56">
                      <Link to={`/events/${event.id}`} className="font-semibold break-words hover:text-primary-app hover:underline">{event.title}</Link>
                      <p className="text-sm text-muted-app">{formatDate(event.startAt, locale)}{event.venueText && ` · ${event.venueText}`}</p>
                    </div>
                    {event.registrationState ? (
                      <AppBadge tone={event.registrationState === "Confirmed" ? "success" : event.registrationState === "Waitlisted" ? "warning" : "neutral"}>
                        {t(registrationLabels[event.registrationState])}</AppBadge>
                    ) : (
                      <Link to={`/events/${event.id}`} className="inline-flex min-h-10 items-center rounded-full border border-border-app px-4 text-sm font-semibold hover:border-primary-app hover:text-primary-app">
                        {t("memberSpace.register")}</Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={t("memberSpace.attendance")}>
            {space.attendance.length === 0 ? <p className="text-sm text-muted-app">{t("memberSpace.attendanceEmpty")}</p> : (
              <ul className="divide-y divide-border-app">
                {space.attendance.map((item) => (
                  <li key={item.eventId} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <Link to={`/events/${item.eventId}`} className="min-w-0 font-semibold break-words hover:text-primary-app hover:underline">{item.eventTitle}</Link>
                    <span className="text-sm text-muted-app">{t("memberSpace.checkedIn", { date: formatDate(item.checkedInAt, locale) })}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={`${t("memberSpace.members")} · ${t("memberSpace.membersCount", { count: space.members.length })}`}>
            <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {space.members.map((member, index) => (
                <li key={`${member.displayName}-${index}`} className="flex items-center gap-3">
                  <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint-soft-app text-sm font-bold text-mint-app">
                    {member.displayName.trim().charAt(0).toUpperCase()}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium" title={member.displayName}>{member.displayName}</span>
                    <span className="block text-xs text-muted-app">
                      {member.positions.join(", ") || t("memberSpace.noPosition")}
                      {member.state === "Inactive" && ` · ${t("memberSpace.stateInactive")}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6">
          <section className="rounded-3xl bg-surface-app p-5">
            <h2 className="font-heading text-lg font-bold">{t("memberSpace.yourMembership")}</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="text-muted-app">{t("memberSpace.positions")}</dt>
                <dd className="font-semibold">{membership.positions.join(", ") || t("memberSpace.noPosition")}</dd></div>
            </dl>
            <p className="mt-2 text-sm text-muted-app">{t("memberSpace.joinedOn", { date: formatDay(membership.joinedAt, locale) })}</p>
          </section>
          <section className="rounded-3xl bg-surface-app p-5">
            <h2 className="font-heading text-lg font-bold">{t("memberSpace.board")}</h2>
            {space.board.length === 0 ? <p className="mt-2 text-sm text-muted-app">{t("memberSpace.boardEmpty")}</p> : (
              <ul className="mt-3 space-y-2 text-sm">
                {space.board.map((seat) => (
                  <li key={`${seat.positionName}-${seat.memberName}`}>
                    <span className="text-muted-app">{seat.positionName}: </span><span className="font-semibold">{seat.memberName}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {!pending && <LeaveClub membershipId={membership.id} csrfToken={csrfToken} />}
        </aside>
      </div>
    </>
  );
}

/** UC22: the member asks to leave; the club executes it in UC21, so membership state does not change here. */
function LeaveClub({ membershipId, csrfToken }: { membershipId: string; csrfToken: string }) {
  const { t } = useTranslation();
  const action = useMembershipAction();
  const inFlight = useRef(false);
  const reasonId = useId();
  const dateId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(todayInVietnam);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !event.currentTarget.reportValidity()) return;
    inFlight.current = true;
    try {
      // Noon in Vietnam keeps the chosen calendar day whatever the browser's timezone.
      await action.mutateAsync({ kind: "request", membershipId, reason: reason.trim(),
        requestedEffectiveDate: new Date(`${date}T12:00:00+07:00`).toISOString(), csrfToken });
      setOpen(false);
    } catch {
      // action.isError renders below.
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <section className="rounded-3xl border border-border-app p-5">
      <h2 className="font-heading text-lg font-bold">{t("memberSpace.leaveTitle")}</h2>
      <p className="mt-1 text-sm text-muted-app">{t("memberSpace.leaveIntro")}</p>
      {action.isSuccess && <p role="status" className="mt-3 text-sm font-semibold text-success-app">{t("memberSpace.leaveSent")}</p>}
      {!open ? (
        <AppButton variant="secondary" className="mt-4" onClick={() => setOpen(true)}>
          <AppIcon name="logout" className="size-4" />{t("memberSpace.leaveOpen")}</AppButton>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <label htmlFor={reasonId} className="block text-sm font-medium">{t("memberSpace.leaveReason")}</label>
            <AppTextarea id={reasonId} value={reason} required maxLength={2000} rows={3} className="w-full"
              onChange={(event) => setReason(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={dateId} className="block text-sm font-medium">{t("memberSpace.leaveDate")}</label>
            <AppInput id={dateId} type="date" value={date} min={todayInVietnam()} required className="w-full"
              onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <AppButton type="submit" disabled={action.isPending || !reason.trim()}>
              {action.isPending ? t("memberSpace.leaveSubmitting") : t("memberSpace.leaveSubmit")}</AppButton>
            <AppButton type="button" variant="ghost" onClick={() => setOpen(false)}>{t("memberSpace.cancel")}</AppButton>
          </div>
          {action.isError && <AppNotice tone="danger" role="alert" title={t("memberSpace.leaveError")}><p>{action.error.message}</p></AppNotice>}
        </form>
      )}
    </section>
  );
}
