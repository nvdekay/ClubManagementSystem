import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { SimilarClubHints } from '@/components/custom/SimilarClubHints'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import type { useApplicationPreview } from '@/hooks/useApplications'
import type { FoundingIssue } from '@/services/applications'
import { issueStep, sectionTitleClass } from '@/pages/student/applicationEditorFormat'

interface ApplicationReviewStepProps {
  preview: ReturnType<typeof useApplicationPreview>
  submitIssues: FoundingIssue[] | null
  issues: FoundingIssue[]
  minFoundingMembers: number
  onFix: (step: number) => void
  /** Bản tóm tắt nội dung đã nhập. */
  children: ReactNode
}

// Bước 4: những gì còn chặn việc nộp (mỗi lỗi dẫn về đúng bước để sửa) và bản tóm tắt
export function ApplicationReviewStep({
  preview,
  submitIssues,
  issues,
  minFoundingMembers,
  onFix,
  children,
}: ApplicationReviewStepProps) {
  const { t } = useTranslation()
  return (
    <section className="space-y-6 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs sm:p-6">
      <h2 className={sectionTitleClass}>{t('applications.reviewTitle')}</h2>
      {preview.isPending && !submitIssues ? (
        <AppSkeleton className="h-20 w-full" />
      ) : preview.isError && !submitIssues ? (
        <AppNotice tone="danger" role="alert">
          {preview.error.message}
        </AppNotice>
      ) : issues.length ? (
        <AppNotice tone="warning" role="status">
          <p className="font-semibold">{t('applications.reviewBlocked')}</p>
          <ul className="mt-2 space-y-1">
            {issues.map((issue) => (
              <li key={issue} className="flex flex-wrap items-center gap-2">
                <span>
                  {t(`applications.issue_${issue}`, {
                    count: minFoundingMembers,
                  })}
                </span>
                <button
                  type="button"
                  className="text-sm font-medium text-primary-app hover:underline"
                  onClick={() => onFix(issueStep[issue])}
                >
                  {t('applications.fix')}
                </button>
              </li>
            ))}
          </ul>
        </AppNotice>
      ) : (
        <AppNotice tone="success" role="status">
          {t('applications.reviewReady')}
        </AppNotice>
      )}
      {preview.data?.activeNameConflict && (
        <AppNotice tone="warning">{t('applications.submitWarning')}</AppNotice>
      )}
      {preview.data && <SimilarClubHints hints={preview.data.similarClubs} audience="applicant" />}
      {children}
    </section>
  )
}
