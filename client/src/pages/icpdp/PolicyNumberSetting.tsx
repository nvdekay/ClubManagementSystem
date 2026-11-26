import type { ComponentProps } from 'react'

import { AppFieldError } from '@/components/ui/field/AppFieldError'
import { AppRequiredMark } from '@/components/ui/field/AppRequiredMark'
import { AppInput } from '@/components/ui/input/AppInput'

// Một dòng cài đặt số: nhãn bên trái, ô nhập bên phải
export function PolicyNumberSetting({
  label,
  value,
  min,
  onChange,
  control,
  error,
}: {
  label: string
  value: string
  min: number
  onChange: (value: string) => void
  control: Pick<ComponentProps<'input'>, 'required' | 'onBlur' | 'aria-invalid'>
  error: string | null
}) {
  return (
    <li className="py-3.5 first:pt-0 last:pb-0">
      <label className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm">
        <span className="min-w-0 flex-1 basis-60 text-text-app">
          {label}
          <AppRequiredMark />
        </span>
        <AppInput
          className="w-28 text-right tabular-nums"
          type="number"
          min={min}
          value={value}
          {...control}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <div className="text-right">
        <AppFieldError message={error} />
      </div>
    </li>
  )
}
