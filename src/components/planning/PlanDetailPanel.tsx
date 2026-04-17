'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { PanelCloseButton } from '@/components/ui/PanelCloseButton'
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
  trackingType?: string
  currentHorimeter?: number
  createdAt?: string
  updatedAt?: string
}

interface PlanWorkOrder {
  id: string
  internalId?: string
  customId?: string
  externalId?: string
  title: string
  status: string
  priority: string
  type: string
  dueDate?: string
  plannedStartDate?: string
  asset?: { id: string; name: string; tag?: string }
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

const WO_STATUS_LABELS: Record<string, string> = {
  PENDING: 'PENDENTE',
  RELEASED: 'LIBERADA',
  OPEN: 'ABERTA',
  IN_PROGRESS: 'EM PROGRESSO',
  ON_HOLD: 'EM ESPERA',
}

const WO_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  RELEASED: 'bg-blue-100 text-blue-700',
  OPEN: 'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  ON_HOLD: 'bg-orange-100 text-orange-700',
}

const WO_PRIORITY_LABELS: Record<string, string> = {
  HIGH: 'ALTA',
  MEDIUM: 'MEDIA',
  LOW: 'BAIXA',
  NONE: 'NENHUMA',
}

export function PlanDetailPanel({ plan, onClose, onDelete, canDelete }: PlanDetailPanelProps) {
  const [workOrders, setWorkOrders] = useState<PlanWorkOrder[]>([])
  const [loadingWOs, setLoadingWOs] = useState(false)

  useEffect(() => {
    if (!plan.id) return
    setLoadingWOs(true)
    fetch(`/api/planning/plans/${plan.id}/work-orders`)
      .then(res => res.json())
      .then(json => setWorkOrders(json.data || []))
      .catch(() => setWorkOrders([]))
      .finally(() => setLoadingWOs(false))
  }, [plan.id])

  return (
    <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
        <h2 className="text-lg font-black text-gray-900">
          {plan.planNumber ? `#${plan.planNumber}` : 'Plano'}
        </h2>
        <PanelCloseButton onClick={onClose} />
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
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Tipo de Controle</p>
              <p className="text-sm text-foreground">
                {plan.trackingType === 'HORIMETER' ? 'HORIMETRO' : 'TEMPO PRE-DETERMINADO'}
              </p>
            </div>
            {plan.trackingType === 'HORIMETER' && plan.currentHorimeter != null && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Horímetro Atual</p>
                <p className="text-sm text-foreground">{plan.currentHorimeter}</p>
              </div>
            )}
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Terminado?</p>
              <p className="text-sm text-foreground">{plan.isFinished ? 'SIM' : 'NAO'}</p>
            </div>
          </div>
        </div>

        {/* Work Orders section */}
        <div className="p-4">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">
            Ordens de Serviço Vinculadas
          </h3>

          {loadingWOs ? (
            <div className="flex items-center justify-center py-6">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-on-surface-variant" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
            </div>
          ) : workOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma OS em aberto vinculada a este plano.
            </p>
          ) : (
            <div className="space-y-2">
              {workOrders.map(wo => (
                <div
                  key={wo.id}
                  className="border border-gray-200 rounded-[4px] p-3 bg-white"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-600">
                      {wo.internalId || wo.customId || wo.externalId || '—'}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${WO_STATUS_COLORS[wo.status] || 'bg-gray-100 text-gray-600'}`}>
                      {WO_STATUS_LABELS[wo.status] || wo.status}
                    </span>
                  </div>
                  <p className="text-sm text-foreground truncate">{wo.title}</p>
                  {wo.asset && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {wo.asset.tag ? `${wo.asset.tag} — ` : ''}{wo.asset.name}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    <span>Prioridade: {WO_PRIORITY_LABELS[wo.priority] || wo.priority || 'NENHUMA'}</span>
                    {(wo.dueDate || wo.plannedStartDate) && (
                      <span>Prazo: {formatDate(wo.dueDate || wo.plannedStartDate || '')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
