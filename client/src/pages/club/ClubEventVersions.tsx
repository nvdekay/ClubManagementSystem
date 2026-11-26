import { useTranslation } from 'react-i18next'

import { AppBadge } from '@/components/ui/badge/AppBadge'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppIcon } from '@/components/ui/icon/AppIcon'
import type { ClubEvent, ClubEventDetail } from '@/services/clubEvents'
import { formatBytes } from '@/utils/proposalFile'

interface ClubEventVersionsProps {
  active: ClubEvent
  versions: ClubEventDetail['versions']
  bookings: ClubEventDetail['bookings']
  properties: { id: string; name: string }[]
  format: Intl.DateTimeFormat
  documentPending: boolean
  onDownload: (revisionNo: number, inline: boolean) => void
}

// Các phiên bản đã nộp của đề xuất sự kiện, mỗi bản mở rộng được để xem nội dung, tài liệu và ngân sách
export function ClubEventVersions({
  active,
  versions,
  bookings,
  properties,
  format,
  documentPending,
  onDownload,
}: ClubEventVersionsProps) {
  const { t, i18n } = useTranslation()
  return (
    <>
      {versions.map((v) => {
        const vp = v.payload ?? {}
        function resolveRoomName(propId?: string) {
          return propId
            ? (properties.find((p) => p.id === propId)?.name ??
                bookings.find((b) => b.propertyId === propId)?.propertyName ??
                propId)
            : undefined
        }
        const vStart = vp.startAt ?? active.startAt
        const vEnd = vp.endAt ?? active.endAt
        const vVenue =
          [resolveRoomName(vp.propertyId), vp.venueText].filter(Boolean).join(' · ') || '—'
        const vScope = vp.audienceScope ?? active.audienceScope
        const vOccurrences = Array.isArray(vp.occurrences) ? vp.occurrences : []
        const vForm = Array.isArray(vp.registrationForm) ? vp.registrationForm : []
        const vDoc = vp.proposalDocument
        const vBudgetTotal =
          v.requestedBudgetTotal ?? v.budgetLines.reduce((sum, line) => sum + line.amount, 0)
        const vSubmitter = v.submittedByName ?? v.submittedBy
        const vConflictTone =
          v.conflictResult === 'Blocking Conflict'
            ? 'danger'
            : v.conflictResult === 'Warning'
              ? 'warning'
              : 'success'
        return (
          <details
            key={v.revisionNo}
            className="mt-2 rounded-xl border border-border-app bg-surface-app/40 p-4"
          >
            <summary className="font-medium">
              <span>
                #{v.revisionNo} · {format.format(new Date(v.submittedAt))}
              </span>
              {vSubmitter && (
                <span className="ml-2 font-normal text-muted-app">
                  · {t('clubEvents.submittedByLabel', { name: vSubmitter })}
                </span>
              )}
              {v.conflictResult && (
                <span className="ml-2 inline-flex align-middle">
                  <AppBadge tone={vConflictTone}>
                    {t(`clubEvents.${v.conflictResult}`, {
                      defaultValue: v.conflictResult,
                    })}
                  </AppBadge>
                </span>
              )}
              <span className="ml-2 font-normal text-muted-app">
                ·{' '}
                {vBudgetTotal > 0
                  ? `${vBudgetTotal.toLocaleString(i18n.language)} VND`
                  : t('clubEvents.noBudgetRequested')}
              </span>
            </summary>
            <div className="mt-4 space-y-4 border-t border-border-app pt-4 text-sm">
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-app">{t('clubEvents.titleField')}</dt>
                  <dd className="mt-0.5 font-medium break-words">{vp.title ?? active.title}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-app">{t('clubEvents.scheduleVenue')}</dt>
                  <dd className="mt-0.5 font-medium">
                    {format.format(new Date(vStart))} – {format.format(new Date(vEnd))}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-app">{t('clubEvents.venue')}</dt>
                  <dd className="mt-0.5 font-medium break-words">{vVenue}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-app">{t('clubEvents.scope')}</dt>
                  <dd className="mt-0.5 font-medium">{t(`clubEvents.${vScope}`)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-app">{t('clubEvents.maxParticipants')}</dt>
                  <dd className="mt-0.5 font-medium">{vp.capacity ?? active.capacity}</dd>
                </div>
              </dl>

              {(vp.objective ?? active.objective) && (
                <div>
                  <p className="text-xs font-medium text-muted-app">{t('clubEvents.objective')}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words">
                    {vp.objective ?? active.objective}
                  </p>
                </div>
              )}

              {vp.plan && (
                <div>
                  <p className="text-xs font-medium text-muted-app">{t('clubEvents.plan')}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words">{vp.plan}</p>
                </div>
              )}

              {vp.riskNote && (
                <div>
                  <p className="text-xs font-medium text-muted-app">{t('clubEvents.riskNote')}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words">{vp.riskNote}</p>
                </div>
              )}

              {vp.facilityNeeds && (
                <div>
                  <p className="text-xs font-medium text-muted-app">
                    {t('clubEvents.facilityNeeds')}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words">{vp.facilityNeeds}</p>
                </div>
              )}

              {vOccurrences.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-app">
                    {t('clubEvents.occurrences')}
                  </p>
                  <ul className="mt-1 list-inside list-disc space-y-1">
                    {vOccurrences.map((occ, idx) => {
                      const occLocation = [resolveRoomName(occ.propertyId), occ.venueText]
                        .filter(Boolean)
                        .join(' · ')
                      return (
                        <li key={idx}>
                          <span className="font-medium">
                            {t('clubEvents.sessionIndex', { index: idx + 1 })}:
                          </span>{' '}
                          {format.format(new Date(occ.startAt))} –{' '}
                          {format.format(new Date(occ.endAt))}
                          {occLocation ? ` (${occLocation})` : ''}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {vDoc && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border-app bg-bg-app px-3 py-2">
                  <span className="font-medium">{t('clubEvents.proposalDocumentSection')}:</span>
                  <span className="min-w-0 break-words">
                    {vDoc.fileName} · {formatBytes(vDoc.bytes)} ·{' '}
                    {t('clubEvents.proposalDocumentUploaded', {
                      date: format.format(new Date(vDoc.uploadedAt)),
                    })}
                  </span>
                  <AppButton
                    variant="secondary"
                    disabled={documentPending}
                    onClick={() => onDownload(v.revisionNo, false)}
                  >
                    <AppIcon name="download" className="size-4" />
                    {t('clubEvents.proposalDocumentDownload')}
                  </AppButton>
                  {vDoc.mimeType === 'application/pdf' && (
                    <AppButton
                      variant="ghost"
                      disabled={documentPending}
                      onClick={() => onDownload(v.revisionNo, true)}
                    >
                      {t('clubEvents.proposalDocumentView')}
                    </AppButton>
                  )}
                </div>
              )}

              {vForm.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-app">{t('clubEvents.form')}</p>
                  <ul className="mt-1 list-inside list-disc space-y-1">
                    {vForm.map((field, idx) => (
                      <li key={idx} className="break-words">
                        <span className="font-medium">{field.label}</span>
                        {field.required ? ' *' : ''} (
                        {t(`clubEvents.${field.type}`, { defaultValue: field.type })})
                        {field.options?.length ? `: ${field.options.join(', ')}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-muted-app">{t('clubEvents.budget')}</p>
                {v.budgetLines.length > 0 ? (
                  <div className="mt-1.5 overflow-x-auto rounded-lg border border-border-app bg-bg-app">
                    <table className="w-full min-w-[26rem] text-left text-sm">
                      <thead className="bg-surface-app text-xs text-muted-app">
                        <tr>
                          <th scope="col" className="px-3 py-2 font-medium">
                            {t('clubEvents.category')}
                          </th>
                          <th scope="col" className="px-3 py-2 font-medium">
                            {t('clubEvents.purpose')}
                          </th>
                          <th scope="col" className="px-3 py-2 text-right font-medium">
                            {t('clubEvents.amount')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {v.budgetLines.map((line, index) => (
                          <tr key={index} className="border-t border-border-app align-top">
                            <td className="px-3 py-2 font-medium">{line.category}</td>
                            <td className="px-3 py-2">
                              <p className="break-words">{line.purpose}</p>
                              {line.plannedItems && (
                                <p className="mt-0.5 whitespace-pre-line text-xs text-muted-app">
                                  {line.plannedItems}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {line.amount.toLocaleString(i18n.language)} VND
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-border-app bg-surface-app font-semibold">
                          <td className="px-3 py-2" colSpan={2}>
                            {t('clubEvents.requestedTotal')}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {vBudgetTotal.toLocaleString(i18n.language)} VND
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="mt-1 text-muted-app">{t('clubEvents.noBudgetRequested')}</p>
                )}
              </div>
            </div>
          </details>
        )
      })}
    </>
  )
}
