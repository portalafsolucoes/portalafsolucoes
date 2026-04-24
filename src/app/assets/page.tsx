'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/layout/PageHeader'
import { AssetTree } from '@/components/assets/AssetTree'
import { AssetTable } from '@/components/assets/AssetTable'
import { AdaptiveSplitPanel } from '@/components/layout/AdaptiveSplitPanel'
import { useResponsiveLayout } from '@/hooks/useMediaQuery'
import { ExportButton } from '@/components/ui/ExportButton'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { hasPermission } from '@/lib/permissions'
import { getDefaultCmmsPath, isSuperAdminRole } from '@/lib/user-roles'

// Lazy load: modais e painéis só carregam quando necessário
const AssetDetailPanel = dynamic(() => import('@/components/assets/AssetDetailPanel').then(m => ({ default: m.AssetDetailPanel })), { ssr: false })
const AssetEditPanel = dynamic(() => import('@/components/assets/AssetEditPanel').then(m => ({ default: m.AssetEditPanel })), { ssr: false })
const AssetCreateModal = dynamic(() => import('@/components/assets/AssetCreateModal').then(m => ({ default: m.AssetCreateModal })), { ssr: false })

type ViewMode = 'tree' | 'table'

interface Asset {
  id: string
  name: string
  description?: string
  status: string
  protheusCode?: string
  tag?: string
  barCode?: string
  acquisitionCost?: number
  area?: string
  areaId?: string | null
  assetArea?: { id: string; name: string } | null
  unitId?: string | null
  unit?: { id: string; name: string } | null
  location?: { name: string; id: string }
  category?: { name: string; id: string }
  primaryUser?: { firstName: string; lastName: string }
  parentAssetId?: string | null
  parentAsset?: { id: string; protheusCode?: string; name: string } | null
  childAssets?: Asset[]
  files?: Array<{ id: string; url: string; name: string; mimeType?: string }>
  createdAt: string
  updatedAt: string
}

export default function AssetsPage() {
  const router = useRouter()
  const { isPhone } = useResponsiveLayout()
  const { user } = useAuth()
  const { canCreate, canEdit, canDelete } = usePermissions()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [parentAssetForNew, setParentAssetForNew] = useState<{ id: string; name: string } | undefined>(undefined)
  const [isEditingInPanel, setIsEditingInPanel] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    if (!user || !hasPermission(user, 'assets', 'view')) return
    loadAssets()
  }, [user])

  useEffect(() => {
    if (!user) return
    if (!hasPermission(user, 'assets', 'view')) {
      router.replace(getDefaultCmmsPath(user))
    }
  }, [router, user])

  const loadAssets = async () => {
    try {
      const res = await fetch('/api/assets?summary=true')
      const data = await res.json()
      setAssets(data.data || [])
    } catch (error) {
      console.error('Error loading assets:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAssetDetails = async (assetId: string) => {
    try {
      const res = await fetch(`/api/assets/${assetId}`)
      const data = await res.json()
      if (data.data) {
        setSelectedAsset(data.data)
      }
    } catch (error) {
      console.error('Error loading asset details:', error)
    }
  }

  const handleAssetSelect = (asset: Asset) => {
    setIsEditingInPanel(false)
    setIsCreating(false)
    setParentAssetForNew(undefined)
    loadAssetDetails(asset.id)
  }

  const handleAddSubAsset = (parentAsset: Asset) => {
    setSelectedAsset(null)
    setIsEditingInPanel(false)
    setParentAssetForNew({ id: parentAsset.id, name: parentAsset.name })
    setIsCreating(true)
  }

  const handleAddNewAsset = () => {
    setSelectedAsset(null)
    setIsEditingInPanel(false)
    setParentAssetForNew(undefined)
    setIsCreating(true)
  }

  const handleEdit = () => {
    setIsEditingInPanel(true)
  }

  const handleDelete = async (assetId: string) => {
    if (!confirm('Tem certeza que deseja excluir este ativo? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const res = await fetch(`/api/assets/${assetId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        loadAssets()
        setSelectedAsset(null)
      } else {
        alert('Erro ao excluir ativo')
      }
    } catch {
      alert('Erro ao conectar ao servidor')
    }
  }

  const handleEditSuccess = () => {
    loadAssets()
    if (selectedAsset) {
      loadAssetDetails(selectedAsset.id)
    }
    setIsEditingInPanel(false)
  }

  const handleCreateSuccess = () => {
    loadAssets()
    setIsCreating(false)
    setParentAssetForNew(undefined)
  }

  const handleCreateClose = () => {
    setIsCreating(false)
    setParentAssetForNew(undefined)
  }

  const closeSidePanel = () => {
    setSelectedAsset(null)
    setIsCreating(false)
    setIsEditingInPanel(false)
    setParentAssetForNew(undefined)
  }

  // Filtro de assets com busca e status (busca em todas as colunas da tabela)
  const statusLabels: Record<string, string> = {
    OPERATIONAL: 'operacional',
    DOWN: 'parado',
    IN_REPAIR: 'em reparo',
    IN_OPERATION: 'em operacao em operação',
    INACTIVE: 'inativo',
  }
  const normalizeSearch = (value: unknown): string => {
    if (value == null) return ''
    return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }
  const formatCreatedAt = (iso: string): string => {
    try {
      const d = new Date(iso)
      const dd = String(d.getDate()).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const yyyy = d.getFullYear()
      return `${dd}/${mm}/${yyyy} ${dd}-${mm}-${yyyy} ${yyyy}-${mm}-${dd}`
    } catch {
      return ''
    }
  }
  const filteredAssets = assets.filter(asset => {
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter
    if (!matchesStatus) return false
    const q = normalizeSearch(searchTerm.trim())
    if (!q) return true
    const haystack = [
      asset.name,
      asset.description,
      asset.protheusCode,
      asset.tag,
      asset.barCode,
      asset.parentAsset?.name,
      asset.parentAsset?.protheusCode,
      statusLabels[asset.status] || asset.status,
      asset.assetArea?.name,
      asset.area,
      asset.location?.name,
      formatCreatedAt(asset.createdAt),
    ]
      .map(normalizeSearch)
      .join(' ')
    return haystack.includes(q)
  })

  const showSidePanel = !!(selectedAsset || isCreating)

  const activePanel = isCreating ? (
    <AssetCreateModal
      isOpen={true}
      onClose={handleCreateClose}
      onSuccess={handleCreateSuccess}
      parentAsset={parentAssetForNew}
      inPage
    />
  ) : selectedAsset && isEditingInPanel ? (
    <AssetEditPanel
      asset={selectedAsset}
      onClose={() => setIsEditingInPanel(false)}
      onSuccess={handleEditSuccess}
    />
  ) : selectedAsset ? (
    <AssetDetailPanel
      asset={selectedAsset}
      onClose={() => {
        setSelectedAsset(null)
        setIsEditingInPanel(false)
      }}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  ) : null

  // Force table view on phone (tree not available)
  const effectiveViewMode = isPhone ? 'table' : viewMode

  const listContent = loading ? (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
        <p className="mt-2 text-muted-foreground">Carregando...</p>
      </div>
    </div>
  ) : (
    <div className="h-full flex flex-col overflow-hidden">
      {effectiveViewMode === 'tree' && (
        <div className="p-3 border-b border-border bg-surface flex-shrink-0">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Hierarquia de Ativos
          </p>
        </div>
      )}
      <div className={`flex-1 min-h-0 ${effectiveViewMode === 'tree' ? 'overflow-auto' : ''}`}>
        {effectiveViewMode === 'tree' ? (
          <AssetTree
            assets={filteredAssets}
            onSelectAsset={handleAssetSelect}
            selectedAssetId={selectedAsset?.id}
            onAddSubAsset={canCreate('assets') ? handleAddSubAsset : undefined}
          />
        ) : (
          <AssetTable
            assets={filteredAssets}
            onSelectAsset={handleAssetSelect}
            selectedAssetId={selectedAsset?.id}
            onEdit={canEdit('assets') ? handleEdit : undefined}
            onDelete={canDelete('assets') ? handleDelete : undefined}
            showUnit={isSuperAdminRole(user)}
          />
        )}
      </div>
    </div>
  )

  if (!user || !hasPermission(user, 'assets', 'view')) {
    return null
  }

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          title="Ativos"
          description="Gestao de bens e equipamentos"
          className="mb-0"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative w-full sm:w-48 xl:w-64">
                <Icon name="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar ativos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* View Mode Toggle — hidden on phone */}
              <div className="hidden sm:flex items-center bg-muted rounded-[4px] p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-sm font-medium transition-all ${
                    viewMode === 'table'
                      ? 'bg-background text-foreground ambient-shadow'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Visualização em Tabela"
                >
                  <Icon name="table" className="text-base" />
                  <span className="hidden md:inline">Tabela</span>
                </button>
                <button
                  onClick={() => setViewMode('tree')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-sm font-medium transition-all ${
                    viewMode === 'tree'
                      ? 'bg-background text-foreground ambient-shadow'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Visualização em Árvore"
                >
                  <Icon name="account_tree" className="text-base" />
                  <span className="hidden md:inline">Árvore</span>
                </button>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 text-sm border border-input rounded-[4px] bg-background focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
              >
                <option value="all">Todos os Status</option>
                <option value="OPERATIONAL">Operacional</option>
                <option value="DOWN">Parado</option>
                <option value="IN_REPAIR">Em Reparo</option>
                <option value="INACTIVE">Inativo</option>
              </select>

              <ExportButton data={filteredAssets} entity="assets" />
              {canCreate('assets') && (
                <Button onClick={handleAddNewAsset} className="whitespace-nowrap bg-accent-orange hover:bg-accent-orange/90 text-white font-bold shadow-md">
                  <Icon name="add" className="text-base" />
                  <span className="hidden sm:inline ml-1">Adicionar</span>
                </Button>
              )}
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
            panelTitle="Ativo"
            onClosePanel={closeSidePanel}
          />
        </div>
      </div>
    </PageContainer>
  )
}
