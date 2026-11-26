import { useTranslation } from 'react-i18next'

import { AppBadge } from '@/components/ui/badge/AppBadge'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppSelect } from '@/components/ui/select/AppSelect'
import type { FounderProfile, FounderRole } from '@/services/applications'
import { founderRoles } from '@/pages/student/applicationEditorFormat'

interface ApplicationFounderRowProps {
  userId: string
  role: FounderRole
  profile: FounderProfile | undefined
  isMe: boolean
  readOnly: boolean
  onRoleChange?: (role: FounderRole) => void
  onRemove?: () => void
}

// Dòng hiển thị một sáng lập viên và vai trò
export function ApplicationFounderRow({
  userId,
  role,
  profile,
  isMe,
  readOnly,
  onRoleChange,
  onRemove,
}: ApplicationFounderRowProps) {
  const { t } = useTranslation()
  const name = profile?.displayName ?? userId
  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-2.5">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft-app text-sm font-semibold text-primary-app"
      >
        {name.trim().charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1 basis-40">
        <span className="block font-semibold break-words">
          {name}
          {isMe && ` (${t('applications.you')})`}
        </span>
        {profile && <span className="block text-xs break-all text-muted-app">{profile.email}</span>}
      </span>
      {readOnly ? (
        <AppBadge tone={role === 'MEMBER' ? 'neutral' : 'info'}>
          {t(`applications.role${role}`)}
        </AppBadge>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <AppSelect
            className="w-44"
            label={t('applications.roleLabel', { name })}
            value={role}
            options={founderRoles.map((value) => ({
              value,
              label: t(`applications.role${value}`),
            }))}
            onChange={(value) => onRoleChange?.(value)}
          />
          {!isMe && (
            <AppButton type="button" variant="secondary" onClick={onRemove}>
              {t('applications.remove')}
            </AppButton>
          )}
        </div>
      )}
    </li>
  )
}
