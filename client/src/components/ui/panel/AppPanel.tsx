import { type ReactNode } from 'react'

interface AppPanelProps {
  /** Tiêu đề h2 ở đầu khối. */
  title: ReactNode
  children: ReactNode
}

// Khối nội dung có viền bo tròn và tiêu đề h2 (một phần của trang chi tiết)
export function AppPanel({ title, children }: AppPanelProps) {
  return (
    <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
      <h2 className="font-heading text-base font-semibold">{title}</h2>
      {children}
    </section>
  )
}
