import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AppBadge } from '@/components/ui/badge/AppBadge'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppIcon } from '@/components/ui/icon/AppIcon'
import { AppInput } from '@/components/ui/input/AppInput'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { useFounderLookup } from '@/hooks/useApplications'
import type { DraftInput, FounderProfile, FounderRole } from '@/services/applications'
import { sectionTitleClass } from '@/pages/student/applicationEditorFormat'
import { ApplicationFounderRow } from '@/pages/student/ApplicationFounderRow'
import { cn } from '@/utils/cn'

interface ApplicationFoundersStepProps {
  founders: DraftInput['founders']
  minFoundingMembers: number
  maxViceLeaders: number
  missingFounders: number
  rolesValid: boolean
  meId: string | undefined
  profileOf: (userId: string) => FounderProfile | undefined
  onAdd: (profile: FounderProfile) => void
  onRoleChange: (userId: string, role: FounderRole) => void
  onRemove: (userId: string) => void
}

// Bước 2: danh sách sáng lập viên, vai trò và thêm người theo email
export function ApplicationFoundersStep({
  founders,
  minFoundingMembers,
  maxViceLeaders,
  missingFounders,
  rolesValid,
  meId,
  profileOf,
  onAdd,
  onRoleChange,
  onRemove,
}: ApplicationFoundersStepProps) {
  const { t } = useTranslation()
  const founderLookup = useFounderLookup()
  const [founderEmail, setFounderEmail] = useState('')
  const [founderError, setFounderError] = useState<string | null>(null)

  // Thêm sáng lập viên theo email
  async function addFounder() {
    const email = founderEmail.trim()
    if (!email) {
      return
    }
    setFounderError(null)
    try {
      const profile = await founderLookup.mutateAsync(email)
      if (founders.some((founder) => founder.userId === profile.id)) {
        setFounderError(t('applications.founderAlreadyAdded'))
        return
      }
      onAdd(profile)
      setFounderEmail('')
    } catch (error) {
      const status = (error as { status?: number }).status
      setFounderError(
        status === 404 ? t('applications.founderNotFound') : t('applications.founderLookupError'),
      )
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className={sectionTitleClass}>{t('applications.founders')}</h2>
        <AppBadge tone={missingFounders ? 'warning' : 'success'}>
          {t('applications.foundersProgress', {
            count: founders.length,
            required: minFoundingMembers,
          })}
        </AppBadge>
        <span className="text-sm text-muted-app">
          {missingFounders
            ? t('applications.foundersMissing', { count: missingFounders })
            : t('applications.foundersEnough')}
        </span>
      </div>
      <ul className="divide-y divide-border-app rounded-xl border border-border-app">
        {founders.map((founder) => (
          <ApplicationFounderRow
            key={founder.userId}
            userId={founder.userId}
            role={founder.role}
            profile={profileOf(founder.userId)}
            isMe={founder.userId === meId}
            readOnly={false}
            onRoleChange={(role) => onRoleChange(founder.userId, role)}
            onRemove={() => onRemove(founder.userId)}
          />
        ))}
      </ul>
      <p className={cn('text-sm text-muted-app', { 'text-danger-app': !rolesValid })}>
        {t('applications.rolesRule', { max: maxViceLeaders })}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 basis-56 text-sm font-medium text-text-app">
          {t('applications.founderEmail')}
          <AppInput
            className="mt-1.5 block w-full"
            type="email"
            value={founderEmail}
            onChange={(event) => {
              setFounderEmail(event.target.value)
              setFounderError(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void addFounder()
              }
            }}
          />
        </label>
        <AppButton
          type="button"
          variant="secondary"
          disabled={!founderEmail.trim() || founderLookup.isPending}
          onClick={() => void addFounder()}
        >
          <AppIcon name="plus" className="size-4" />
          {t('applications.addFounder')}
        </AppButton>
      </div>
      {founderError && (
        <p role="alert" className="text-sm text-danger-app">
          {founderError}
        </p>
      )}
      <p className="text-xs text-muted-app">{t('applications.foundersHint')}</p>
      <AppNotice>{t('applications.rolesHint')}</AppNotice>
    </section>
  )
}
