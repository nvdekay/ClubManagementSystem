import { useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { useAuth } from '@/hooks/useAuth'
import { useWorkspacePermission } from '@/hooks/useWorkspacePermission'
import { useClubTransitionPlans } from '@/hooks/useClubTransitionPlans'
import { ClubTransitionPlanEditor } from './ClubTransitionPlanEditor'
import { AppErrorNotice } from '@/components/ui/notice/AppErrorNotice'
// Trang kế hoạch chuyển giao nhiệm kỳ ban chủ nhiệm của CLB
export function ClubTransitionPlansPage() {
  const { clubId = '' } = useParams()
  const { t } = useTranslation()
  const auth = useAuth()
  const allowed = useWorkspacePermission(clubId, 'club.transition.plan')
  const query = useClubTransitionPlans(clubId, allowed)
  if (auth.isPending) {
    return <AppSkeleton className="h-64 w-full" />
  }
  if (!allowed) {
    return <AppNotice tone="danger">{t('clubTransitionPlans.denied')}</AppNotice>
  }
  return (
    <>
      <PageHeader
        title={t('clubTransitionPlans.title')}
        description={t('clubTransitionPlans.description')}
      />
      {query.isPending && <AppSkeleton className="h-64 w-full" />}
      {query.isError && (
        <AppErrorNotice onRetry={() => void query.refetch()} retryVariant="primary">
          {query.error.message}
        </AppErrorNotice>
      )}
      {query.data && (
        <div className="space-y-6">
          {!query.data.term && <AppNotice>{t('clubTransitionPlans.noTerm')}</AppNotice>}
          {query.data.term &&
            !query.data.plans.some((p) =>
              ['Draft', 'Returned', 'Pending Confirmation'].includes(p.state),
            ) && (
              <ClubTransitionPlanEditor
                key="new"
                clubId={clubId}
                csrfToken={auth.data!.csrfToken}
                context={query.data}
              />
            )}
          {query.data.plans.map((p) => (
            <ClubTransitionPlanEditor
              key={`${p.id}:${p.revision}`}
              clubId={clubId}
              csrfToken={auth.data!.csrfToken}
              context={query.data!}
              plan={p}
            />
          ))}
        </div>
      )}
    </>
  )
}
