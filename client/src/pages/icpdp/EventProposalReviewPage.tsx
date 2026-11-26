/**
 * Trang xét duyệt ICPDP: tài liệu đã nộp, khác biệt giữa các phiên bản và người phụ trách.
 * ProposalDecisionPanel soạn quyết định; useEventProposalReviews gọi API và cập nhật bộ nhớ đệm.
 */
import { Link, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'

import { ProposalSectionComments } from '@/components/custom/ProposalSectionComments'
import { RevisionChanges } from '@/components/custom/RevisionChanges'
import { SubmittedEventProposal } from '@/components/custom/SubmittedEventProposal'
import { PageHeader } from '@/components/layout/PageHeader'
import { AppBadge } from '@/components/ui/badge/AppBadge'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { useAuth } from '@/hooks/useAuth'
import {
  useEventProposal,
  useEventProposalAction,
  useReviewProposalDocumentAccess,
} from '@/hooks/useEventProposalReviews'
import { useProposalReasonDraft } from '@/hooks/useProposalReasonDraft'
import {
  resolveI18nError,
  reviewSectionLabel,
  reviewStateLabel,
  reviewStateTone,
  versionFields,
} from '@/pages/icpdp/eventProposalReviewFormat'
import { ProposalBudgetSection } from '@/pages/icpdp/ProposalBudgetSection'
import { ProposalCancellationPanel } from '@/pages/icpdp/ProposalCancellationPanel'
import { ProposalClubBookingsSection } from '@/pages/icpdp/ProposalClubBookingsSection'
import { ProposalDecisionHistory } from '@/pages/icpdp/ProposalDecisionHistory'
import { ProposalDecisionPanel } from '@/pages/icpdp/ProposalDecisionPanel'
import { ProposalDefensePanel } from '@/pages/icpdp/ProposalDefensePanel'
import { ProposalDocumentsSection } from '@/pages/icpdp/ProposalDocumentsSection'
import { ProposalOverviewSection } from '@/pages/icpdp/ProposalOverviewSection'
import { ProposalSubmissionHistory } from '@/pages/icpdp/ProposalSubmissionHistory'
import { diffFields } from '@/utils/revisionDiff'
import { openInNewTab } from '@/utils/openInNewTab'

/** Kết hợp hồ sơ đề xuất và các thao tác xét duyệt cho tài khoản ICPDP đã đăng nhập. */
export function EventProposalReviewPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const auth = useAuth()
  const isOfficer = Boolean(auth.data?.systemRoles.includes('ICPDP_OFFICER'))
  const review = useEventProposal(id, isOfficer)
  const action = useEventProposalAction()
  const documentAccess = useReviewProposalDocumentAccess()
  // Dùng dữ liệu đã chốt khi nộp cho tài liệu và ngân sách, có phương án dự phòng cho hồ sơ cũ.
  const current =
    review.data?.versions.find(
      (version) => version.revisionNo === review.data?.event.currentRevisionNo,
    ) ?? review.data?.versions.at(-1)
  const reasonDraft = useProposalReasonDraft(
    auth.data?.user.id ?? '',
    id ?? '',
    current?.revisionNo ?? 0,
    auth.data?.user.displayName ?? '',
  )

  const back = {
    to: ['Approved', 'Upcoming', 'Ongoing', 'Completed'].includes(review.data?.event.state ?? '')
      ? '/workspace/event-proposals?view=approved'
      : '/workspace/event-proposals',
    label: t('eventReviews.back'),
  }

  // Truy vấn bị tắt vẫn ở trạng thái chờ; chỉ chờ dữ liệu xét duyệt khi có quyền tải.
  if (auth.isPending || (isOfficer && review.isPending)) {
    return (
      <div className="space-y-4">
        <AppSkeleton className="h-10 w-1/2" />
        <AppSkeleton className="h-[28rem] w-full" />
      </div>
    )
  }
  if (!auth.data) {
    return (
      <AppNotice>
        <p>{t('eventReviews.signIn')}</p>
        <Link
          className="inline-block font-semibold text-primary-app hover:underline"
          to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}
        >
          {t('eventReviews.signInLink')}
        </Link>
      </AppNotice>
    )
  }
  if (!isOfficer) {
    return (
      <AppNotice tone="danger" role="alert">
        {t('eventReviews.unauthorized')}
      </AppNotice>
    )
  }
  if (review.isError || !review.data) {
    return (
      <>
        <PageHeader title={t('eventReviews.proposal')} back={back} />
        <AppNotice
          tone="danger"
          role="alert"
          title={resolveI18nError(review.error, t('eventReviews.loadError'))}
        >
          <AppButton variant="secondary" onClick={() => void review.refetch()}>
            {t('eventReviews.retry')}
          </AppButton>
        </AppNotice>
      </>
    )
  }

  const {
    event,
    task,
    club,
    decisions,
    versions,
    bookings,
    semesterBudgets,
    budget,
    activeDefenseSession,
    defenseHistory,
    cancellationRequest,
  } = review.data
  // Ghép lần nộp trước với yêu cầu chỉnh sửa có trước lần nộp hiện tại.
  const previous =
    current &&
    versions
      .filter((version) => version.revisionNo < current.revisionNo)
      .sort((a, b) => b.revisionNo - a.revisionNo)[0]
  const revisionRequest =
    current &&
    [...decisions]
      .reverse()
      .find(
        (decision) =>
          decision.outcome === 'Request revision' &&
          new Date(decision.at) <= new Date(current.submittedAt),
      )
  // Người phụ trách và trạng thái hồ sơ quyết định việc mở khung thao tác; server kiểm tra lại cả hai.
  const mine = task.assigneeId === auth.data.user.id
  const isOpen =
    task.state === 'Open' &&
    ['Pending Approval', 'Under Review', 'Re-defense Pending'].includes(event.state)
  const isPendingCancellation = task.state === 'Open' && cancellationRequest?.state === 'Pending'

  /** Mở tài liệu của phiên bản đã nộp được chọn bằng đường dẫn truy cập tạm thời. */
  async function openDocument(revisionNo: number, inline: boolean) {
    if (!id) {
      return
    }
    try {
      await openInNewTab(
        async () => (await documentAccess.mutateAsync({ id, revisionNo, inline })).url,
      )
    } catch {
      // Lỗi thao tác được hiển thị tại khu vực tài liệu đề xuất.
    }
  }

  /** Nhận đề xuất cho ICPDP hiện tại; thao tác thành công cập nhật lại chi tiết xét duyệt. */
  async function claim() {
    if (!auth.data || !id) {
      return
    }
    try {
      await action.mutateAsync({ kind: 'claim', id, csrfToken: auth.data.csrfToken })
    } catch (error) {
      console.error('[EventProposalReviewPage] claim failed:', error)
    }
  }

  return (
    <>
      {/* Tiêu đề và trạng thái mới nhất của đề xuất; hồ sơ nằm cạnh các thao tác xét duyệt. */}
      <PageHeader
        title={event.title}
        back={back}
        description={`${event.clubName} · ${t('eventReviews.revision', { number: event.currentRevisionNo })}`}
        actions={
          <AppBadge tone={reviewStateTone(event.state)}>
            {t('eventReviews.status')}: {reviewStateLabel(t, event.state)}
          </AppBadge>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-6">
          {/* So sánh hai lần nộp liên tiếp và hiển thị các yêu cầu chỉnh sửa của ICPDP. */}
          {previous && current && (
            <RevisionChanges
              previousNumber={previous.revisionNo}
              changes={diffFields(
                previous,
                current,
                versionFields(t, i18n.language, event, bookings),
              )}
              requestedSections={revisionRequest?.sections.map((section) =>
                reviewSectionLabel(t, section),
              )}
              reason={revisionRequest?.reason}
            />
          )}
          <ProposalDocumentsSection
            versions={versions}
            current={current}
            pending={documentAccess.isPending}
            error={documentAccess.error}
            onOpen={(revisionNo, inline) => void openDocument(revisionNo, inline)}
          />

          {current && (
            <SubmittedEventProposal
              eventId={event.id}
              version={current}
              renderSectionComments={(section) => (
                <ProposalSectionComments
                  key={section.id}
                  title={section.title || t('clubEvents.extractedIntroduction')}
                  authorName={auth.data?.user.displayName}
                  comments={reasonDraft.comments.filter(
                    (comment) =>
                      comment.sectionId === section.id ||
                      (!comment.sectionId && comment.sectionTitle === section.title),
                  )}
                  onEdit={isOpen && mine ? reasonDraft.editComment : undefined}
                  onDelete={isOpen && mine ? reasonDraft.deleteComment : undefined}
                  onAdd={
                    isOpen && mine
                      ? (content) => reasonDraft.addComment(section, content)
                      : undefined
                  }
                />
              )}
            />
          )}
          <ProposalOverviewSection event={event} bookings={bookings} current={current} />

          <ProposalBudgetSection
            current={current}
            budget={budget}
            semesterBudgets={semesterBudgets}
          />

          <ProposalClubBookingsSection club={club} bookings={bookings} />

          <ProposalSubmissionHistory versions={versions} />
        </div>

        <aside
          aria-label={t('eventReviews.decisionPanel')}
          tabIndex={0}
          className="min-w-0 space-y-6 xl:sticky xl:top-24 xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto xl:overscroll-contain xl:pr-2 xl:pb-2"
        >
          <ProposalDefensePanel
            eventId={event.id}
            eventTitle={event.title}
            activeDefenseSession={activeDefenseSession}
            defenseHistory={defenseHistory}
            isOpen={isOpen}
            mine={mine}
            csrfToken={auth.data.csrfToken}
          />

          {cancellationRequest && id && (
            <ProposalCancellationPanel
              id={id}
              cancellationRequest={cancellationRequest}
              canDecide={isPendingCancellation && mine}
              csrfToken={auth.data.csrfToken}
            />
          )}
          {/* Chỉ mở khung quyết định cho người phụ trách; trường hợp khác hiển thị nút nhận hoặc trạng thái phân công. */}
          {(isOpen || isPendingCancellation) && !mine ? (
            <div className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
              <p className="text-sm text-muted-app">
                {task.assigneeId ? t('eventReviews.claimedByOther') : t('eventReviews.claimHint')}
              </p>
              {!task.assigneeId && (
                <AppButton
                  className="mt-5 w-full"
                  disabled={action.isPending}
                  onClick={() => void claim()}
                >
                  {action.isPending ? t('eventReviews.claiming') : t('eventReviews.claim')}
                </AppButton>
              )}
            </div>
          ) : isOpen ? (
            <ProposalDecisionPanel
              reasonDraft={{ value: reasonDraft.reason, onChange: reasonDraft.setReason }}
              onSuccess={reasonDraft.clear}
              detail={review.data}
              csrfToken={auth.data.csrfToken}
              postDefense={Boolean(
                activeDefenseSession?.state === 'DEFENDED' && !activeDefenseSession.outcome,
              )}
            />
          ) : null}

          {/* Hiển thị các điều kiện đã được phê duyệt bên cạnh lịch sử quyết định. */}
          {event.approvalConditions.length > 0 && (
            <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
              <h2 className="font-heading text-base font-semibold">
                {t('eventReviews.conditions')}
              </h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                {event.approvalConditions.map((item, index) => (
                  <li key={index} className="break-words">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <ProposalDecisionHistory decisions={decisions} />
        </aside>
      </div>
    </>
  )
}
