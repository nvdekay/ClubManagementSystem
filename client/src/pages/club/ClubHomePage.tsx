import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'

import { WorkspaceHome } from '@/components/custom/WorkspaceHome'
import { RoleDashboard } from '@/components/custom/RoleDashboard'
import { useClubWorkspace } from '@/hooks/useWorkspacePermission'

// Trang chủ workspace CLB, hiện lối tắt theo permission của người dùng
export function ClubHomePage() {
  const { t } = useTranslation()
  const { clubId } = useParams()
  const workspace = useClubWorkspace(clubId)
  // Kiểm tra workspace CLB hiện tại có permission được hỏi hay không
  function can(permission: string) {
    return Boolean(workspace?.permissions.includes(permission))
  }
  const base = `/club/${encodeURIComponent(clubId ?? '')}`
  return (
    <WorkspaceHome
      subtitle={workspace?.clubName ?? t('auth.club')}
      actions={[
        ...(can('club.board.nominate')
          ? [
              {
                href: `${base}/board`,
                icon: 'badge' as const,
                label: t('boardNominations.title'),
                description: t('boardNominations.description'),
              },
            ]
          : []),
        ...(can('club.recruitment.manage')
          ? [
              {
                href: `${base}/recruitment`,
                icon: 'megaphone' as const,
                label: t('recruitmentCampaigns.title'),
                description: t('recruitmentCampaigns.description'),
              },
            ]
          : []),
        ...(can('club.profile.manage')
          ? [
              {
                href: `${base}/settings`,
                icon: 'settings' as const,
                label: t('clubSettings.title'),
                description: t('clubSettings.description'),
              },
            ]
          : []),
        {
          href: `/clubs/${encodeURIComponent(clubId ?? '')}`,
          icon: 'globe',
          label: t('auth.clubPublicPage'),
          description: t('auth.clubPublicPageDescription'),
        },
        {
          href: '/events',
          icon: 'calendar',
          label: t('discovery.navEvents'),
          description: t('auth.clubEventsDescription'),
        },
      ]}
    >
      {clubId && <RoleDashboard context={{ workspace: 'club', clubId }} />}
    </WorkspaceHome>
  )
}
