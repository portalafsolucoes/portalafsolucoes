'use client'

import { useState } from 'react'
import { X, Edit, Image as ImageIcon, FileText, Download, Calendar, MapPin, User, Package, QrCode as QrIcon, DollarSign, Maximize2, Wrench, CheckCircle, Trash2, Paperclip, Activity, History, FolderTree } from 'lucide-react'
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
      OPERATIONAL: 'bg-success-light text-success-light-foreground border-gray-200',
      DOWN: 'bg-danger-light text-danger-light-foreground border-gray-200',
      MAINTENANCE: 'bg-warning-light text-warning-light-foreground border-gray-200'
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
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xl font-bold text-foreground">{asset.name}</h2>
            <button
              onClick={onClose}
              className="ml-auto p-1 hover:bg-muted rounded transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
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
              <Package className="w-4 h-4" />
              Detalhes
            </TabsTrigger>
            <TabsTrigger value="attachments" className="flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              Anexos
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex-1 overflow-y-auto mt-0">
            {/* Ações */}
            <div className="p-4 border-b border-border space-y-2">
              <button 
                onClick={() => onEdit(asset)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Editar Ativo
              </button>
              <button 
                onClick={() => onDelete(asset.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-danger text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Excluir Ativo
              </button>
            </div>

        {/* Imagem do Ativo */}
        {asset.image && (
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground mb-2">Imagem Principal</h3>
            <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden">
              <img 
                src={asset.image} 
                alt={asset.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Informações Básicas */}
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">Informações</h3>
          
          {asset.description && (
            <div className="mb-3">
              <p className="text-sm text-muted-foreground">{asset.description}</p>
            </div>
          )}

          <div className="space-y-2">
            {asset.location && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Localização</p>
                  <p className="text-sm text-foreground">{asset.location.name}</p>
                </div>
              </div>
            )}

            {asset.category && (
              <div className="flex items-start gap-2">
                <Package className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Categoria</p>
                  <p className="text-sm text-foreground">{asset.category.name}</p>
                </div>
              </div>
            )}

            {asset.primaryUser && (
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Responsável</p>
                  <p className="text-sm text-foreground">
                    {asset.primaryUser.firstName} {asset.primaryUser.lastName}
                  </p>
                </div>
              </div>
            )}

            {asset.barCode && (
              <div className="flex items-start gap-2">
                <QrIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Código de Barras</p>
                  <p className="text-sm text-foreground font-mono">{asset.barCode}</p>
                </div>
              </div>
            )}

            {asset.acquisitionCost && (
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Custo de Aquisição</p>
                  <p className="text-sm text-foreground">{formatCurrency(asset.acquisitionCost)}</p>
                </div>
              </div>
            )}

            {asset.area && (
              <div className="flex items-start gap-2">
                <Maximize2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Área</p>
                  <p className="text-sm text-foreground">{asset.area} m²</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Criado em</p>
                <p className="text-sm text-foreground">{formatDate(asset.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Matriz GUT - Criticidade */}
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Matriz GUT (Criticidade)
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {/* Gravidade */}
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-600 font-medium mb-1">Gravidade</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`w-3 h-3 rounded ${
                      n <= (asset.gutGravity || 1) ? 'bg-gray-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
                <span className="ml-1 font-bold text-gray-700">{asset.gutGravity || 1}</span>
              </div>
            </div>
            {/* Urgência */}
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-600 font-medium mb-1">Urgência</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`w-3 h-3 rounded ${
                      n <= (asset.gutUrgency || 1) ? 'bg-gray-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
                <span className="ml-1 font-bold text-gray-700">{asset.gutUrgency || 1}</span>
              </div>
            </div>
            {/* Tendência */}
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-600 font-medium mb-1">Tendência</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`w-3 h-3 rounded ${
                      n <= (asset.gutTendency || 1) ? 'bg-gray-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
                <span className="ml-1 font-bold text-gray-700">{asset.gutTendency || 1}</span>
              </div>
            </div>
          </div>
          {/* Score Total */}
          <div className="mt-3 p-2 bg-muted rounded-lg flex items-center justify-between">
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
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">QR Code do Ativo</h3>
          <div className="flex flex-col items-center bg-secondary rounded-lg p-4">
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
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              Arquivos Anexos ({asset.files.length})
            </h3>
            <div className="space-y-2">
              {asset.files.map((file) => (
                <a
                  key={file.id}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 bg-secondary rounded border border-border hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground truncate">{file.name}</span>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Histórico de Ordens de Serviço */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Histórico de OS
          </h3>
          
          {workOrders.length > 0 ? (
            <div className="space-y-2">
              {workOrders.slice(0, 5).map((wo) => (
                <div key={wo.id} className="p-2 bg-secondary rounded border border-border">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-medium text-foreground">{wo.title}</p>
                    {wo.status === 'COMPLETED' && (
                      <CheckCircle className="w-4 h-4 text-success" />
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
          <div className="p-4 border-t border-border">
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
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground flex-1 truncate">{file.name}</span>
                  <Download className="w-4 h-4 text-muted-foreground" />
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
