'use client'

import { useState, useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import { formatDate, formatCurrency } from '@/lib/utils'
import { QRCodeSVG } from 'qrcode.react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { PanelActionButtons } from '@/components/ui/PanelActionButtons'
import AssetAttachments from './AssetAttachments'
import AssetTimeline from './AssetTimelineEnhanced'

interface Asset {
  id: string
  name: string
  status: string
  barCode?: string
  description?: string
  acquisitionCost?: number
  area?: string
  areaId?: string | null
  assetArea?: { id: string; name: string } | null
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
  parentAsset?: {
    id: string
    name: string
    protheusCode?: string
    parentAsset?: { id: string; name: string; protheusCode?: string } | null
  } | null
  childAssets?: { id: string; name: string; protheusCode?: string }[]
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

interface OpenWorkOrder {
  id: string
  title: string
  status: string
  priority: string
  type?: string
  internalId?: string
  createdAt: string
  assignedTo?: { firstName: string; lastName: string } | null
}

interface OpenRequest {
  id: string
  requestNumber?: string
  title: string
  status: string
  priority: string
  createdAt: string
  createdBy?: { firstName: string; lastName: string } | null
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
  const [openWorkOrders, setOpenWorkOrders] = useState<OpenWorkOrder[]>([])
  const [openRequests, setOpenRequests] = useState<OpenRequest[]>([])
  const [loadingWOs, setLoadingWOs] = useState(false)
  const [loadingSSs, setLoadingSSs] = useState(false)

  // Fetch open work orders for this asset
  useEffect(() => {
    if (activeTab !== 'open-wo') return
    setLoadingWOs(true)
    fetch(`/api/work-orders?assetId=${asset.id}&limit=100`)
      .then(res => res.json())
      .then(result => {
        const openStatuses = ['PENDING', 'RELEASED', 'IN_PROGRESS', 'ON_HOLD']
        const items = (result.data || []).filter((wo: OpenWorkOrder) => openStatuses.includes(wo.status))
        setOpenWorkOrders(items)
      })
      .catch(() => setOpenWorkOrders([]))
      .finally(() => setLoadingWOs(false))
  }, [activeTab, asset.id])

  // Fetch open requests for this asset
  useEffect(() => {
    if (activeTab !== 'open-ss') return
    setLoadingSSs(true)
    fetch(`/api/requests?assetId=${asset.id}&limit=100`)
      .then(res => res.json())
      .then(result => {
        const openStatuses = ['PENDING', 'APPROVED']
        const items = (result.data || []).filter((r: OpenRequest) => openStatuses.includes(r.status))
        setOpenRequests(items)
      })
      .catch(() => setOpenRequests([]))
      .finally(() => setLoadingSSs(false))
  }, [activeTab, asset.id])

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

  const getWOStatusText = (status: string) => {
    const texts: Record<string, string> = {
      PENDING: 'Pendente', RELEASED: 'Liberada', IN_PROGRESS: 'Em Progresso',
      ON_HOLD: 'Em Espera', COMPLETE: 'Concluída'
    }
    return texts[status] || status
  }

  const getWOStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-gray-100 text-gray-700',
      RELEASED: 'bg-blue-100 text-blue-700',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
      ON_HOLD: 'bg-orange-100 text-orange-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getSSStatusText = (status: string) => {
    const texts: Record<string, string> = {
      PENDING: 'Pendente', APPROVED: 'Aprovada', REJECTED: 'Rejeitada',
      CANCELLED: 'Cancelada', COMPLETED: 'Concluída'
    }
    return texts[status] || status
  }

  const getSSStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-gray-100 text-gray-700',
      APPROVED: 'bg-green-100 text-green-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getPriorityText = (priority: string) => {
    const texts: Record<string, string> = {
      NONE: 'Nenhuma', LOW: 'Baixa', MEDIUM: 'Média',
      HIGH: 'Alta', CRITICAL: 'Crítica'
    }
    return texts[priority] || priority
  }

  return (
    <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-lg font-black text-gray-900">{asset.name}</h2>
            <button
              onClick={onClose}
              className="ml-auto flex items-center justify-center p-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-md text-gray-500 shadow-sm transition-colors"
            >
              <Icon name="close" className="text-xl" />
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
            <TabsTrigger value="open-wo" className="flex items-center gap-2">
              <Icon name="assignment" className="text-base" />
              OSs em aberto
            </TabsTrigger>
            <TabsTrigger value="open-ss" className="flex items-center gap-2">
              <Icon name="description" className="text-base" />
              SSs em aberto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex-1 overflow-y-auto mt-0">
            {/* Ações */}
            <PanelActionButtons
              onEdit={() => onEdit(asset)}
              onDelete={() => onDelete(asset.id)}
            />

        {/* Imagem do Ativo */}
        {asset.image && (
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Imagem Principal</h3>
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
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Identificação</h3>
          {asset.description && (
            <div className="mb-3">
              <p className="text-sm text-muted-foreground">{asset.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {asset.protheusCode && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Código do Bem</p>
                <p className="text-sm text-foreground font-mono font-semibold">{asset.protheusCode}</p>
              </div>
            )}
            {asset.tag && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Tag</p>
                <p className="text-sm text-foreground font-mono">{asset.tag}</p>
              </div>
            )}
            {asset.barCode && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Código de Barras</p>
                <p className="text-sm text-foreground font-mono">{asset.barCode}</p>
              </div>
            )}
            {asset.fixedAssetCode && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Cód. Imobilizado</p>
                <p className="text-sm text-foreground">{asset.fixedAssetCode}</p>
              </div>
            )}
            {asset.assetPlate && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Chapa Imobilizado</p>
                <p className="text-sm text-foreground">{asset.assetPlate}</p>
              </div>
            )}
            {asset.assetCategoryType && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Categoria</p>
                <p className="text-sm text-foreground">{asset.assetCategoryType}</p>
              </div>
            )}
            {asset.assetPriority && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Prioridade</p>
                <p className="text-sm text-foreground">{asset.assetPriority}</p>
              </div>
            )}
            {asset.ownershipType && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Proprietário</p>
                <p className="text-sm text-foreground">{asset.ownershipType === 'PROPRIO' ? 'Próprio' : 'Terceiro'}</p>
              </div>
            )}
            {asset.parentAsset?.protheusCode && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Cód. Bem Pai</p>
                <p className="text-sm text-foreground font-mono font-semibold">{asset.parentAsset.protheusCode}</p>
              </div>
            )}
            {asset.maintenanceStatus && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Sit. Manutenção</p>
                <p className="text-sm text-foreground">{asset.maintenanceStatus === 'ACTIVE' ? 'Ativo' : 'Inativo'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Localização e Organização */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Localização</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {asset.location && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Localização</p>
                <p className="text-sm text-foreground">{asset.location.name}</p>
              </div>
            )}
            {asset.warehouse && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Almoxarifado</p>
                <p className="text-sm text-foreground">{asset.warehouse}</p>
              </div>
            )}
            {asset.shiftCode && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Turno</p>
                <p className="text-sm text-foreground">{asset.shiftCode}</p>
              </div>
            )}
            {asset.primaryUser && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Responsável</p>
                <p className="text-sm text-foreground">{asset.primaryUser.firstName} {asset.primaryUser.lastName}</p>
              </div>
            )}
          </div>
        </div>

        {/* Dados Técnicos */}
        {(asset.manufacturer || asset.modelName || asset.serialNumber || asset.hasCounter) && (
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Dados Técnicos</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {asset.manufacturer && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Fabricante</p>
                <p className="text-sm text-foreground">{asset.manufacturer}</p>
              </div>
            )}
            {asset.modelName && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Modelo</p>
                <p className="text-sm text-foreground">{asset.modelName}</p>
              </div>
            )}
            {asset.serialNumber && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">N. Série</p>
                <p className="text-sm text-foreground font-mono">{asset.serialNumber}</p>
              </div>
            )}
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Estrutura</p>
              <p className="text-sm text-foreground">{asset.hasStructure ? 'Sim' : 'Não'}</p>
            </div>
            {asset.hasCounter && (
              <>
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Contador</p>
                  <p className="text-sm text-foreground">{asset.counterType || 'Sim'}</p>
                </div>
                {asset.counterPosition != null && (
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Posição Contador</p>
                    <p className="text-sm text-foreground">{asset.counterPosition}</p>
                  </div>
                )}
              </>
            )}
            {asset.lifeValue != null && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Vida Útil</p>
                <p className="text-sm text-foreground">{asset.lifeValue} {asset.lifeUnit || ''}</p>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Financeiro */}
        {(asset.acquisitionCost || asset.purchaseValue || asset.hourlyCost || asset.purchaseDate) && (
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Financeiro e Aquisição</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {asset.purchaseValue != null && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Valor de Compra</p>
                <p className="text-sm text-foreground">{formatCurrency(asset.purchaseValue)}</p>
              </div>
            )}
            {asset.acquisitionCost != null && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Custo de Aquisição</p>
                <p className="text-sm text-foreground">{formatCurrency(asset.acquisitionCost)}</p>
              </div>
            )}
            {asset.hourlyCost != null && asset.hourlyCost > 0 && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Custo Hora</p>
                <p className="text-sm text-foreground">{formatCurrency(asset.hourlyCost)}</p>
              </div>
            )}
            {asset.purchaseDate && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Data de Compra</p>
                <p className="text-sm text-foreground">{formatDate(asset.purchaseDate)}</p>
              </div>
            )}
            {asset.installationDate && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Data de Instalação</p>
                <p className="text-sm text-foreground">{formatDate(asset.installationDate)}</p>
              </div>
            )}
            {asset.supplierCode && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Fornecedor</p>
                <p className="text-sm text-foreground">{asset.supplierCode}{asset.supplierStore ? ` / ${asset.supplierStore}` : ''}</p>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Garantia */}
        {(asset.warrantyPeriod || asset.warrantyDate) && (
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Garantia</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {asset.warrantyPeriod != null && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Prazo</p>
                <p className="text-sm text-foreground">{asset.warrantyPeriod} {asset.warrantyUnit || ''}</p>
              </div>
            )}
            {asset.warrantyDate && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Data Garantia</p>
                <p className="text-sm text-foreground">{formatDate(asset.warrantyDate)}</p>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Datas */}
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Criado em</p>
              <p className="text-sm text-foreground">{formatDate(asset.createdAt)}</p>
            </div>
            {asset.deactivationDate && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Data de Baixa</p>
                <p className="text-sm text-foreground">{formatDate(asset.deactivationDate)}</p>
              </div>
            )}
            {asset.deactivationReason && (
              <div className="col-span-2">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Motivo da Baixa</p>
                <p className="text-sm text-foreground">{asset.deactivationReason}</p>
              </div>
            )}
          </div>
        </div>

        {/* Matriz GUT - Criticidade */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
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
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">QR Code do Ativo</h3>
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
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
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
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
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
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">{formatDate(wo.createdAt)}</p>
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
          <div className="p-4 border-t border-border">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Documentos</h3>
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

          <TabsContent value="history" className="flex-1 overflow-y-auto mt-0">
            <AssetTimeline assetId={asset.id} embedded />
          </TabsContent>

          {/* OSs em aberto */}
          <TabsContent value="open-wo" className="flex-1 overflow-y-auto mt-0">
            {loadingWOs ? (
              <div className="flex items-center justify-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant" />
                <p className="ml-2 text-muted-foreground">Carregando...</p>
              </div>
            ) : openWorkOrders.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="assignment" className="text-5xl text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Nenhuma OS em aberto para este ativo</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {openWorkOrders.map((wo) => (
                  <div key={wo.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-medium text-foreground flex-1">{wo.title}</p>
                      <span className={`ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full ${getWOStatusColor(wo.status)}`}>
                        {getWOStatusText(wo.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {wo.internalId && <span className="font-mono">{wo.internalId}</span>}
                      <span>{getPriorityText(wo.priority)}</span>
                      {wo.type && <span>{wo.type === 'PREVENTIVE' ? 'Preventiva' : wo.type === 'CORRECTIVE' ? 'Corretiva' : wo.type === 'PREDICTIVE' ? 'Preditiva' : 'Reativa'}</span>}
                      <span>{formatDate(wo.createdAt)}</span>
                      {wo.assignedTo && <span>{wo.assignedTo.firstName} {wo.assignedTo.lastName}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* SSs em aberto */}
          <TabsContent value="open-ss" className="flex-1 overflow-y-auto mt-0">
            {loadingSSs ? (
              <div className="flex items-center justify-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant" />
                <p className="ml-2 text-muted-foreground">Carregando...</p>
              </div>
            ) : openRequests.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="description" className="text-5xl text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Nenhuma SS em aberto para este ativo</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {openRequests.map((req) => (
                  <div key={req.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-medium text-foreground flex-1">{req.title}</p>
                      <span className={`ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full ${getSSStatusColor(req.status)}`}>
                        {getSSStatusText(req.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {req.requestNumber && <span className="font-mono">{req.requestNumber}</span>}
                      <span>{getPriorityText(req.priority)}</span>
                      <span>{formatDate(req.createdAt)}</span>
                      {req.createdBy && <span>{req.createdBy.firstName} {req.createdBy.lastName}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
