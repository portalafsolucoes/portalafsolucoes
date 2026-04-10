'use client'

import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'

interface StandardAssetCharacteristic {
  characteristicId: string
  value: string | null
  unit: string | null
  characteristic?: {
    id: string
    name: string
    unit?: string | null
    infoType?: string
  } | null
}

interface StandardAsset {
  id: string
  familyId: string
  family?: { id: string; code: string; name: string }
  name: string | null
  costCenterCode: string | null
  costCenterName: string | null
  shiftCode: string | null
  workCenterCode: string | null
  workCenterName: string | null
  supplierCode: string | null
  supplierStore: string | null
  modelType: string | null
  manufacturer: string | null
  modelName: string | null
  serialNumber: string | null
  warehouse: string | null
  priority: string | null
  hourlyCost: number | null
  hasCounter: boolean
  assetMovement: string | null
  trackingPeriod: string | null
  unitOfMeasure: string | null
  imageUrl: string | null
  counterType: string | null
  coupling: string | null
  annualCoupValue: number | null
  createdAt: string
  characteristics?: StandardAssetCharacteristic[]
}

interface StandardAssetDetailPanelProps {
  item: StandardAsset
  onClose: () => void
  onEdit: (item: StandardAsset) => void
  onDelete: (id: string) => void
}

const priorityLabels: Record<string, string> = {
  AAA: 'AAA - Altíssima',
  AA: 'AA - Muito Alta',
  A: 'A - Alta',
  B: 'B - Média',
  C: 'C - Baixa',
  ZZZ: 'ZZZ - Sem prioridade',
}

export function StandardAssetDetailPanel({ item, onClose, onEdit, onDelete }: StandardAssetDetailPanelProps) {
  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-foreground">
              {item.name || item.family?.name || 'Bem Padrão'}
            </h2>
            <button
              onClick={onClose}
              className="ml-auto p-1 hover:bg-muted rounded transition-colors"
            >
              <Icon name="close" className="text-xl text-muted-foreground" />
            </button>
          </div>
          {item.family && (
            <p className="text-sm text-muted-foreground">
              {item.family.code} - {item.family.name}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Ações */}
        <div className="p-4 border-b border-border space-y-2">
          <button
            onClick={() => onEdit(item)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-[4px] hover:bg-primary-graphite transition-colors"
          >
            <Icon name="edit" className="text-base" />
            Editar
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-danger text-white rounded-[4px] hover:bg-primary-graphite transition-colors"
          >
            <Icon name="delete" className="text-base" />
            Excluir
          </button>
        </div>

        {/* Localização e Organização */}
        {(item.costCenterCode || item.shiftCode || item.workCenterCode || item.warehouse) && (
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3">Localização e Organização</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {item.costCenterCode && (
                <div>
                  <p className="text-xs text-muted-foreground">Centro de Custo</p>
                  <p className="text-sm text-foreground">{item.costCenterCode}{item.costCenterName ? ` - ${item.costCenterName}` : ''}</p>
                </div>
              )}
              {item.shiftCode && (
                <div>
                  <p className="text-xs text-muted-foreground">Turno</p>
                  <p className="text-sm text-foreground">{item.shiftCode}</p>
                </div>
              )}
              {item.workCenterCode && (
                <div>
                  <p className="text-xs text-muted-foreground">Centro de Trabalho</p>
                  <p className="text-sm text-foreground">{item.workCenterCode}{item.workCenterName ? ` - ${item.workCenterName}` : ''}</p>
                </div>
              )}
              {item.warehouse && (
                <div>
                  <p className="text-xs text-muted-foreground">Estoque</p>
                  <p className="text-sm text-foreground">{item.warehouse}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fornecedor e Modelo */}
        {(item.supplierCode || item.modelType || item.manufacturer || item.modelName || item.serialNumber) && (
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3">Fornecedor e Modelo</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {item.supplierCode && (
                <div>
                  <p className="text-xs text-muted-foreground">Fornecedor</p>
                  <p className="text-sm text-foreground">{item.supplierCode}{item.supplierStore ? ` / ${item.supplierStore}` : ''}</p>
                </div>
              )}
              {item.modelType && (
                <div>
                  <p className="text-xs text-muted-foreground">Tipo Modelo</p>
                  <p className="text-sm text-foreground">{item.modelType}</p>
                </div>
              )}
              {item.manufacturer && (
                <div>
                  <p className="text-xs text-muted-foreground">Fabricante</p>
                  <p className="text-sm text-foreground">{item.manufacturer}</p>
                </div>
              )}
              {item.modelName && (
                <div>
                  <p className="text-xs text-muted-foreground">Modelo</p>
                  <p className="text-sm text-foreground">{item.modelName}</p>
                </div>
              )}
              {item.serialNumber && (
                <div>
                  <p className="text-xs text-muted-foreground">Série</p>
                  <p className="text-sm text-foreground font-mono">{item.serialNumber}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Operação */}
        {(item.priority || item.hourlyCost || item.assetMovement || item.coupling) && (
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3">Operação</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {item.priority && (
                <div>
                  <p className="text-xs text-muted-foreground">Prioridade</p>
                  <p className="text-sm text-foreground">{priorityLabels[item.priority] || item.priority}</p>
                </div>
              )}
              {item.hourlyCost != null && item.hourlyCost > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Custo Hora</p>
                  <p className="text-sm text-foreground">R$ {item.hourlyCost.toFixed(2)}</p>
                </div>
              )}
              {item.assetMovement && (
                <div>
                  <p className="text-xs text-muted-foreground">Movim. Bem</p>
                  <p className="text-sm text-foreground">{item.assetMovement}</p>
                </div>
              )}
              {item.trackingPeriod && (
                <div>
                  <p className="text-xs text-muted-foreground">Per. Acompanhamento</p>
                  <p className="text-sm text-foreground">{item.trackingPeriod}</p>
                </div>
              )}
              {item.unitOfMeasure && (
                <div>
                  <p className="text-xs text-muted-foreground">Unid. Medida</p>
                  <p className="text-sm text-foreground">{item.unitOfMeasure}</p>
                </div>
              )}
              {item.coupling && (
                <div>
                  <p className="text-xs text-muted-foreground">Acoplamento</p>
                  <p className="text-sm text-foreground">{item.coupling}</p>
                </div>
              )}
              {item.annualCoupValue != null && item.annualCoupValue > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Val. Ac. Ano</p>
                  <p className="text-sm text-foreground">R$ {item.annualCoupValue.toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contador */}
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">Contador</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Tem Contador</p>
              <p className="text-sm text-foreground">{item.hasCounter ? 'Sim' : 'Não'}</p>
            </div>
            {item.hasCounter && item.counterType && (
              <div>
                <p className="text-xs text-muted-foreground">Tipo do Contador</p>
                <p className="text-sm text-foreground">{item.counterType}</p>
              </div>
            )}
          </div>
        </div>

        {/* Características */}
        {item.characteristics && item.characteristics.length > 0 && (
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3">Características</h3>
            <div className="space-y-2">
              {item.characteristics.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-secondary rounded-[4px]">
                  <span className="text-sm text-foreground font-medium">
                    {c.characteristic?.name || c.characteristicId}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {c.value}{c.unit ? ` ${c.unit}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Imagem */}
        {item.imageUrl && (
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground mb-2">Imagem</h3>
            <div className="relative w-full h-48 bg-muted rounded-[4px] overflow-hidden">
              <img
                src={item.imageUrl}
                alt={item.name || 'Bem Padrão'}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
