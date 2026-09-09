interface AppEmptyStateProps {
  message: string;
}

export function AppEmptyState({ message }: AppEmptyStateProps) {
  return <p className="text-sm text-muted-app">{message}</p>;
}
