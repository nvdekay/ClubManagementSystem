import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { useSponsoredItems } from '@/hooks/useSponsoredItems'
import { cn } from '@/utils/cn'
import { formatSponsoredMoney } from '@/utils/sponsoredItems'
import { SponsoredItemCard } from './SponsoredItemCard'

export interface SponsoredItemsProps {
  budgetId: string
  clubId?: string
  csrfToken: string
  fallback?: ReactNode
}

// List sponsored budget items with summary totals for club and ICPDP workspaces
export function SponsoredItems({
  budgetId,
  clubId,
  csrfToken,
  fallback = null,
}: SponsoredItemsProps) {
  const { t, i18n } = useTranslation()
  const query = useSponsoredItems(budgetId, clubId)
  if (query.isPending) {
    return <AppSkeleton className="mt-5 h-48" />
  }
  if (query.isError) {
    return (
      <p role="alert" className="mt-4 text-danger-app">
        {t('sponsoredItems.error')}
      </p>
    )
  }
  if (!query.data) {
    return <>{fallback}</>
  }

  const disbursed = query.data.items.reduce((sum, item) => {
    if (item.fundingDecision === 'BEFORE_EVENT') {
      return sum + (item.advanceReceivedAt ? (item.advanceAmount ?? item.approvedAmount) : 0)
    }
    return sum + (item.status === 'Paid' ? (item.payable ?? 0) : 0)
  }, 0)

  const refunded = query.data.items.reduce(
    (sum, item) =>
      sum +
      (item.fundingDecision === 'BEFORE_EVENT' && item.refundConfirmedAt
        ? (item.refundAmount ?? 0)
        : 0),
    0,
  )

  const totals = [
    {
      label: t('budgets.approved'),
      amount: query.data.items.reduce((sum, item) => sum + item.approvedAmount, 0),
    },
    {
      label: t('accountability.recorded'),
      amount: query.data.items.reduce((sum, item) => sum + item.amount, 0),
    },
    { label: t('budgets.transferred'), amount: disbursed },
    ...(refunded > 0 ? [{ label: t('budgets.refunded'), amount: refunded }] : []),
  ]

  return (
    <section className="mt-6 space-y-4">
      <h3 className="font-heading text-lg font-semibold">{t('sponsoredItems.title')}</h3>
      <dl className={cn('grid gap-3', totals.length > 3 ? 'sm:grid-cols-4' : 'sm:grid-cols-3')}>
        {totals.map((total) => (
          <div key={total.label} className="rounded-xl border border-border-app bg-bg-app p-4">
            <dt className="text-sm text-muted-app">{total.label}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">
              {formatSponsoredMoney(total.amount, i18n.language)}
            </dd>
          </div>
        ))}
      </dl>
      {query.data.items.map((item) => (
        <SponsoredItemCard
          key={`${item.id}-${item.status}-${item.amount}`}
          budget={query.data!}
          item={item}
          clubId={clubId}
          csrfToken={csrfToken}
        />
      ))}
    </section>
  )
}
