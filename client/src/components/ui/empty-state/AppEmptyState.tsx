import { AppIcon } from "@/components/ui/icon/AppIcon";

interface AppEmptyStateProps {
  message: string;
  /**
   * "inline" (default): a muted line, for empty cells or inside a card that already frames it.
   * "boxed": a dashed box with an icon, for a whole section or list that has nothing to show.
   */
  variant?: "inline" | "boxed";
}

export function AppEmptyState({ message, variant = "inline" }: AppEmptyStateProps) {
  if (variant === "inline") return <p className="text-sm text-muted-app">{message}</p>;
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border-app px-4 py-8 text-center">
      <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-lg border border-border-app text-muted-app">
        <AppIcon name="inbox" className="size-4.5" />
      </span>
      <p className="max-w-md text-sm text-pretty text-muted-app">{message}</p>
    </div>
  );
}
