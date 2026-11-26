import { useTranslation } from 'react-i18next'

import type { useApplication } from '@/hooks/useApplications'
import { applicationSectionLabel } from '@/pages/student/applicationEditorFormat'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/formatDate'

type ApplicationDecision = NonNullable<
  ReturnType<typeof useApplication>['data']
>['decisions'][number]

interface ApplicationDecisionFeedbackProps {
  state: 'Revision Requested' | 'Rejected'
  decision: ApplicationDecision
  revisionDeadlineAt: string | undefined
}

// Phản hồi mới nhất của ICPDP khi hồ sơ bị yêu cầu chỉnh sửa hoặc bị từ chối
export function ApplicationDecisionFeedback({
  state,
  decision: latestDecision,
  revisionDeadlineAt,
}: ApplicationDecisionFeedbackProps) {
  const { t, i18n } = useTranslation()
  return (
    <section
      role="status"
      className={cn('mb-6 rounded-xl border-l-4 px-5 py-4', {
        'border-warning-app bg-warning-app/10': state === 'Revision Requested',
        'border-danger-app bg-danger-app/10': state === 'Rejected',
      })}
    >
      <h2 className="font-semibold font-heading">
        {state === 'Rejected'
          ? t('applications.feedbackRejectedTitle')
          : t('applications.feedbackRevisionTitle')}
      </h2>
      {latestDecision.reason && (
        <p className="mt-2 whitespace-pre-wrap text-sm">{latestDecision.reason}</p>
      )}
      {latestDecision.sections.length > 0 && (
        <p className="mt-3 text-sm">
          <span className="font-semibold">{t('applications.feedbackSections')}:</span>{' '}
          {latestDecision.sections.map((section) => applicationSectionLabel(t, section)).join(', ')}
        </p>
      )}
      {state === 'Revision Requested' && revisionDeadlineAt && (
        <p className="mt-2 text-sm">
          <span className="font-semibold">{t('applications.feedbackDeadline')}:</span>{' '}
          {formatDate(revisionDeadlineAt, i18n.language)}
        </p>
      )}
    </section>
  )
}
