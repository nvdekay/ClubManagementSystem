import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'

import { AppLinkedText } from '@/components/ui/linked-text/AppLinkedText'
import type { ProposalSection } from '@/utils/eventProposalImport'

interface EventProposalContentProps {
  sections: ProposalSection[]
  renderSectionComments?: (section: ProposalSection) => ReactNode
}

// Source text is rendered as text nodes; tables retain every row and merged cell.
export function EventProposalContent({
  sections,
  renderSectionComments,
}: EventProposalContentProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section
          key={section.id}
          className="min-w-0 space-y-5"
          aria-label={section.title || t('clubEvents.extractedIntroduction')}
        >
          <div className="flex flex-wrap items-center gap-3 border-b border-border-app pb-3">
            <span className="h-5 w-1 rounded-full bg-primary-app" aria-hidden="true" />
            <h3 className="min-w-0 font-heading text-lg font-semibold">
              <AppLinkedText
                text={section.title || t('clubEvents.extractedIntroduction')}
                links={section.titleLinks}
              />
            </h3>
            {renderSectionComments && (
              <div className="relative ml-auto shrink-0">{renderSectionComments(section)}</div>
            )}
          </div>
          <div className="min-w-0 space-y-5">
            {section.blocks.map((block, index) => {
              if (block.kind === 'paragraph') {
                if (index === 0 && block.text === section.title) {
                  return null
                }
                return block.heading || /^(?:[IVX]+[.)]|\d+[.)])\s/u.test(block.text) ? (
                  <h4
                    key={index}
                    className="pt-3 font-heading text-base font-semibold leading-relaxed"
                  >
                    <AppLinkedText text={block.text} links={block.links} />
                  </h4>
                ) : (
                  <p
                    key={index}
                    className="whitespace-pre-wrap break-words text-sm leading-7 text-text-app"
                  >
                    <AppLinkedText text={block.text} links={block.links} />
                  </p>
                )
              }
              const headerRows = block.rows[0]?.length === 1 && block.rows.length > 1 ? 2 : 1
              const label =
                block.rows[0]?.map((cell) => cell.text).join(' · ') ||
                t('clubEvents.extractedTable', { number: index + 1 })
              return (
                <div
                  key={index}
                  role="region"
                  aria-label={label}
                  tabIndex={0}
                  className="min-w-0 overflow-x-auto rounded-xl border border-border-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-app"
                >
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-surface-app">
                      {block.rows.slice(0, headerRows).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, column) => (
                            <th
                              key={column}
                              colSpan={cell.columnSpan}
                              rowSpan={cell.rowSpan}
                              className="min-w-24 border-r border-b border-border-app px-4 py-3 align-top whitespace-pre-wrap font-semibold leading-6 last:border-r-0"
                            >
                              <AppLinkedText text={cell.text || '—'} links={cell.links} />
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody className="divide-y divide-border-app">
                      {block.rows.slice(headerRows).map((row, rowIndex) => (
                        <tr key={rowIndex} className="even:bg-surface-app/40">
                          {row.map((cell, column) => (
                            <td
                              key={column}
                              colSpan={cell.columnSpan}
                              rowSpan={cell.rowSpan}
                              className="min-w-24 border-r border-border-app px-4 py-3 align-top whitespace-pre-wrap break-words leading-7 last:border-r-0"
                            >
                              <AppLinkedText text={cell.text || '—'} links={cell.links} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
