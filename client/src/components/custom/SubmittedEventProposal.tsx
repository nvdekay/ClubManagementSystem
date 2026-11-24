import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { EventProposalDocument } from '@/components/custom/EventProposalDocument'
import { EventProposalPreview } from '@/components/custom/EventProposalPreview'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { useReviewProposalPreview } from '@/hooks/useEventProposalReviews'
import type { EventProposalVersion } from '@/services/eventProposalReviews'
import type { ProposalSection } from '@/utils/eventProposalImport'

interface SubmittedEventProposalProps {
  eventId: string
  version: EventProposalVersion
  renderSectionComments?: (section: ProposalSection) => ReactNode
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Both review and live defense render the exact submitted revision, never a mutable draft. */
export function SubmittedEventProposal({
  eventId,
  version,
  renderSectionComments,
}: SubmittedEventProposalProps) {
  const { t } = useTranslation()
  const payload = version.payload
  const rawDocument = payload.proposalDocument
  const documentId =
    rawDocument && typeof rawDocument === 'object' && 'id' in rawDocument
      ? text(rawDocument.id)
      : ''
  const preview = useReviewProposalPreview(
    eventId,
    version.revisionNo,
    documentId,
    Boolean(documentId),
  )

  return (
    <div className="min-w-0 space-y-6">
      {documentId &&
        (preview.data ? (
          <EventProposalDocument file={preview.data} />
        ) : preview.isError ? (
          <AppNotice tone="warning" role="alert">
            <p>{t('clubEvents.documentLoadError')}</p>
            <AppButton variant="secondary" onClick={() => void preview.refetch()}>
              {t('eventReviews.retry')}
            </AppButton>
          </AppNotice>
        ) : (
          <AppSkeleton className="h-[76vh] min-h-[420px] w-full" />
        ))}
      <EventProposalPreview
        key={`${version.revisionNo}-${documentId}`}
        file={preview.data}
        missing={[]}
        renderSectionComments={renderSectionComments}
        input={{
          title: text(payload.title),
          objective: text(payload.objective),
          plan: text(payload.plan),
          startAt: text(payload.startAt),
          endAt: text(payload.endAt),
          venueText: text(payload.venueText),
          capacity: typeof payload.capacity === 'number' ? payload.capacity : 0,
          audienceScope: payload.audienceScope === 'MEMBERS_ONLY' ? 'MEMBERS_ONLY' : 'PUBLIC',
          riskNote: text(payload.riskNote),
          facilityNeeds: text(payload.facilityNeeds),
          budgetLines: version.budgetLines,
          bookingIds: [],
        }}
      />
    </div>
  )
}
