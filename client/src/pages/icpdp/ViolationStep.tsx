import type { ReactNode } from 'react'

import { cn } from '@/utils/cn'

// Một khối đánh số trong panel bước tiếp theo, nổi bật khi là bước hiện tại
/** Một khối của bảng "bước tiếp theo": có số thứ tự, được làm nổi bật khi vụ việc đang ở bước đó. */
export function ViolationStep({
  number,
  current,
  children,
}: {
  number: number
  current: boolean
  children: ReactNode
}) {
  return (
    <div className="flex gap-3" aria-current={current ? 'step' : undefined}>
      <span
        aria-hidden="true"
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full border border-border-app text-xs font-semibold text-muted-app',
          { 'border-brand-app text-brand-app': current },
        )}
      >
        {number}
      </span>
      <div className={cn('min-w-0 flex-1', { '[&>h3]:text-muted-app': !current })}>{children}</div>
    </div>
  )
}
