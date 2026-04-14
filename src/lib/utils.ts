import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('pt-BR')
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('pt-BR')
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // WorkOrder status (novos)
    PENDING: 'bg-muted text-muted-foreground',
    RELEASED: 'bg-info-light text-info-light-foreground',
    IN_PROGRESS: 'bg-warning-light text-warning-light-foreground',
    ON_HOLD: 'bg-[hsl(0,0%,93%)] text-[hsl(0,0%,35%)]',
    COMPLETE: 'bg-success-light text-success-light-foreground',
    // WorkOrder status (legado - compatibilidade)
    OPEN: 'bg-info-light text-info-light-foreground',
    // Request status
    APPROVED: 'bg-success-light text-success-light-foreground',
    REJECTED: 'bg-danger-light text-danger-light-foreground',
    CANCELLED: 'bg-muted text-muted-foreground',
    COMPLETED: 'bg-success-light text-success-light-foreground',
    // Asset status
    OPERATIONAL: 'bg-success-light text-success-light-foreground',
    DOWN: 'bg-danger-light text-danger-light-foreground',
    // Maintenance status
    ACTIVE: 'bg-success-light text-success-light-foreground',
    INACTIVE: 'bg-muted text-muted-foreground',
    // Schedule status
    DRAFT: 'bg-muted text-muted-foreground',
    CONFIRMED: 'bg-success-light text-success-light-foreground',
  }
  return colors[status] || 'bg-muted text-muted-foreground'
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    NONE: 'bg-muted text-muted-foreground',
    LOW: 'bg-info-light text-info-light-foreground',
    MEDIUM: 'bg-warning-light text-warning-light-foreground',
    HIGH: 'bg-danger-light text-danger-light-foreground',
    CRITICAL: 'bg-danger text-danger-foreground'
  }
  return colors[priority] || 'bg-muted text-muted-foreground'
}
