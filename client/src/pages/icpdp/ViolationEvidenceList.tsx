import { useTranslation } from 'react-i18next'

import { AppEmptyState } from '@/components/ui/empty-state/AppEmptyState'
import type { ViolationEvidence } from '@/services/violations'
import { documentHref } from '@/utils/documentLinks'
import { formatDay } from '@/utils/formatDate'

// Danh sách minh chứng của ca vi phạm
export function ViolationEvidenceList({
  items,
  names,
}: {
  items: ViolationEvidence[]
  names: Record<string, string>
}) {
  const { t, i18n } = useTranslation()
  if (!items.length) {
    return (
      <div className="mt-3">
        <AppEmptyState message={t('violations.noEvidence')} />
      </div>
    )
  }
  return (
    <ul className="mt-3 space-y-2 text-sm">
      {items.map((item, index) => (
        <li key={index} className="rounded-xl border border-border-app px-3 py-2">
          {item.url ? (
            <a
              href={documentHref(item.url) ?? undefined}
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium break-all text-primary-app hover:underline"
            >
              {item.note}
            </a>
          ) : (
            <p className="break-words">{item.note}</p>
          )}
          <p className="mt-0.5 text-xs text-muted-app">
            {names[item.addedBy] ?? item.addedBy} · {formatDay(item.addedAt, i18n.language)}
          </p>
        </li>
      ))}
    </ul>
  )
}
