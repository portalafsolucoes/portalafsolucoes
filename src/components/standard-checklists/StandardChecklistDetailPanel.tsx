'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { PanelActionButtons } from '@/components/ui/PanelActionButtons'
import { Button } from '@/components/ui/Button'

export interface StandardChecklistFamilyGroupDetail {
  id: string
  order: number
  assetFamily?: { id: string; code: string | null; name: string }
  familyModel?: { id: string; name: string }
  steps?: Array<{
    id: string
    order: number
    genericStep?: { id: string; name: string; protheusCode?: string | null; optionType?: string }
  }>
}

export interface StandardChecklistDetail {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  workCenter?: { id: string; name: string; protheusCode?: string | null }
  serviceType?: { id: string; code: string | null; name: string }
  unit?: { id: string; name: string }
  createdBy?: { id: string; firstName: string | null; lastName: string | null }
  familyGroups?: StandardChecklistFamilyGroupDetail[]
}

interface Props {
  checklist: StandardChecklistDetail
  onClose: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onToggleActive: (id: string, isActive: boolean) => void
  canEdit: boolean
  canDelete: boolean
}

const sectionTitleCls = 'text-sm font-semibold text-foreground mb-3'
const labelCls = 'text-xs text-muted-foreground'
const valueCls = 'text-sm text-foreground'

export default function StandardChecklistDetailPanel({
  checklist,
  onClose,
  onEdit,
  onDelete,
  onToggleActive,
  canEdit,
  canDelete,
}: Props) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const totalSteps = (checklist.familyGroups || []).reduce((acc, g) => acc + (g.steps?.length || 0), 0)
  const totalGroups = checklist.familyGroups?.length || 0

  return (
    <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-gray-900">{checklist.name}</h2>
            {!checklist.isActive && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-gray-200 text-gray-700 border border-gray-300">
                Arquivado
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {checklist.workCenter?.name || '-'} / {checklist.serviceType?.name || '-'}
          </p>
        </div>
        <button onClick={onClose} className="flex items-center justify-center p-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-md text-gray-500 shadow-sm transition-colors">
          <Icon name="close" className="text-xl" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {(canEdit || canDelete) && (
          <PanelActionButtons
            onEdit={canEdit ? () => onEdit(checklist.id) : undefined}
            onDelete={canDelete ? () => onDelete(checklist.id) : undefined}
          />
        )}

        {canEdit && (
          <div className="px-4 pt-2 pb-1">
            <Button
              variant="outline"
              onClick={() => onToggleActive(checklist.id, !checklist.isActive)}
              className="w-full"
            >
              <Icon name={checklist.isActive ? 'inventory' : 'unarchive'} className="text-base mr-2" />
              {checklist.isActive ? 'Arquivar check list' : 'Reativar check list'}
            </Button>
          </div>
        )}

        <div className="p-4 border-b border-border">
          <h3 className={sectionTitleCls}>Identificacao</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <span className={labelCls}>Centro de Trabalho</span>
              <p className={valueCls}>{checklist.workCenter?.name || '-'}</p>
            </div>
            <div>
              <span className={labelCls}>Tipo de Servico</span>
              <p className={valueCls}>{checklist.serviceType?.code ? `${checklist.serviceType.code} - ` : ''}{checklist.serviceType?.name || '-'}</p>
            </div>
            <div>
              <span className={labelCls}>Unidade</span>
              <p className={valueCls}>{checklist.unit?.name || '-'}</p>
            </div>
            <div>
              <span className={labelCls}>Criado por</span>
              <p className={valueCls}>
                {[checklist.createdBy?.firstName, checklist.createdBy?.lastName].filter(Boolean).join(' ') || '-'}
              </p>
            </div>
            <div>
              <span className={labelCls}>Status</span>
              <p className={valueCls}>{checklist.isActive ? 'ATIVO' : 'ARQUIVADO'}</p>
            </div>
            <div>
              <span className={labelCls}>Total de etapas</span>
              <p className={valueCls}>{totalSteps} ({totalGroups} grupo(s))</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <h3 className={sectionTitleCls}>Familias e Etapas</h3>
          {(checklist.familyGroups || []).length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nenhum grupo de familia/modelo configurado.</p>
          ) : (
            <div className="space-y-2">
              {(checklist.familyGroups || []).map(group => {
                const isOpen = openGroups[group.id] !== false
                return (
                  <div key={group.id} className="border border-gray-200 rounded-[4px] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenGroups(s => ({ ...s, [group.id]: !isOpen }))}
                      className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-100 border-b border-gray-200 text-[12px] font-bold text-gray-900 uppercase tracking-wider hover:bg-gray-200 transition-colors"
                    >
                      <Icon name={isOpen ? 'expand_more' : 'chevron_right'} className="text-base text-gray-600" />
                      <span className="flex-1 text-left">
                        {group.assetFamily?.code ? `${group.assetFamily.code} - ` : ''}{group.assetFamily?.name || '-'} / {group.familyModel?.name || '-'}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {group.steps?.length || 0} etapa(s)
                      </span>
                    </button>
                    {isOpen && (
                      <div className="bg-white p-3">
                        {(group.steps || []).length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Sem etapas configuradas.</p>
                        ) : (
                          <ol className="space-y-1">
                            {(group.steps || []).map(step => (
                              <li key={step.id} className="flex items-start gap-2 text-sm text-foreground">
                                <span className="text-xs text-muted-foreground min-w-[22px]">
                                  {String(step.order + 1).padStart(2, '0')}
                                </span>
                                <span className="flex-1">{step.genericStep?.name || '-'}</span>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    )}
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
