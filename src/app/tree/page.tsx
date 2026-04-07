'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Icon } from '@/components/ui/Icon'

import { getStatusColor } from '@/lib/utils'

interface TreeNode {
  id: string
  name: string
  tag?: string
  type: 'unit' | 'area' | 'workCenter' | 'asset'
  status?: string
  parentAssetId?: string | null
  children?: TreeNode[]
}

interface AssetDetail {
  workOrders: any[]
  requests: any[]
  rafs: any[]
}

export default function TreePage() {
  const [units, setUnits] = useState<any[]>([])
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selectedUnit, setSelectedUnit] = useState<string>('')
  const [selectedAsset, setSelectedAsset] = useState<string>('')
  const [assetDetail, setAssetDetail] = useState<AssetDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    fetchUnits()
  }, [])

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/tree')
      const data = await res.json()
      setUnits(data.data?.units || [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  const fetchUnitTree = useCallback(async (unitId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/tree?unitId=${unitId}`)
      const data = await res.json()
      const { areas, workCenters, assets } = data.data || {}

      // Construir árvore hierárquica
      const parentAssets = (assets || []).filter((a: any) => !a.parentAssetId)
      const childAssets = (assets || []).filter((a: any) => a.parentAssetId)

      const buildAssetChildren = (parentId: string): TreeNode[] => {
        return childAssets
          .filter((a: any) => a.parentAssetId === parentId)
          .map((a: any) => ({
            id: a.id,
            name: a.tag ? `[${a.tag}] ${a.name}` : a.name,
            tag: a.tag,
            type: 'asset' as const,
            status: a.status,
            children: buildAssetChildren(a.id),
          }))
      }

      const tree: TreeNode[] = (areas || []).map((area: any) => {
        const areaWorkCenters = (workCenters || []).filter((wc: any) => wc.areaId === area.id)
        return {
          id: area.id,
          name: area.name,
          type: 'area' as const,
          children: areaWorkCenters.map((wc: any) => {
            const wcAssets = parentAssets.filter((a: any) => a.workCenterId === wc.id)
            return {
              id: wc.id,
              name: wc.name,
              type: 'workCenter' as const,
              children: wcAssets.map((a: any) => ({
                id: a.id,
                name: a.tag ? `[${a.tag}] ${a.name}` : a.name,
                tag: a.tag,
                type: 'asset' as const,
                status: a.status,
                children: buildAssetChildren(a.id),
              })),
            }
          }),
        }
      })

      // Ativos sem área/centro de trabalho
      const unassigned = parentAssets.filter((a: any) => !a.workCenterId && !a.areaId)
      if (unassigned.length > 0) {
        tree.push({
          id: 'unassigned',
          name: 'Sem Classificação',
          type: 'area' as const,
          children: unassigned.map((a: any) => ({
            id: a.id,
            name: a.tag ? `[${a.tag}] ${a.name}` : a.name,
            tag: a.tag,
            type: 'asset' as const,
            status: a.status,
            children: buildAssetChildren(a.id),
          })),
        })
      }

      setTreeData(tree)
    } catch { setTreeData([]) }
    setLoading(false)
  }, [])

  const fetchAssetDetail = async (assetId: string) => {
    setDetailLoading(true)
    setSelectedAsset(assetId)
    try {
      const res = await fetch(`/api/tree?assetId=${assetId}`)
      const data = await res.json()
      setAssetDetail(data.data || { workOrders: [], requests: [], rafs: [] })
    } catch { setAssetDetail(null) }
    setDetailLoading(false)
  }

  const toggleExpand = (nodeId: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }

  const selectUnit = (unitId: string) => {
    setSelectedUnit(unitId)
    setSelectedAsset('')
    setAssetDetail(null)
    if (unitId) fetchUnitTree(unitId)
    else setTreeData([])
  }

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'unit': return <Icon name="business" className="text-base text-foreground" />
      case 'area': return <Icon name="location_on" className="text-base text-muted-foreground" />
      case 'workCenter': return <Icon name="construction" className="text-base text-muted-foreground" />
      case 'asset': return <Icon name="inventory_2" className="text-base text-foreground" />
      default: return null
    }
  }

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expanded.has(node.id)
    const isSelected = selectedAsset === node.id
    const isAsset = node.type === 'asset'

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded-[4px] transition-colors text-sm ${
            isSelected ? 'bg-primary/10 text-foreground font-medium' : 'hover:bg-muted/50'
          }`}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
          onClick={() => {
            if (hasChildren) toggleExpand(node.id)
            if (isAsset) fetchAssetDetail(node.id)
          }}
        >
          {hasChildren ? (
            isExpanded ? <Icon name="expand_more" className=".5 text-sm.5 flex-shrink-0" /> : <Icon name="chevron_right" className=".5 text-sm.5 flex-shrink-0" />
          ) : (
            <span className="w-3.5" />
          )}
          {getNodeIcon(node.type)}
          <span className="truncate">{node.name}</span>
          {node.status && (
            <span className={`ml-auto px-1.5 py-0.5 rounded text-xs ${getStatusColor(node.status)}`}>
              {node.status === 'OPERATIONAL' ? 'OK' : 'DOWN'}
            </span>
          )}
        </div>
        {isExpanded && hasChildren && (
          <div>
            {node.children!.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Icon name="account_tree" className="text-2xl text-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Árvore</h1>
            <p className="text-sm text-muted-foreground">Navegação hierárquica de ativos</p>
          </div>
        </div>

        {/* Seletor de Unidade */}
        <div className="flex items-center gap-3 p-3 bg-card rounded-[4px]">
          <label className="text-sm font-medium text-foreground">Unidade:</label>
          <select
            value={selectedUnit}
            onChange={e => selectUnit(e.target.value)}
            className="flex-1 max-w-xs px-3 py-2 text-sm rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Selecione a unidade...</option>
            {units.map((u: any) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {!selectedUnit ? (
          <div className="rounded-[4px] bg-card p-12 text-center text-muted-foreground">
            Selecione uma unidade para visualizar a árvore de ativos.
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-on-surface-variant border-r-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Painel Esquerdo: Árvore */}
            <div className="lg:col-span-1 rounded-[4px] bg-card overflow-hidden">
              <div className="p-3 border-b border-border bg-muted/30">
                <h3 className="text-sm font-medium text-foreground">Estrutura de Ativos</h3>
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-300px)] p-2">
                {treeData.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">Nenhum ativo cadastrado nesta unidade.</p>
                ) : (
                  treeData.map(node => renderNode(node))
                )}
              </div>
            </div>

            {/* Painel Direito: Detalhes */}
            <div className="lg:col-span-2 rounded-[4px] bg-card overflow-hidden">
              <div className="p-3 border-b border-border bg-muted/30">
                <h3 className="text-sm font-medium text-foreground">
                  {selectedAsset ? 'Detalhes do Ativo' : 'Selecione um ativo'}
                </h3>
              </div>
              <div className="p-4 overflow-y-auto max-h-[calc(100vh-300px)]">
                {!selectedAsset ? (
                  <p className="text-center text-muted-foreground py-8">Clique em um ativo na árvore para ver OSs, SSs e ações pendentes.</p>
                ) : detailLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-solid border-on-surface-variant border-r-transparent" />
                  </div>
                ) : assetDetail ? (
                  <div className="space-y-6">
                    {/* OSs Abertas */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Icon name="construction" className="text-base" /> Ordens de Serviço ({assetDetail.workOrders.length})
                      </h4>
                      {assetDetail.workOrders.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nenhuma OS aberta.</p>
                      ) : (
                        <div className="space-y-2">
                          {assetDetail.workOrders.map((wo: any) => (
                            <div key={wo.id} className="flex items-center justify-between p-2 rounded-[4px] text-sm">
                              <span className="font-medium">{wo.title}</span>
                              <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(wo.status)}`}>{wo.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SSs Abertas */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Icon name="assignment" className="text-base" /> Solicitações ({assetDetail.requests.length})
                      </h4>
                      {assetDetail.requests.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nenhuma SS aberta.</p>
                      ) : (
                        <div className="space-y-2">
                          {assetDetail.requests.map((ss: any) => (
                            <div key={ss.id} className="flex items-center justify-between p-2 rounded-[4px] text-sm">
                              <span className="font-medium">{ss.title}</span>
                              <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(ss.status)}`}>{ss.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Ações Pendentes RAFs */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Icon name="warning" className="text-base" /> Ações Pendentes RAF ({assetDetail.rafs.length})
                      </h4>
                      {assetDetail.rafs.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nenhuma ação pendente.</p>
                      ) : (
                        <div className="space-y-2">
                          {assetDetail.rafs.map((raf: any) => (
                            <div key={raf.id} className="p-2 rounded-[4px] text-sm">
                              <span className="font-medium">{raf.rafNumber}</span>
                              <span className="text-muted-foreground ml-2">{raf.equipment}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
