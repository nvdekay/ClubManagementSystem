import { useState } from 'react'
import { formatDate, formatDay, vnDayBoundary, vnTomorrowInput } from '@/utils/formatDate'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { AppBadge } from '@/components/ui/badge/AppBadge'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppFieldError } from '@/components/ui/field/AppFieldError'
import { AppRequiredMark } from '@/components/ui/field/AppRequiredMark'
import { AppEmptyState } from '@/components/ui/empty-state/AppEmptyState'
import { AppInput } from '@/components/ui/input/AppInput'
import { AppTextarea } from '@/components/ui/textarea/AppTextarea'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppPagination } from '@/components/ui/pagination/AppPagination'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { useAuth } from '@/hooks/useAuth'
import { useWorkspacePermission } from '@/hooks/useWorkspacePermission'
import { useFieldValidation } from '@/hooks/useFieldValidation'
import {
  useAdminSuspensionRequests,
  useSuspensionRequests,
  useSuspensionRequestAction,
} from '@/hooks/useSuspensionRequests'
import { AppErrorNotice } from '@/components/ui/notice/AppErrorNotice'
const PAGE_SIZE = 20
interface Props {
  clubId?: string
}
// Workspace yêu cầu tạm ngưng CLB: CLB gửi yêu cầu, ICPDP duyệt
export function SuspensionRequestWorkspace({ clubId }: Props) {
  const { t, i18n } = useTranslation()
  const auth = useAuth()
  const canRequest = useWorkspacePermission(clubId, 'club.suspension.request')
  const allowed = clubId ? canRequest : Boolean(auth.data?.systemRoles.includes('ICPDP_OFFICER'))
  // A club reads its own requests with the impact preview; ICPDP pages every club's queue.
  const query = useSuspensionRequests(clubId, allowed)
  const [pageIndex, setPageIndex] = useState(0)
  const queue = useAdminSuspensionRequests(pageIndex + 1, PAGE_SIZE, allowed && !clubId)
  const list = clubId ? query : queue
  const requests = clubId ? query.data?.requests : queue.data?.items
  const pageCount = Math.ceil((queue.data?.total ?? 0) / PAGE_SIZE)
  // Step back after the queue shrinks so the page never goes blank.
  if (queue.data && !queue.isPlaceholderData && pageIndex > 0 && pageIndex >= pageCount) {
    setPageIndex(Math.max(pageCount - 1, 0))
  }
  const action = useSuspensionRequestAction(clubId)
  const [reason, setReason] = useState('')
  const [until, setUntil] = useState('')
  const [obligationsPlan, setObligationsPlan] = useState('')
  const [recoveryPlan, setRecoveryPlan] = useState('')
  const [acknowledged, setAcknowledged] = useState('')
  const [decisions, setDecisions] = useState<Record<string, string>>({})
  const impactKey = JSON.stringify(query.data?.impacts.map((i) => i.id).sort() ?? [])
  const field = useFieldValidation({
    reason: reason.trim() ? null : t('common.fieldRequired'),
    until: !until
      ? t('common.fieldRequired')
      : until < vnTomorrowInput()
        ? t('common.dateNotPast')
        : null,
    obligationsPlan: obligationsPlan.trim() ? null : t('common.fieldRequired'),
    recoveryPlan: recoveryPlan.trim() ? null : t('common.fieldRequired'),
    acknowledged: acknowledged === impactKey ? null : t('suspensionRequests.acknowledgeRequired'),
  })
  const decision = useFieldValidation(
    Object.fromEntries(
      (requests ?? [])
        .filter((r) => r.state === 'Pending')
        .map((r) => [r.id, decisions[r.id]?.trim() ? null : t('common.fieldRequired')]),
    ),
  )
  const inputClass = 'mt-1.5 block w-full'
  const labelText = 'text-sm font-medium text-text-app'
  // Kiểm tra hợp lệ rồi gửi yêu cầu tạm ngưng CLB
  async function submit() {
    if (!field.touchAll() || !auth.data || !query.data) {
      return
    }
    try {
      await action.mutateAsync({
        kind: 'submit',
        csrfToken: auth.data.csrfToken,
        input: {
          reason,
          until: vnDayBoundary(until, 'end'),
          obligationsPlan,
          recoveryPlan,
          acknowledgedImpactIds: query.data.impacts.map((i) => i.id),
        },
      })
      field.reset()
    } catch {
      /* The mutation error is displayed below. */
    }
  }
  // ICPDP duyệt hoặc từ chối một yêu cầu tạm ngưng kèm lý do
  async function decide(id: string, outcome: 'Approve' | 'Reject') {
    decision.touch(id)
    if (!auth.data || !decisions[id]?.trim()) {
      return
    }
    try {
      await action.mutateAsync({
        kind: 'decide',
        csrfToken: auth.data.csrfToken,
        id,
        outcome,
        reason: decisions[id] ?? '',
      })
    } catch {
      /* The mutation error is displayed below. */
    }
  }
  if (auth.isPending) {
    return <AppSkeleton className="h-64 w-full" />
  }
  if (!allowed) {
    return <AppNotice tone="danger">{t('suspensionRequests.denied')}</AppNotice>
  }
  return (
    <>
      <PageHeader
        title={t('suspensionRequests.title')}
        description={t(
          clubId ? 'suspensionRequests.description' : 'suspensionRequests.reviewDescription',
        )}
      />
      {list.isPending && <AppSkeleton className="h-64 w-full" />}
      {list.isError && (
        <AppErrorNotice onRetry={() => void list.refetch()} retryVariant="primary">
          {list.error.message}
        </AppErrorNotice>
      )}
      {action.isError && (
        <AppNotice tone="danger" role="alert">
          {action.error.message}
        </AppNotice>
      )}
      {clubId && query.data && !query.data.requests.some((r) => r.state === 'Pending') && (
        <section className="mb-6 space-y-4 rounded-2xl border border-border-app bg-bg-app p-5 text-sm shadow-xs">
          <label className="block">
            <span className={labelText}>
              {t('suspensionRequests.reason')}
              <AppRequiredMark />
            </span>
            <AppTextarea
              className={inputClass}
              maxLength={2000}
              value={reason}
              {...field.control('reason')}
              onChange={(e) => setReason(e.target.value)}
            />
            <AppFieldError message={field.error('reason')} />
          </label>
          <label className="block">
            <span className={labelText}>
              {t('suspensionRequests.until')}
              <AppRequiredMark />
            </span>
            <AppInput
              type="date"
              className={inputClass}
              min={vnTomorrowInput()}
              value={until}
              {...field.control('until')}
              onChange={(e) => setUntil(e.target.value)}
            />
            <AppFieldError message={field.error('until')} />
          </label>
          <label className="block">
            <span className={labelText}>
              {t('suspensionRequests.obligations')}
              <AppRequiredMark />
            </span>
            <AppTextarea
              className={inputClass}
              maxLength={5000}
              value={obligationsPlan}
              {...field.control('obligationsPlan')}
              onChange={(e) => setObligationsPlan(e.target.value)}
            />
            <AppFieldError message={field.error('obligationsPlan')} />
          </label>
          <label className="block">
            <span className={labelText}>
              {t('suspensionRequests.recovery')}
              <AppRequiredMark />
            </span>
            <AppTextarea
              className={inputClass}
              maxLength={5000}
              value={recoveryPlan}
              {...field.control('recoveryPlan')}
              onChange={(e) => setRecoveryPlan(e.target.value)}
            />
            <AppFieldError message={field.error('recoveryPlan')} />
          </label>
          <h2 className="text-sm font-semibold">{t('suspensionRequests.impact')}</h2>
          <ul className="list-inside list-disc">
            {query.data.impacts.map((i) => (
              <li key={i.id}>
                {i.title} · {formatDate(i.startAt, i18n.language)}
              </li>
            ))}
          </ul>
          <div>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={acknowledged === impactKey}
                {...field.control('acknowledged')}
                onChange={(e) => {
                  setAcknowledged(e.target.checked ? impactKey : '')
                  field.touch('acknowledged')
                }}
              />
              <span>
                {t('suspensionRequests.acknowledge')}
                <AppRequiredMark />
              </span>
            </label>
            <AppFieldError message={field.error('acknowledged')} />
          </div>
          <AppButton disabled={action.isPending} onClick={() => void submit()}>
            {t('suspensionRequests.submit')}
          </AppButton>
        </section>
      )}
      {requests?.length === 0 && (
        <AppEmptyState variant="boxed" message={t('suspensionRequests.empty')} />
      )}
      <div className="space-y-6">
        {requests?.map((r) => (
          <section
            key={r.id}
            className="space-y-3 rounded-2xl border border-border-app bg-bg-app p-5 text-sm shadow-xs"
          >
            <h2 className="flex flex-wrap items-center gap-2 font-heading text-base font-semibold">
              <span className="break-words">{r.clubName}</span>
              <AppBadge
                tone={
                  r.state === 'Approved' ? 'success' : r.state === 'Rejected' ? 'danger' : 'warning'
                }
              >
                {t(`suspensionRequests.${r.state}`)}
              </AppBadge>
            </h2>
            <p className="whitespace-pre-wrap break-words">{r.reason}</p>
            <p>
              {t('suspensionRequests.until')}: {formatDay(r.until, i18n.language)}
            </p>
            <p className="whitespace-pre-wrap break-words">{r.obligationsPlan}</p>
            <p className="whitespace-pre-wrap break-words">{r.recoveryPlan}</p>
            {r.decisionReason && <AppNotice>{r.decisionReason}</AppNotice>}
            {!clubId && r.state === 'Pending' && (
              <>
                <label className="block">
                  <span className={labelText}>
                    {t('suspensionRequests.decision')}
                    <AppRequiredMark />
                  </span>
                  <AppTextarea
                    className={inputClass}
                    maxLength={2000}
                    value={decisions[r.id] ?? ''}
                    {...decision.control(r.id)}
                    onChange={(e) => setDecisions((d) => ({ ...d, [r.id]: e.target.value }))}
                  />
                  <AppFieldError message={decision.error(r.id)} />
                </label>
                <div className="flex flex-wrap gap-3">
                  <AppButton
                    disabled={action.isPending}
                    onClick={() => void decide(r.id, 'Approve')}
                  >
                    {t('suspensionRequests.approve')}
                  </AppButton>
                  <AppButton
                    variant="secondary"
                    disabled={action.isPending}
                    onClick={() => void decide(r.id, 'Reject')}
                  >
                    {t('suspensionRequests.reject')}
                  </AppButton>
                </div>
              </>
            )}
          </section>
        ))}
      </div>
      {!clubId && (
        <AppPagination
          className="mt-4"
          pageIndex={pageIndex}
          pageCount={pageCount}
          onPageChange={setPageIndex}
          navLabel={t('suspensionRequests.pagination')}
        />
      )}
    </>
  )
}
