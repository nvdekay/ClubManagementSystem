import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'

import { ClubBoardHistory } from '@/components/custom/ClubBoardHistory'
import { PageHeader } from '@/components/layout/PageHeader'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { useAuth } from '@/hooks/useAuth'
import { useWorkspacePermission } from '@/hooks/useWorkspacePermission'

// Trang lịch sử đề cử ban chủ nhiệm của CLB
/** FR-UC02-03, BR56: góc nhìn của Club Leader về các phiên bản cơ cấu và ban chủ nhiệm theo nhiệm kỳ của CLB. */
export function ClubBoardHistoryPage() {
  const { clubId = '' } = useParams()
  const { t } = useTranslation()
  const auth = useAuth()
  const allowed = useWorkspacePermission(clubId, 'club.board.nominate')
  if (auth.isPending) {
    return <AppSkeleton className="h-64 w-full" />
  }
  if (!allowed) {
    return (
      <AppNotice tone="danger" role="alert">
        {t('clubOversight.clubForbidden')}
      </AppNotice>
    )
  }
  return (
    <>
      <PageHeader
        title={t('clubOversight.clubHistoryTitle')}
        description={t('clubOversight.clubHistoryDescription')}
      />
      <ClubBoardHistory clubId={clubId} />
    </>
  )
}
