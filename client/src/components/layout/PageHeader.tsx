import { type ReactNode } from "react";
import { Link } from "react-router";

import { AppIcon } from "@/components/ui/icon/AppIcon";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Liên kết "quay lại" tuỳ chọn hiển thị phía trên tiêu đề ở trang chi tiết. */
  back?: { to: string; label: string };
  actions?: ReactNode;
}

// Tiêu đề đầu mỗi trang workspace, kèm liên kết quay lại và nút thao tác
/** Khối tiêu đề đầu mỗi trang workspace: không dùng thẻ, chỉ chữ và khoảng trắng. */
export function PageHeader({ title, description, back, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-3xl">
        {back && <Link to={back.to} className="mb-2 inline-flex min-h-9 items-center gap-1.5 rounded-md text-sm font-medium text-muted-app hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app">
          <AppIcon name="arrowLeft" className="size-4" />{back.label}
        </Link>}
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {description && <p className="mt-1 text-sm text-pretty text-muted-app">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
