/** Trang ICPDP quản lý mẫu đề xuất, nhận hồ sơ xử lý và mở chi tiết xét duyệt. */
import { useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { AppBadge } from '@/components/ui/badge/AppBadge'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppEmptyState } from '@/components/ui/empty-state/AppEmptyState'
import { AppIcon } from '@/components/ui/icon/AppIcon'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { appToast } from '@/components/ui/toast/AppToast'
import { useAuth } from '@/hooks/useAuth'
import { useEventProposalTemplate } from '@/hooks/useClubEvents'
import {
  useEventProposalAction,
  useEventProposalQueue,
  useUploadProposalTemplate,
} from '@/hooks/useEventProposalReviews'
import { EVENT_PROPOSAL_TEMPLATE_DOWNLOAD_URL } from '@/services/clubEvents'
import { formatBytes, proposalFileType } from '@/utils/proposalFile'

/** Chỉ tải danh sách chờ duyệt sau khi xác nhận người dùng có vai trò ICPDP. */
export function EventProposalQueuePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const auth = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get('view') === 'approved' ? 'approved' : 'pending'
  // Chỉ ICPDP được tải danh sách và mẫu; các thao tác ghi theo dõi trạng thái chờ và lỗi riêng.
  const isOfficer = Boolean(auth.data?.systemRoles.includes('ICPDP_OFFICER'))
  const queue = useEventProposalQueue(isOfficer, view)
  const action = useEventProposalAction()
  const template = useEventProposalTemplate(isOfficer)
  const replaceTemplate = useUploadProposalTemplate()
  const templateInput = useRef<HTMLInputElement>(null)
  const [templateError, setTemplateError] = useState<string | null>(null)

  /** Kiểm tra file mẫu được chọn rồi gọi API thay mẫu dùng chung. */
  async function uploadTemplate(file: File | undefined) {
    if (!file || !auth.data) {
      return
    }
    replaceTemplate.reset()
    const mimeType = proposalFileType(file, ['docx', 'pdf', 'xlsx'], 10 * 1024 * 1024)
    setTemplateError(mimeType ? null : t('eventReviews.templateInvalid'))
    if (!mimeType) {
      return
    }
    try {
      await replaceTemplate.mutateAsync({ file, mimeType, csrfToken: auth.data.csrfToken })
      appToast.success(t('eventReviews.templateReplaced'))
    } catch {
      // Lỗi thay mẫu được hiển thị trong thẻ thông tin mẫu.
    }
  }

  /** Định dạng thời gian trong danh sách theo ngôn ngữ giao diện đang chọn. */
  function date(value: string) {
    return new Intl.DateTimeFormat(i18n.language, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  }

  /** Dịch mức rủi ro đã biết; giữ nguyên giá trị khác do server trả về. */

  /** Hiển thị kinh phí đề nghị theo tiền Việt Nam, không có phần thập phân. */
  function money(value: number) {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value)
  }

  /** Nhận hồ sơ còn trống trước khi mở chi tiết; hồ sơ đã giao người khác chỉ mở để xem. */
  async function open(eventId: string, takenElsewhere: boolean) {
    if (!auth.data) {
      return
    }
    if (view === 'pending' && !takenElsewhere) {
      try {
        await action.mutateAsync({ kind: 'claim', id: eventId, csrfToken: auth.data.csrfToken })
      } catch {
        return // Giữ danh sách hiện tại để ICPDP đọc được lỗi nhận xử lý.
      }
    }
    navigate(`/workspace/event-proposals/${eventId}`)
  }

  const loading = (
    <div className="space-y-2">
      {[0, 1, 2].map((item) => (
        <AppSkeleton key={item} className="h-24 w-full" />
      ))}
    </div>
  )

  return (
    <>
      <PageHeader
        title={t('eventReviews.title')}
        description={t('eventReviews.description')}
        actions={
          queue.data && (
            <AppBadge tone="info">
              {t(view === 'approved' ? 'eventReviews.approvedCount' : 'eventReviews.openCount', {
                count: queue.data.length,
              })}
            </AppBadge>
          )
        }
      />

      {/* Quản lý mẫu dùng chung: thông tin file, tải xuống, thay mẫu và lỗi tải lên. */}
      {isOfficer && (
        <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-app bg-bg-app p-5 text-sm shadow-xs">
          <div className="min-w-0 flex-1 basis-64">
            <h2 className="font-heading text-base font-semibold">
              {t('eventReviews.templateTitle')}
            </h2>
            {template.data ? (
              <p className="mt-1 break-words">
                {template.data.fileName} · {formatBytes(template.data.bytes)} ·{' '}
                {template.data.isSystemDefault
                  ? t('eventReviews.templateDefault')
                  : t('eventReviews.templateUpdated', { date: date(template.data.updatedAt) })}
              </p>
            ) : template.isError ? (
              <p role="alert" className="mt-1 text-danger-app">
                {t('eventReviews.templateLoadError')}
              </p>
            ) : (
              <AppSkeleton className="mt-1 h-4 w-56" />
            )}
            <p className="mt-1 text-muted-app">
              {t('eventReviews.templateHint')} {t('eventReviews.templateAccept')}
            </p>
            {(templateError || replaceTemplate.isError) && (
              <p role="alert" className="mt-1 text-danger-app">
                {templateError ?? replaceTemplate.error?.message}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={EVENT_PROPOSAL_TEMPLATE_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border-app bg-bg-app px-3.5 font-heading text-sm font-medium text-text-app shadow-xs transition-colors hover:bg-surface-app focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app focus-visible:outline-none sm:min-h-9"
            >
              <AppIcon name="download" className="size-4" />
              {t('eventReviews.templateDownload')}
            </a>
            <input
              ref={templateInput}
              type="file"
              accept=".docx,.pdf,.xlsx"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                void uploadTemplate(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <AppButton
              disabled={replaceTemplate.isPending}
              onClick={() => templateInput.current?.click()}
            >
              <AppIcon name="filePlus" className="size-4" />
              {replaceTemplate.isPending
                ? t('eventReviews.templateUploading')
                : t('eventReviews.templateReplace')}
            </AppButton>
          </div>
        </section>
      )}

      {/* Xử lý trạng thái tải, đăng nhập, quyền và lỗi trước khi hiển thị danh sách hoặc trạng thái rỗng. */}
      {isOfficer && (
        <nav aria-label={t('eventReviews.title')} className="mb-5 flex flex-wrap gap-2">
          <AppButton
            variant={view === 'pending' ? 'primary' : 'secondary'}
            aria-pressed={view === 'pending'}
            onClick={() => {
              action.reset()
              setSearchParams({ view: 'pending' })
            }}
          >
            {t('eventReviews.pendingTab')}
          </AppButton>
          <AppButton
            variant={view === 'approved' ? 'primary' : 'secondary'}
            aria-pressed={view === 'approved'}
            onClick={() => {
              action.reset()
              setSearchParams({ view: 'approved' })
            }}
          >
            {t('eventReviews.approvedTab')}
          </AppButton>
        </nav>
      )}
      {auth.isPending || (isOfficer && queue.isPending) ? (
        loading
      ) : !auth.data ? (
        <AppNotice>
          <p>{t('eventReviews.signIn')}</p>
          <Link
            className="inline-block font-semibold text-primary-app hover:underline"
            to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}
          >
            {t('eventReviews.signInLink')}
          </Link>
        </AppNotice>
      ) : !isOfficer ? (
        <AppNotice tone="danger" role="alert">
          {t('eventReviews.unauthorized')}
        </AppNotice>
      ) : queue.isError ? (
        <AppNotice
          tone="danger"
          role="alert"
          title={queue.error.message || t('eventReviews.loadError')}
        >
          <AppButton variant="secondary" onClick={() => void queue.refetch()}>
            {t('eventReviews.retry')}
          </AppButton>
        </AppNotice>
      ) : queue.data?.length ? (
        <ul className="divide-y divide-border-app rounded-2xl border border-border-app bg-bg-app shadow-xs">
          {queue.data.map(({ task, event }) => {
            // Người đang phụ trách quyết định việc mở hồ sơ có cần nhận xử lý trước hay không.
            const mine = task.assigneeId === auth.data?.user.id
            const takenElsewhere = Boolean(task.assigneeId && !mine)
            return (
              <li key={task.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4">
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border-app bg-bg-app text-muted-app"
                >
                  <AppIcon name="calendar" />
                </span>
                <div className="min-w-0 flex-1 basis-64">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-base font-semibold break-words">
                      {event.title}
                    </h2>
                    {event.hasPendingCancellation && (
                      <AppBadge tone="warning">{t('eventReviews.cancellationBadge')}</AppBadge>
                    )}
                    {view === 'approved' ? (
                      <AppBadge tone="success">{t('eventReviews.stateApproved')}</AppBadge>
                    ) : (
                      <AppBadge tone={mine ? 'success' : takenElsewhere ? 'danger' : 'neutral'}>
                        {mine
                          ? t('eventReviews.assignedToYou')
                          : takenElsewhere
                            ? t('eventReviews.assigned')
                            : t('eventReviews.unassigned')}
                      </AppBadge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-app">
                    {event.clubName} · {date(event.startAt)} ·{' '}
                    {t('eventReviews.revision', { number: event.currentRevisionNo })}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <AppBadge tone={event.requestedBudgetTotal ? 'info' : 'neutral'}>
                      {event.requestedBudgetTotal
                        ? t('eventReviews.requested', { amount: money(event.requestedBudgetTotal) })
                        : t('eventReviews.noBudget')}
                    </AppBadge>
                    <span className="text-xs text-muted-app">
                      {t(
                        view === 'approved'
                          ? 'eventReviews.submittedDate'
                          : 'eventReviews.waitingSince',
                        { date: date(task.openedAt) },
                      )}
                    </span>
                  </div>
                </div>
                <AppButton
                  variant={takenElsewhere ? 'secondary' : 'primary'}
                  disabled={action.isPending}
                  onClick={() => void open(event.id, takenElsewhere)}
                >
                  {action.isPending && action.variables?.id === event.id
                    ? t('eventReviews.claiming')
                    : t(view === 'approved' ? 'eventReviews.viewApproved' : 'eventReviews.open')}
                  <AppIcon name="chevronRight" className="size-4" />
                </AppButton>
              </li>
            )
          })}
        </ul>
      ) : (
        <AppEmptyState
          variant="boxed"
          icon="sparkles"
          title={t(view === 'approved' ? 'eventReviews.noneApproved' : 'eventReviews.none')}
          message={t(
            view === 'approved' ? 'eventReviews.noneApprovedHint' : 'eventReviews.noneHint',
          )}
        />
      )}
      {/* Nếu nhận xử lý thất bại, giữ danh sách và hiển thị lỗi xung đột từ server tại đây. */}
      {action.isError && (
        <AppNotice tone="danger" role="alert" className="mt-4">
          {action.error.message}
        </AppNotice>
      )}
    </>
  )
}
