import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { useAuth } from '@/hooks/useAuth'

export function ViolationGate({ children }: { children: (csrfToken: string) => ReactNode }) {
  const { t } = useTranslation()
  const auth = useAuth()
  if (auth.isPending) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((item) => (
          <AppSkeleton key={item} className="h-20 w-full" />
        ))}
      </div>
    )
  }
  if (!auth.data) {
    return (
      <AppNotice>
        <p>{t('violations.signIn')}</p>
        <Link
          className="inline-block font-semibold text-primary-app hover:underline"
          to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}
        >
          {t('violations.signInLink')}
        </Link>
      </AppNotice>
    )
  }
  if (!auth.data.systemRoles.includes('ICPDP_OFFICER')) {
    return (
      <AppNotice tone="danger" role="alert">
        {t('violations.unauthorized')}
      </AppNotice>
    )
  }
  return <>{children(auth.data.csrfToken)}</>
}
