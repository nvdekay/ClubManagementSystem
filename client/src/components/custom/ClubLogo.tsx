import { useState } from "react";

import { cn } from "@/utils/cn";

interface ClubLogoProps {
  name: string;
  logoUrl?: string;
  /** Rendered size in CSS pixels. */
  size?: number;
  className?: string;
}

/** Ask Cloudinary for a cropped, auto-format thumbnail instead of the full-size upload. */
export function thumbnail(url: string, width: number, height = width): string {
  const marker = "/image/upload/";
  if (!url.includes("res.cloudinary.com") || !url.includes(marker)) return url;
  // Doubled so the image stays sharp on high-density screens.
  return url.replace(marker, `${marker}c_fill,w_${width * 2},h_${height * 2},f_auto,q_auto/`);
}

/**
 * Every logo requests the same thumbnail regardless of `size`, so the browser cache is shared
 * across pages and Cloudinary derives one variant per logo. Covers the largest size in use (96).
 */
const LOGO_THUMBNAIL_SIZE = 96;

/** Club logo with an initial-letter fallback when there is no logo or it fails to load. */
export function ClubLogo({ name, logoUrl, size = 56, className }: ClubLogoProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(logoUrl) && failedUrl !== logoUrl;
  return (
    <span aria-hidden="true" style={{ width: size, height: size }}
      className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-soft-app font-heading font-bold text-primary-app", {
        "border border-border-app bg-bg-app": showImage,
      }, className)}>
      {showImage && logoUrl ? (
        <img src={thumbnail(logoUrl, LOGO_THUMBNAIL_SIZE)} alt="" width={size} height={size} loading="lazy" decoding="async"
          onError={() => setFailedUrl(logoUrl)} className="size-full object-cover" />
      ) : (
        <span style={{ fontSize: Math.round(size * 0.4) }}>{name.trim().charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}
