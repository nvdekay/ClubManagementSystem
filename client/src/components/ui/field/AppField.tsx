import { type ReactNode } from 'react'

import { AppFieldError } from '@/components/ui/field/AppFieldError'
import { AppRequiredMark } from '@/components/ui/field/AppRequiredMark'

interface AppFieldProps {
  label: ReactNode
  /** Hiện dấu sao đỏ sau nhãn. */
  required?: boolean
  /** Lỗi hiện dưới control; null/undefined thì không hiện gì. */
  error?: string | null
  children: ReactNode
}

// Nhãn bọc một control: chữ nhãn, dấu bắt buộc, control và lỗi ngay dưới
export function AppField({ label, required, error, children }: AppFieldProps) {
  return (
    <label className="block text-sm font-medium text-text-app">
      {label}
      {required && <AppRequiredMark />}
      {children}
      <AppFieldError message={error} />
    </label>
  )
}
