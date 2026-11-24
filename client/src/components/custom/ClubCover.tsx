import { useState } from 'react'

// Ảnh bìa thẻ CLB, dùng chữ cái đầu khi chưa có logo hoặc ảnh lỗi
/** Banner của thẻ CLB: logo phóng to và làm mờ, hoặc chữ cái đầu khi chưa có logo. */
export function ClubCover({ name, logoUrl }: { name: string; logoUrl?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="relative block h-28 overflow-hidden bg-primary-soft-app">
      {logoUrl && !failed ? (
        <img
          src={logoUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="size-full scale-105 object-cover opacity-75 transition-transform duration-300 group-hover:scale-110"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-full items-center justify-center font-heading text-5xl font-extrabold text-primary-app/15"
        >
          {name.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <span aria-hidden="true" className="absolute inset-0 bg-text-app/5" />
    </span>
  )
}
