'use client'

export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 bg-surface-container rounded-[4px] w-64" />
        <div className="h-4 bg-surface-low rounded-[4px] w-96" />
      </div>

      {/* Content skeleton - cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-surface-low rounded-[4px]" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="space-y-3">
        <div className="h-10 bg-surface-low rounded-[4px]" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-surface-low/50 rounded-[4px]" />
        ))}
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-10 bg-surface-low rounded-[4px]" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-surface-low/50 rounded-[4px]" />
      ))}
    </div>
  )
}

export function CardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-32 bg-surface-low rounded-[4px]" />
      ))}
    </div>
  )
}
