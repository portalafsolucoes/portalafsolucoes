'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdaptiveSplitPanel } from '@/components/layout/AdaptiveSplitPanel'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/hooks/useAuth'
import { useActiveUnit } from '@/hooks/useActiveUnit'
import { hasPermission } from '@/lib/permissions'
import { canSwitchUnits, getDefaultCmmsPath } from '@/lib/user-roles'

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

function findTreeNode(nodes: TreeNode[], nodeId: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node
    if (node.children?.length) {
      const childNode = findTreeNode(node.children, nodeId)
      if (childNode) return childNode
    }
  }

  return null
}

export default function TreePage() {
  const router = useRouter()
  const { user, unitId: authUnitId } = useAuth()
  const { activeUnitId, availableUnits } = useActiveUnit()
  const isAdmin = canSwitchUnits(user)

  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selectedUnit, setSelectedUnit] = useState<string>('')
  const [selectedAsset, setSelectedAsset] = useState<string>('')
  const [assetDetail, setAssetDetail] = useState<AssetDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

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

  useEffect(() => {
    if (!user) return
    if (!hasPermission(user, 'tree', 'view')) {
      router.replace(getDefaultCmmsPath(user))
    }
  }, [router, user])

  // Auto-selecionar unidade ativa da session
  useEffect(() => {
    if (!user || !hasPermission(user, 'tree', 'view')) return
    const unitToUse = activeUnitId || authUnitId
    if (unitToUse && !selectedUnit) {
      setSelectedUnit(unitToUse)
      fetchUnitTree(unitToUse)
    } else if (!unitToUse) {
      setLoading(false)
    }
  }, [activeUnitId, authUnitId, fetchUnitTree, selectedUnit, user])

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
            isSelected ? 'bg-gray-100 text-gray-900 font-medium' : 'hover:bg-muted/50'
          }`}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
          onClick={() => {
            if (hasChildren) toggleExpand(node.id)
            if (isAsset) fetchAssetDetail(node.id)
          }}
        >
          {hasChildren ? (
            isExpanded ? <Icon name="expand_more" className="text-sm flex-shrink-0" /> : <Icon name="chevron_right" className="text-sm flex-shrink-0" />
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

  const selectedAssetNode = selectedAsset ? findTreeNode(treeData, selectedAsset) : null

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          className="mb-0"
          title="Árvore"
          description="Navegação hierárquica de ativos"
          actions={
            isAdmin && availableUnits.length > 1 ? (
              <select
                value={selectedUnit}
                onChange={e => selectUnit(e.target.value)}
                className="h-9 px-3 text-sm border border-gray-300 shadow-sm rounded-[4px] bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">Selecione a unidade...</option>
                {availableUnits.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            ) : undefined
          }
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          {!selectedUnit ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center px-6">
                <p className="text-muted-foreground">Selecione uma unidade para visualizar a árvore de ativos.</p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
                <p className="mt-2 text-muted-foreground">Carregando...</p>
              </div>
            </div>
          ) : (
            <AdaptiveSplitPanel
              showPanel={!!selectedAsset}
              panelTitle={selectedAssetNode?.name || 'Detalhes do Ativo'}
              onClosePanel={() => { setSelectedAsset(''); setAssetDetail(null) }}
              list={
                <div className="h-full flex flex-col bg-card overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-border">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Estrutura de Ativos</h2>
                      <p className="text-sm text-muted-foreground">Expanda áreas e centros de trabalho para navegar na hierarquia.</p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto min-h-0 p-2">
                    {treeData.length === 0 ? (
                      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                        Nenhum ativo cadastrado nesta unidade.
                      </div>
                    ) : (
                      treeData.map(node => renderNode(node))
                    )}
                  </div>
                </div>
              }
              panel={selectedAsset ? (
                <div className="h-full flex flex-col bg-card border-l border-border">
                    <div className="flex items-start justify-between p-4 border-b border-border">
                      <div>
                        <h2 className="text-xl font-bold text-foreground">{selectedAssetNode?.name || 'Detalhes do Ativo'}</h2>
                        <p className="text-sm text-muted-foreground">Ordens, solicitações e RAFs relacionadas ao ativo selecionado.</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedAsset('')
                          setAssetDetail(null)
                        }}
                      >
                        <Icon name="close" className="text-base" />
                      </Button>
                    </div>

                    {detailLoading ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
                          <p className="mt-2 text-muted-foreground">Carregando...</p>
                        </div>
                      </div>
                    ) : assetDetail ? (
                      <div className="flex-1 overflow-y-auto min-h-0">
                        <div className="p-4 border-b border-border">
                          <h3 className="text-sm font-semibold text-foreground mb-3">Ordens de Serviço ({assetDetail.workOrders.length})</h3>
                          {assetDetail.workOrders.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhuma OS aberta.</p>
                          ) : (
                            <div className="space-y-2">
                              {assetDetail.workOrders.map((wo: any) => (
                                <div key={wo.id} className="flex items-center justify-between gap-3 p-3 border border-border rounded-[4px] text-sm">
                                  <span className="font-medium text-foreground">{wo.title}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(wo.status)}`}>{wo.status}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="p-4 border-b border-border">
                          <h3 className="text-sm font-semibold text-foreground mb-3">Solicitações ({assetDetail.requests.length})</h3>
                          {assetDetail.requests.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhuma SS aberta.</p>
                          ) : (
                            <div className="space-y-2">
                              {assetDetail.requests.map((ss: any) => (
                                <div key={ss.id} className="flex items-center justify-between gap-3 p-3 border border-border rounded-[4px] text-sm">
                                  <span className="font-medium text-foreground">{ss.title}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(ss.status)}`}>{ss.status}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="p-4">
                          <h3 className="text-sm font-semibold text-foreground mb-3">Ações Pendentes RAF ({assetDetail.rafs.length})</h3>
                          {assetDetail.rafs.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhuma ação pendente.</p>
                          ) : (
                            <div className="space-y-2">
                              {assetDetail.rafs.map((raf: any) => (
                                <div key={raf.id} className="p-3 border border-border rounded-[4px] text-sm">
                                  <span className="font-medium text-foreground">{raf.rafNumber}</span>
                                  <span className="text-muted-foreground ml-2">{raf.equipment}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
                        Clique em um ativo na árvore para ver OSs, SSs e ações pendentes.
                      </div>
                    )}
                </div>
              ) : null}
            />
          )}
        </div>
      </div>
    </PageContainer>
  )
}
