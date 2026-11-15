import { type ReactNode } from "react";

import { AppIcon, type AppIconName } from "@/components/ui/icon/AppIcon";

interface AppEmptyStateProps {
  message: string;
  /**
   * "inline" (mặc định): một dòng chữ mờ, dùng cho ô trống hoặc bên trong thẻ đã có khung.
   * "boxed": khung nét đứt kèm icon, dùng cho cả mục hoặc danh sách không có gì để hiển thị.
   */
  variant?: "inline" | "boxed";
  /** Chỉ cho boxed: tiêu đề phía trên thông báo (render thành h2), dùng cho hàng đợi rỗng ở cấp trang. */
  title?: string;
  /** Chỉ cho boxed: icon trong ô; mặc định là hộp thư. */
  icon?: AppIconName;
  /** Chỉ cho boxed: nút kêu gọi hành động dưới thông báo, ví dụ liên kết xem danh sách CLB. */
  action?: ReactNode;
}

// Trạng thái rỗng khi chưa có dữ liệu
export function AppEmptyState({ message, variant = "inline", title, icon = "inbox", action }: AppEmptyStateProps) {
  if (variant === "inline") return <p className="text-sm text-muted-app">{message}</p>;
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border-app px-4 py-10 text-center">
      <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-lg border border-border-app text-muted-app">
        <AppIcon name={icon} className="size-4.5" />
      </span>
      {title && <h2 className="mt-1 font-heading text-base font-semibold text-balance">{title}</h2>}
      <p className="max-w-md text-sm text-pretty text-muted-app">{message}</p>
      {action && <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
