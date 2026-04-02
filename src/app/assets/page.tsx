'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Plus, Search, LayoutGrid, Table2, Filter } from 'lucide-react'
import { getStatusColor } from '@/lib/utils'
import { AssetTree } from '@/components/assets/AssetTree'
import { AssetTable } from '@/components/assets/AssetTable'
import { AssetDetailPanel } from '@/components/assets/AssetDetailPanel'
import { AssetEditPanel } from '@/components/assets/AssetEditPanel'
import { AssetCreatePanel } from '@/components/assets/AssetCreatePanel'
import { AssetDetailModal } from '@/components/assets/AssetDetailModal'
import { AssetEditModal } from '@/components/assets/AssetEditModal'
import { AssetCreateModal } from '@/components/assets/AssetCreateModal'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { ExportButton } from '@/components/ui/ExportButton'

type ViewMode = 'tree' | 'table'

interface Asset {
  id: string
  name: string
  description?: string
  status: string
  barCode?: string
  acquisitionCost?: number
  area?: number
  location?: { name: string; id: string }
  category?: { name: string; id: string }
  primaryUser?: { firstName: string; lastName: string }
  parentAssetId?: string | null
  childAssets?: Asset[]
  files?: Array<{ id: string; url: string; name: string; mimeType?: string }>
  createdAt: string
  updatedAt: string
}

export default function AssetsPage() {
  const isMobile = useIsMobile()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [parentAssetForNew, setParentAssetForNew] = useState<{ id: string; name: string } | undefined>(undefined)
  const [isEditingInPanel, setIsEditingInPanel] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('tree')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadAssets()
  }, [])

  const loadAssets = async () => {
    try {
      const res = await fetch('/api/assets')
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

  const handleEdit = (asset: Asset) => {
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
    } catch (error) {
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

  return (
    <AppLayout>
      <div className="h-full flex flex-col overflow-hidden">
      {/* Header - Inspirado no TracOS da Tractian */}
      <div className="border-b border-border bg-card px-4 md:px-6 py-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3 md:gap-4 flex-1 w-full sm:w-auto">
            <h1 className="text-lg md:text-xl font-bold text-foreground">Ativos</h1>
            
            {/* Search */}
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar ativos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* View Mode Toggle - Estilo TracOS */}
            <div className="flex items-center bg-secondary rounded-lg p-1">
              <button
                onClick={() => setViewMode('tree')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'tree'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Visualização em Árvore"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden md:inline">Árvore</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'table'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Visualização em Tabela"
              >
                <Table2 className="w-4 h-4" />
                <span className="hidden md:inline">Tabela</span>
              </button>
            </div>

            {/* Status Filter - Estilo TracOS */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">Todos os Status</option>
              <option value="OPERATIONAL">Operacional</option>
              <option value="DOWN">Parado</option>
              <option value="IN_REPAIR">Em Reparo</option>
              <option value="INACTIVE">Inativo</option>
            </select>

            <ExportButton data={filteredAssets} entity="assets" />
            <Button onClick={handleAddNewAsset} className="whitespace-nowrap">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          </div>
        ) : (
          <>
            {/* Desktop: Tree/Table View with Panels - Inspirado no TracOS */}
            {!isMobile && (
              <>
                {/* Left Panel - Asset Tree ou Table baseado no viewMode */}
                <div className={`${selectedAsset || isCreating ? 'w-1/2' : 'w-full'} border-r border-border bg-card transition-all overflow-hidden`}>
                  <div className="h-full flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-border bg-secondary flex-shrink-0">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {viewMode === 'tree' ? 'Hierarquia de Ativos' : 'Lista de Ativos'}
                      </p>
                    </div>
                    <div className={`flex-1 min-h-0 ${viewMode === 'tree' ? 'overflow-auto' : ''}`}>
                      {viewMode === 'tree' ? (
                        <AssetTree 
                          assets={filteredAssets} 
                          onSelectAsset={handleAssetSelect}
                          selectedAssetId={selectedAsset?.id}
                          onAddSubAsset={handleAddSubAsset}
                        />
                      ) : (
                        <AssetTable 
                          assets={filteredAssets} 
                          onSelectAsset={handleAssetSelect}
                          selectedAssetId={selectedAsset?.id}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Panel - Create, Edit, or Details */}
                {(isCreating || selectedAsset) && (
                  <div className="w-1/2">
                    {isCreating ? (
                      <AssetCreatePanel
                        onClose={handleCreateClose}
                        onSuccess={handleCreateSuccess}
                        parentAsset={parentAssetForNew}
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
                    ) : null}
                  </div>
                )}
              </>
            )}

            {/* Mobile: Tree/Table View with Modals - Inspirado no TracOS */}
            {isMobile && (
              <div className="w-full border-r border-border bg-card overflow-hidden">
                <div className="h-full flex flex-col overflow-hidden">
                  <div className="p-3 border-b border-border bg-secondary flex-shrink-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {viewMode === 'tree' ? 'Hierarquia de Ativos' : 'Lista de Ativos'}
                    </p>
                  </div>
                  <div className={`flex-1 min-h-0 ${viewMode === 'tree' ? 'overflow-auto' : ''}`}>
                    {viewMode === 'tree' ? (
                      <AssetTree 
                        assets={filteredAssets} 
                        onSelectAsset={handleAssetSelect}
                        selectedAssetId={selectedAsset?.id}
                        onAddSubAsset={handleAddSubAsset}
                      />
                    ) : (
                      <AssetTable 
                        assets={filteredAssets} 
                        onSelectAsset={handleAssetSelect}
                        selectedAssetId={selectedAsset?.id}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals for Mobile */}
      {isMobile && selectedAsset && !isEditingInPanel && (
        <div 
          className="fixed top-16 left-0 right-0 bottom-0 bg-black/20 z-40 overflow-y-auto lg:left-64"
          onClick={() => {
            setSelectedAsset(null)
            setIsEditingInPanel(false)
          }}
        >
          <div className="max-w-7xl mx-auto p-4" onClick={(e) => e.stopPropagation()}>
            <AssetDetailModal
              isOpen={true}
              onClose={() => {
                setSelectedAsset(null)
                setIsEditingInPanel(false)
              }}
              asset={selectedAsset}
              onEdit={handleEdit}
              onDelete={handleDelete}
              inPage={true}
            />
          </div>
        </div>
      )}

      {isMobile && selectedAsset && isEditingInPanel && (
        <div 
          className="fixed top-16 left-0 right-0 bottom-0 bg-black/20 z-40 overflow-y-auto lg:left-64"
          onClick={() => setIsEditingInPanel(false)}
        >
          <div className="max-w-7xl mx-auto p-4" onClick={(e) => e.stopPropagation()}>
            <AssetEditModal
              isOpen={true}
              onClose={() => setIsEditingInPanel(false)}
              asset={selectedAsset}
              onSuccess={handleEditSuccess}
              inPage={true}
            />
          </div>
        </div>
      )}

      {isMobile && isCreating && (
        <div 
          className="fixed top-16 left-0 right-0 bottom-0 bg-black/20 z-40 overflow-y-auto lg:left-64"
          onClick={handleCreateClose}
        >
          <div className="max-w-7xl mx-auto p-4" onClick={(e) => e.stopPropagation()}>
            <AssetCreateModal
              isOpen={true}
              onClose={handleCreateClose}
              onSuccess={handleCreateSuccess}
              parentAsset={parentAssetForNew}
              inPage={true}
            />
          </div>
        </div>
      )}
      </div>
    </AppLayout>
  )
}
