'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { PanelActionButtons } from '@/components/ui/PanelActionButtons'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatHours } from '@/lib/units/time'

export interface AssetPlanDetail {
  id: string
  name: string
  sequence: number
  maintenanceTime: number
  timeUnit: string
  period: string
  trackingType: string
  isActive: boolean
  isStandard: boolean
  lastMaintenanceDate: string | null
  createdAt: string
  updatedAt: string
  standardPlanId: string | null
  hasLocalOverrides?: boolean
  detachedAt?: string | null
  detachedById?: string | null
  asset?: { id: string; name: string; tag?: string; protheusCode?: string; family?: { id: string; code: string; name: string }; familyModel?: { id: string; name: string } }
  serviceType?: { id: string; code: string; name: string }
  maintenanceArea?: { id: string; name: string }
  maintenanceType?: { id: string; name: string }
  calendar?: { id: string; name: string }
  tasks?: TaskDetail[]
}

interface TaskDetail {
  id: string
  description: string
  executionTime: number | null
  order: number
  steps?: { stepId: string; order: number; step?: { id: string; name: string } }[]
  resources?: {
    id: string
    resourceType?: string
    resourceId: string | null
    jobTitleId?: string | null
    userId?: string | null
    resourceCount: number
    quantity: number
    hours: number
    unit: string
    resource?: { id: string; name: string; type: string; unit?: string }
    jobTitle?: { id: string; name: string }
    user?: { id: string; firstName: string; lastName: string; jobTitle?: string }
  }[]
}

interface AssetPlanDetailPanelProps {
  plan: AssetPlanDetail
  onClose: () => void
  onEdit: (planId: string) => void
  onDelete: (planId: string) => void
  onRevert?: (planId: string) => Promise<void> | void
  canEdit: boolean
}

const sectionTitleCls = 'text-sm font-semibold text-foreground mb-3'
const labelCls = 'text-xs text-muted-foreground'
const valueCls = 'text-sm text-foreground'

export default function AssetPlanDetailPanel({ plan, onClose, onEdit, onDelete, onRevert, canEdit }: AssetPlanDetailPanelProps) {
  const [revertConfirmOpen, setRevertConfirmOpen] = useState(false)
  const [reverting, setReverting] = useState(false)

  const isCustomized = !!plan.hasLocalOverrides
  const canRevert = !!(canEdit && onRevert && plan.hasLocalOverrides && plan.standardPlanId)

  const handleConfirmRevert = async () => {
    if (!onRevert) return
    try {
      setReverting(true)
      await onRevert(plan.id)
      setRevertConfirmOpen(false)
    } finally {
      setReverting(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-black text-gray-900">{plan.name || 'Plano sem nome'}</h2>
            {isCustomized && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-warning-light text-warning border border-warning/30">
                <Icon name="edit_note" className="text-sm" />
                Customizado
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {plan.asset?.protheusCode || plan.asset?.tag || ''}{plan.asset?.protheusCode || plan.asset?.tag ? ' - ' : ''}{plan.asset?.name}
          </p>
        </div>
        <button onClick={onClose} className="flex items-center justify-center p-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-md text-gray-500 shadow-sm transition-colors">
          <Icon name="close" className="text-xl" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Ações */}
        {canEdit && (
          <PanelActionButtons
            onEdit={() => onEdit(plan.id)}
            onDelete={() => onDelete(plan.id)}
          />
        )}

        {/* Reverter ao padrão (somente quando há customizações e vínculo com padrão) */}
        {canRevert && (
          <div className="px-4 pb-3">
            <div className="flex items-start gap-3 p-3 bg-warning-light border border-warning/30 rounded-[4px]">
              <Icon name="info" className="text-warning text-lg flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-0.5">Plano customizado</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Este plano foi editado após vir do padrão. Reverter descarta as customizações e recopia o conteúdo atual do plano padrão.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRevertConfirmOpen(true)}
                  className="w-full border-warning text-warning hover:bg-warning/10"
                >
                  <Icon name="restart_alt" className="text-base mr-2" />
                  Reverter ao padrão
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Classificação */}
        <div className="p-4 border-b border-border">
          <h3 className={sectionTitleCls}>Classificação</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <span className={labelCls}>Bem/Ativo</span>
              <p className={valueCls}>
                {plan.asset?.protheusCode && <span className="font-mono">{plan.asset.protheusCode}</span>}
                {plan.asset?.protheusCode && ' - '}
                {plan.asset?.name}
                {plan.asset?.tag && <span className="ml-1 text-xs text-muted-foreground">({plan.asset.tag})</span>}
              </p>
            </div>
            <div>
              <span className={labelCls}>Família</span>
              <p className={valueCls}>{plan.asset?.family ? `${plan.asset.family.code} - ${plan.asset.family.name}` : '-'}</p>
            </div>
            <div>
              <span className={labelCls}>Tipo Modelo</span>
              <p className={valueCls}>{plan.asset?.familyModel?.name || 'Genérico'}</p>
            </div>
            <div>
              <span className={labelCls}>Tipo de Serviço</span>
              <p className={valueCls}>{plan.serviceType ? `${plan.serviceType.code} - ${plan.serviceType.name}` : '-'}</p>
            </div>
            <div>
              <span className={labelCls}>Sequência</span>
              <p className={valueCls}>{plan.sequence}</p>
            </div>
            <div>
              <span className={labelCls}>Manutenção Padrão?</span>
              <p className={valueCls}>{plan.isStandard ? 'SIM' : 'NAO'}</p>
            </div>
          </div>
        </div>

        {/* Manutenção */}
        <div className="p-4 border-b border-border">
          <h3 className={sectionTitleCls}>Manutenção</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="col-span-2">
              <span className={labelCls}>Nome da Manutenção</span>
              <p className={valueCls}>{plan.name || '-'}</p>
            </div>
            <div>
              <span className={labelCls}>Tipo de Controle</span>
              <p className={valueCls}>{plan.trackingType === 'HORIMETER' ? 'HORIMETRO' : 'TEMPO PRE-DETERMINADO'}</p>
            </div>
            <div>
              <span className={labelCls}>Calendário</span>
              <p className={valueCls}>{plan.calendar?.name || 'Nenhum'}</p>
            </div>
            <div>
              <span className={labelCls}>Frequência</span>
              <p className={valueCls}>{plan.maintenanceTime ? `${plan.maintenanceTime} ${plan.timeUnit}` : '-'}</p>
            </div>
            <div>
              <span className={labelCls}>Período</span>
              <p className={valueCls}>{plan.period || '-'}</p>
            </div>
            {plan.maintenanceArea && (
              <div>
                <span className={labelCls}>Área de Manutenção</span>
                <p className={valueCls}>{plan.maintenanceArea.name}</p>
              </div>
            )}
            {plan.maintenanceType && (
              <div>
                <span className={labelCls}>Tipo de Manutenção</span>
                <p className={valueCls}>{plan.maintenanceType.name}</p>
              </div>
            )}
            <div>
              <span className={labelCls}>Ativa?</span>
              <p className={valueCls}>{plan.isActive ? 'SIM' : 'NAO'}</p>
            </div>
            {plan.lastMaintenanceDate && (
              <div>
                <span className={labelCls}>Última Manutenção</span>
                <p className={valueCls}>{new Date(plan.lastMaintenanceDate).toLocaleDateString('pt-BR')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Confirmação de reversão */}
        <ConfirmDialog
          isOpen={revertConfirmOpen}
          onClose={() => setRevertConfirmOpen(false)}
          onConfirm={handleConfirmRevert}
          title="Reverter ao padrão?"
          message="As customizações locais deste plano (campos estruturais, tarefas, etapas e recursos) serão descartadas e substituídas pelo conteúdo atual do plano padrão de origem. Campos operacionais do bem (última manutenção, tolerância, ativo, etc.) são preservados. Esta ação não pode ser desfeita."
          confirmText="Reverter"
          cancelText="Cancelar"
          variant="warning"
          loading={reverting}
        />

        {/* Tarefas */}
        <div className="p-4">
          <h3 className={sectionTitleCls}>Tarefas ({plan.tasks?.length || 0})</h3>
          {(!plan.tasks || plan.tasks.length === 0) ? (
            <p className="text-sm text-muted-foreground">Nenhuma tarefa cadastrada.</p>
          ) : (
            <div className="space-y-3">
              {plan.tasks.map((task, idx) => (
                <div key={task.id} className="border border-border rounded-[4px] p-3 bg-background">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Tarefa {idx + 1}</span>
                    {task.executionTime != null && (
                      <span className="text-xs text-muted-foreground">
                        <Icon name="schedule" className="text-xs mr-0.5 align-middle" />
                        {formatHours(task.executionTime)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground mb-2">{task.description}</p>

                  {/* Etapas da tarefa */}
                  {task.steps && task.steps.length > 0 && (
                    <div className="mb-2">
                      <span className={labelCls}>Etapas</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {task.steps.map(s => (
                          <span key={s.stepId} className="inline-flex items-center px-2 py-1 text-xs bg-muted rounded-[4px]">
                            {s.step?.name || s.stepId}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recursos da tarefa */}
                  {task.resources && task.resources.length > 0 && (
                    <div>
                      <span className={labelCls}>Recursos</span>
                      <div className="space-y-1 mt-1">
                        {task.resources.map((r, ri) => {
                          const type = r.resourceType || r.resource?.type || 'MATERIAL'
                          let name = ''
                          let detail = ''

                          if (type === 'SPECIALTY') {
                            name = r.jobTitle?.name || 'Especialidade'
                            detail = `${r.resourceCount || r.quantity || 1} pessoa(s)`
                          } else if (type === 'LABOR') {
                            name = r.user ? `${r.user.firstName} ${r.user.lastName}` : 'Mão de obra'
                            detail = r.hours ? `${r.hours}h` : ''
                          } else {
                            name = r.resource?.name || 'Recurso'
                            const unit = r.resource?.unit || r.unit || 'pç'
                            detail = `${r.resourceCount || r.quantity || 1} ${unit === 'H' ? 'pç' : unit}`
                          }

                          return (
                            <div key={r.id || ri} className="flex items-center justify-between text-xs bg-muted rounded-[4px] px-2 py-1.5">
                              <span className="text-foreground">{name}</span>
                              {detail && <span className="text-muted-foreground">{detail}</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
