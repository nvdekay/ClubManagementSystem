import type { ReactNode } from 'react'

import { AppFieldError } from '@/components/ui/field/AppFieldError'
import { AppRequiredMark } from '@/components/ui/field/AppRequiredMark'

// Khung nhãn kèm dấu bắt buộc và lỗi cho một ô nhập
export function ClubEventField({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string | null
  children: ReactNode
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm">
      <span className="flex flex-wrap items-center gap-2 font-medium text-text-app">
        <span>
          {label}
          {required && <AppRequiredMark />}
        </span>
      </span>
      {children}
      <AppFieldError message={error} />
    </label>
  )
}
