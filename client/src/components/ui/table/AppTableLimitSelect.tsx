import { AppSelect } from '@/components/ui/select/AppSelect'
import { cn } from '@/utils/cn'

interface AppTableLimitSelectProps {
  value: number
  onChange: (limit: number) => void
  /** Nhãn đã dịch hiển thị trước control. */
  label: string
  /** Danh sách tuỳ chọn tuỳ biến — mặc định khớp giới hạn của API (tối đa 100). */
  options?: number[]
  className?: string
}

const DEFAULT_OPTIONS = [5, 10, 20, 50, 100]

// Ô chọn số dòng mỗi trang của bảng
export function AppTableLimitSelect({
  value,
  onChange,
  label,
  options = DEFAULT_OPTIONS,
  className,
}: AppTableLimitSelectProps) {
  return (
    <span className={cn('flex flex-wrap items-center gap-2 text-sm text-muted-app', className)}>
      {label}
      <AppSelect
        value={value}
        // min-w giữ cho nút mở không đổi kích thước giữa "5" và "100".
        className="min-w-20"
        options={options.map((n) => ({ value: n, label: String(n) }))}
        onChange={onChange}
        label={label}
      />
    </span>
  )
}
