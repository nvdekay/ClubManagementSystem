import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router'
import type { UseQueryResult } from '@tanstack/react-query'

import { AppBadge } from '@/components/ui/badge/AppBadge'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppIcon } from '@/components/ui/icon/AppIcon'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { useEventProposalDocumentAccess } from '@/hooks/useClubEvents'
import { useClubEventDefense } from '@/hooks/useEventDefense'
import type { ClubEvent, ClubEventDetail as ClubEventDetailData } from '@/services/clubEvents'
import { ClubEventDefenseCard } from '@/pages/club/ClubEventDefenseCard'
import { ClubEventErrorMessage } from '@/pages/club/ClubEventErrorMessage'
import { ClubEventVersions } from '@/pages/club/ClubEventVersions'
import {
  decisionOutcomeLabel,
  sectionLabel,
  stateLabel,
  stateTones,
  type ClubEventOperation,
  type DecisionComments,
} from '@/pages/club/clubEventFormat'
import { openInNewTab } from '@/utils/openInNewTab'
import { formatBytes } from '@/utils/proposalFile'

interface ClubEventDetailProps {
  clubId: string
  /** Id trong URL (`?event=`); buổi bảo vệ được tải song song với chi tiết theo id này. */
  eventId: string
  detail: UseQueryResult<ClubEventDetailData>
  active: ClubEvent | undefined
  properties: { id: string; name: string }[] | undefined
  format: Intl.DateTimeFormat
  renderedAt: number
  actionPending: boolean
  runAction: (action: string, body: object) => Promise<void>
  openOperation: (kind: ClubEventOperation) => void
}

// Khung chi tiết đề xuất sự kiện đang chọn (mode "events"): thông tin, tài liệu, yêu cầu chỉnh sửa,
// buổi bảo vệ, các thao tác theo trạng thái, phiên bản đã nộp và quyết định của ICPDP
export function ClubEventDetail({
  clubId,
  eventId,
  detail,
  active,
  properties,
  format,
  renderedAt,
  actionPending,
  runAction,
  openOperation,
}: ClubEventDetailProps) {
  const { t, i18n } = useTranslation()
  const documentAccess = useEventProposalDocumentAccess(clubId)
  const defense = useClubEventDefense(clubId, eventId || undefined, Boolean(eventId))
  // Yêu cầu chỉnh sửa mới nhất trên đề xuất đang mở: những phần ICPDP yêu cầu CLB sửa.
  const revisionRequest = [...(detail.data?.decisions ?? [])]
    .reverse()
    .find((d) => d.outcome === 'Request revision')
  const revisionSections =
    active?.state === 'Revision Requested'
      ? ((revisionRequest?.comments as DecisionComments | undefined)?.sections ?? [])
      : []
  // Mở tài liệu đề xuất sự kiện (tải về hoặc xem) qua URL có chữ ký
  async function downloadDocument(id: string, revisionNo?: number, inline = false) {
    try {
      await openInNewTab(
        async () => (await documentAccess.mutateAsync({ id, revisionNo, inline })).url,
      )
    } catch {
      /* Lỗi của mutation được hiển thị cạnh tệp. */
    }
  }
  return (
    <section
      id="club-event-detail"
      className="mt-6 scroll-mt-24 rounded-2xl border border-border-app bg-bg-app p-5 text-sm shadow-xs"
    >
      <ClubEventErrorMessage error={detail.error} />
      {detail.isPending ? (
        <AppSkeleton className="h-48" />
      ) : (
        detail.data &&
        active && (
          <>
            <h2 className="mb-2 font-heading text-base font-semibold break-words">
              {active.title}
            </h2>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-app">
              <AppBadge tone={stateTones[active.state] ?? 'neutral'}>
                {stateLabel(t, active.state)}
              </AppBadge>{' '}
              {format.format(new Date(active.startAt))} – {format.format(new Date(active.endAt))}
            </p>
            <p className="mt-2 break-words">{active.objective}</p>
            <p className="mt-2 whitespace-pre-wrap break-words">{active.plan}</p>
            <p className="mt-2">
              {t('clubEvents.venue')}:{' '}
              {active.venueText ||
                (properties?.find((p) => p.id === active.propertyId)?.name ?? '—')}{' '}
              · {t('clubEvents.PUBLIC')}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="font-medium">{t('clubEvents.proposalDocumentSection')}:</span>
              {active.proposalDocument ? (
                <>
                  <span className="min-w-0 break-words">
                    {active.proposalDocument.fileName} ·{' '}
                    {formatBytes(active.proposalDocument.bytes)}
                  </span>
                  <AppButton
                    variant="secondary"
                    disabled={documentAccess.isPending}
                    onClick={() => void downloadDocument(active.id)}
                  >
                    <AppIcon name="download" className="size-4" />
                    {t('clubEvents.proposalDocumentDownload')}
                  </AppButton>
                </>
              ) : (
                <span className="text-muted-app">{t('clubEvents.proposalDocumentNone')}</span>
              )}
              {documentAccess.isError && <ClubEventErrorMessage error={documentAccess.error} />}
            </div>
            {active.state === 'Revision Requested' && revisionRequest ? (
              <div
                role="status"
                className="mt-4 rounded-xl border-l-4 border-warning-app bg-warning-app/10 px-4 py-3 text-sm"
              >
                <p className="font-semibold">{t('clubEvents.revisionTitle')}</p>
                {revisionSections.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span>{t('clubEvents.revisionSections')}:</span>
                    {revisionSections.map((section) => (
                      <AppBadge key={section} tone="warning">
                        {sectionLabel(t, section)}
                      </AppBadge>
                    ))}
                  </div>
                )}
                {revisionRequest.reason && (
                  <p className="mt-2 whitespace-pre-wrap break-words">{revisionRequest.reason}</p>
                )}
                {active.revisionDeadlineAt && (
                  <p className="mt-2">
                    <span className="font-semibold">{t('clubEvents.revisionDeadline')}:</span>{' '}
                    {format.format(new Date(active.revisionDeadlineAt))}
                  </p>
                )}
                <p className="mt-2 text-muted-app">{t('clubEvents.revisionHint')}</p>
              </div>
            ) : (
              active.revisionDeadlineAt && (
                <p className="mt-2">
                  {t('clubEvents.revisionDeadline')}:{' '}
                  {format.format(new Date(active.revisionDeadlineAt))}
                </p>
              )
            )}
            {active.approvalConditions?.length > 0 && (
              <div className="mt-3">
                <h3 className="font-semibold">{t('clubEvents.conditions')}</h3>
                <ul className="mt-2 list-inside list-disc">
                  {active.approvalConditions.map((condition, index) => (
                    <li key={index}>{condition}</li>
                  ))}
                </ul>
              </div>
            )}
            {active.conflictResult && (
              <p className="mt-3">
                {t(`clubEvents.${active.conflictResult}`, {
                  defaultValue: active.conflictResult,
                })}
              </p>
            )}
            {detail.data.budget?.id && (
              <NavLink
                className="inline-flex rounded-lg border border-border-app px-4 py-2 text-sm font-medium text-primary-app hover:bg-surface-app"
                to={`/club/${clubId}/budgets?budget=${detail.data.budget.id}`}
              >
                {t('accountability.finances')}
              </NavLink>
            )}
            {detail.data.budget && (
              <p className="mt-2">
                {t('clubEvents.approvedBudget')}:{' '}
                {new Intl.NumberFormat(i18n.language === 'vi' ? 'vi-VN' : 'en-GB', {
                  style: 'currency',
                  currency: 'VND',
                }).format(detail.data.budget.approvedTotal)}
              </p>
            )}
            {active.state === 'Re-defense Pending' && (
              <div className="mt-4">
                <AppNotice tone="info">{t('eventDefense.clubReDefenseBanner')}</AppNotice>
              </div>
            )}
            {defense.isError && (
              <div className="mt-4">
                <AppNotice tone="danger" role="alert">
                  {t('eventDefense.loadClubDefenseFailed')}
                </AppNotice>
              </div>
            )}
            {defense.data?.activeSession && (
              <ClubEventDefenseCard
                clubId={clubId}
                eventId={active.id}
                session={defense.data.activeSession}
                format={format}
                renderedAt={renderedAt}
              />
            )}
            {active.cancellationRequest?.state === 'Pending' && (
              <div className="mt-4">
                <AppNotice tone="warning" title={t('clubEvents.cancelPendingTitle')}>
                  <p>
                    {t('clubEvents.cancelPendingHint', {
                      date: format.format(new Date(active.cancellationRequest.requestedAt)),
                      reason: active.cancellationRequest.reason,
                    })}
                  </p>
                </AppNotice>
              </div>
            )}
            {active.cancellationRequest?.state === 'Rejected' && (
              <div className="mt-4">
                <AppNotice tone="danger" title={t('clubEvents.cancelRejectedTitle')}>
                  <p>
                    {t('clubEvents.cancelRejectedHint', {
                      date: active.cancellationRequest.decidedAt
                        ? format.format(new Date(active.cancellationRequest.decidedAt))
                        : '—',
                      reason: active.cancellationRequest.reviewReason ?? '—',
                    })}
                  </p>
                </AppNotice>
              </div>
            )}
            {(() => {
              const cancellationPending = active.cancellationRequest?.state === 'Pending'
              const approvedProposalEvent = ['Approved', 'Upcoming', 'Ongoing'].includes(
                active.state,
              )
              const withinCancelCutoff =
                approvedProposalEvent && Date.parse(active.startAt) - renderedAt < 72 * 3600_000
              return (
                <>
                  <div className="my-4 flex flex-wrap gap-2">
                    {['Draft', 'Revision Requested'].includes(active.state) && (
                      <>
                        <Link
                          to={`/club/${encodeURIComponent(clubId)}/events/${encodeURIComponent(active.id)}/edit`}
                          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-app px-3.5 font-heading text-sm font-medium text-on-primary-app shadow-xs transition-[opacity,scale] duration-200 hover:opacity-90 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app focus-visible:outline-none sm:min-h-9"
                        >
                          {t('clubEvents.edit')}
                        </Link>
                        <AppButton
                          disabled={actionPending}
                          onClick={() =>
                            void runAction('submit', { expectedVersion: active.version })
                          }
                        >
                          {t('clubEvents.submit')}
                        </AppButton>
                      </>
                    )}
                    {!cancellationPending && ['Approved'].includes(active.state) && (
                      <AppButton onClick={() => openOperation('publish')}>
                        {t('clubEvents.publish')}
                      </AppButton>
                    )}
                    {/* Sự kiện nội bộ đã công khai (PUBLIC, ONGOING) giữ nguyên lịch: chỉ được huỷ. */}
                    {!cancellationPending &&
                      ['Approved', 'Upcoming', 'CREATED'].includes(active.state) && (
                        <AppButton onClick={() => openOperation('reschedule')}>
                          {t('clubEvents.reschedule')}
                        </AppButton>
                      )}
                    {!cancellationPending &&
                      [
                        'Approved',
                        'Upcoming',
                        'Ongoing',
                        'DRAFT',
                        'CREATED',
                        'PUBLIC',
                        'ONGOING',
                      ].includes(active.state) &&
                      !active.attendanceFinalized && (
                        <AppButton
                          variant="ghost"
                          disabled={withinCancelCutoff}
                          onClick={() => openOperation('cancel')}
                        >
                          {t(
                            approvedProposalEvent
                              ? 'clubEvents.requestCancel'
                              : 'clubEvents.cancel',
                          )}
                        </AppButton>
                      )}
                  </div>
                  {!cancellationPending && withinCancelCutoff && !active.attendanceFinalized && (
                    <p className="mb-3 text-xs text-muted-app">
                      {t('clubEvents.cancelCutoffNotice')}
                    </p>
                  )}
                </>
              )
            })()}
            {active.checkInCode && (
              <p>
                {t('clubEvents.code')}: <strong>{active.checkInCode}</strong>
              </p>
            )}
            <h3 className="mt-5 text-sm font-semibold">{t('clubEvents.versions')}</h3>
            <ClubEventVersions
              active={active}
              versions={detail.data.versions}
              bookings={detail.data.bookings}
              properties={properties ?? []}
              format={format}
              documentPending={documentAccess.isPending}
              onDownload={(revisionNo, inline) =>
                void downloadDocument(active.id, revisionNo, inline)
              }
            />
            <h3 className="mt-5 text-sm font-semibold">{t('clubEvents.decisions')}</h3>
            {detail.data.decisions.map((d, index) => (
              <div key={index} className="mt-2">
                <p>
                  {decisionOutcomeLabel(t, d.outcome)} · {format.format(new Date(d.at))}
                  {d.reason ? ` · ${d.reason}` : ''}
                </p>
                {((d.comments as DecisionComments | undefined)?.sections ?? []).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(d.comments as DecisionComments).sections!.map((section) => (
                      <AppBadge key={section} tone="warning">
                        {sectionLabel(t, section)}
                      </AppBadge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )
      )}
    </section>
  )
}
