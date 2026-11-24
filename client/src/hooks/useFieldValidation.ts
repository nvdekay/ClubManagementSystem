import { useCallback, useState } from 'react'

/** Tên trường → thông báo, hoặc null khi giá trị hợp lệ. Được tính lại từ state của form mỗi lần render. */
export type FieldErrors<K extends string> = Partial<Record<K, string | null>>

// Quản lý hiển thị lỗi từng trường: chỉ hiện sau khi rời trường hoặc khi submit
/**
 * Hiện lỗi của một trường khi người dùng đã rời khỏi trường (`touch`) hoặc thử submit (`touchAll`),
 * để trường bắt buộc được báo lỗi ngay khi đang điền thay vì chỉ sau khi submit.
 */
export function useFieldValidation<K extends string>(errors: FieldErrors<K>) {
  const [touched, setTouched] = useState<ReadonlySet<K>>(() => new Set())
  const [submitted, setSubmitted] = useState(false)

  const touch = useCallback((name: K) => {
    setTouched((current) => (current.has(name) ? current : new Set(current).add(name)))
  }, [])

  /** Hiện mọi lỗi; trả true khi form được phép gửi. `reveal: false` bỏ qua việc cuộn tới lỗi đầu tiên. */
  function touchAll(reveal = true): boolean {
    setSubmitted(true)
    const valid = !Object.values(errors).some(Boolean)
    // Form dài có nút submit nằm rất xa lỗi đầu tiên: đưa trường đó vào vùng nhìn thấy
    // sau khi các lỗi đã render, để một lần bấm không bao giờ trông như không có tác dụng.
    if (!valid && reveal) {
      requestAnimationFrame(() => {
        const field = document.querySelector<HTMLElement>('[aria-invalid="true"]')
        field?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        field?.focus({ preventScroll: true })
      })
    }
    return valid
  }

  function reset() {
    setTouched(new Set())
    setSubmitted(false)
  }

  function error(name: K): string | null {
    return submitted || touched.has(name) ? (errors[name] ?? null) : null
  }

  /** Spread vào AppInput/AppTextarea: cờ required, theo dõi blur và aria-invalid. */
  function control(name: K, required = true) {
    return { required, onBlur: () => touch(name), 'aria-invalid': error(name) ? true : undefined }
  }

  return { touch, touchAll, reset, error, control, isValid: !Object.values(errors).some(Boolean) }
}
