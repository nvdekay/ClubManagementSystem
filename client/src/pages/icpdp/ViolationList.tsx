import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { AppBadge } from '@/components/ui/badge/AppBadge'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppEmptyState } from '@/components/ui/empty-state/AppEmptyState'
import { AppIcon } from '@/components/ui/icon/AppIcon'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppPagination } from '@/components/ui/pagination/AppPagination'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { useViolations } from '@/hooks/useViolations'
import type { ViolationSummary } from '@/services/violations'
import { ViolationOpenCaseForm } from '@/pages/icpdp/ViolationOpenCaseForm'
import {
  filterLabel,
  filters,
  matches,
  originLabel,
  severityLabel,
  severityTone,
  stateLabel,
  stateTone,
  type Filter,
} from '@/pages/icpdp/violationFormat'
import { cn } from '@/utils/cn'
import { formatDay } from '@/utils/formatDate'

const PAGE_SIZE = 20
const emptyViolations: ViolationSummary[] = []

// Danh sách ca vi phạm kèm bộ lọc và nút mở ca mới
export function ViolationList({ csrfToken }: { csrfToken: string }) {
  const { t, i18n } = useTranslation()
  const list = useViolations(true)
  const [filter, setFilter] = useState<Filter>('active')
  const [opening, setOpening] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  const items = list.data ?? emptyViolations
  // Counts for every tab are computed in one pass instead of re-filtering per tab on each render.
  const counts = useMemo(() => {
    const result = Object.fromEntries(filters.map((value) => [value, 0])) as Record<Filter, number>
    for (const item of items) {
      for (const value of filters) {
        if (matches(value, item)) {
          result[value] += 1
        }
      }
    }
    return result
  }, [items])
  const visible = useMemo(() => items.filter((item) => matches(filter, item)), [items, filter])
  const pageCount = Math.ceil(visible.length / PAGE_SIZE)
  // Clamp after the list shrinks (e.g. a case leaves the current tab) so the page never goes blank.
  const page = Math.min(pageIndex, Math.max(pageCount - 1, 0))
  const pageItems = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  function day(value: string) {
    return formatDay(value, i18n.language)
  }

  return (
    <>
      {opening ? (
        <ViolationOpenCaseForm csrfToken={csrfToken} onCancel={() => setOpening(false)} />
      ) : (
        <AppButton className="mb-6" onClick={() => setOpening(true)}>
          <AppIcon name="plus" className="size-4" />
          {t('violations.openCase')}
        </AppButton>
      )}
      {list.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((item) => (
            <AppSkeleton key={item} className="h-20 w-full" />
          ))}
        </div>
      ) : list.isError ? (
        <AppNotice
          tone="danger"
          role="alert"
          title={list.error.message || t('violations.loadError')}
        >
          <AppButton variant="secondary" onClick={() => void list.refetch()}>
            {t('violations.retry')}
          </AppButton>
        </AppNotice>
      ) : (
        <>
          <div
            role="group"
            aria-label={t('violations.title')}
            className="mb-5 flex w-fit max-w-full flex-wrap gap-1 rounded-lg border border-border-app bg-surface-app p-1"
          >
            {filters.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => {
                  setFilter(value)
                  setPageIndex(0)
                }}
                className={cn(
                  'inline-flex min-h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-muted-app transition-colors hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app',
                  {
                    'bg-segment-app text-text-app shadow-xs hover:text-text-app': filter === value,
                  },
                )}
              >
                {filterLabel(t, value)} · {counts[value]}
              </button>
            ))}
          </div>
          {visible.length ? (
            <>
              <ul className="divide-y divide-border-app overflow-hidden rounded-2xl border border-border-app bg-bg-app shadow-xs">
                {pageItems.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={`/workspace/violations/${item.id}`}
                      className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 hover:bg-surface-app focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring-app"
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border-app bg-bg-app text-muted-app"
                      >
                        <AppIcon name="shield" />
                      </span>
                      <span className="min-w-0 flex-1 basis-64">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-heading text-base font-semibold break-words">
                            {item.title}
                          </span>
                          <AppBadge tone={stateTone(item.state)}>
                            {stateLabel(t, item.state)}
                          </AppBadge>
                        </span>
                        <span className="mt-1 block text-sm text-muted-app">
                          {item.clubName} · {originLabel(t, item.originType)} ·{' '}
                          {t('violations.openedOn', { date: day(item.openedAt) })}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-2">
                          <AppBadge tone={severityTone(item.severity)}>
                            {severityLabel(t, item.severity)}
                          </AppBadge>
                          {item.responseOverdue ? (
                            <AppBadge tone="danger">{t('violations.responseOverdue')}</AppBadge>
                          ) : (
                            item.state === 'Awaiting Club Response' &&
                            item.responseDueAt && (
                              <span className="text-xs text-muted-app">
                                {t('violations.responseDue', { date: day(item.responseDueAt) })}
                              </span>
                            )
                          )}
                          {item.pendingActions > 0 && (
                            <AppBadge tone="warning">
                              {t('violations.pendingActions', { count: item.pendingActions })}
                            </AppBadge>
                          )}
                        </span>
                      </span>
                      <AppIcon name="chevronRight" className="size-4 text-muted-app" />
                    </Link>
                  </li>
                ))}
              </ul>
              <AppPagination
                className="mt-4"
                pageIndex={page}
                pageCount={pageCount}
                onPageChange={setPageIndex}
                prevLabel={t('violations.previousPage')}
                nextLabel={t('violations.nextPage')}
                pageLabel={(value) => t('violations.pageNumber', { page: value })}
                navLabel={t('violations.pagination')}
              />
            </>
          ) : (
            <AppEmptyState
              variant="boxed"
              icon="sparkles"
              title={t('violations.none')}
              message={t('violations.noneHint')}
            />
          )}
        </>
      )}
    </>
  )
}
