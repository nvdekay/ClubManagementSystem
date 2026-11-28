import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/PageHeader'
import { AppBadge } from '@/components/ui/badge/AppBadge'
import { AppIcon } from '@/components/ui/icon/AppIcon'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { AppEmptyState } from '@/components/ui/empty-state/AppEmptyState'
import { useAuth } from '@/hooks/useAuth'
import { useMyApplications } from '@/hooks/useApplications'
import {
  applicationStateLabel,
  applicationStateTone,
} from '@/pages/student/applicationEditorFormat'
import { AppErrorNotice } from '@/components/ui/notice/AppErrorNotice'

// Trang danh sách đơn thành lập CLB của sinh viên
export function ApplicationsPage() {
  const { t } = useTranslation()
  const auth = useAuth()
  const applications = useMyApplications(Boolean(auth.data))
  return (
    <>
      <PageHeader
        title={t('applications.title')}
        description={t('applications.description')}
        actions={
          <Link
            to="/workspace/applications/new"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-app px-3.5 text-sm font-medium text-on-primary-app shadow-xs transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app focus-visible:outline-none sm:min-h-9"
          >
            <AppIcon name="plus" className="size-4" />
            {t('applications.new')}
          </Link>
        }
      />
      {auth.isPending || applications.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((item) => (
            <AppSkeleton key={item} className="h-18 w-full" />
          ))}
        </div>
      ) : auth.isError || applications.isError ? (
        <AppErrorNotice
          title={applications.error?.message ?? auth.error?.message ?? t('applications.loadError')}
          onRetry={() => void applications.refetch()}
        />
      ) : !auth.data ? null : applications.data?.length ? (
        <ul className="divide-y divide-border-app overflow-hidden rounded-2xl border border-border-app bg-bg-app shadow-xs">
          {applications.data.map((application) => (
            <li key={application.id}>
              <Link
                to={`/workspace/applications/${application.id}`}
                className="group flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-ring-app"
              >
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border-app bg-bg-app text-muted-app"
                >
                  <AppIcon name="file" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium break-words text-text-app">
                    {application.draft.clubName}
                  </span>
                  {application.state !== 'Draft' && (
                    <span className="mt-0.5 block text-sm text-muted-app">
                      {t('applications.version', { number: application.currentVersionNo })}
                    </span>
                  )}
                </span>
                <AppBadge tone={applicationStateTone(application.state)}>
                  {applicationStateLabel(t, application.state)}
                </AppBadge>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-app group-hover:text-text-app">
                  {t('applications.edit')}
                  <AppIcon
                    name="chevronRight"
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <AppEmptyState variant="boxed" message={t('applications.none')} />
      )}
    </>
  )
}
