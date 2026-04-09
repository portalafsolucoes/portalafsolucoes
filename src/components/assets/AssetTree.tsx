'use client'

import { Icon } from '@/components/ui/Icon'
import { useState, useEffect } from 'react'

interface Asset {
  id: string
  name: string
  status: string
  protheusCode?: string
  barCode?: string
  description?: string
  acquisitionCost?: number
  area?: number
  location?: { id: string; name: string }
  category?: { name: string; id: string }
  primaryUser?: { firstName: string; lastName: string }
  parentAssetId?: string | null
  childAssets?: Asset[]
  files?: Array<{ id: string; url: string; name: string; mimeType?: string }>
  createdAt: string
  updatedAt: string
}

interface AssetTreeNodeProps {
  asset: Asset
  level: number
  onSelect: (asset: Asset) => void
  selectedId?: string
  onAddSubAsset?: (parentAsset: Asset) => void
}

function AssetTreeNode({ asset, level, onSelect, selectedId, onAddSubAsset }: AssetTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const hasChildren = asset.childAssets && asset.childAssets.length > 0
  const isSelected = selectedId === asset.id

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
    setShowContextMenu(true)
  }

  const handleAddSubAsset = () => {
    setShowContextMenu(false)
    if (onAddSubAsset) {
      onAddSubAsset(asset)
    }
  }

  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false)
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showContextMenu])

  const getIcon = () => {
    // Nível 0 (raiz) - Cubo 3D azul (principal)
    if (level === 0) {
      return <Icon name="inventory_2" className="text-base text-primary" />
    }
    // Nível 1 (filhos diretos) - Múltiplos cubos laranja
    if (level === 1) {
      return <Icon name="widgets" className="text-base text-orange-500" />
    }
    // Nível 2+ (netos em diante) - Componente cinza
    return <Icon name="memory" className="text-base text-muted-foreground" />
  }

  const getStatusIndicator = () => {
    if (asset.status === 'OPERATIONAL') {
      return <div className="w-2 h-2 rounded-full bg-success-light0" />
    }
    if (asset.status === 'DOWN') {
      return <div className="w-2 h-2 rounded-full bg-danger-light0" />
    }
    return <div className="w-2 h-2 rounded-full bg-warning-light0" />
  }

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-primary/5 rounded transition-colors relative ${
          isSelected ? 'bg-primary/10 border-l-2 border-blue-600' : ''
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(asset)}
        onContextMenu={handleContextMenu}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="p-0.5 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <Icon name="expand_more" className="text-base text-muted-foreground" />
            ) : (
              <Icon name="chevron_right" className="text-base text-muted-foreground" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-5" />}
        
        <div className="flex items-center gap-2 flex-1">
          {getIcon()}
          <span className={`text-sm ${isSelected ? 'font-semibold text-blue-900' : 'text-foreground'}`}>
            {asset.protheusCode ? `${asset.protheusCode} - ${asset.name}` : asset.name}
          </span>
          {getStatusIndicator()}
        </div>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="fixed bg-card rounded-[4px] ambient-shadow py-1 z-50"
          style={{ left: `${contextMenuPosition.x}px`, top: `${contextMenuPosition.y}px` }}
        >
          <button
            onClick={handleAddSubAsset}
            className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
          >
            <Icon name="add" className="text-base" />
            Adicionar Subativo
          </button>
        </div>
      )}

      {hasChildren && isExpanded && (
        <div>
          {asset.childAssets!.map((child) => (
            <AssetTreeNode
              key={child.id}
              asset={child}
              level={level + 1}
              onSelect={onSelect}
              selectedId={selectedId}
              onAddSubAsset={onAddSubAsset}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface AssetTreeProps {
  assets: Asset[]
  onSelectAsset: (asset: Asset) => void
  selectedAssetId?: string
  onAddSubAsset?: (parentAsset: Asset) => void
}

export function AssetTree({ assets, onSelectAsset, selectedAssetId, onAddSubAsset }: AssetTreeProps) {
  // Construir hierarquia de ativos
  const buildHierarchy = (assets: Asset[]): Asset[] => {
    const assetMap = new Map<string, Asset>()
    const rootAssets: Asset[] = []

    // Primeiro, criar mapa de todos os ativos
    assets.forEach(asset => {
      assetMap.set(asset.id, { ...asset, childAssets: [] })
    })

    // Depois, construir hierarquia
    assets.forEach(asset => {
      const assetWithChildren = assetMap.get(asset.id)!
      if (!asset.parentAssetId) {
        rootAssets.push(assetWithChildren)
      } else {
        const parent = assetMap.get(asset.parentAssetId)
        if (parent) {
          if (!parent.childAssets) {
            parent.childAssets = []
          }
          parent.childAssets.push(assetWithChildren)
        } else {
          // Mantém o ativo visível mesmo se o pai não vier na listagem filtrada.
          rootAssets.push(assetWithChildren)
        }
      }
    })

    return rootAssets
  }

  const hierarchy = buildHierarchy(assets)

  return (
    <div className="h-full overflow-auto bg-card">
      <div className="p-2">
        {hierarchy.length > 0 ? (
          hierarchy.map((asset) => (
            <AssetTreeNode
              key={asset.id}
              asset={asset}
              level={0}
              onSelect={onSelectAsset}
              selectedId={selectedAssetId}
              onAddSubAsset={onAddSubAsset}
            />
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Icon name="error" className="text-3xl mx-auto mb-2 text-muted-foreground" />
            <p>Nenhum ativo encontrado</p>
          </div>
        )}
      </div>
    </div>
  )
}
