'use client'

import { Icon } from '@/components/ui/Icon'
import { formatDate } from '@/lib/utils'

interface Plan {
  id: string
  planNumber?: number
  description?: string
  planDate?: string
  startDate?: string
  endDate?: string
  status?: string
  isFinished?: boolean
  createdAt?: string
  updatedAt?: string
}

interface PlanDetailPanelProps {
  plan: Plan
  onClose: () => void
  onDelete: () => void
  canDelete: boolean
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em Andamento',
  CLOSED: 'Fechado',
}

export function PlanDetailPanel({ plan, onClose, onDelete, canDelete }: PlanDetailPanelProps) {
  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border">
        <h2 className="text-xl font-bold text-foreground">
          {plan.planNumber ? `#${plan.planNumber}` : 'Plano'}
        </h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <Icon name="close" className="text-xl text-muted-foreground" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Action buttons */}
        {canDelete && (
          <div className="p-4 border-b border-border space-y-2">
            <button
              onClick={onDelete}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-danger text-white rounded-[4px] hover:bg-danger/90 transition-colors"
            >
              <Icon name="delete" className="text-base" />
              Excluir
            </button>
          </div>
        )}

        {/* Data section */}
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">Dados do Plano</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Descrição</p>
              <p className="text-sm text-foreground">{plan.description || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data do Plano</p>
              <p className="text-sm text-foreground">{plan.planDate ? formatDate(plan.planDate) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-sm text-foreground">{STATUS_LABELS[plan.status || ''] || plan.status || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data Início</p>
              <p className="text-sm text-foreground">{plan.startDate ? formatDate(plan.startDate) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data Fim</p>
              <p className="text-sm text-foreground">{plan.endDate ? formatDate(plan.endDate) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Terminado?</p>
              <p className="text-sm text-foreground">{plan.isFinished ? 'Sim' : 'Não'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
