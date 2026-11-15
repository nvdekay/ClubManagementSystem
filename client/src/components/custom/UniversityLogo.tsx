import { cn } from "@/utils/cn";

interface UniversityLogoProps {
  alt: string;
  className?: string;
  priority?: boolean;
}

// Logo chính thức do website Trường Đại học FPT cung cấp.
const universityLogoUrl = "https://daihoc.fpt.edu.vn/wp-content/themes/fpt-university/assets/images/logo.png";

// Logo Trường Đại học FPT
export function UniversityLogo({ alt, className, priority = false }: UniversityLogoProps) {
  return (
    <img
      src={universityLogoUrl}
      alt={alt}
      width={330}
      height={93}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      draggable={false}
      className={cn("block h-auto max-w-full object-contain", className)}
    />
  );
}
