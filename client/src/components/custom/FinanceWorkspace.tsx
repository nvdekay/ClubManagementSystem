import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { SponsoredItems } from './SponsoredItems'
import type { accountability } from '@/i18n/accountability'
import { PageHeader } from '@/components/layout/PageHeader'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppEmptyState } from '@/components/ui/empty-state/AppEmptyState'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppSelect } from '@/components/ui/select/AppSelect'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { useAuth } from '@/hooks/useAuth'
import { useClubFinances } from '@/hooks/useAccountability'
import type { AccountabilityContext } from '@/services/accountability'

// Ánh xạ trạng thái ngân sách sang key i18n
function stateKey(state: string): keyof typeof accountability.en {
  return (
    (
      {
        Approved: 'approved',
        Closed: 'closed',
        Cancelled: 'cancelled',
      } as Record<string, keyof typeof accountability.en>
    )[state] ?? 'approved'
  )
}

// Workspace tài chính sự kiện: chọn ngân sách và thao tác theo từng hạng mục tài trợ (CLB hoặc ICPDP)
export function FinanceWorkspace({
  context,
  id = '',
}: {
  context: AccountabilityContext
  id?: string
}) {
  const { t } = useTranslation()
  const auth = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // Chọn ngân sách đang xem và lưu vào query string
  function setSelected(value: string) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value) {
          next.set('budget', value)
        } else {
          next.delete('budget')
        }
        next.delete('event')
        return next
      },
      { replace: true },
    )
  }

  const allowed =
    context.kind === 'admin'
      ? auth.data?.systemRoles.includes('ICPDP_OFFICER')
      : auth.data?.workspaces.some(
          (w) =>
            w.kind === 'club' &&
            w.clubId === context.clubId &&
            w.permissions.includes('club.expense.record'),
        )

  const list = useClubFinances(
    context.kind === 'club' ? context.clubId : '',
    Boolean(allowed) && context.kind === 'club',
  )
  const selected =
    id ||
    searchParams.get('budget') ||
    list.data?.find((item) => item.eventId === searchParams.get('event'))?.id ||
    ''

  if (auth.isPending) {
    return <AppSkeleton className="h-40 w-full" />
  }
  if (!allowed || !auth.data) {
    return <AppNotice tone="danger">{t('accountability.access')}</AppNotice>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(context.kind === 'admin' ? 'accountability.review' : 'accountability.finances')}
      />
      {context.kind === 'club' &&
        (list.isPending ? (
          <AppSkeleton className="h-20 w-full" />
        ) : list.isError ? (
          <AppNotice tone="danger" role="alert">
            {list.error.message}
            <AppButton onClick={() => void list.refetch()}>{t('accountability.retry')}</AppButton>
          </AppNotice>
        ) : list.data?.length ? (
          <AppSelect
            className="w-full sm:max-w-xl"
            label={t('accountability.select')}
            value={selected}
            onChange={setSelected}
            options={[
              { value: '', label: t('accountability.select') },
              ...list.data.map((item) => ({
                value: item.id,
                label: `${item.eventTitle} · ${t(`accountability.${stateKey(item.state)}`)}`,
              })),
            ]}
          />
        ) : (
          <AppEmptyState variant="boxed" message={t('accountability.empty')} />
        ))}
      {selected ? (
        <SponsoredItems
          key={selected}
          budgetId={selected}
          clubId={context.kind === 'club' ? context.clubId : undefined}
          csrfToken={auth.data.csrfToken}
          fallback={<AppNotice>{t('budgets.noSponsoredData')}</AppNotice>}
        />
      ) : (
        <p className="text-sm text-muted-app">{t('accountability.noSelection')}</p>
      )}
    </div>
  )
}
