'use client'

import { Modal } from '../ui/Modal'
import { X, Edit, Image as ImageIcon, FileText, Download, Calendar, MapPin, User, Package, QrCode as QrIcon, DollarSign, Maximize2, Wrench, CheckCircle, Trash2, Paperclip, Box } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { QRCodeSVG } from 'qrcode.react'

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

interface AssetDetailModalProps {
  isOpen: boolean
  onClose: () => void
  asset: Asset
  onEdit: (asset: Asset) => void
  onDelete: (assetId: string) => void
  workOrders?: WorkOrder[]
  inPage?: boolean
}

export function AssetDetailModal({ isOpen, onClose, asset, onEdit, onDelete, workOrders = [], inPage = false }: AssetDetailModalProps) {
  const getStatusBadge = (status: string) => {
    const colors = {
      OPERATIONAL: 'bg-success-light text-success-light-foreground',
      DOWN: 'bg-danger-light text-danger-light-foreground',
      MAINTENANCE: 'bg-warning-light text-warning-light-foreground'
    }
    return colors[status as keyof typeof colors] || 'bg-muted text-foreground'
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
    <Modal isOpen={isOpen} onClose={onClose} size="xl" hideHeader inPage={inPage}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b px-4 md:px-6 pt-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Box className="w-6 h-6 text-primary" />
              <h2 className="text-lg md:text-2xl font-bold text-foreground">{asset.name}</h2>
            </div>
            <div className="flex gap-2">
              <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${getStatusBadge(asset.status)}`}>
                {getStatusText(asset.status)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(asset)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Editar"
            >
              <Edit className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => onDelete(asset.id)}
              className="p-2 hover:bg-danger-light rounded-lg transition-colors"
              title="Excluir"
            >
              <Trash2 className="w-5 h-5 text-danger" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Imagem do Ativo */}
          {asset.image && (
            <div className="p-4 md:p-6 border-b border-border">
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
          <div className="p-4 md:p-6 border-b border-border">
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

          {/* QR Code */}
          <div className="p-4 md:p-6 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3">QR Code do Ativo</h3>
            <div className="flex flex-col items-center bg-secondary rounded-lg p-4">
              <QRCodeSVG 
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/assets?id=${asset.id}`}
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
            <div className="p-4 md:p-6 border-b border-border">
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
          <div className="p-4 md:p-6">
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
        </div>
      </div>
    </Modal>
  )
}
