import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

// Hiệu ứng chuyển trang: cuộn lên đầu và làm mờ dần khi đổi đường dẫn
/**
 * Làm mượt việc chuyển trang phía client: khi đường dẫn đổi, vùng trang cuộn về đầu và
 * mờ dần/trượt vào. Hiệu ứng chạy trên phần tử hiện có thay vì mount lại, nên state của trang
 * (bộ lọc, bản nháp) được giữ nguyên, và không làm gì ở lần render đầu hoặc khi người dùng bật giảm chuyển động.
 */
export function usePageTransition<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const { pathname } = useLocation()
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    // #root đảm nhiệm việc cuộn (xem index.css), nên nếu không có đoạn này trang mới sẽ mở ở giữa chừng.
    document.getElementById('root')?.scrollTo({ top: 0 })
    const node = ref.current
    if (
      !node ||
      typeof node.animate !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }
    node.animate(
      [
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 220, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
    )
  }, [pathname])

  return ref
}
