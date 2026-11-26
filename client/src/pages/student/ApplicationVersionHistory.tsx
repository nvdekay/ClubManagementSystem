import { useTranslation } from 'react-i18next'

import { AppEmptyState } from '@/components/ui/empty-state/AppEmptyState'
import type { useApplication } from '@/hooks/useApplications'
import type { ApplicationDocument } from '@/services/applications'
import { sectionTitleClass } from '@/pages/student/applicationEditorFormat'
import { formatDate } from '@/utils/formatDate'

type ApplicationVersions = NonNullable<ReturnType<typeof useApplication>['data']>['versions']

// Lịch sử các lần nộp hồ sơ, mỗi lần mở rộng được để xem bản chụp nội dung và tài liệu
export function ApplicationVersionHistory({ versions }: { versions: ApplicationVersions }) {
  const { t, i18n } = useTranslation()
  return (
    <section className="mt-6 space-y-3 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs sm:p-6">
      <h2 className={sectionTitleClass}>{t('applications.history')}</h2>
      {versions.length ? (
        <ol className="space-y-0">
          {versions.map((version) => (
            <li
              key={version.id}
              className="relative space-y-2 border-l-2 border-border-app pb-6 pl-6 last:pb-0"
            >
              <span
                aria-hidden="true"
                className="absolute top-1 -left-[0.4375rem] size-3 rounded-full bg-brand-app"
              />
              <h3 className="font-semibold font-heading">
                {t('applications.version', { number: version.versionNo })}
              </h3>
              <p className="text-sm text-muted-app">
                {t('applications.submittedAt', {
                  date: formatDate(version.submittedAt, i18n.language),
                })}
              </p>
              <p className="text-xs text-muted-app">
                {t('applications.policyVersion', { id: version.policyVersionId })}
              </p>
              <details>
                <summary className="inline-flex min-h-10 items-center text-sm font-medium text-primary-app">
                  {version.snapshot.clubName}
                </summary>
                <p className="mt-2 text-sm">
                  {version.snapshot.summary || version.snapshot.objectives}
                </p>
                <p className="mt-2 text-xs text-muted-app">
                  {version.snapshot.documents
                    .map((item: ApplicationDocument) => item.fileName)
                    .join(', ')}
                </p>
              </details>
            </li>
          ))}
        </ol>
      ) : (
        <AppEmptyState message={t('applications.historyEmpty')} />
      )}
    </section>
  )
}
