import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'

import { AppFieldError } from '@/components/ui/field/AppFieldError'
import { AppRequiredMark } from '@/components/ui/field/AppRequiredMark'
import { AppInput } from '@/components/ui/input/AppInput'
import type { useFieldValidation } from '@/hooks/useFieldValidation'
import type { PolicyForm } from '@/pages/icpdp/policyEditorForm'
import { PolicySubHeading } from '@/pages/icpdp/PolicySubHeading'
import { cn } from '@/utils/cn'

interface PolicyFinanceSectionProps {
  form: PolicyForm
  setForm: Dispatch<SetStateAction<PolicyForm>>
  field: ReturnType<typeof useFieldValidation<string>>
}

// Nhóm "tài chính": tài khoản nhận hoàn trả của nhà trường
export function PolicyFinanceSection({ form, setForm, field }: PolicyFinanceSectionProps) {
  const { t } = useTranslation()
  const fieldLabel = 'block text-sm font-medium text-text-app'
  const fieldInput = 'mt-1.5 block w-full'
  const refund = form.schoolRefundAccount
  const anyFilled = Boolean(
    refund.accountHolder.trim() ||
    refund.accountNumber.trim() ||
    refund.bankName.trim() ||
    refund.bankBranch.trim() ||
    refund.transferNote.trim(),
  )
  return (
    <div className="space-y-4">
      <PolicySubHeading
        title={t('policy.refundAccountTitle')}
        hint={t('policy.refundAccountHint')}
      />
      <div className="grid gap-4 rounded-xl border border-border-app p-4 sm:grid-cols-2">
        <label className={fieldLabel}>
          {t('policy.refundAccountHolder')}
          {anyFilled ? <AppRequiredMark /> : null}
          <AppInput
            className={fieldInput}
            maxLength={200}
            value={refund.accountHolder}
            {...field.control('refundAccountHolder')}
            onChange={(event) =>
              setForm({
                ...form,
                schoolRefundAccount: { ...refund, accountHolder: event.target.value },
              })
            }
          />
          <AppFieldError message={field.error('refundAccountHolder')} />
        </label>
        <label className={fieldLabel}>
          {t('policy.refundAccountNumber')}
          {anyFilled ? <AppRequiredMark /> : null}
          <AppInput
            className={fieldInput}
            maxLength={50}
            value={refund.accountNumber}
            {...field.control('refundAccountNumber')}
            onChange={(event) =>
              setForm({
                ...form,
                schoolRefundAccount: { ...refund, accountNumber: event.target.value },
              })
            }
          />
          <AppFieldError message={field.error('refundAccountNumber')} />
        </label>
        <label className={fieldLabel}>
          {t('policy.refundBankName')}
          {anyFilled ? <AppRequiredMark /> : null}
          <AppInput
            className={fieldInput}
            maxLength={200}
            value={refund.bankName}
            {...field.control('refundBankName')}
            onChange={(event) =>
              setForm({
                ...form,
                schoolRefundAccount: { ...refund, bankName: event.target.value },
              })
            }
          />
          <AppFieldError message={field.error('refundBankName')} />
        </label>
        <label className={fieldLabel}>
          {t('policy.refundBankBranch')}
          <AppInput
            className={fieldInput}
            maxLength={200}
            value={refund.bankBranch}
            onChange={(event) =>
              setForm({
                ...form,
                schoolRefundAccount: { ...refund, bankBranch: event.target.value },
              })
            }
          />
        </label>
        <label className={cn(fieldLabel, 'sm:col-span-2')}>
          {t('policy.refundTransferNote')}
          <AppInput
            className={fieldInput}
            maxLength={500}
            value={refund.transferNote}
            onChange={(event) =>
              setForm({
                ...form,
                schoolRefundAccount: { ...refund, transferNote: event.target.value },
              })
            }
          />
        </label>
      </div>
    </div>
  )
}
