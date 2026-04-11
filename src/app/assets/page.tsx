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
import { useIsMobile } from '@/hooks/useMediaQuery'
import { ExportButton } from '@/components/ui/ExportButton'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { hasPermission } from '@/lib/permissions'
import { getDefaultCmmsPath, isSuperAdminRole } from '@/lib/user-roles'

// Lazy load: modais e painéis só carregam quando necessário
const AssetDetailPanel = dynamic(() => import('@/components/assets/AssetDetailPanel').then(m => ({ default: m.AssetDetailPanel })), { ssr: false })
const AssetEditPanel = dynamic(() => import('@/components/assets/AssetEditPanel').then(m => ({ default: m.AssetEditPanel })), { ssr: false })
const AssetDetailModal = dynamic(() => import('@/components/assets/AssetDetailModal').then(m => ({ default: m.AssetDetailModal })), { ssr: false })
const AssetEditModal = dynamic(() => import('@/components/assets/AssetEditModal').then(m => ({ default: m.AssetEditModal })), { ssr: false })
const AssetCreateModal = dynamic(() => import('@/components/assets/AssetCreateModal').then(m => ({ default: m.AssetCreateModal })), { ssr: false })

type ViewMode = 'tree' | 'table'

interface Asset {
  id: string
  name: string
  description?: string
  status: string
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
  const isMobile = useIsMobile()
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

  // Filtro de assets com busca e status - Estilo TracOS
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter
    return matchesSearch && matchesStatus
  })

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
              <div className="relative w-64">
                <Icon name="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar ativos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-muted rounded-[4px] p-1">
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
                className="h-9 px-3 text-sm border border-input rounded-[4px] bg-background focus:outline-none focus:ring-2 focus:ring-ring"
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
                  <Icon name="add" className="mr-2 text-base" />
                  Adicionar
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
              <p className="mt-2 text-muted-foreground">Carregando...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop: Tree/Table View with Panels */}
            {!isMobile && (
              <>
                {/* Left Panel - Asset Tree ou Table baseado no viewMode */}
                <div
                  className={`${
                    (selectedAsset || isCreating) ? 'w-1/2' : 'w-full'
                  } ${
                    viewMode === 'tree' ? 'border-r border-border' : ''
                  } transition-all overflow-hidden`}
                >
                  <div className="h-full flex flex-col overflow-hidden">
                    {viewMode === 'tree' && (
                      <div className="p-3 border-b border-border bg-surface flex-shrink-0">
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                          Hierarquia de Ativos
                        </p>
                      </div>
                    )}
                    <div className={`flex-1 min-h-0 ${viewMode === 'tree' ? 'overflow-auto' : ''}`}>
                      {viewMode === 'tree' ? (
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
                </div>

                {/* Right Panel - Create, Edit, or Details */}
                {isCreating && (
                  <div className="w-1/2">
                    <AssetCreateModal
                      isOpen={true}
                      onClose={handleCreateClose}
                      onSuccess={handleCreateSuccess}
                      parentAsset={parentAssetForNew}
                      inPage
                    />
                  </div>
                )}
                {!isCreating && selectedAsset && (
                  <div className="w-1/2">
                    {selectedAsset && isEditingInPanel ? (
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
                    ) : null}
                  </div>
                )}
              </>
            )}

            {/* Mobile: Tree/Table View with Modals */}
            {isMobile && (
              <div className={`w-full ${viewMode === 'tree' ? 'border-r border-border' : ''} overflow-hidden`}>
                <div className="h-full flex flex-col overflow-hidden">
                  {viewMode === 'tree' && (
                    <div className="p-3 border-b border-border bg-surface flex-shrink-0">
                      <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                        Hierarquia de Ativos
                      </p>
                    </div>
                  )}
                  <div className={`flex-1 min-h-0 ${viewMode === 'tree' ? 'overflow-auto' : ''}`}>
                    {viewMode === 'tree' ? (
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
              </div>
            )}
          </>
        )}
        </div>
      </div>

      {/* Modals for Mobile */}
      {isMobile && selectedAsset && !isEditingInPanel && (
        <AssetDetailModal
          isOpen={true}
          onClose={() => {
            setSelectedAsset(null)
            setIsEditingInPanel(false)
          }}
          asset={selectedAsset}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {isMobile && selectedAsset && isEditingInPanel && (
        <AssetEditModal
          isOpen={true}
          onClose={() => setIsEditingInPanel(false)}
          asset={selectedAsset}
          onSuccess={handleEditSuccess}
        />
      )}

      {isMobile && isCreating && (
        <AssetCreateModal
          isOpen={true}
          onClose={handleCreateClose}
          onSuccess={handleCreateSuccess}
          parentAsset={parentAssetForNew}
        />
      )}
    </PageContainer>
  )
}
