import { useState } from 'react'

import { cn } from '@/utils/cn'

interface ClubLogoProps {
  name: string
  logoUrl?: string
  /** Kích thước hiển thị tính bằng pixel CSS. */
  size?: number
  className?: string
}

// Dựng URL ảnh thu nhỏ Cloudinary, giữ nguyên URL khác
/** Yêu cầu Cloudinary trả ảnh thu nhỏ đã cắt, tự chọn định dạng, thay vì ảnh gốc kích thước đầy đủ. */
export function thumbnail(url: string, width: number, height = width): string {
  const marker = '/image/upload/'
  if (!url.includes('res.cloudinary.com') || !url.includes(marker)) {
    return url
  }
  // Nhân đôi để ảnh vẫn nét trên màn hình mật độ điểm ảnh cao.
  return url.replace(marker, `${marker}c_fill,w_${width * 2},h_${height * 2},f_auto,q_auto/`)
}

/**
 * Mọi logo đều xin cùng một ảnh thu nhỏ bất kể `size`, nên cache của trình duyệt được dùng chung
 * giữa các trang và Cloudinary chỉ tạo một biến thể cho mỗi logo. Đủ cho kích thước lớn nhất đang dùng (96).
 */
const LOGO_THUMBNAIL_SIZE = 96

// Logo CLB, dùng chữ cái đầu khi chưa có logo hoặc ảnh lỗi
/** Logo CLB, dùng chữ cái đầu khi không có logo hoặc ảnh tải lỗi. */
export function ClubLogo({ name, logoUrl, size = 56, className }: ClubLogoProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const showImage = Boolean(logoUrl) && failedUrl !== logoUrl
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-soft-app font-heading font-bold text-primary-app',
        {
          'border border-border-app bg-bg-app': showImage,
        },
        className,
      )}
    >
      {showImage && logoUrl ? (
        <img
          src={thumbnail(logoUrl, LOGO_THUMBNAIL_SIZE)}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setFailedUrl(logoUrl)}
          className="size-full object-cover"
        />
      ) : (
        <span style={{ fontSize: Math.round(size * 0.4) }}>
          {name.trim().charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  )
}
