'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Asset {
  id: string
  name: string
  description?: string
  status: string
  area?: number
  location?: { name: string; id: string }
  category?: { name: string; id: string }
  parentAssetId?: string | null
  protheusCode?: string
  tag?: string
  createdAt: string
  updatedAt: string
}

interface AssetTableProps {
  assets: Asset[]
  onSelectAsset: (asset: Asset) => void
  selectedAssetId?: string
  onEdit?: (asset: Asset) => void
  onDelete?: (assetId: string) => void
}

type SortField = 'name' | 'protheusCode' | 'status' | 'area' | 'createdAt'
type SortDirection = 'asc' | 'desc'

const statusConfig: Record<string, { label: string; icon: string; className: string }> = {
  OPERATIONAL: {
    label: 'Operacional',
    icon: 'check_circle',
    className: 'bg-surface-low text-foreground dark:bg-on-surface/30 dark:text-muted-foreground'
  },
  DOWN: {
    label: 'Parado',
    icon: 'cancel',
    className: 'bg-surface-low text-foreground dark:bg-on-surface/30 dark:text-muted-foreground'
  },
  IN_REPAIR: {
    label: 'Em Reparo',
    icon: 'construction',
    className: 'bg-surface-low text-foreground dark:bg-on-surface/30 dark:text-muted-foreground'
  },
  IN_OPERATION: {
    label: 'Em Operação',
    icon: 'check_circle',
    className: 'bg-surface-low text-foreground dark:bg-on-surface/30 dark:text-muted-foreground'
  },
  INACTIVE: {
    label: 'Inativo',
    icon: 'error',
    className: 'bg-surface-low text-foreground dark:bg-on-surface/30 dark:text-muted-foreground'
  },
}

export function AssetTable({ 
  assets, 
  onSelectAsset, 
  selectedAssetId,
  onEdit,
  onDelete 
}: AssetTableProps) {
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Ordenação
  const sortedAssets = [...assets].sort((a, b) => {
    let comparison = 0
    
    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'protheusCode':
        comparison = (a.protheusCode || '').localeCompare(b.protheusCode || '')
        break
      case 'status':
        comparison = a.status.localeCompare(b.status)
        break
      case 'area':
        comparison = (a.area || 0) - (b.area || 0)
        break
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
    }
    
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleSelectAll = () => {
    if (selectedIds.size === assets.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(assets.map(a => a.id)))
    }
  }

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <Icon name="expand_more" className="text-base text-muted-foreground opacity-0 group-hover:opacity-50" />
    }
    return sortDirection === 'asc'
      ? <Icon name="expand_less" className="text-base text-primary" />
      : <Icon name="expand_more" className="text-base text-primary" />
  }

  const getStatusInfo = (status: string) => {
    return statusConfig[status] || statusConfig.OPERATIONAL
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR })
    } catch {
      return '-'
    }
  }

  return (
    <div className="h-full flex flex-col bg-card min-h-0 overflow-hidden">
      {/* Barra de seleção em massa */}
      {selectedIds.size > 0 && (
        <div className="px-4 py-2 bg-primary/10 border-b border-on-surface-variant/10 flex items-center gap-4">
          <span className="text-sm font-medium text-primary">
            {selectedIds.size} ativo(s) selecionado(s)
          </span>
          <button 
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Limpar seleção
          </button>
        </div>
      )}

      {/* Tabela */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full">
          <thead className="sticky top-0 bg-secondary/80 backdrop-blur-sm z-10">
            <tr className="border-b border-border">
              {/* Checkbox */}
              <th className="w-12 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === assets.length && assets.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                />
              </th>
              
              {/* Código do Bem */}
              <th
                className="px-4 py-3 text-left cursor-pointer group"
                onClick={() => handleSort('protheusCode')}
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Código
                  <SortIcon field="protheusCode" />
                </div>
              </th>

              {/* Nome */}
              <th
                className="px-4 py-3 text-left cursor-pointer group"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Icon name="inventory_2" className="text-base" />
                  Nome do Ativo
                  <SortIcon field="name" />
                </div>
              </th>
              
              {/* Status */}
              <th 
                className="px-4 py-3 text-left cursor-pointer group"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Status
                  <SortIcon field="status" />
                </div>
              </th>
              
              {/* Área */}
              <th 
                className="px-4 py-3 text-left cursor-pointer group"
                onClick={() => handleSort('area')}
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Icon name="location_on" className="text-base" />
                  Área
                  <SortIcon field="area" />
                </div>
              </th>
              
              {/* Data de Criação */}
              <th 
                className="px-4 py-3 text-left cursor-pointer group"
                onClick={() => handleSort('createdAt')}
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Icon name="calendar_today" className="text-base" />
                  Criado em
                  <SortIcon field="createdAt" />
                </div>
              </th>
              
              {/* Ações */}
              <th className="w-20 px-4 py-3 text-center">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Ações
                </span>
              </th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-border">
            {sortedAssets.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Icon name="inventory_2" className="text-5xl opacity-20" />
                    <p className="text-sm">Nenhum ativo encontrado</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedAssets.map((asset) => {
                const statusInfo = getStatusInfo(asset.status)
                const isSelected = selectedIds.has(asset.id)
                const isActive = selectedAssetId === asset.id
                
                return (
                  <tr 
                    key={asset.id}
                    className={`
                      transition-colors cursor-pointer
                      ${isActive ? 'bg-primary/10' : 'hover:bg-muted/50'}
                      ${isSelected ? 'bg-primary/5' : ''}
                    `}
                    onClick={() => onSelectAsset(asset)}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectOne(asset.id)}
                        className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                      />
                    </td>
                    
                    {/* Código do Bem */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-foreground font-mono">
                        {asset.protheusCode || '-'}
                      </span>
                      {asset.tag && (
                        <span className="ml-1 text-xs text-muted-foreground">({asset.tag})</span>
                      )}
                    </td>

                    {/* Nome */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {asset.name}
                        </span>
                        {asset.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {asset.description}
                          </span>
                        )}
                      </div>
                    </td>
                    
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`
                        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                        ${statusInfo.className}
                      `}>
                        <Icon name={statusInfo.icon} className="text-sm" />
                        {statusInfo.label}
                      </span>
                    </td>
                    
                    {/* Área */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-foreground">
                        {asset.area || '-'}
                      </span>
                    </td>
                    
                    {/* Data de Criação */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(asset.createdAt)}
                      </span>
                    </td>
                    
                    {/* Ações */}
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === asset.id ? null : asset.id)}
                          className="p-1.5 rounded-[4px] hover:bg-muted transition-colors"
                        >
                          <Icon name="more_horiz" className="text-base text-muted-foreground" />
                        </button>
                        
                        {/* Dropdown Menu */}
                        {openMenuId === asset.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-40 bg-popover rounded-[4px] ambient-shadow z-20 py-1">
                              <button
                                onClick={() => {
                                  onSelectAsset(asset)
                                  setOpenMenuId(null)
                                }}
                                className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-muted transition-colors"
                              >
                                <Icon name="visibility" className="text-base" />
                                Visualizar
                              </button>
                              {onEdit && (
                                <button
                                  onClick={() => {
                                    onEdit(asset)
                                    setOpenMenuId(null)
                                  }}
                                  className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-muted transition-colors"
                                >
                                  <Icon name="edit" className="text-base" />
                                  Editar
                                </button>
                              )}
                              {onDelete && (
                                <button
                                  onClick={() => {
                                    onDelete(asset.id)
                                    setOpenMenuId(null)
                                  }}
                                  className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-muted text-muted-foreground transition-colors"
                                >
                                  <Icon name="delete" className="text-base" />
                                  Excluir
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Footer com contagem */}
      <div className="px-4 py-2 border-t border-on-surface-variant/10 bg-secondary/50 flex-shrink-0">
        <p className="text-xs text-muted-foreground">
          {assets.length} ativo(s) no total
        </p>
      </div>
    </div>
  )
}
