import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { AppBadge } from '@/components/ui/badge/AppBadge'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppEmptyState } from '@/components/ui/empty-state/AppEmptyState'
import { AppIcon } from '@/components/ui/icon/AppIcon'
import { AppPagination } from '@/components/ui/pagination/AppPagination'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { useViolations } from '@/hooks/useViolations'
import type { ViolationSummary } from '@/services/violations'
import { ViolationOpenCaseForm } from '@/pages/icpdp/ViolationOpenCaseForm'
import {
  filterLabel,
  filters,
  originLabel,
  severityLabel,
  severityTone,
  stateLabel,
  stateTone,
  type Filter,
} from '@/pages/icpdp/violationFormat'
import { cn } from '@/utils/cn'
import { useFormat } from '@/hooks/useFormat'
import { AppErrorNotice } from '@/components/ui/notice/AppErrorNotice'

const PAGE_SIZE = 20
const emptyViolations: ViolationSummary[] = []

// Danh sách ca vi phạm kèm bộ lọc và nút mở ca mới
export function ViolationList({ csrfToken }: { csrfToken: string }) {
  const { t } = useTranslation()
  const { day } = useFormat()
  const [filter, setFilter] = useState<Filter>('active')
  const [opening, setOpening] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  // The server filters and pages; the tab badges come from its per-filter counts.
  const list = useViolations(filter, pageIndex + 1, PAGE_SIZE, true)
  const pageItems = list.data?.items ?? emptyViolations
  const pageCount = Math.ceil((list.data?.total ?? 0) / PAGE_SIZE)
  // Step back after the list shrinks (e.g. the last case of the last page left this tab).
  if (list.data && !list.isPlaceholderData && pageIndex > 0 && pageIndex >= pageCount) {
    setPageIndex(Math.max(pageCount - 1, 0))
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
        <AppErrorNotice
          title={list.error.message || t('violations.loadError')}
          onRetry={() => void list.refetch()}
        />
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
                {filterLabel(t, value)} · {list.data.counts[value]}
              </button>
            ))}
          </div>
          {pageItems.length ? (
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
                pageIndex={pageIndex}
                pageCount={pageCount}
                onPageChange={setPageIndex}
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
