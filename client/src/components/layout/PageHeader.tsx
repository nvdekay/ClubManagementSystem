import { type ReactNode } from "react";
import { Link } from "react-router";

import { AppIcon } from "@/components/ui/icon/AppIcon";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional "back" link shown above the title on detail pages. */
  back?: { to: string; label: string };
  actions?: ReactNode;
}

/** Title block at the top of every workspace page: no card, just type and whitespace. */
export function PageHeader({ title, description, back, actions }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-3xl">
        {back && <Link to={back.to} className="mb-3 inline-flex min-h-10 items-center gap-1.5 rounded-full text-sm font-semibold text-accent-app hover:underline focus-visible:outline-2 focus-visible:outline-ring-app">
          <AppIcon name="arrowLeft" className="size-4" />{back.label}
        </Link>}
        <h1 className="font-heading text-2xl font-bold tracking-tight text-balance sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 text-pretty text-muted-app">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
