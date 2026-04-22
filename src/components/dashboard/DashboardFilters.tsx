'use client'

import { Icon } from '@/components/ui/Icon'

export type DashboardPeriod = '30d' | '90d' | '12m'

interface DashboardFiltersProps {
  period: DashboardPeriod
  onPeriodChange: (p: DashboardPeriod) => void
  loading?: boolean
  onRefresh?: () => void
}

const OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: '30d', label: '30 DIAS' },
  { value: '90d', label: '90 DIAS' },
  { value: '12m', label: '12 MESES' },
]

export function DashboardFilters({ period, onPeriodChange, loading, onRefresh }: DashboardFiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="inline-flex items-center bg-muted rounded-[4px] p-1">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onPeriodChange(opt.value)}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-bold tracking-wide transition-colors ${
              period === opt.value
                ? 'bg-background text-foreground ambient-shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center justify-center h-9 w-9 rounded-[4px] border border-input bg-background text-muted-foreground hover:text-foreground disabled:opacity-50"
          title="Atualizar"
        >
          <Icon name={loading ? 'autorenew' : 'refresh'} className={`text-base ${loading ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  )
}
