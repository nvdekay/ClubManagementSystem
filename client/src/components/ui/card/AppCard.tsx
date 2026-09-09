import { type ReactNode } from "react";

import { cn } from "@/utils/cn";

interface AppCardProps {
  children: ReactNode;
  className?: string;
  href?: string;
}

export function AppCard({ children, className, href }: AppCardProps) {
  const cardClassName = cn("rounded border border-border-app p-4", className);

  if (href) {
    return (
      <a href={href} className={cardClassName}>
        {children}
      </a>
    );
  }

  return <div className={cardClassName}>{children}</div>;
}
