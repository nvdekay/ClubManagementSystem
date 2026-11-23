import { type ReactNode } from "react";
import { cn } from "@/utils/cn";

interface AppNoticeProps {
  tone?: "info" | "success" | "warning" | "danger" | "neutral";
  title?: string;
  /** "alert" cho lỗi người dùng cần thấy ngay, "status" cho cập nhật nhẹ nhàng. */
  role?: "alert" | "status";
  className?: string;
  children?: ReactNode;
}

// Khung thông báo theo tone
/** Thông báo phẳng nằm trong dòng (lỗi, trạng thái rỗng, gợi ý), có vạch màu bên trái thay vì dùng thẻ. */
export function AppNotice({ tone = "neutral", title, role, className, children }: AppNoticeProps) {
  return (
    <div role={role} className={cn("rounded-xl border-l-4 px-4 py-3 text-sm", {
      "border-border-app bg-surface-app text-text-app": tone === "neutral",
      "border-info-app bg-info-soft-app text-text-app": tone === "info",
      "border-success-app bg-mint-soft-app text-text-app": tone === "success",
      "border-warning-app bg-warning-app/10 text-text-app": tone === "warning",
      "border-danger-app bg-danger-app/10 text-text-app": tone === "danger",
    }, className)}>
      {title && <p className={cn("font-semibold", {
        "text-danger-app": tone === "danger",
        "text-warning-app": tone === "warning",
        "text-success-app": tone === "success",
        "text-info-app": tone === "info",
      })}>{title}</p>}
      {children && <div className={cn("space-y-2", { "mt-1": Boolean(title) })}>{children}</div>}
    </div>
  );
}
