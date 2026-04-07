'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { formatDate, formatCurrency } from '@/lib/utils'
import { QRCodeSVG } from 'qrcode.react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import AssetAttachments from './AssetAttachments'
import AssetTimeline from './AssetTimelineEnhanced'

interface Asset {
  id: string
  name: string
  status: string
  barCode?: string
  description?: string
  acquisitionCost?: number
  area?: number
  image?: string | null
  location?: { id: string; name: string }
  category?: { id: string; name: string }
  primaryUser?: { firstName: string; lastName: string }
  files?: { id: string; name: string; url: string; type?: string; size?: number }[]
  gutGravity?: number
  gutUrgency?: number
  gutTendency?: number
  createdAt: string
  updatedAt: string
  // Campos TOTVS
  protheusCode?: string
  tag?: string
  fixedAssetCode?: string
  assetPlate?: string
  assetCategoryType?: string
  assetPriority?: string
  ownershipType?: string
  manufacturer?: string
  modelName?: string
  serialNumber?: string
  hasStructure?: boolean
  hasCounter?: boolean
  counterType?: string
  counterPosition?: number
  counterLimit?: number
  dailyVariation?: number
  purchaseValue?: number
  hourlyCost?: number
  purchaseDate?: string
  installationDate?: string
  supplierCode?: string
  supplierStore?: string
  warrantyPeriod?: number
  warrantyUnit?: string
  warrantyDate?: string
  maintenanceStatus?: string
  deactivationDate?: string
  deactivationReason?: string
  warehouse?: string
  shiftCode?: string
  lifeValue?: number
  lifeUnit?: string
}

interface WorkOrder {
  id: string
  title: string
  status: string
  priority: string
  createdAt: string
  completedAt?: string
}

interface AssetDetailPanelProps {
  asset: Asset
  onClose: () => void
  onEdit: (asset: Asset) => void
  onDelete: (assetId: string) => void
  workOrders?: WorkOrder[]
}

export function AssetDetailPanel({ asset, onClose, onEdit, onDelete, workOrders = [] }: AssetDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('details')
  
  const getStatusBadge = (status: string) => {
    const colors = {
      OPERATIONAL: 'bg-success-light text-success-light-foreground border-border',
      DOWN: 'bg-danger-light text-danger-light-foreground border-border',
      MAINTENANCE: 'bg-warning-light text-warning-light-foreground border-border'
    }
    return colors[status as keyof typeof colors] || 'bg-muted text-foreground border-border'
  }

  const getStatusText = (status: string) => {
    const texts = {
      OPERATIONAL: 'Operacional',
      DOWN: 'Parado',
      MAINTENANCE: 'Em Manutenção'
    }
    return texts[status as keyof typeof texts] || status
  }

  return (
    <div className="h-full flex flex-col bg-card border-l border-on-surface-variant/10">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-on-surface-variant/10">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xl font-bold text-foreground">{asset.name}</h2>
            <button
              onClick={onClose}
              className="ml-auto p-1 hover:bg-muted rounded transition-colors"
            >
              <Icon name="close" className="text-xl text-muted-foreground" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusBadge(asset.status)}`}>
              {getStatusText(asset.status)}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="w-full justify-start border-b rounded-none px-4">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Icon name="inventory_2" className="text-base" />
              Detalhes
            </TabsTrigger>
            <TabsTrigger value="attachments" className="flex items-center gap-2">
              <Icon name="attach_file" className="text-base" />
              Anexos
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Icon name="history" className="text-base" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex-1 overflow-y-auto mt-0">
            {/* Ações */}
            <div className="p-4 border-b border-on-surface-variant/10 space-y-2">
              <button 
                onClick={() => onEdit(asset)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-[4px] hover:bg-primary-graphite transition-colors"
              >
                <Icon name="edit" className="text-base" />
                Editar Ativo
              </button>
              <button 
                onClick={() => onDelete(asset.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-danger text-white rounded-[4px] hover:bg-primary-graphite transition-colors"
              >
                <Icon name="delete" className="text-base" />
                Excluir Ativo
              </button>
            </div>

        {/* Imagem do Ativo */}
        {asset.image && (
          <div className="p-4 border-b border-on-surface-variant/10">
            <h3 className="text-sm font-semibold text-foreground mb-2">Imagem Principal</h3>
            <div className="relative w-full h-48 bg-muted rounded-[4px] overflow-hidden">
              <img 
                src={asset.image} 
                alt={asset.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Identificação */}
        <div className="p-4 border-b border-on-surface-variant/10">
          <h3 className="text-sm font-semibold text-foreground mb-3">Identificação</h3>
          {asset.description && (
            <div className="mb-3">
              <p className="text-sm text-muted-foreground">{asset.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {asset.protheusCode && (
              <div>
                <p className="text-xs text-muted-foreground">Código do Bem</p>
                <p className="text-sm text-foreground font-mono font-semibold">{asset.protheusCode}</p>
              </div>
            )}
            {asset.tag && (
              <div>
                <p className="text-xs text-muted-foreground">Tag</p>
                <p className="text-sm text-foreground font-mono">{asset.tag}</p>
              </div>
            )}
            {asset.barCode && (
              <div>
                <p className="text-xs text-muted-foreground">Código de Barras</p>
                <p className="text-sm text-foreground font-mono">{asset.barCode}</p>
              </div>
            )}
            {asset.fixedAssetCode && (
              <div>
                <p className="text-xs text-muted-foreground">Cód. Imobilizado</p>
                <p className="text-sm text-foreground">{asset.fixedAssetCode}</p>
              </div>
            )}
            {asset.assetPlate && (
              <div>
                <p className="text-xs text-muted-foreground">Chapa Imobilizado</p>
                <p className="text-sm text-foreground">{asset.assetPlate}</p>
              </div>
            )}
            {asset.assetCategoryType && (
              <div>
                <p className="text-xs text-muted-foreground">Categoria</p>
                <p className="text-sm text-foreground">{asset.assetCategoryType}</p>
              </div>
            )}
            {asset.assetPriority && (
              <div>
                <p className="text-xs text-muted-foreground">Prioridade</p>
                <p className="text-sm text-foreground">{asset.assetPriority}</p>
              </div>
            )}
            {asset.ownershipType && (
              <div>
                <p className="text-xs text-muted-foreground">Proprietário</p>
                <p className="text-sm text-foreground">{asset.ownershipType === 'PROPRIO' ? 'Próprio' : 'Terceiro'}</p>
              </div>
            )}
            {asset.maintenanceStatus && (
              <div>
                <p className="text-xs text-muted-foreground">Sit. Manutenção</p>
                <p className="text-sm text-foreground">{asset.maintenanceStatus === 'ACTIVE' ? 'Ativo' : 'Inativo'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Localização e Organização */}
        <div className="p-4 border-b border-on-surface-variant/10">
          <h3 className="text-sm font-semibold text-foreground mb-3">Localização</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {asset.location && (
              <div>
                <p className="text-xs text-muted-foreground">Localização</p>
                <p className="text-sm text-foreground">{asset.location.name}</p>
              </div>
            )}
            {asset.warehouse && (
              <div>
                <p className="text-xs text-muted-foreground">Almoxarifado</p>
                <p className="text-sm text-foreground">{asset.warehouse}</p>
              </div>
            )}
            {asset.shiftCode && (
              <div>
                <p className="text-xs text-muted-foreground">Turno</p>
                <p className="text-sm text-foreground">{asset.shiftCode}</p>
              </div>
            )}
            {asset.primaryUser && (
              <div>
                <p className="text-xs text-muted-foreground">Responsável</p>
                <p className="text-sm text-foreground">{asset.primaryUser.firstName} {asset.primaryUser.lastName}</p>
              </div>
            )}
          </div>
        </div>

        {/* Dados Técnicos */}
        {(asset.manufacturer || asset.modelName || asset.serialNumber || asset.hasCounter) && (
        <div className="p-4 border-b border-on-surface-variant/10">
          <h3 className="text-sm font-semibold text-foreground mb-3">Dados Técnicos</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {asset.manufacturer && (
              <div>
                <p className="text-xs text-muted-foreground">Fabricante</p>
                <p className="text-sm text-foreground">{asset.manufacturer}</p>
              </div>
            )}
            {asset.modelName && (
              <div>
                <p className="text-xs text-muted-foreground">Modelo</p>
                <p className="text-sm text-foreground">{asset.modelName}</p>
              </div>
            )}
            {asset.serialNumber && (
              <div>
                <p className="text-xs text-muted-foreground">N. Série</p>
                <p className="text-sm text-foreground font-mono">{asset.serialNumber}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Estrutura</p>
              <p className="text-sm text-foreground">{asset.hasStructure ? 'Sim' : 'Não'}</p>
            </div>
            {asset.hasCounter && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Contador</p>
                  <p className="text-sm text-foreground">{asset.counterType || 'Sim'}</p>
                </div>
                {asset.counterPosition != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Posição Contador</p>
                    <p className="text-sm text-foreground">{asset.counterPosition}</p>
                  </div>
                )}
              </>
            )}
            {asset.lifeValue != null && (
              <div>
                <p className="text-xs text-muted-foreground">Vida Útil</p>
                <p className="text-sm text-foreground">{asset.lifeValue} {asset.lifeUnit || ''}</p>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Financeiro */}
        {(asset.acquisitionCost || asset.purchaseValue || asset.hourlyCost || asset.purchaseDate) && (
        <div className="p-4 border-b border-on-surface-variant/10">
          <h3 className="text-sm font-semibold text-foreground mb-3">Financeiro e Aquisição</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {asset.purchaseValue != null && (
              <div>
                <p className="text-xs text-muted-foreground">Valor de Compra</p>
                <p className="text-sm text-foreground">{formatCurrency(asset.purchaseValue)}</p>
              </div>
            )}
            {asset.acquisitionCost != null && (
              <div>
                <p className="text-xs text-muted-foreground">Custo de Aquisição</p>
                <p className="text-sm text-foreground">{formatCurrency(asset.acquisitionCost)}</p>
              </div>
            )}
            {asset.hourlyCost != null && asset.hourlyCost > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Custo Hora</p>
                <p className="text-sm text-foreground">{formatCurrency(asset.hourlyCost)}</p>
              </div>
            )}
            {asset.purchaseDate && (
              <div>
                <p className="text-xs text-muted-foreground">Data de Compra</p>
                <p className="text-sm text-foreground">{formatDate(asset.purchaseDate)}</p>
              </div>
            )}
            {asset.installationDate && (
              <div>
                <p className="text-xs text-muted-foreground">Data de Instalação</p>
                <p className="text-sm text-foreground">{formatDate(asset.installationDate)}</p>
              </div>
            )}
            {asset.supplierCode && (
              <div>
                <p className="text-xs text-muted-foreground">Fornecedor</p>
                <p className="text-sm text-foreground">{asset.supplierCode}{asset.supplierStore ? ` / ${asset.supplierStore}` : ''}</p>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Garantia */}
        {(asset.warrantyPeriod || asset.warrantyDate) && (
        <div className="p-4 border-b border-on-surface-variant/10">
          <h3 className="text-sm font-semibold text-foreground mb-3">Garantia</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {asset.warrantyPeriod != null && (
              <div>
                <p className="text-xs text-muted-foreground">Prazo</p>
                <p className="text-sm text-foreground">{asset.warrantyPeriod} {asset.warrantyUnit || ''}</p>
              </div>
            )}
            {asset.warrantyDate && (
              <div>
                <p className="text-xs text-muted-foreground">Data Garantia</p>
                <p className="text-sm text-foreground">{formatDate(asset.warrantyDate)}</p>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Datas */}
        <div className="p-4 border-b border-on-surface-variant/10">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Criado em</p>
              <p className="text-sm text-foreground">{formatDate(asset.createdAt)}</p>
            </div>
            {asset.deactivationDate && (
              <div>
                <p className="text-xs text-muted-foreground">Data de Baixa</p>
                <p className="text-sm text-foreground">{formatDate(asset.deactivationDate)}</p>
              </div>
            )}
            {asset.deactivationReason && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Motivo da Baixa</p>
                <p className="text-sm text-foreground">{asset.deactivationReason}</p>
              </div>
            )}
          </div>
        </div>

        {/* Matriz GUT - Criticidade */}
        <div className="p-4 border-b border-on-surface-variant/10">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Icon name="monitoring" className="text-base text-primary" />
            Matriz GUT (Criticidade)
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {/* Gravidade */}
            <div className="p-2 bg-surface rounded-[4px]">
              <p className="text-xs text-muted-foreground font-medium mb-1">Gravidade</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`w-3 h-3 rounded ${
                      n <= (asset.gutGravity || 1) ? 'bg-on-surface-variant' : 'bg-surface-high'
                    }`}
                  />
                ))}
                <span className="ml-1 font-bold text-foreground">{asset.gutGravity || 1}</span>
              </div>
            </div>
            {/* Urgência */}
            <div className="p-2 bg-surface rounded-[4px]">
              <p className="text-xs text-muted-foreground font-medium mb-1">Urgência</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`w-3 h-3 rounded ${
                      n <= (asset.gutUrgency || 1) ? 'bg-on-surface-variant' : 'bg-surface-high'
                    }`}
                  />
                ))}
                <span className="ml-1 font-bold text-foreground">{asset.gutUrgency || 1}</span>
              </div>
            </div>
            {/* Tendência */}
            <div className="p-2 bg-surface rounded-[4px]">
              <p className="text-xs text-muted-foreground font-medium mb-1">Tendência</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`w-3 h-3 rounded ${
                      n <= (asset.gutTendency || 1) ? 'bg-on-surface-variant' : 'bg-surface-high'
                    }`}
                  />
                ))}
                <span className="ml-1 font-bold text-foreground">{asset.gutTendency || 1}</span>
              </div>
            </div>
          </div>
          {/* Score Total */}
          <div className="mt-3 p-2 bg-muted rounded-[4px] flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Score GUT:</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground">
                {(asset.gutGravity || 1) * (asset.gutUrgency || 1) * (asset.gutTendency || 1)}
              </span>
              <span className="text-xs text-muted-foreground">
                ({asset.gutGravity || 1}×{asset.gutUrgency || 1}×{asset.gutTendency || 1})
              </span>
            </div>
          </div>
        </div>

        {/* QR Code */}
        <div className="p-4 border-b border-on-surface-variant/10">
          <h3 className="text-sm font-semibold text-foreground mb-3">QR Code do Ativo</h3>
          <div className="flex flex-col items-center bg-secondary rounded-[4px] p-4">
            <QRCodeSVG 
              value={`${window.location.origin}/assets?id=${asset.id}`}
              size={150}
              level="H"
              includeMargin
            />
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Escaneie para acessar este ativo
            </p>
          </div>
        </div>

        {/* Arquivos Anexos */}
        {asset.files && asset.files.length > 0 && (
          <div className="p-4 border-b border-on-surface-variant/10">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Icon name="attach_file" className="text-base" />
              Arquivos Anexos ({asset.files.length})
            </h3>
            <div className="space-y-2">
              {asset.files.map((file) => (
                <a
                  key={file.id}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 bg-secondary rounded hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Icon name="description" className="text-base text-muted-foreground" />
                    <span className="text-sm text-foreground truncate">{file.name}</span>
                  </div>
                  <Icon name="download" className="text-base text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Histórico de Ordens de Serviço */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Icon name="construction" className="text-base" />
            Histórico de OS
          </h3>
          
          {workOrders.length > 0 ? (
            <div className="space-y-2">
              {workOrders.slice(0, 5).map((wo) => (
                <div key={wo.id} className="p-2 bg-secondary rounded">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-medium text-foreground">{wo.title}</p>
                    {wo.status === 'COMPLETED' && (
                      <Icon name="check_circle" className="text-base text-success" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(wo.createdAt)}</p>
                </div>
              ))}
              {workOrders.length > 5 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  +{workOrders.length - 5} ordens de serviço
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma OS registrada
            </p>
          )}
        </div>

        {/* Arquivos Anexados */}
        {asset.files && asset.files.length > 1 && (
          <div className="p-4 border-t border-on-surface-variant/10">
            <h3 className="text-sm font-semibold text-foreground mb-3">Documentos</h3>
            <div className="space-y-2">
              {asset.files.slice(1).map((file, index) => (
                <a
                  key={index}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-secondary rounded hover:bg-muted transition-colors"
                >
                  <Icon name="description" className="text-base text-muted-foreground" />
                  <span className="text-sm text-foreground flex-1 truncate">{file.name}</span>
                  <Icon name="download" className="text-base text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>
        )}
          </TabsContent>

          <TabsContent value="attachments" className="flex-1 overflow-y-auto mt-0 p-4">
            <AssetAttachments assetId={asset.id} />
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-y-auto mt-0 p-4">
            <AssetTimeline assetId={asset.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
