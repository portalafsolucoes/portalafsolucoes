'use client'

import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'

interface AssetPlanDetail {
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
  resources?: { resourceId: string; resourceCount: number; quantity: number; unit: string; resource?: { id: string; name: string; type: string } }[]
}

interface AssetPlanDetailPanelProps {
  plan: AssetPlanDetail
  onClose: () => void
  onEdit: (planId: string) => void
  onDelete: (planId: string) => void
  canEdit: boolean
}

const sectionTitleCls = 'text-sm font-semibold text-foreground mb-3'
const labelCls = 'text-xs text-muted-foreground'
const valueCls = 'text-sm text-foreground'

export default function AssetPlanDetailPanel({ plan, onClose, onEdit, onDelete, canEdit }: AssetPlanDetailPanelProps) {
  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-xl font-bold text-foreground">{plan.name || 'Plano sem nome'}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {plan.asset?.protheusCode || plan.asset?.tag || ''}{plan.asset?.protheusCode || plan.asset?.tag ? ' - ' : ''}{plan.asset?.name}
          </p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
          <Icon name="close" className="text-xl" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Ações */}
        {canEdit && (
          <div className="p-4 border-b border-border flex gap-2">
            <Button onClick={() => onEdit(plan.id)} className="flex-1">
              <Icon name="edit" className="text-base mr-2" />
              Editar Plano
            </Button>
            <Button variant="outline" onClick={() => onDelete(plan.id)} className="flex-1 text-danger border-danger hover:bg-danger/10">
              <Icon name="delete" className="text-base mr-2" />
              Excluir Plano
            </Button>
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
              <p className={valueCls}>{plan.isStandard ? 'Sim' : 'Não'}</p>
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
              <p className={valueCls}>{plan.trackingType === 'HORIMETER' ? 'Horímetro' : 'Tempo Pré-determinado'}</p>
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
              <p className={valueCls}>{plan.isActive ? 'Sim' : 'Não'}</p>
            </div>
            {plan.lastMaintenanceDate && (
              <div>
                <span className={labelCls}>Última Manutenção</span>
                <p className={valueCls}>{new Date(plan.lastMaintenanceDate).toLocaleDateString('pt-BR')}</p>
              </div>
            )}
          </div>
        </div>

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
                        {task.executionTime} min
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
                        {task.resources.map(r => (
                          <div key={r.resourceId} className="flex items-center justify-between text-xs bg-muted rounded-[4px] px-2 py-1.5">
                            <span className="text-foreground">{r.resource?.name || r.resourceId}</span>
                            <span className="text-muted-foreground">
                              {r.resourceCount} {r.unit}
                              {(r.resource?.type === 'MAO_DE_OBRA' || r.resource?.type === 'LABOR') && r.quantity > 0 && ` / ${r.quantity}h`}
                            </span>
                          </div>
                        ))}
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
