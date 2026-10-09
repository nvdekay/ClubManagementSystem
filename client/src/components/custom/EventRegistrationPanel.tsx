import { useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

import { EventCheckInForm } from "@/components/custom/EventCheckInForm";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useMyAttendances } from "@/hooks/useEventCheckIns";
import { isSignInRequired, useEventRegistrationAction, useEventRegistrationContext } from "@/hooks/useEventRegistrations";
import type { Locale } from "@/i18n";
import type {
  EventRegistrationAnswer,
  EventRegistrationContext,
  EventRegistrationFormField,
} from "@/services/eventRegistrations";
import { formatDate } from "@/utils/formatDate";

interface EventRegistrationPanelProps {
  eventId: string;
}

/** UC29 call to action on the public event page: sign in, register (or waitlist), see status, cancel. */
export function EventRegistrationPanel({ eventId }: EventRegistrationPanelProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const auth = useAuth();
  const signedIn = Boolean(auth.data);
  const context = useEventRegistrationContext(eventId, signedIn);
  const loginTarget = `/login?returnTo=${encodeURIComponent(location.pathname)}`;

  let body;
  if (auth.isPending) {
    body = <AppSkeleton className="h-24 w-full" />;
  } else if (!signedIn) {
    body = <SignInPrompt to={loginTarget} />;
  } else if (context.isPending) {
    body = <div className="space-y-3"><p role="status" className="text-sm text-muted-app">{t("eventRegistrations.loading")}</p>
      <AppSkeleton className="h-24 w-full" /></div>;
  } else if (context.isError) {
    body = isSignInRequired(context.error)
      ? <SignInPrompt to={loginTarget} />
      : <AppNotice tone="danger" role="alert" title={t("eventRegistrations.loadError")}>
        <p>{context.error.message}</p>
        <AppButton variant="secondary" onClick={() => void context.refetch()}>{t("eventRegistrations.retry")}</AppButton>
      </AppNotice>;
  } else {
    body = <RegistrationBody context={context.data} csrfToken={auth.data!.csrfToken} />;
  }

  return (
    <section aria-labelledby="event-registration-title" className="mt-8 rounded-3xl bg-surface-app p-5 sm:p-6">
      <h2 id="event-registration-title" className="font-heading text-xl font-bold">{t("eventRegistrations.panelTitle")}</h2>
      <div className="mt-4">{body}</div>
    </section>
  );
}

function SignInPrompt({ to }: { to: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-muted-app">{t("eventRegistrations.signInToRegister")}</p>
      <Link to={to} className="inline-flex min-h-11 items-center rounded-full bg-primary-app px-5 text-sm font-semibold text-on-primary-app shadow-sm hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
        {t("eventRegistrations.signIn")}
      </Link>
    </div>
  );
}

function RegistrationBody({ context, csrfToken }: { context: EventRegistrationContext; csrfToken: string }) {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === "vi" ? "vi" : "en";
  const action = useEventRegistrationAction();
  const attendances = useMyAttendances(true);
  const inFlight = useRef(false);
  const [answers, setAnswers] = useState<Record<string, EventRegistrationAnswer>>({});
  const [feedback, setFeedback] = useState<"registered" | "cancelled" | null>(null);
  const { event, registration } = context;
  const now = new Date();
  const started = new Date(event.startAt) <= now;
  const attendance = attendances.data?.find((item) => item.eventId === event.id);
  const spotsLeft = Math.max(event.capacity - event.confirmedRegistrationCount, 0);
  const full = event.capacity > 0 && spotsLeft === 0;
  const active = registration && registration.state !== "Cancelled" ? registration : null;
  const membersOnlyBlocked = event.audienceScope === "MEMBERS_ONLY" && !context.isActiveClubMember;
  const opensLater = event.registrationOpenAt ? new Date(event.registrationOpenAt) > now : false;

  async function run(input: Parameters<typeof action.mutateAsync>[0], done: "registered" | "cancelled") {
    if (inFlight.current) return;
    inFlight.current = true;
    setFeedback(null);
    try {
      await action.mutateAsync(input);
      setFeedback(done);
      if (done === "registered") setAnswers({});
    } catch {
      // action.isError renders the message below.
    } finally {
      inFlight.current = false;
    }
  }

  function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!formEvent.currentTarget.reportValidity()) return;
    void run({ kind: "register", eventId: event.id, csrfToken, answers }, "registered");
  }

  function cancel() {
    if (!active || !window.confirm(t("eventRegistrations.cancelConfirm"))) return;
    void run({ kind: "cancel", registrationId: active.id, csrfToken }, "cancelled");
  }

  const capacityLine = event.capacity > 0 && (
    <p className="text-sm text-muted-app">
      {t("eventRegistrations.capacity", { confirmed: event.confirmedRegistrationCount, capacity: event.capacity })}
      {!full && <> · <span className="font-semibold text-success-app">{t("eventRegistrations.spotsLeft", { count: spotsLeft })}</span></>}
    </p>
  );
  const windowLine = event.registrationOpenAt && event.registrationCloseAt && (
    <p className="text-sm text-muted-app">{t("eventRegistrations.window", {
      open: formatDate(event.registrationOpenAt, locale), close: formatDate(event.registrationCloseAt, locale) })}</p>
  );

  let main;
  if (active) {
    main = (
      <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <AppBadge tone={active.state === "Confirmed" ? "success" : "warning"}>
            {active.state === "Confirmed" ? t("eventRegistrations.confirmed")
              : t("eventRegistrations.waitlisted", { position: active.waitlistPosition ?? "—" })}
          </AppBadge>
          <p className="text-sm text-muted-app">{t("eventRegistrations.registeredAt", { date: formatDate(active.createdAt, locale) })}</p>
        </div>
        {started ? <p className="text-sm text-muted-app">{t("eventRegistrations.cancelLocked")}</p>
          : <AppButton variant="secondary" disabled={action.isPending} onClick={cancel}>
            {action.isPending ? t("eventRegistrations.cancelling") : t("eventRegistrations.cancel")}
          </AppButton>}
      </div>
      {attendance ? (
        <AppNotice tone="success" title={t("eventRegistrations.checkedInBadge")}>
          <p>{t("eventRegistrations.checkedInAt", { date: formatDate(attendance.checkedInAt, locale) })}</p>
        </AppNotice>
      ) : active.state === "Confirmed" && new Date(active.checkInOpensAt) <= now && now < new Date(active.checkInClosesAt) && (
        <div className="rounded-2xl bg-bg-app p-4">
          <h3 className="mb-2 font-semibold">{t("eventRegistrations.checkInOpen")}</h3>
          <EventCheckInForm eventId={event.id} />
        </div>
      )}
      </div>
    );
  } else if (!context.registrationOpen) {
    main = <AppNotice>{opensLater && event.registrationOpenAt
      ? t("eventRegistrations.notOpenYet", { date: formatDate(event.registrationOpenAt, locale) })
      : t("eventRegistrations.closed")}</AppNotice>;
  } else if (membersOnlyBlocked) {
    main = <AppNotice tone="warning">{t("eventRegistrations.membersOnly", { club: event.clubName })}</AppNotice>;
  } else if (full && !event.waitlistEnabled) {
    main = <AppNotice tone="warning">{t("eventRegistrations.full")}</AppNotice>;
  } else {
    main = (
      <form onSubmit={submit} className="space-y-5" noValidate={false}>
        {registration?.state === "Cancelled" && <AppNotice tone="info">{t("eventRegistrations.reRegisterHint")}</AppNotice>}
        {full && <AppNotice tone="warning">{t("eventRegistrations.waitlistOpen")}</AppNotice>}
        {context.formSchema.length > 0 && (
          <fieldset className="space-y-4">
            <legend className="mb-1 font-semibold">{t("eventRegistrations.formTitle")}</legend>
            {context.formSchema.map((field) => (
              <FormField key={field.key} field={field} value={answers[field.key]}
                onChange={(value) => setAnswers((current) => ({ ...current, [field.key]: value }))} />
            ))}
          </fieldset>
        )}
        <AppButton type="submit" disabled={action.isPending}>
          {action.isPending ? t("eventRegistrations.registering")
            : full ? t("eventRegistrations.joinWaitlist") : t("eventRegistrations.register")}
        </AppButton>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">{capacityLine}{windowLine}</div>
      {main}
      {action.isError && <AppNotice tone="danger" role="alert" title={t("eventRegistrations.actionError")}>
        <p>{action.error.message}</p></AppNotice>}
      {feedback && !action.isError && <p role="status" className="text-sm font-semibold text-success-app">
        {feedback === "registered" ? t("eventRegistrations.registerSuccess") : t("eventRegistrations.cancelSuccess")}
      </p>}
    </div>
  );
}

interface FormFieldProps {
  field: EventRegistrationFormField;
  value: EventRegistrationAnswer | undefined;
  onChange: (value: EventRegistrationAnswer) => void;
}

function FormField({ field, value, onChange }: FormFieldProps) {
  const { t } = useTranslation();
  const id = `registration-${field.key}`;
  const label = <span className="flex flex-wrap items-baseline gap-2 text-sm font-medium">
    {field.label}{field.required && <span className="text-xs text-danger-app">{t("eventRegistrations.required")}</span>}
  </span>;
  const text = typeof value === "string" ? value : "";
  const list = Array.isArray(value) ? value : [];
  const options = field.options ?? [];

  if (field.type === "text" || field.type === "textarea") {
    return <label htmlFor={id} className="block space-y-1.5">{label}
      {field.type === "text"
        ? <AppInput id={id} value={text} required={field.required} maxLength={2000} className="w-full"
          onChange={(event) => onChange(event.target.value)} />
        : <AppTextarea id={id} value={text} required={field.required} maxLength={2000} className="w-full"
          onChange={(event) => onChange(event.target.value)} />}
    </label>;
  }
  if (field.type === "select") {
    return <div className="space-y-1.5">{label}
      <AppSelect label={field.label} value={text} className="w-full"
        options={[{ value: "", label: t("eventRegistrations.choose") }, ...options.map((option) => ({ value: option, label: option }))]}
        onChange={onChange} />
      {/* AppSelect is a custom combobox; this hidden input lets the form enforce "required" natively. */}
      {field.required && <input tabIndex={-1} aria-hidden="true" className="sr-only" required value={text} onChange={() => undefined} />}
    </div>;
  }
  return (
    <fieldset className="space-y-1.5">
      <legend>{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = field.type === "radio" ? text === option : list.includes(option);
          return (
            <label key={option} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-app bg-bg-app px-4 text-sm has-checked:border-primary-app has-checked:bg-primary-soft-app has-checked:text-primary-app">
              <input type={field.type} name={id} value={option} checked={checked}
                required={field.required && field.type === "radio"} className="accent-primary-app"
                onChange={(event) => onChange(field.type === "radio" ? option
                  : event.target.checked ? [...list, option] : list.filter((item) => item !== option))} />
              {option}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
