import { useEffect, useState, type InputHTMLAttributes } from 'react'

import { AppInput } from '@/components/ui/input/AppInput'

interface AppSearchInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> {
  /** Được gọi với giá trị đã trim, có debounce. Phải ổn định về tham chiếu (ví dụ setter của useState). */
  onSearch: (value: string) => void
  delayMs?: number
}

// Ô tìm kiếm gọi onSearch sau khi ngừng gõ một lúc
export function AppSearchInput({
  onSearch,
  delayMs = 300,
  defaultValue,
  ...props
}: AppSearchInputProps) {
  const [value, setValue] = useState(defaultValue?.toString() ?? '')

  useEffect(() => {
    const id = setTimeout(() => onSearch(value.trim()), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs, onSearch])

  return (
    <AppInput type="search" value={value} onChange={(e) => setValue(e.target.value)} {...props} />
  )
}
