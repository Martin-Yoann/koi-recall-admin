// ============================================================
// KOI Admin — Dashboard Loading Skeleton
// ============================================================

export default function DashboardLoading() {
  return (
    <div className="container-content py-8 space-y-8">
      <div>
        <div className="h-8 w-48 bg-surface-secondary rounded animate-pulse" />
        <div className="h-4 w-72 bg-surface-secondary rounded animate-pulse mt-2" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-surface-elevated p-5 space-y-3">
            <div className="h-3 w-24 bg-surface-secondary rounded animate-pulse" />
            <div className="h-7 w-16 bg-surface-secondary rounded animate-pulse" />
            <div className="h-3 w-32 bg-surface-secondary rounded animate-pulse" />
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 rounded-xl border bg-surface-elevated p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-9 w-9 bg-surface-secondary rounded-lg animate-pulse shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 bg-surface-secondary rounded animate-pulse w-3/4" />
                <div className="h-3 bg-surface-secondary rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-2 rounded-xl border bg-surface-elevated p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-surface-secondary rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
