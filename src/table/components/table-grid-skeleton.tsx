export function TableGridSkeleton() {
  return (
    <div className="space-y-4">
      {/* Summary bar skeleton */}
      <div className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-7 w-28 animate-pulse rounded bg-muted"
          />
        ))}
      </div>

      {/* Zone tabs skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-[44px] w-24 animate-pulse rounded-full bg-muted"
          />
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="min-h-[140px] animate-pulse rounded-xl border border-muted border-t-4 border-t-muted bg-muted/30"
          />
        ))}
      </div>
    </div>
  );
}
