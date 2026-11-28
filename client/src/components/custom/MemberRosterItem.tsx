import { useTranslation } from 'react-i18next'

import type { MemberSpace } from '@/services/memberSpace'
import { cn } from '@/utils/cn'

interface MemberRosterItemProps {
  member: MemberSpace['members'][number]
  className?: string
}

// Một dòng danh sách thành viên CLB: chữ cái đầu, tên, chức vụ và dấu "ngừng hoạt động"
export function MemberRosterItem({ member, className }: MemberRosterItemProps) {
  const { t } = useTranslation()
  return (
    <li className={cn('flex items-center gap-3', className)}>
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft-app text-sm font-semibold text-primary-app"
      >
        {member.displayName.trim().charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium" title={member.displayName}>
          {member.displayName}
        </span>
        <span className="block text-xs text-muted-app">
          {member.positions.join(', ') || t('memberSpace.noPosition')}
          {member.state === 'Inactive' && ` · ${t('memberSpace.stateInactive')}`}
        </span>
      </span>
    </li>
  )
}
