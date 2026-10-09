import { type ReactNode } from "react";

import { cn } from "@/utils/cn";

interface AppCardProps {
  children: ReactNode;
  className?: string;
  href?: string;
}

export function AppCard({ children, className, href }: AppCardProps) {
  const cardClassName = cn("flex flex-col gap-2 rounded-[32px] border border-border-app bg-surface-app p-4", className);

  if (href) {
    return (
      <a href={href} className={cardClassName}>
        {children}
      </a>
    );
  }

  return <div className={cardClassName}>{children}</div>;
}
