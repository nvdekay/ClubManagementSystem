import { type ReactNode } from "react";

import { cn } from "@/utils/cn";

interface AppCardProps {
  children: ReactNode;
  className?: string;
  href?: string;
}

// Thẻ nội dung, thành liên kết khi có href
export function AppCard({ children, className, href }: AppCardProps) {
  const cardClassName = cn("flex flex-col gap-2 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs", className);

  if (href) {
    return (
      <a href={href} className={cardClassName}>
        {children}
      </a>
    );
  }

  return <div className={cardClassName}>{children}</div>;
}
