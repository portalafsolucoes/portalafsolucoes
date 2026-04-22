'use client'

import { ReactNode } from 'react'
import { Icon } from '@/components/ui/Icon'

interface ChartCardProps {
  title: string
  description?: string
  icon?: string
  action?: ReactNode
  children: ReactNode
  empty?: boolean
  emptyLabel?: string
  className?: string
}

export function ChartCard({ title, description, icon, action, children, empty, emptyLabel, className }: ChartCardProps) {
  return (
    <div className={`bg-card rounded-[4px] ambient-shadow p-4 md:p-5 flex flex-col ${className || ''}`}>
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-start gap-2 min-w-0">
          {icon && <Icon name={icon} className="text-base text-primary-graphite flex-shrink-0 mt-0.5" />}
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-on-surface truncate">{title}</h3>
            {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
          </div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      <div className="flex-1 min-h-0">
        {empty ? (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
            {emptyLabel || 'Sem dados no período selecionado.'}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
