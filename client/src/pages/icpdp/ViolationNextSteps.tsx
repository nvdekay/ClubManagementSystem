import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AppButton } from '@/components/ui/button/AppButton'
import { AppFieldError } from '@/components/ui/field/AppFieldError'
import { AppRequiredMark } from '@/components/ui/field/AppRequiredMark'
import { AppInput } from '@/components/ui/input/AppInput'
import { AppSelect } from '@/components/ui/select/AppSelect'
import { AppTextarea } from '@/components/ui/textarea/AppTextarea'
import { useFieldValidation } from '@/hooks/useFieldValidation'
import type { ViolationDetail, ViolationStep as ViolationStepInput } from '@/services/violations'
import { ViolationStep } from '@/pages/icpdp/ViolationStep'
import { endOfDay, evidenceLines, inputDate } from '@/pages/icpdp/violationFormat'
import { cn } from '@/utils/cn'

interface ViolationNextStepsProps {
  item: ViolationDetail
  pending: boolean
  error: Error | null
  run: (next: ViolationStepInput, confirmText?: string) => Promise<boolean>
}

// Bảng "bước tiếp theo" của ca vi phạm: điều tra, yêu cầu giải trình, ghi nhận phản hồi, kết luận
// và giao/hoàn tất hành động khắc phục; mỗi bước giữ state form của riêng nó.
export function ViolationNextSteps({ item, pending, error, run }: ViolationNextStepsProps) {
  const { t } = useTranslation()
  const [message, setMessage] = useState('')
  const [dueAt, setDueAt] = useState(inputDate(7))
  const [responseText, setResponseText] = useState('')
  const [finding, setFinding] = useState<'VIOLATION' | 'NO_VIOLATION'>('VIOLATION')
  const [reason, setReason] = useState('')
  const [decisionEvidence, setDecisionEvidence] = useState('')
  const [rows, setRows] = useState([{ description: '', dueAt: inputDate(14), link: '' }])
  const requestField = useFieldValidation({
    message: message.trim() ? null : t('common.fieldRequired'),
    dueAt: !dueAt
      ? t('common.fieldRequired')
      : new Date(endOfDay(dueAt)) <= new Date()
        ? t('common.dateNotPast')
        : null,
  })
  const responseField = useFieldValidation({
    responseText: responseText.trim() ? null : t('common.fieldRequired'),
  })
  const decideField = useFieldValidation({
    reason: reason.trim() ? null : t('violations.decisionReasonRequired'),
    evidence:
      finding === 'VIOLATION' && !evidenceLines(decisionEvidence).length
        ? t('violations.decisionEvidenceRequired')
        : null,
  })
  // Các dòng trống bị bỏ qua khi lưu, nên chỉ mô tả đầu tiên là bắt buộc, và chỉ khi mọi dòng đều trống.
  const anyAction = rows.some((row) => row.description.trim())
  const actionsField = useFieldValidation(
    Object.fromEntries(
      rows.flatMap((row, index) => [
        [`description${index}`, index === 0 && !anyAction ? t('common.fieldRequired') : null],
        [
          `dueAt${index}`,
          !row.description.trim()
            ? null
            : !row.dueAt
              ? t('common.fieldRequired')
              : new Date(endOfDay(row.dueAt)) <= new Date()
                ? t('common.dateNotPast')
                : null,
        ],
      ]),
    ),
  )
  const response = item.clubResponse
  const responseOverdue = Boolean(
    response && !response.source && new Date(response.dueAt) < new Date(),
  )
  const decided = item.state === 'Decision Issued' || item.state === 'Corrective Action'
  const canDecideViolation = item.state === 'Awaiting Club Response' && Boolean(response?.source)
  // Các khối của bảng đọc như các bước đánh số; trạng thái của hồ sơ quyết định bước nào là hiện tại.
  const steps = [
    item.state === 'Open' && 'investigate',
    (item.state === 'Open' || item.state === 'Under Investigation') && 'request',
    item.state === 'Awaiting Club Response' && response && !response.source && 'record',
    !decided && 'decide',
    decided && 'actions',
  ].filter((key): key is string => Boolean(key))
  const currentStep =
    item.state === 'Open'
      ? 'investigate'
      : item.state === 'Under Investigation'
        ? 'request'
        : item.state === 'Awaiting Club Response'
          ? response && !response.source
            ? 'record'
            : 'decide'
          : decided
            ? 'actions'
            : ''
  function stepProps(key: string) {
    return { number: steps.indexOf(key) + 1, current: currentStep === key }
  }

  // Ghi quyết định kết luận ca vi phạm kèm lý do, minh chứng
  async function decide() {
    if (!decideField.touchAll()) {
      return
    }
    const evidence = evidenceLines(decisionEvidence)
    if (
      await run(
        { type: 'decide', finding, reason: reason.trim(), evidence },
        finding === 'VIOLATION' ? t('violations.confirmDecision') : t('violations.confirmClose'),
      )
    ) {
      setReason('')
      setDecisionEvidence('')
      decideField.reset()
    }
  }

  // Giao các hành động khắc phục cho CLB
  async function assign() {
    if (!actionsField.touchAll()) {
      return
    }
    const actions = rows.filter((row) => row.description.trim())
    if (
      await run({
        type: 'addActions',
        actions: actions.map((row) => ({
          description: row.description.trim(),
          dueAt: endOfDay(row.dueAt),
          ...(row.link === 'SUSPEND' || row.link === 'DISSOLVE'
            ? { linkedLifecycleAction: row.link }
            : {}),
        })),
      })
    ) {
      setRows([{ description: '', dueAt: inputDate(14), link: '' }])
      actionsField.reset()
    }
  }

  return (
    <section className="space-y-6 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
      <h2 className="font-heading text-base font-semibold">{t('violations.nextStep')}</h2>

      {item.state === 'Open' && (
        <ViolationStep {...stepProps('investigate')}>
          <p className="text-sm text-muted-app">{t('violations.investigateHint')}</p>
          <AppButton
            className="mt-3 w-full"
            variant="secondary"
            disabled={pending}
            onClick={() => void run({ type: 'investigate' })}
          >
            {t('violations.investigate')}
          </AppButton>
        </ViolationStep>
      )}

      {(item.state === 'Open' || item.state === 'Under Investigation') && (
        <ViolationStep {...stepProps('request')}>
          <h3 className="text-sm font-semibold">{t('violations.requestResponse')}</h3>
          <label className="mt-3 block text-sm font-medium text-text-app">
            {t('violations.requestMessage')}
            <AppRequiredMark />
            <AppTextarea
              className="mt-1.5 min-h-24 w-full"
              value={message}
              maxLength={2000}
              {...requestField.control('message')}
              onChange={(e) => setMessage(e.target.value)}
            />
            <AppFieldError message={requestField.error('message')} />
          </label>
          <label className="mt-3 block text-sm font-medium text-text-app">
            {t('violations.responseDueAt')}
            <AppRequiredMark />
            <AppInput
              type="date"
              className="mt-1.5 w-full"
              value={dueAt}
              min={inputDate(1)}
              {...requestField.control('dueAt')}
              onChange={(e) => setDueAt(e.target.value)}
            />
            <AppFieldError message={requestField.error('dueAt')} />
            <span className="mt-1 block text-xs text-muted-app">
              {t('violations.responseDueHint')}
            </span>
          </label>
          <AppButton
            className="mt-3 w-full"
            disabled={pending}
            onClick={() => {
              if (!requestField.touchAll()) {
                return
              }
              void run({
                type: 'requestResponse',
                message: message.trim(),
                dueAt: endOfDay(dueAt),
              }).then((done) => {
                if (done) {
                  setMessage('')
                  requestField.reset()
                }
              })
            }}
          >
            {t('violations.sendRequest')}
          </AppButton>
        </ViolationStep>
      )}

      {item.state === 'Awaiting Club Response' && response && !response.source && (
        <ViolationStep {...stepProps('record')}>
          <h3 className="text-sm font-semibold">
            {t('violations.recordResponse')}
            <AppRequiredMark />
          </h3>
          <p className="mt-1 text-xs text-muted-app">{t('violations.recordResponseHint')}</p>
          <AppTextarea
            aria-label={t('violations.responseText')}
            className="mt-3 min-h-24 w-full"
            value={responseText}
            maxLength={5000}
            {...responseField.control('responseText')}
            onChange={(e) => setResponseText(e.target.value)}
          />
          <AppFieldError message={responseField.error('responseText')} />
          <AppButton
            className="mt-3 w-full"
            variant="secondary"
            disabled={pending}
            onClick={() => {
              if (!responseField.touchAll()) {
                return
              }
              void run({ type: 'recordResponse', text: responseText.trim() }).then((done) => {
                if (done) {
                  setResponseText('')
                  responseField.reset()
                }
              })
            }}
          >
            {t('violations.saveResponse')}
          </AppButton>
          {responseOverdue && (
            <AppButton
              className="mt-2 w-full"
              variant="secondary"
              disabled={pending}
              onClick={() => void run({ type: 'recordResponse', noResponse: true })}
            >
              {t('violations.noResponse')}
            </AppButton>
          )}
        </ViolationStep>
      )}

      {!decided && (
        <ViolationStep {...stepProps('decide')}>
          <h3 className="text-sm font-semibold">{t('violations.decide')}</h3>
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-border-app bg-surface-app p-1">
            {(['VIOLATION', 'NO_VIOLATION'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={finding === value}
                onClick={() => setFinding(value)}
                className={cn(
                  'min-h-11 rounded-md px-2 text-xs font-medium text-muted-app transition-colors hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app sm:min-h-9',
                  {
                    'bg-segment-app text-text-app shadow-xs hover:text-text-app': finding === value,
                  },
                )}
              >
                {value === 'VIOLATION'
                  ? t('violations.findViolation')
                  : t('violations.findNoViolation')}
              </button>
            ))}
          </div>
          {finding === 'VIOLATION' && !canDecideViolation ? (
            <p className="mt-3 text-sm text-muted-app">{t('violations.needsResponseFirst')}</p>
          ) : (
            <>
              {finding === 'NO_VIOLATION' && (
                <p className="mt-3 text-xs text-muted-app">
                  {t('violations.closeNoViolationHint')}
                </p>
              )}
              <label className="mt-3 block text-sm font-medium text-text-app">
                {t('violations.decisionReason')}
                <AppRequiredMark />
                <AppTextarea
                  className="mt-1.5 min-h-24 w-full"
                  value={reason}
                  maxLength={5000}
                  {...decideField.control('reason')}
                  onChange={(e) => setReason(e.target.value)}
                />
                <AppFieldError message={decideField.error('reason')} />
              </label>
              <label className="mt-3 block text-sm font-medium text-text-app">
                {t('violations.decisionEvidence')}
                {finding === 'VIOLATION' && <AppRequiredMark />}
                <AppTextarea
                  className="mt-1.5 min-h-20 w-full"
                  value={decisionEvidence}
                  placeholder={t('violations.decisionEvidenceHint')}
                  {...decideField.control('evidence', finding === 'VIOLATION')}
                  onChange={(e) => setDecisionEvidence(e.target.value)}
                />
                <AppFieldError message={decideField.error('evidence')} />
              </label>
              <AppButton className="mt-3 w-full" disabled={pending} onClick={() => void decide()}>
                {finding === 'VIOLATION'
                  ? t('violations.saveDecision')
                  : t('violations.closeNoViolation')}
              </AppButton>
            </>
          )}
        </ViolationStep>
      )}

      {decided && (
        <ViolationStep {...stepProps('actions')}>
          <h3 className="text-sm font-semibold">
            {t('violations.addActions')}
            <AppRequiredMark />
          </h3>
          <div className="mt-3 space-y-4">
            {rows.map((row, index) => (
              <div key={index} className="space-y-2">
                <div>
                  <AppInput
                    aria-label={t('violations.actionDescription')}
                    placeholder={t('violations.actionDescription')}
                    value={row.description}
                    maxLength={1000}
                    className="w-full"
                    {...actionsField.control(`description${index}`, index === 0)}
                    onChange={(e) =>
                      setRows((current) =>
                        current.map((item, at) =>
                          at === index ? { ...item, description: e.target.value } : item,
                        ),
                      )
                    }
                  />
                  <AppFieldError message={actionsField.error(`description${index}`)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <AppInput
                      type="date"
                      aria-label={t('violations.actionDue')}
                      value={row.dueAt}
                      min={inputDate(1)}
                      className="w-full"
                      {...actionsField.control(`dueAt${index}`, Boolean(row.description.trim()))}
                      onChange={(e) =>
                        setRows((current) =>
                          current.map((item, at) =>
                            at === index ? { ...item, dueAt: e.target.value } : item,
                          ),
                        )
                      }
                    />
                    <AppFieldError message={actionsField.error(`dueAt${index}`)} />
                  </div>
                  <AppSelect
                    label={t('violations.actionLink')}
                    value={row.link}
                    className="w-full"
                    onChange={(value) =>
                      setRows((current) =>
                        current.map((item, at) => (at === index ? { ...item, link: value } : item)),
                      )
                    }
                    options={[
                      { value: '', label: t('violations.actionLinkNone') },
                      { value: 'SUSPEND', label: t('violations.actionLinkSUSPEND') },
                      { value: 'DISSOLVE', label: t('violations.actionLinkDISSOLVE') },
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-3 text-sm font-semibold text-primary-app hover:underline rounded-sm focus-visible:outline-2 focus-visible:outline-ring-app"
            onClick={() =>
              setRows((current) => [
                ...current,
                { description: '', dueAt: inputDate(14), link: '' },
              ])
            }
          >
            {t('violations.addActionRow')}
          </button>
          <AppButton className="mt-3 w-full" disabled={pending} onClick={() => void assign()}>
            {t('violations.saveActions')}
          </AppButton>
          <p className="mt-5 text-xs text-muted-app">{t('violations.resolveHint')}</p>
          <AppButton
            className="mt-2 w-full"
            variant="secondary"
            disabled={pending || item.actions.some((action) => action.state === 'Pending')}
            onClick={() => void run({ type: 'resolve' }, t('violations.confirmResolve'))}
          >
            {t('violations.resolve')}
          </AppButton>
        </ViolationStep>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger-app">
          {error.message}
        </p>
      )}
    </section>
  )
}
