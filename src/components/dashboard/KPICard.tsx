'use client'

import { Icon } from '@/components/ui/Icon'

interface KPICardProps {
  label: string
  value: string | number
  unit?: string
  delta?: number | null
  deltaInvert?: boolean
  icon?: string
  hint?: string
}

export function KPICard({ label, value, unit, delta, deltaInvert = false, icon, hint }: KPICardProps) {
  const showDelta = typeof delta === 'number' && !Number.isNaN(delta)
  const isPositive = showDelta && delta! > 0
  const isNegative = showDelta && delta! < 0
  // Para KPIs onde "mais baixo e melhor" (ex: MTTR, taxa reprog), invertemos a cor
  const improved = deltaInvert ? isNegative : isPositive
  const worsened = deltaInvert ? isPositive : isNegative
  const deltaColor = improved ? 'text-success' : worsened ? 'text-danger' : 'text-muted-foreground'
  const deltaIcon = showDelta && delta! > 0 ? 'trending_up' : showDelta && delta! < 0 ? 'trending_down' : 'trending_flat'

  return (
    <div className="bg-card rounded-[4px] ambient-shadow p-4 md:p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">{label}</p>
        </div>
        {icon && (
          <div className="flex items-center justify-center h-8 w-8 rounded-[4px] bg-surface-container flex-shrink-0">
            <Icon name={icon} className="text-base text-primary-graphite" />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl md:text-3xl font-black text-on-surface leading-none">{value}</span>
        {unit && <span className="text-sm font-semibold text-muted-foreground">{unit}</span>}
      </div>
      <div className="flex items-center gap-2">
        {showDelta ? (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${deltaColor}`}>
            <Icon name={deltaIcon} className="text-xs" />
            {delta! > 0 ? '+' : ''}{delta!.toFixed(1)}%
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">—</span>
        )}
        {hint && <span className="text-[11px] text-muted-foreground truncate">{hint}</span>}
      </div>
    </div>
  )
}
