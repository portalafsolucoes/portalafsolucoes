import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/Icon'

type PageHeaderProps = {
  title: string
  description?: string
  icon?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6', className)}>
      <div className="flex items-start gap-3">
        {icon && (
          <Icon name={icon} className="text-3xl text-muted-foreground mt-0.5" />
        )}
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
