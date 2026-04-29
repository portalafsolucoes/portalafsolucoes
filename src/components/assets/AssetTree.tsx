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
  area?: string
  areaId?: string | null
  assetArea?: { id: string; name: string } | null
  workCenterId?: string | null
  assetWorkCenter?: { id: string; name: string } | null
  location?: { id: string; name: string }
  category?: { name: string; id: string }
  primaryUser?: { firstName: string; lastName: string }
  parentAssetId?: string | null
  parentAsset?: { id: string; protheusCode?: string; name: string } | null
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
    // assetDepth = 0 (Pai), 1 (Filho), 2 (Neto), 3 (Bisneto), 4+ fallback
    // O AssetTreeNode entra em level=2 porque a arvore tem 2 agrupadores acima (Area + Centro de Trabalho)
    const assetDepth = level - 2
    if (assetDepth <= 0) {
      return <Icon name="precision_manufacturing" className="text-base text-gray-900" />
    }
    if (assetDepth === 1) {
      return <Icon name="settings" className="text-base text-gray-700" />
    }
    if (assetDepth === 2) {
      return <Icon name="memory" className="text-base text-gray-500" />
    }
    return <Icon name="bolt" className="text-base text-gray-400" />
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
          isSelected ? 'bg-primary/10 border-l-2 border-on-surface-variant' : ''
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

interface GroupNodeProps {
  label: string
  icon: string
  iconColor: string
  level: number
  children: React.ReactNode
}

function GroupNode({ label, icon, iconColor, level, children }: GroupNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div>
      <div
        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-primary/5 rounded transition-colors"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="p-0.5 hover:bg-muted rounded">
          {isExpanded ? (
            <Icon name="expand_more" className="text-base text-muted-foreground" />
          ) : (
            <Icon name="chevron_right" className="text-base text-muted-foreground" />
          )}
        </button>
        <Icon name={icon} className={`text-base ${iconColor}`} />
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </div>
      {isExpanded && <div>{children}</div>}
    </div>
  )
}

const NO_KEY = '__none__'

function sortedGroupKeys(keys: Iterable<string>, names: Map<string, string>): string[] {
  return Array.from(keys).sort((a, b) => {
    if (a === NO_KEY) return 1
    if (b === NO_KEY) return -1
    const nameA = names.get(a) || ''
    const nameB = names.get(b) || ''
    return nameA.localeCompare(nameB, 'pt-BR')
  })
}

interface AreaGroup {
  areaName: string
  workCenterGroups: Map<string, { wcName: string; assets: Asset[] }>
}

export function AssetTree({ assets, onSelectAsset, selectedAssetId, onAddSubAsset }: AssetTreeProps) {
  const buildHierarchy = (assets: Asset[]): Map<string, AreaGroup> => {
    const assetMap = new Map<string, Asset>()
    const rootAssets: Asset[] = []

    // Criar mapa de todos os ativos
    assets.forEach(asset => {
      assetMap.set(asset.id, { ...asset, childAssets: [] })
    })

    // Construir hierarquia pai-filho
    assets.forEach(asset => {
      const assetWithChildren = assetMap.get(asset.id)!
      if (!asset.parentAssetId) {
        rootAssets.push(assetWithChildren)
      } else {
        const parent = assetMap.get(asset.parentAssetId)
        if (parent) {
          if (!parent.childAssets) parent.childAssets = []
          parent.childAssets.push(assetWithChildren)
        } else {
          rootAssets.push(assetWithChildren)
        }
      }
    })

    // Agrupar: Área → Centro de Trabalho → Ativos
    const areaMap = new Map<string, AreaGroup>()

    rootAssets.forEach(asset => {
      const areaKey = asset.areaId || NO_KEY
      const areaName = asset.assetArea?.name || 'Sem Área'
      const wcKey = asset.workCenterId || NO_KEY
      const wcName = asset.assetWorkCenter?.name || 'Sem Centro de Trabalho'

      if (!areaMap.has(areaKey)) {
        areaMap.set(areaKey, { areaName, workCenterGroups: new Map() })
      }
      const areaGroup = areaMap.get(areaKey)!

      if (!areaGroup.workCenterGroups.has(wcKey)) {
        areaGroup.workCenterGroups.set(wcKey, { wcName, assets: [] })
      }
      areaGroup.workCenterGroups.get(wcKey)!.assets.push(asset)
    })

    return areaMap
  }

  const areaMap = buildHierarchy(assets)

  const areaNames = new Map<string, string>()
  areaMap.forEach((group, key) => areaNames.set(key, group.areaName))
  const sortedAreaKeys = sortedGroupKeys(areaMap.keys(), areaNames)

  return (
    <div className="h-full overflow-auto bg-card">
      <div className="p-2">
        {sortedAreaKeys.length > 0 ? (
          sortedAreaKeys.map((areaKey) => {
            const areaGroup = areaMap.get(areaKey)!

            const wcNames = new Map<string, string>()
            areaGroup.workCenterGroups.forEach((wc, key) => wcNames.set(key, wc.wcName))
            const sortedWcKeys = sortedGroupKeys(areaGroup.workCenterGroups.keys(), wcNames)

            return (
              <GroupNode
                key={areaKey}
                label={areaGroup.areaName}
                icon="folder"
                iconColor="text-amber-600"
                level={0}
              >
                {sortedWcKeys.map((wcKey) => {
                  const wcGroup = areaGroup.workCenterGroups.get(wcKey)!
                  return (
                    <GroupNode
                      key={wcKey}
                      label={wcGroup.wcName}
                      icon="engineering"
                      iconColor="text-blue-600"
                      level={1}
                    >
                      {wcGroup.assets.map((asset) => (
                        <AssetTreeNode
                          key={asset.id}
                          asset={asset}
                          level={2}
                          onSelect={onSelectAsset}
                          selectedId={selectedAssetId}
                          onAddSubAsset={onAddSubAsset}
                        />
                      ))}
                    </GroupNode>
                  )
                })}
              </GroupNode>
            )
          })
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
