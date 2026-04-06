'use client'

export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 bg-muted rounded w-64" />
        <div className="h-4 bg-muted/60 rounded w-96" />
      </div>

      {/* Content skeleton - cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted/40 rounded-xl border border-border/30" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="space-y-3">
        <div className="h-10 bg-muted/40 rounded-lg" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-muted/20 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-10 bg-muted/40 rounded-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-muted/20 rounded-lg" />
      ))}
    </div>
  )
}

export function CardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-32 bg-muted/40 rounded-xl border border-border/30" />
      ))}
    </div>
  )
}
