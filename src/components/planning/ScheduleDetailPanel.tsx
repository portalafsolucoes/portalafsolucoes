'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { PanelCloseButton } from '@/components/ui/PanelCloseButton'
import { PanelActionButtons } from '@/components/ui/PanelActionButtons'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'

interface Schedule {
  id: string
  scheduleNumber?: number
  description?: string
  scheduleDate?: string
  startDate?: string
  endDate?: string
  status?: string
  createdBy?: { firstName?: string; lastName?: string }
  createdAt?: string
  updatedAt?: string
}

interface ScheduleItem {
  id: string
  scheduledDate: string
  status: string
  workOrder: {
    id: string
    externalId?: string
    internalId?: string
    title: string
    status: string
    priority: string
    type: string
    dueDate?: string
    plannedStartDate?: string
    asset?: { id: string; name: string; tag?: string }
    serviceType?: { id: string; name: string }
  }
}

interface ResourceSummary {
  totalHours: number
  totalCost: number
  totalItems: number
  scheduledWorkOrders: number
  byType: Record<string, { totalHours: number; totalQuantity: number; totalCost: number }>
}

interface ScheduleDetailPanelProps {
  schedule: Schedule
  onClose: () => void
  onEdit: () => void
  onEditMetadata: () => void
  onDelete: () => void
  onConfirm: (id: string) => void
  onReprogram: (id: string) => void
  canEdit: boolean
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  CONFIRMED: 'Confirmada',
  REPROGRAMMING: 'Reprogramação',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  CONFIRMED: 'bg-success-light text-success-light-foreground',
  REPROGRAMMING: 'bg-amber-100 text-amber-700',
}

const WO_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  RELEASED: 'Liberada',
  IN_PROGRESS: 'Em Progresso',
  ON_HOLD: 'Em Espera',
  COMPLETE: 'Concluída',
}

const WO_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  RELEASED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  ON_HOLD: 'bg-orange-100 text-orange-700',
  COMPLETE: 'bg-green-100 text-green-700',
}

const WO_PRIORITY_LABELS: Record<string, string> = {
  HIGH: 'Alta',
  MEDIUM: 'Média',
  LOW: 'Baixa',
  NONE: 'Nenhuma',
}

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  SPECIALTY: 'Especialidades',
  LABOR: 'Mão de Obra',
  MATERIAL: 'Materiais',
  TOOL: 'Ferramentas',
}

export function ScheduleDetailPanel({
  schedule, onClose, onEdit, onEditMetadata, onDelete, onConfirm, onReprogram, canEdit,
}: ScheduleDetailPanelProps) {
  const [items, setItems] = useState<ScheduleItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [resourceSummary, setResourceSummary] = useState<ResourceSummary | null>(null)
  const [loadingResources, setLoadingResources] = useState(false)

  const isDraft = schedule.status === 'DRAFT'
  const isConfirmed = schedule.status === 'CONFIRMED'
  const isReprogramming = schedule.status === 'REPROGRAMMING'
  const isEditable = isDraft || isReprogramming

  useEffect(() => {
    if (!schedule.id) return

    // Carregar itens
    setLoadingItems(true)
    fetch(`/api/planning/schedules/${schedule.id}/items`)
      .then(res => res.json())
      .then(json => setItems(json.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoadingItems(false))

    // Carregar resumo de recursos
    setLoadingResources(true)
    fetch(`/api/planning/schedules/${schedule.id}/resources`)
      .then(res => res.json())
      .then(json => setResourceSummary(json.data?.summary || null))
      .catch(() => setResourceSummary(null))
      .finally(() => setLoadingResources(false))
  }, [schedule.id])

  return (
    <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-black text-gray-900">
            {schedule.scheduleNumber ? `#${schedule.scheduleNumber}` : 'Programação'}
          </h2>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${STATUS_COLORS[schedule.status || ''] || 'bg-muted text-muted-foreground'}`}>
            {STATUS_LABELS[schedule.status || ''] || schedule.status || '—'}
          </span>
        </div>
        <PanelCloseButton onClick={onClose} />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Action buttons */}
        {canEdit && (
          <>
            <PanelActionButtons
              onEdit={isEditable ? onEdit : undefined}
              onDelete={isDraft ? onDelete : undefined}
            />

            {/* Confirm button */}
            {isEditable && items.length > 0 && (
              <div className="px-4 pb-4 space-y-2">
                <Button
                  onClick={() => onConfirm(schedule.id)}
                  className="w-full flex items-center justify-center gap-2 bg-success text-white hover:bg-success/90 min-h-[44px]"
                >
                  <Icon name="check_circle" className="text-base" />
                  Confirmar Programação
                </Button>
              </div>
            )}

            {/* Edit metadata + Reprogram buttons (only for CONFIRMED) */}
            {isConfirmed && (
              <div className="px-4 pb-4 space-y-2">
                <Button
                  onClick={onEditMetadata}
                  className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white hover:bg-gray-800 min-h-[44px]"
                >
                  <Icon name="edit" className="text-base" />
                  Editar
                </Button>
                <Button
                  onClick={() => onReprogram(schedule.id)}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 border-amber-500 text-amber-700 hover:bg-amber-50 min-h-[44px]"
                >
                  <Icon name="refresh" className="text-base" />
                  Reprogramar
                </Button>
              </div>
            )}
          </>
        )}

        {/* Data section */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Dados da Programação</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            <div className="sm:col-span-2">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Descrição</p>
              <p className="text-sm text-foreground">{schedule.description || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Data</p>
              <p className="text-sm text-foreground">{schedule.scheduleDate ? formatDate(schedule.scheduleDate) : '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Criado por</p>
              <p className="text-sm text-foreground">
                {schedule.createdBy
                  ? `${schedule.createdBy.firstName || ''} ${schedule.createdBy.lastName || ''}`.trim() || '—'
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Data Início</p>
              <p className="text-sm text-foreground">{schedule.startDate ? formatDate(schedule.startDate) : '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Data Fim</p>
              <p className="text-sm text-foreground">{schedule.endDate ? formatDate(schedule.endDate) : '—'}</p>
            </div>
          </div>
        </div>

        {/* Resource summary */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Resumo de Recursos</h3>
          {loadingResources ? (
            <div className="flex items-center justify-center py-4">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-on-surface-variant" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
            </div>
          ) : !resourceSummary || resourceSummary.totalItems === 0 ? (
            <p className="text-sm text-muted-foreground py-2 text-center">
              Nenhum recurso associado às OSs.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="border border-gray-200 rounded-[4px] p-2.5 bg-white">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Total Horas</p>
                  <p className="text-lg font-bold text-gray-900">{resourceSummary.totalHours.toFixed(1)}h</p>
                </div>
                <div className="border border-gray-200 rounded-[4px] p-2.5 bg-white">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">OSs Programadas</p>
                  <p className="text-lg font-bold text-gray-900">{resourceSummary.scheduledWorkOrders}</p>
                </div>
              </div>
              {Object.entries(resourceSummary.byType).map(([type, data]) => (
                <div key={type} className="flex items-center justify-between text-xs border-b border-gray-100 py-1.5">
                  <span className="text-gray-600">{RESOURCE_TYPE_LABELS[type] || type}</span>
                  <span className="text-gray-900 font-medium">
                    {data.totalHours > 0 ? `${data.totalHours.toFixed(1)}h` : ''}
                    {data.totalHours > 0 && data.totalQuantity > 0 ? ' / ' : ''}
                    {data.totalQuantity > 0 ? `${data.totalQuantity} un.` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Work Orders section */}
        <div className="p-4">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">
            Ordens de Serviço ({items.length})
          </h3>

          {loadingItems ? (
            <div className="flex items-center justify-center py-6">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-on-surface-variant" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma OS vinculada a esta programação.
            </p>
          ) : (
            <div className="space-y-2">
              {items.map(item => {
                const wo = item.workOrder
                return (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-[4px] p-3 bg-white min-h-[44px]"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-gray-600">
                        {wo.internalId || wo.externalId || '—'}
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
                    <div className="flex items-center gap-2 sm:gap-3 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
                      <span>Prioridade: {WO_PRIORITY_LABELS[wo.priority] || wo.priority || 'Nenhuma'}</span>
                      <span>Programada: {formatDate(item.scheduledDate)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
