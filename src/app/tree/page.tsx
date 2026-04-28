'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdaptiveSplitPanel } from '@/components/layout/AdaptiveSplitPanel'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { AssetTree } from '@/components/assets/AssetTree'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { hasPermission } from '@/lib/permissions'
import { getDefaultCmmsPath } from '@/lib/user-roles'

const AssetDetailPanel = dynamic(() => import('@/components/assets/AssetDetailPanel').then(m => ({ default: m.AssetDetailPanel })), { ssr: false })
const AssetEditPanel = dynamic(() => import('@/components/assets/AssetEditPanel').then(m => ({ default: m.AssetEditPanel })), { ssr: false })
const AssetCreateModal = dynamic(() => import('@/components/assets/AssetCreateModal').then(m => ({ default: m.AssetCreateModal })), { ssr: false })

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
  workCenterId?: string | null
  assetWorkCenter?: { id: string; name: string } | null
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

export default function TreePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { canCreate, canEdit: _canEdit, canDelete: _canDelete } = usePermissions()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [parentAssetForNew, setParentAssetForNew] = useState<{ id: string; name: string } | undefined>(undefined)
  const [isEditingInPanel, setIsEditingInPanel] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    if (!user || !hasPermission(user, 'tree', 'view')) return
    loadAssets()
  }, [user])

  useEffect(() => {
    if (!user) return
    if (!hasPermission(user, 'tree', 'view')) {
      router.replace(getDefaultCmmsPath(user))
    }
  }, [router, user])

  const loadAssets = async () => {
    try {
      const res = await fetch('/api/assets?summary=true&all=true')
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
      const res = await fetch(`/api/assets/${assetId}`, { method: 'DELETE' })
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

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter
    return matchesSearch && matchesStatus
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

  const listContent = loading ? (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
        <p className="mt-2 text-muted-foreground">Carregando...</p>
      </div>
    </div>
  ) : (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-3 border-b border-border bg-surface flex-shrink-0">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Hierarquia de Ativos
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <AssetTree
          assets={filteredAssets}
          onSelectAsset={handleAssetSelect}
          selectedAssetId={selectedAsset?.id}
          onAddSubAsset={canCreate('assets') ? handleAddSubAsset : undefined}
        />
      </div>
    </div>
  )

  if (!user || !hasPermission(user, 'tree', 'view')) {
    return null
  }

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          title="Árvore"
          description="Navegação hierárquica de ativos"
          className="mb-0"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
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
