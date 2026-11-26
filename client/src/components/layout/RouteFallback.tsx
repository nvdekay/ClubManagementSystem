import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'

// Placeholder shown inside a layout's Outlet while a lazily loaded page chunk downloads
export function RouteFallback() {
  return (
    <div className="space-y-4" aria-busy="true">
      <AppSkeleton className="h-10 w-1/2" />
      <AppSkeleton className="h-64 w-full" />
    </div>
  )
}
