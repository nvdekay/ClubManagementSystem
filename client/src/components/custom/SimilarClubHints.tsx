import { useTranslation } from 'react-i18next'

import { AppBadge } from '@/components/ui/badge/AppBadge'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import type { SimilarClubHint } from '@/services/applications'

interface SimilarClubHintsProps {
  hints: SimilarClubHint[]
  /** Người nộp đơn không thấy gì khi không có gợi ý; ICPDP được báo là không tìm thấy. */
  audience: 'applicant' | 'officer'
  className?: string
}

// Gợi ý các CLB tương tự khi xét hồ sơ thành lập CLB
/** Gợi ý mang tính tham khảo về các CLB tương tự cho hồ sơ thành lập (UC07 người nộp, UC08 ICPDP). */
export function SimilarClubHints({ hints, audience, className }: SimilarClubHintsProps) {
  const { t } = useTranslation()
  if (!hints.length && audience === 'applicant') {
    return null
  }

  // Dịch trạng thái CLB hoặc hồ sơ sang nhãn hiển thị
  function stateLabel(state: string): string {
    switch (state) {
      case 'Pending Setup':
        return t('clubLifecycle.state_Pending Setup')
      case 'Active':
        return t('clubLifecycle.state_Active')
      case 'Suspended':
        return t('clubLifecycle.state_Suspended')
      case 'Dissolving':
        return t('clubLifecycle.state_Dissolving')
      case 'Dissolved':
        return t('clubLifecycle.state_Dissolved')
      case 'Submitted':
        return t('applications.statusSubmitted')
      case 'Under Review':
        return t('applications.statusUnderReview')
      case 'Revision Requested':
        return t('applications.statusRevisionRequested')
      default:
        return state
    }
  }

  // Đổi tỉ lệ 0-1 sang phần trăm làm tròn
  function percent(value: number): number {
    return Math.round(value * 100)
  }

  return (
    <AppNotice
      tone={hints.some((hint) => hint.level === 'HIGH') ? 'warning' : 'neutral'}
      role="status"
      title={t('applications.similarTitle')}
      className={className}
    >
      <p>
        {t(
          audience === 'officer'
            ? 'applications.similarOfficerHint'
            : 'applications.similarApplicantHint',
        )}
      </p>
      {hints.length ? (
        <ul className="divide-y divide-border-app">
          {hints.map((hint) => (
            <li key={`${hint.kind}-${hint.id}`} className="space-y-1.5 py-2.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 font-semibold break-words">{hint.name}</span>
                <AppBadge tone={hint.level === 'HIGH' ? 'warning' : 'info'}>
                  {hint.level === 'HIGH'
                    ? t('applications.similarHigh')
                    : t('applications.similarMedium')}
                  {' · '}
                  {t('applications.similarScore', { score: hint.score })}
                </AppBadge>
              </div>
              <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-app">
                <span>
                  {hint.kind === 'CLUB'
                    ? t('applications.similarKindClub')
                    : t('applications.similarKindApplication')}
                </span>
                {hint.field && <span>{hint.field}</span>}
                <span>{stateLabel(hint.state)}</span>
              </p>
              <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <span>{t('applications.similarName', { value: percent(hint.reasons.name) })}</span>
                <span>
                  {hint.reasons.content === null
                    ? t('applications.similarNoContent')
                    : t('applications.similarContent', { value: percent(hint.reasons.content) })}
                </span>
                <span>
                  {hint.reasons.field
                    ? t('applications.similarSameField')
                    : t('applications.similarOtherField')}
                </span>
              </p>
              {hint.reasons.sharedWords.length > 0 && (
                <p className="text-xs break-words text-muted-app">
                  {t('applications.similarSharedWords', {
                    words: hint.reasons.sharedWords.join(', '),
                  })}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-app">{t('applications.similarNone')}</p>
      )}
    </AppNotice>
  )
}
