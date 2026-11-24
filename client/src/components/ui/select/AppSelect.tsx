import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

import { cn } from '@/utils/cn'

interface AppSelectOption<T> {
  value: T
  label: string
  disabled?: boolean
}

interface AppSelectProps<T> {
  value: T
  options: AppSelectOption<T>[]
  onChange: (value: T) => void
  /** Tên truy cập được cho nút mở — nút này chỉ hiển thị nhãn đang chọn. */
  label: string
  disabled?: boolean
  /** Đánh dấu nút mở là bắt buộc / đang lỗi (viền đỏ), giống `aria-invalid` trên AppInput. */
  required?: boolean
  invalid?: boolean
  /** Gắn lên wrapper định vị, để class chiều rộng được áp đúng chỗ có hiệu lực. */
  className?: string
  /** Giữ danh sách tuỳ chọn rộng đúng bằng nút mở và cho nhãn dài xuống dòng (trong hộp thoại). */
  fitWidth?: boolean
}

// Mũi tên xuống của ô chọn
function ChevronDownIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

// Dấu tick cho tuỳ chọn đang chọn
function CheckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

// Ô chọn tuỳ biến, hỗ trợ bàn phím và gõ để tìm
/**
 * Combobox chỉ để chọn (WAI-ARIA APG). Focus DOM giữ trên danh sách khi đang mở và
 * tuỳ chọn đang nổi bật được báo qua aria-activedescendant — cách còn lại là
 * chuyển focus vào từng <li>, sẽ xung đột với cơ chế tự khôi phục focus của trình duyệt khi đóng.
 */
export function AppSelect<T extends string | number>({
  value,
  options,
  onChange,
  label,
  disabled,
  required,
  invalid,
  className,
  fitWidth,
}: AppSelectProps<T>) {
  const [open, setOpen] = useState(false)
  // Vị trí vừa với danh sách: mặc định bên dưới nút mở, chuyển lên trên khi chỗ trống bên dưới quá ít.
  const [placement, setPlacement] = useState({
    up: false,
    right: false,
    maxHeight: 240,
    maxWidth: 480,
  })
  const selectedIndex = options.findIndex((option) => option.value === value)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()
  // Gõ để nhảy như <select> gốc: các chữ gõ liên tiếp trong khoảng nghỉ ngắn tạo thành một chuỗi tìm.
  const typed = useRef({ text: '', at: 0 })

  useEffect(() => {
    if (!open) {
      return
    }
    listRef.current?.focus()
    // Dùng pointerdown thay vì click: một lượt bấm bắt đầu từ bên ngoài phải đóng danh sách kể cả khi
    // con trỏ được thả ở chỗ khác (kéo, bôi đen chữ).
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Giữ tuỳ chọn đang nổi bật luôn nhìn thấy khi danh sách đủ dài để phải cuộn.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  // Tính hướng mở và kích thước danh sách theo chỗ trống quanh nút
  /** Đo khoảng trống quanh nút mở để danh sách không bao giờ tràn khỏi đáy màn hình. */
  function place() {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) {
      return
    }
    const below = window.innerHeight - rect.bottom - 12
    const above = rect.top - 12
    const up = below < 200 && above > below
    // Nút mở nằm nửa bên phải thì danh sách mở rộng sang trái, để danh sách rộng không tràn khỏi màn hình.
    const right = rect.left > window.innerWidth / 2
    setPlacement({
      up,
      right,
      maxHeight: Math.max(120, Math.min(240, up ? above : below)),
      maxWidth: Math.max(rect.width, (right ? rect.right : window.innerWidth - rect.left) - 12),
    })
  }

  // Mở danh sách và làm nổi bật tuỳ chọn đang chọn
  function openList() {
    place()
    setActiveIndex(selectedIndex < 0 ? 0 : selectedIndex)
    setOpen(true)
  }

  // Đóng danh sách và trả focus về nút
  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  // Chọn một tuỳ chọn rồi đóng danh sách
  function select(index: number) {
    if (!options[index] || options[index].disabled) {
      return
    }
    onChange(options[index].value)
    close()
  }

  // Gõ chữ để nhảy tới tuỳ chọn bắt đầu bằng chữ đó
  /** Làm nổi bật tuỳ chọn kế tiếp có nhãn bắt đầu bằng chữ đã gõ; trả true khi phím đã được xử lý. */
  function typeahead(event: KeyboardEvent, from: number): boolean {
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) {
      return false
    }
    const now = event.timeStamp // tính bằng ms từ lúc tải trang; chỉ khoảng chênh giữa các lần bấm phím là quan trọng
    // Phím cách chỉ dùng để tìm khi đang gõ dở một từ; đứng riêng thì vẫn là chọn tuỳ chọn.
    if (event.key === ' ' && now - typed.current.at > 700) {
      return false
    }
    const text = (now - typed.current.at > 700 ? '' : typed.current.text) + fold(event.key)
    typed.current = { text, at: now }
    // Một chữ cái mới gõ đơn lẻ sẽ nhảy qua tuỳ chọn hiện tại, nên gõ lặp lại chữ đó sẽ lần lượt đi qua các kết quả khớp.
    const start = text.length === 1 ? from + 1 : from
    for (let step = 0; step < options.length; step++) {
      const index = (start + step) % options.length
      const option = options[index]!
      if (!option.disabled && fold(option.label).startsWith(text)) {
        setActiveIndex(index)
        break
      }
    }
    event.preventDefault()
    return true
  }

  // Xử lý phím trên nút mở danh sách
  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (
      event.key.length === 1 &&
      event.key !== ' ' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      place()
      setOpen(true)
      typeahead(event, selectedIndex < 0 ? -1 : selectedIndex)
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return
    }
    event.preventDefault() // nếu không cả hai phím sẽ cuộn trang
    openList()
  }

  // Xử lý phím điều hướng và chọn trong danh sách
  function onListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (typeahead(event, activeIndex)) {
      return
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((index) => Math.min(index + 1, options.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((index) => Math.max(index - 1, 0))
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(options.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        select(activeIndex)
        break
      case 'Escape':
        event.preventDefault()
        close()
        break
      case 'Tab':
        setOpen(false) // để focus đi tiếp, đừng kéo ngược về nút mở
        break
    }
  }

  return (
    <div ref={rootRef} className={cn('relative inline-block', className)}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        disabled={disabled}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onTriggerKeyDown}
        className="inline-flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-border-app bg-bg-app px-3 text-sm text-text-app shadow-xs transition-colors hover:bg-surface-app focus-visible:border-ring-app focus-visible:ring-3 focus-visible:ring-ring-app/20 focus-visible:outline-none disabled:opacity-50 sm:h-9 aria-[invalid=true]:border-danger-app aria-[invalid=true]:focus-visible:ring-danger-app"
      >
        <span className="min-w-0 truncate text-left">{options[selectedIndex]?.label ?? ''}</span>
        <ChevronDownIcon />
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          aria-activedescendant={`${listId}-${activeIndex}`}
          tabIndex={-1}
          onKeyDown={onListKeyDown}
          style={{
            maxHeight: placement.maxHeight,
            maxWidth: fitWidth ? undefined : placement.maxWidth,
          }}
          className={cn(
            'absolute z-20 mt-1 overflow-auto rounded-lg border border-border-app bg-bg-app p-1 shadow-lg transition-[opacity,translate] duration-150 ease-out focus:outline-none starting:-translate-y-1 starting:opacity-0',
            fitWidth ? 'w-full' : 'w-max max-w-[calc(100vw-2rem)] min-w-full',
            {
              'bottom-full mt-0 mb-1 starting:translate-y-1': placement.up,
              'right-0': placement.right,
            },
          )}
        >
          {options.map((option, index) => (
            <li
              key={String(option.value)}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              data-active={index === activeIndex}
              onPointerEnter={() => setActiveIndex(index)}
              onClick={() => select(index)}
              className={cn(
                'flex items-center justify-between gap-3 rounded-md px-2.5 py-2 text-sm',
                {
                  'bg-surface-app text-text-app': index === activeIndex,
                  'text-muted-app opacity-50': option.disabled,
                },
              )}
            >
              <span className="min-w-0 break-words">{option.label}</span>
              {option.value === value && <CheckIcon />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Chuẩn hoá chữ thường không dấu để so khớp khi gõ tìm
/** Chuyển về chữ thường và bỏ dấu tiếng Việt, để gõ "nguy" tìm được "Nguyễn". */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
}
