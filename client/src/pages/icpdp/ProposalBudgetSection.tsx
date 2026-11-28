import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { AppBadge } from '@/components/ui/badge/AppBadge'
import type { EventProposalDetail, EventProposalVersion } from '@/services/eventProposalReviews'
import { useFormat } from '@/hooks/useFormat'

interface ProposalBudgetSectionProps {
  current: EventProposalVersion | undefined
  budget: EventProposalDetail['budget']
  semesterBudgets: EventProposalDetail['semesterBudgets']
}

// Đối chiếu từng khoản đề nghị với khoản đã duyệt và hiển thị kinh phí trong học kỳ.
export function ProposalBudgetSection({
  current,
  budget,
  semesterBudgets,
}: ProposalBudgetSectionProps) {
  const { t } = useTranslation()
  const { money } = useFormat()
  const lines = current?.budgetLines ?? []
  const semesterTotal = semesterBudgets.reduce((sum, item) => sum + item.approvedTotal, 0)
  return (
    <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
      {/* Đối chiếu từng khoản đề nghị với khoản đã duyệt và hiển thị kinh phí trong học kỳ. */}
      <h2 className="font-heading text-base font-semibold">{t('eventReviews.budget')}</h2>
      {budget && (
        <Link
          className="mt-4 inline-flex rounded-lg border border-border-app px-4 py-2 text-sm font-medium text-primary-app hover:bg-surface-app"
          to={`/workspace/budgets/${budget.id}`}
        >
          {t('budgets.title')}
        </Link>
      )}
      {lines.length ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border-app bg-bg-app">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="bg-surface-app">
              <tr className="text-xs text-muted-app">
                <th scope="col" className="px-4 py-2.5 font-medium">
                  {t('eventReviews.category')}
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  {t('eventReviews.purpose')}
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  {t('eventReviews.requestedAmount')}
                </th>
                {budget && (
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    {t('eventReviews.approvedAmount')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const approved = budget?.lines[index]
                return (
                  <tr key={index} className="border-t border-border-app align-top">
                    <td className="px-4 py-3 font-medium">{line.category}</td>
                    <td className="px-4 py-3">
                      <p className="break-words">{line.purpose}</p>
                      {line.plannedItems && (
                        <p className="mt-0.5 whitespace-pre-line text-xs text-muted-app">
                          {line.plannedItems}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{money(line.amount)}</td>
                    {budget && (
                      <td className="px-4 py-3 text-right tabular-nums">
                        {approved ? money(approved.approvedAmount) : '—'}
                        {approved?.reason && (
                          <p className="mt-0.5 text-xs text-muted-app">{approved.reason}</p>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border-app bg-surface-app font-semibold">
                <td className="px-4 py-3" colSpan={2}>
                  {t('eventReviews.total')}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {money(current?.requestedBudgetTotal ?? 0)}
                </td>
                {budget && (
                  <td className="px-4 py-3 text-right tabular-nums">
                    {money(budget.approvedTotal)}
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-app">{t('eventReviews.budgetNone')}</p>
      )}
      <div className="mt-5 rounded-xl border border-border-app bg-surface-app p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{t('eventReviews.semesterBudgets')}</h3>
          {semesterBudgets.length > 0 && (
            <AppBadge tone="info">
              {t('eventReviews.semesterTotal', { amount: money(semesterTotal) })}
            </AppBadge>
          )}
        </div>
        {semesterBudgets.length ? (
          <ul className="mt-3 divide-y divide-border-app text-sm">
            {semesterBudgets.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0 break-words">{item.eventTitle ?? item.eventId}</span>
                <span className="tabular-nums">{money(item.approvedTotal)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-app">{t('eventReviews.semesterBudgetsNone')}</p>
        )}
      </div>
    </section>
  )
}
