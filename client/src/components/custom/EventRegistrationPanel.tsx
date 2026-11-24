import { useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'

import { EventCheckInForm } from '@/components/custom/EventCheckInForm'
import { AppBadge } from '@/components/ui/badge/AppBadge'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppFieldError } from '@/components/ui/field/AppFieldError'
import { AppRequiredMark } from '@/components/ui/field/AppRequiredMark'
import { AppInput } from '@/components/ui/input/AppInput'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppSelect } from '@/components/ui/select/AppSelect'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { AppTextarea } from '@/components/ui/textarea/AppTextarea'
import { useAuth } from '@/hooks/useAuth'
import { useMyAttendances } from '@/hooks/useEventCheckIns'
import {
  isSignInRequired,
  useEventRegistrationAction,
  useEventRegistrationContext,
} from '@/hooks/useEventRegistrations'
import type { Locale } from '@/i18n'
import type {
  EventRegistrationAnswer,
  EventRegistrationContext,
  EventRegistrationFormField,
} from '@/services/eventRegistrations'
import { formatDate } from '@/utils/formatDate'
import { useConfirm } from '@/hooks/useConfirm'
import { useFieldValidation } from '@/hooks/useFieldValidation'

interface EventRegistrationPanelProps {
  eventId: string
}

// Khu vực đăng ký sự kiện: yêu cầu đăng nhập rồi hiển thị trạng thái đăng ký
/** UC29 trên trang sự kiện công khai: đăng nhập, đăng ký (hoặc vào danh sách chờ), xem trạng thái, huỷ. */
export function EventRegistrationPanel({ eventId }: EventRegistrationPanelProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const auth = useAuth()
  const signedIn = Boolean(auth.data)
  const context = useEventRegistrationContext(eventId, signedIn)
  const loginTarget = `/login?returnTo=${encodeURIComponent(location.pathname)}`

  let body
  if (auth.isPending) {
    body = <AppSkeleton className="h-24 w-full" />
  } else if (!signedIn) {
    body = <SignInPrompt to={loginTarget} />
  } else if (context.isPending) {
    body = (
      <div className="space-y-3">
        <p role="status" className="text-sm text-muted-app">
          {t('eventRegistrations.loading')}
        </p>
        <AppSkeleton className="h-24 w-full" />
      </div>
    )
  } else if (context.isError) {
    body = isSignInRequired(context.error) ? (
      <SignInPrompt to={loginTarget} />
    ) : (
      <AppNotice tone="danger" role="alert" title={t('eventRegistrations.loadError')}>
        <p>{context.error.message}</p>
        <AppButton variant="secondary" onClick={() => void context.refetch()}>
          {t('eventRegistrations.retry')}
        </AppButton>
      </AppNotice>
    )
  } else {
    body = <RegistrationBody context={context.data} csrfToken={auth.data!.csrfToken} />
  }

  return (
    <section
      aria-labelledby="event-registration-title"
      className="mt-8 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs sm:p-6"
    >
      <h2 id="event-registration-title" className="font-heading text-lg font-semibold">
        {t('eventRegistrations.panelTitle')}
      </h2>
      <div className="mt-4">{body}</div>
    </section>
  )
}

// Lời nhắc đăng nhập để đăng ký sự kiện
function SignInPrompt({ to }: { to: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-muted-app">{t('eventRegistrations.signInToRegister')}</p>
      <Link
        to={to}
        className="inline-flex min-h-11 items-center rounded-lg bg-primary-app px-4 text-sm font-medium text-on-primary-app shadow-xs hover:opacity-90 sm:min-h-9 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app"
      >
        {t('eventRegistrations.signIn')}
      </Link>
    </div>
  )
}

// Nội dung đăng ký: form, sức chứa, đăng ký hiện tại và huỷ đăng ký
function RegistrationBody({
  context,
  csrfToken,
}: {
  context: EventRegistrationContext
  csrfToken: string
}) {
  const { t, i18n } = useTranslation()
  const askConfirm = useConfirm()
  const locale: Locale = i18n.language === 'vi' ? 'vi' : 'en'
  const action = useEventRegistrationAction()
  const attendances = useMyAttendances(true)
  const inFlight = useRef(false)
  const [answers, setAnswers] = useState<Record<string, EventRegistrationAnswer>>({})
  const [feedback, setFeedback] = useState<'registered' | 'cancelled' | null>(null)
  const { event, registration } = context
  const now = new Date()
  const started = new Date(event.startAt) <= now
  const attendance = attendances.data?.find((item) => item.eventId === event.id)
  const spotsLeft = Math.max(event.capacity - event.confirmedRegistrationCount, 0)
  const full = event.capacity > 0 && spotsLeft === 0
  const active = registration && registration.state !== 'Cancelled' ? registration : null
  const membersOnlyBlocked = event.audienceScope === 'MEMBERS_ONLY' && !context.isActiveClubMember
  const opensLater = event.registrationOpenAt ? new Date(event.registrationOpenAt) > now : false
  // Cùng quy tắc có mặt mà server áp dụng cho câu trả lời bắt buộc (mọi giá trị không rỗng).
  const validation = useFieldValidation(
    Object.fromEntries(
      context.formSchema.map((field) => {
        const answer = answers[field.key]
        const present = (Array.isArray(answer) ? answer : [answer ?? '']).some((value) =>
          value.trim(),
        )
        const choice =
          field.type === 'select' || field.type === 'radio' || field.type === 'checkbox'
        return [
          field.key,
          field.required && !present
            ? t(choice ? 'common.chooseRequired' : 'common.fieldRequired')
            : null,
        ]
      }),
    ),
  )

  // Chạy thao tác đăng ký hoặc huỷ, chống gửi trùng và báo kết quả
  async function run(
    input: Parameters<typeof action.mutateAsync>[0],
    done: 'registered' | 'cancelled',
  ) {
    if (inFlight.current) {
      return
    }
    inFlight.current = true
    setFeedback(null)
    try {
      await action.mutateAsync(input)
      setFeedback(done)
      if (done === 'registered') {
        setAnswers({})
        validation.reset()
      }
    } catch {
      // action.isError hiển thị thông báo lỗi bên dưới.
    } finally {
      inFlight.current = false
    }
  }

  // Kiểm tra hợp lệ rồi gửi đăng ký sự kiện
  function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    if (!validation.touchAll()) {
      return
    }
    void run({ kind: 'register', eventId: event.id, csrfToken, answers }, 'registered')
  }

  // Xin xác nhận rồi huỷ đăng ký hiện tại
  async function cancel() {
    if (!active || !(await askConfirm(t('eventRegistrations.cancelConfirm')))) {
      return
    }
    void run({ kind: 'cancel', registrationId: active.id, csrfToken }, 'cancelled')
  }

  const capacityLine = event.capacity > 0 && (
    <p className="text-sm text-muted-app">
      {t('eventRegistrations.capacity', {
        confirmed: event.confirmedRegistrationCount,
        capacity: event.capacity,
      })}
      {!full && (
        <>
          {' '}
          ·{' '}
          <span className="font-semibold text-success-app">
            {t('eventRegistrations.spotsLeft', { count: spotsLeft })}
          </span>
        </>
      )}
    </p>
  )
  const windowLine = event.registrationOpenAt && event.registrationCloseAt && (
    <p className="text-sm text-muted-app">
      {t('eventRegistrations.window', {
        open: formatDate(event.registrationOpenAt, locale),
        close: formatDate(event.registrationCloseAt, locale),
      })}
    </p>
  )

  let main
  if (active) {
    main = (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <AppBadge tone={active.state === 'Confirmed' ? 'success' : 'warning'}>
              {active.state === 'Confirmed'
                ? t('eventRegistrations.confirmed')
                : t('eventRegistrations.waitlisted', { position: active.waitlistPosition ?? '—' })}
            </AppBadge>
            <p className="text-sm text-muted-app">
              {t('eventRegistrations.registeredAt', { date: formatDate(active.createdAt, locale) })}
            </p>
          </div>
          {started ? (
            <p className="text-sm text-muted-app">{t('eventRegistrations.cancelLocked')}</p>
          ) : (
            <AppButton variant="secondary" disabled={action.isPending} onClick={cancel}>
              {action.isPending
                ? t('eventRegistrations.cancelling')
                : t('eventRegistrations.cancel')}
            </AppButton>
          )}
        </div>
        {attendance ? (
          <AppNotice tone="success" title={t('eventRegistrations.checkedInBadge')}>
            <p>
              {t('eventRegistrations.checkedInAt', {
                date: formatDate(attendance.checkedInAt, locale),
              })}
            </p>
          </AppNotice>
        ) : (
          active.state === 'Confirmed' &&
          new Date(active.checkInOpensAt) <= now &&
          now < new Date(active.checkInClosesAt) && (
            <div className="rounded-xl border border-border-app bg-surface-app p-4">
              <h3 className="mb-2 font-semibold">{t('eventRegistrations.checkInOpen')}</h3>
              <EventCheckInForm eventId={event.id} />
            </div>
          )
        )}
      </div>
    )
  } else if (!context.registrationOpen) {
    main = (
      <AppNotice>
        {opensLater && event.registrationOpenAt
          ? t('eventRegistrations.notOpenYet', {
              date: formatDate(event.registrationOpenAt, locale),
            })
          : t('eventRegistrations.closed')}
      </AppNotice>
    )
  } else if (membersOnlyBlocked) {
    main = (
      <AppNotice tone="warning">
        {t('eventRegistrations.membersOnly', { club: event.clubName })}
      </AppNotice>
    )
  } else if (full && !event.waitlistEnabled) {
    main = <AppNotice tone="warning">{t('eventRegistrations.full')}</AppNotice>
  } else {
    main = (
      <form onSubmit={submit} className="space-y-5" noValidate>
        {registration?.state === 'Cancelled' && (
          <AppNotice tone="info">{t('eventRegistrations.reRegisterHint')}</AppNotice>
        )}
        {full && <AppNotice tone="warning">{t('eventRegistrations.waitlistOpen')}</AppNotice>}
        {context.formSchema.length > 0 && (
          <fieldset className="space-y-4">
            <legend className="mb-1 font-semibold">{t('eventRegistrations.formTitle')}</legend>
            {context.formSchema.map((field) => (
              <FormField
                key={field.key}
                field={field}
                value={answers[field.key]}
                error={validation.error(field.key)}
                onTouch={() => validation.touch(field.key)}
                onChange={(value) => setAnswers((current) => ({ ...current, [field.key]: value }))}
              />
            ))}
          </fieldset>
        )}
        <AppButton type="submit" disabled={action.isPending}>
          {action.isPending
            ? t('eventRegistrations.registering')
            : full
              ? t('eventRegistrations.joinWaitlist')
              : t('eventRegistrations.register')}
        </AppButton>
      </form>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        {capacityLine}
        {windowLine}
      </div>
      {main}
      {action.isError && (
        <AppNotice tone="danger" role="alert" title={t('eventRegistrations.actionError')}>
          <p>{action.error.message}</p>
        </AppNotice>
      )}
      {feedback && !action.isError && (
        <p role="status" className="text-sm font-semibold text-success-app">
          {feedback === 'registered'
            ? t('eventRegistrations.registerSuccess')
            : t('eventRegistrations.cancelSuccess')}
        </p>
      )}
    </div>
  )
}

interface FormFieldProps {
  field: EventRegistrationFormField
  value: EventRegistrationAnswer | undefined
  error: string | null
  onTouch: () => void
  onChange: (value: EventRegistrationAnswer) => void
}

// Hiển thị một trường của form đăng ký theo kiểu dữ liệu của trường
function FormField({ field, value, error, onTouch, onChange }: FormFieldProps) {
  const { t } = useTranslation()
  const id = `registration-${field.key}`
  const label = (
    <span className="flex flex-wrap items-baseline gap-2 text-sm font-medium">
      <span>
        {field.label}
        {field.required && <AppRequiredMark />}
      </span>
    </span>
  )
  const text = typeof value === 'string' ? value : ''
  const list = Array.isArray(value) ? value : []
  const options = field.options ?? []

  if (field.type === 'text' || field.type === 'textarea') {
    return (
      <label htmlFor={id} className="block space-y-1.5">
        {label}
        {field.type === 'text' ? (
          <AppInput
            id={id}
            value={text}
            required={field.required}
            maxLength={2000}
            className="w-full"
            aria-invalid={error ? true : undefined}
            onBlur={onTouch}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <AppTextarea
            id={id}
            value={text}
            required={field.required}
            maxLength={2000}
            className="w-full"
            aria-invalid={error ? true : undefined}
            onBlur={onTouch}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
        <AppFieldError message={error} />
      </label>
    )
  }
  if (field.type === 'select') {
    return (
      <div className="space-y-1.5">
        {label}
        <AppSelect
          label={field.label}
          value={text}
          className="w-full"
          required={field.required}
          invalid={Boolean(error)}
          options={[
            { value: '', label: t('eventRegistrations.choose') },
            ...options.map((option) => ({ value: option, label: option })),
          ]}
          onChange={(next) => {
            onChange(next)
            onTouch()
          }}
        />
        <AppFieldError message={error} />
      </div>
    )
  }
  return (
    <fieldset
      className="space-y-1.5"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          onTouch()
        }
      }}
    >
      <legend>{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = field.type === 'radio' ? text === option : list.includes(option)
          return (
            <label
              key={option}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border-app bg-bg-app px-3.5 text-sm sm:min-h-9 has-checked:border-brand-app has-checked:bg-primary-soft-app has-checked:text-primary-app"
            >
              <input
                type={field.type}
                name={id}
                value={option}
                checked={checked}
                required={field.required && field.type === 'radio'}
                className="accent-primary-app"
                onChange={(event) => {
                  onChange(
                    field.type === 'radio'
                      ? option
                      : event.target.checked
                        ? [...list, option]
                        : list.filter((item) => item !== option),
                  )
                  onTouch()
                }}
              />
              {option}
            </label>
          )
        })}
      </div>
      <AppFieldError message={error} />
    </fieldset>
  )
}
