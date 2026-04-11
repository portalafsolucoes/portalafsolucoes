'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { ExportButton } from '@/components/ui/ExportButton'
import { AdaptiveSplitPanel } from '@/components/layout/AdaptiveSplitPanel'
import { usePermissions } from '@/hooks/usePermissions'

const CriticalityDetailPanel = dynamic(
  () => import('@/components/criticality/CriticalityDetailPanel').then((m) => ({ default: m.CriticalityDetailPanel })),
  { ssr: false }
)
const CriticalityEditPanel = dynamic(
  () => import('@/components/criticality/CriticalityEditPanel').then((m) => ({ default: m.CriticalityEditPanel })),
  { ssr: false }
)

interface AssetCriticality {
  id: string
  name: string
  customId: string | null
  area: string | null
  status: string
  location: { id: string; name: string } | null
  category: { id: string; name: string } | null
  gutGravity: number
  gutUrgency: number
  gutTendency: number
  gutScore: number
  openRequestsCount: number
  openWorkOrdersCount: number
  rafCount: number
  totalScore: number
  classification: 'critical' | 'warning' | 'ok'
}

interface Summary {
  critical: number
  warning: number
  ok: number
  total: number
}

const classificationConfig = {
  critical: {
    label: 'Crítico',
    color: 'bg-primary-graphite',
    textColor: 'text-foreground',
    bgLight: 'bg-surface-low',
    icon: 'warning',
  },
  warning: {
    label: 'Alerta',
    color: 'bg-on-surface-variant',
    textColor: 'text-muted-foreground',
    bgLight: 'bg-surface',
    icon: 'error',
  },
  ok: {
    label: 'OK',
    color: 'bg-on-surface-variant',
    textColor: 'text-muted-foreground',
    bgLight: 'bg-surface',
    icon: 'check_circle',
  },
}

type SortField =
  | 'status'
  | 'name'
  | 'location'
  | 'gutScore'
  | 'openRequestsCount'
  | 'openWorkOrdersCount'
  | 'rafCount'
  | 'totalScore'

function SortIcon({ field, sortBy, sortOrder }: { field: SortField; sortBy: SortField; sortOrder: 'asc' | 'desc' }) {
  if (sortBy !== field) {
    return <Icon name="unfold_more" className="text-sm text-muted-foreground" />
  }
  return (
    <Icon
      name={sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
      className="text-sm text-accent-orange"
    />
  )
}

export default function CriticalityPage() {
  const { canEdit } = usePermissions()

  const [assets, setAssets] = useState<AssetCriticality[]>([])
  const [summary, setSummary] = useState<Summary>({ critical: 0, warning: 0, ok: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'ok'>('all')
  const [sortBy, setSortBy] = useState<SortField>('totalScore')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showInfo, setShowInfo] = useState(false)

  // Split-panel state
  const [selectedAsset, setSelectedAsset] = useState<AssetCriticality | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const showSidePanel = selectedAsset !== null

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('classification', filter)
      const response = await fetch(`/api/criticality?${params}`)
      const result = await response.json()
      if (result.data) {
        setAssets(result.data)
        setSummary(result.summary)
      }
    } catch (error) {
      console.error('Error fetching criticality data:', error)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortBy(field)
      setSortOrder(field === 'status' || field === 'name' || field === 'location' ? 'asc' : 'desc')
    }
  }

  const handleSelectAsset = (asset: AssetCriticality) => {
    setIsEditing(false)
    setSelectedAsset(asset)
  }

  const handleEditSuccess = () => {
    setIsEditing(false)
    void fetchData()
    if (selectedAsset) {
      setSelectedAsset((prev) => {
        const updated = assets.find((a) => a.id === prev?.id)
        return updated ?? prev
      })
    }
  }

  const closeSidePanel = () => {
    setSelectedAsset(null)
    setIsEditing(false)
  }

  const visibleAssets = assets.filter((asset) => {
    const search = searchTerm.toLowerCase()
    return (
      asset.name.toLowerCase().includes(search) ||
      (asset.customId || '').toLowerCase().includes(search) ||
      (asset.location?.name || '').toLowerCase().includes(search) ||
      (asset.category?.name || '').toLowerCase().includes(search)
    )
  })

  const sortedAssets = [...visibleAssets].sort((a, b) => {
    const mod = sortOrder === 'asc' ? 1 : -1
    switch (sortBy) {
      case 'status': return a.status.localeCompare(b.status) * mod
      case 'name': return a.name.localeCompare(b.name) * mod
      case 'location': return (a.location?.name || '').localeCompare(b.location?.name || '') * mod
      case 'gutScore': return (a.gutScore - b.gutScore) * mod
      case 'openRequestsCount': return (a.openRequestsCount - b.openRequestsCount) * mod
      case 'openWorkOrdersCount': return (a.openWorkOrdersCount - b.openWorkOrdersCount) * mod
      case 'rafCount': return (a.rafCount - b.rafCount) * mod
      case 'totalScore': return (a.totalScore - b.totalScore) * mod
      default: return 0
    }
  })

  const activePanel = isEditing && selectedAsset ? (
    <CriticalityEditPanel
      asset={selectedAsset}
      onClose={() => setIsEditing(false)}
      onSuccess={handleEditSuccess}
    />
  ) : selectedAsset ? (
    <CriticalityDetailPanel
      asset={selectedAsset}
      onClose={closeSidePanel}
      onEdit={() => setIsEditing(true)}
      canEdit={canEdit('criticality')}
    />
  ) : null

  const listContent = loading ? (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant" />
        <p className="mt-2 text-muted-foreground">Carregando...</p>
      </div>
    </div>
  ) : (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="flex-1 overflow-auto min-h-0">
        {/* Summary cards + info panel */}
        <div className="px-4 py-4 md:px-6">
          {showInfo && (
            <div className="mb-4 p-4 bg-surface rounded-[4px]">
              <h3 className="font-semibold text-foreground mb-2">Como funciona a análise de criticidade?</h3>
              <div className="text-sm text-foreground space-y-2">
                <p><strong>Matriz GUT (35% do score):</strong> Gravidade × Urgência × Tendência (1-5 cada)</p>
                <p><strong>Solicitações Abertas (20%):</strong> Quantidade de SS pendentes/aprovadas</p>
                <p><strong>Ordens de Serviço (20%):</strong> Quantidade de OS em aberto/andamento</p>
                <p><strong>Relatórios de Falha (15%):</strong> Quantidade de RAFs registradas</p>
                <p><strong>Status do Ativo (10%):</strong> DOWN = crítico, OPERATIONAL = ok</p>
                <div className="flex gap-4 mt-3 pt-3 border-t border-border">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-primary-graphite" /> Crítico: ≥70 pontos
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-on-surface-variant" /> Alerta: 40-69 pontos
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-on-surface-variant" /> OK: &lt;40 pontos
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4">
            <button
              onClick={() => setFilter('all')}
              className={`p-4 rounded-[4px] border-2 transition-all ${filter === 'all' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total</span>
                <Icon name="monitoring" className="text-xl text-primary" />
              </div>
              <p className="text-3xl font-bold text-foreground mt-2">{summary.total}</p>
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`p-4 rounded-[4px] border-2 transition-all ${filter === 'critical' ? 'border-on-surface bg-surface-low' : 'border-border hover:border-border'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Críticos</span>
                <Icon name="warning" className="text-xl text-muted-foreground" />
              </div>
              <p className="text-3xl font-bold text-foreground mt-2">{summary.critical}</p>
              <p className="text-xs text-muted-foreground mt-1">Ação imediata</p>
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`p-4 rounded-[4px] border-2 transition-all ${filter === 'warning' ? 'border-on-surface-variant bg-surface' : 'border-border hover:border-border'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Em Alerta</span>
                <Icon name="error" className="text-xl text-muted-foreground" />
              </div>
              <p className="text-3xl font-bold text-muted-foreground mt-2">{summary.warning}</p>
              <p className="text-xs text-muted-foreground mt-1">Monitorar</p>
            </button>
            <button
              onClick={() => setFilter('ok')}
              className={`p-4 rounded-[4px] border-2 transition-all ${filter === 'ok' ? 'border-border bg-surface' : 'border-border hover:border-border'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">OK</span>
                <Icon name="check_circle" className="text-xl text-muted-foreground" />
              </div>
              <p className="text-3xl font-bold text-muted-foreground mt-2">{summary.ok}</p>
              <p className="text-xs text-muted-foreground mt-1">Normal</p>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="h-full flex flex-col bg-card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="sticky top-0 bg-secondary z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button type="button" onClick={() => toggleSort('status')} className="flex items-center gap-1">
                    Status
                    <SortIcon field="status" sortBy={sortBy} sortOrder={sortOrder} />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button type="button" onClick={() => toggleSort('name')} className="flex items-center gap-1">
                    Ativo
                    <SortIcon field="name" sortBy={sortBy} sortOrder={sortOrder} />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button type="button" onClick={() => toggleSort('location')} className="flex items-center gap-1">
                    Localização
                    <SortIcon field="location" sortBy={sortBy} sortOrder={sortOrder} />
                  </button>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button type="button" onClick={() => toggleSort('gutScore')} className="flex items-center justify-center gap-1 w-full">
                    GUT <SortIcon field="gutScore" sortBy={sortBy} sortOrder={sortOrder} />
                  </button>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button type="button" onClick={() => toggleSort('openRequestsCount')} className="flex items-center justify-center gap-1 w-full">
                    <Icon name="assignment" className="text-base" /> SS
                    <SortIcon field="openRequestsCount" sortBy={sortBy} sortOrder={sortOrder} />
                  </button>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button type="button" onClick={() => toggleSort('openWorkOrdersCount')} className="flex items-center justify-center gap-1 w-full">
                    <Icon name="construction" className="text-base" /> OS
                    <SortIcon field="openWorkOrdersCount" sortBy={sortBy} sortOrder={sortOrder} />
                  </button>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button type="button" onClick={() => toggleSort('rafCount')} className="flex items-center justify-center gap-1 w-full">
                    <Icon name="warning" className="text-base" /> RAF
                    <SortIcon field="rafCount" sortBy={sortBy} sortOrder={sortOrder} />
                  </button>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button type="button" onClick={() => toggleSort('totalScore')} className="flex items-center justify-center gap-1 w-full">
                    Score <SortIcon field="totalScore" sortBy={sortBy} sortOrder={sortOrder} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-gray-200">
              {sortedAssets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhum ativo encontrado
                  </td>
                </tr>
              ) : (
                sortedAssets.map((asset) => {
                  const config = classificationConfig[asset.classification]
                  const isSelected = selectedAsset?.id === asset.id

                  return (
                    <tr
                      key={asset.id}
                      className={`odd:bg-gray-50 even:bg-white hover:bg-accent-orange-light cursor-pointer transition-colors ${isSelected ? 'bg-secondary' : ''}`}
                      onClick={() => handleSelectAsset(asset)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${config.color}`} />
                          <Icon name={config.icon} className={`text-xl ${config.textColor}`} />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-foreground">{asset.name}</p>
                          {asset.customId && (
                            <p className="text-xs text-muted-foreground">{asset.customId}</p>
                          )}
                          {asset.status === 'DOWN' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-high text-foreground mt-1">
                              PARADO
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {asset.location?.name || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-foreground">{asset.gutScore}</span>
                        <span className="block text-xs text-muted-foreground">
                          {asset.gutGravity}×{asset.gutUrgency}×{asset.gutTendency}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${asset.openRequestsCount > 0 ? 'bg-surface-low text-foreground' : 'bg-surface-low text-muted-foreground'}`}>
                          {asset.openRequestsCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${asset.openWorkOrdersCount > 0 ? 'bg-surface-low text-foreground' : 'bg-surface-low text-muted-foreground'}`}>
                          {asset.openWorkOrdersCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${asset.rafCount > 0 ? 'bg-surface-high text-foreground' : 'bg-surface-low text-muted-foreground'}`}>
                          {asset.rafCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-[4px] ${config.color} text-white font-bold text-lg`}>
                          {asset.totalScore}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          className="mb-0"
          title="Análise de Criticidade de Ativos"
          description="Priorização baseada em Matriz GUT, solicitações, ordens de serviço e falhas"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-full sm:w-48 xl:w-64">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 transform text-base text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar ativos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="h-9 px-3 text-sm border border-input rounded-[4px] bg-background focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
              >
                <option value="all">Todas as Faixas</option>
                <option value="critical">Críticos</option>
                <option value="warning">Em Alerta</option>
                <option value="ok">OK</option>
              </select>
              <ExportButton data={visibleAssets} entity="asset-criticality" />
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="px-3 py-2 rounded-[4px] hover:bg-accent/10 transition-colors"
                title="Sobre o sistema de criticidade"
              >
                <Icon name="info" className="text-xl" />
              </button>
              <Button
                onClick={fetchData}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Icon name="refresh" className={`text-base ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Atualizar</span>
              </Button>
            </div>
          }
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          <AdaptiveSplitPanel
            list={listContent}
            panel={activePanel}
            showPanel={showSidePanel}
            panelTitle="Criticidade"
            onClosePanel={closeSidePanel}
          />
        </div>
      </div>
    </PageContainer>
  )
}
