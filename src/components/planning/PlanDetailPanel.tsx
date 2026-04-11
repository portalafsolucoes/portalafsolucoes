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
    <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
        <h2 className="text-lg font-black text-gray-900">
          {plan.planNumber ? `#${plan.planNumber}` : 'Plano'}
        </h2>
        <button
          onClick={onClose}
          className="p-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-md text-gray-500 shadow-sm transition-colors"
        >
          <Icon name="close" className="text-xl text-muted-foreground" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Action buttons */}
        {canDelete && (
          <div className="p-4 border-b border-gray-200 space-y-2">
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
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Dados do Plano</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="col-span-2">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Descrição</p>
              <p className="text-sm text-foreground">{plan.description || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Data do Plano</p>
              <p className="text-sm text-foreground">{plan.planDate ? formatDate(plan.planDate) : '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Status</p>
              <p className="text-sm text-foreground">{STATUS_LABELS[plan.status || ''] || plan.status || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Data Início</p>
              <p className="text-sm text-foreground">{plan.startDate ? formatDate(plan.startDate) : '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Data Fim</p>
              <p className="text-sm text-foreground">{plan.endDate ? formatDate(plan.endDate) : '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Terminado?</p>
              <p className="text-sm text-foreground">{plan.isFinished ? 'Sim' : 'Não'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
