'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/layout/PageHeader'
import { ExportButton } from '@/components/ui/ExportButton'
import { StandardAssetDetailPanel } from '@/components/standard-assets/StandardAssetDetailPanel'
import { useIsMobile } from '@/hooks/useMediaQuery'

const StandardAssetFormPanel = dynamic(
  () => import('@/components/standard-assets/StandardAssetFormPanel'),
  { ssr: false }
)

/* ------------------------------------------------------------------ */
/*  Tipos                                                               */
/* ------------------------------------------------------------------ */

interface StandardAssetCharacteristic {
  characteristicId: string
  value: string | null
  unit: string | null
  characteristic?: {
    unit?: string | null
  } | null
}

interface StandardAsset {
  id: string
  familyId: string
  family?: { id: string; code: string; name: string }
  name: string | null
  costCenterCode: string | null
  costCenterName: string | null
  shiftCode: string | null
  workCenterCode: string | null
  workCenterName: string | null
  supplierCode: string | null
  supplierStore: string | null
  modelType: string | null
  manufacturer: string | null
  modelName: string | null
  serialNumber: string | null
  warehouse: string | null
  priority: string | null
  hourlyCost: number | null
  hasCounter: boolean
  assetMovement: string | null
  trackingPeriod: string | null
  unitOfMeasure: string | null
  imageUrl: string | null
  counterType: string | null
  coupling: string | null
  annualCoupValue: number | null
  createdAt: string
  characteristics?: StandardAssetCharacteristic[]
}

type SortField = 'family' | 'name' | 'manufacturer' | 'modelType' | 'priority' | 'shiftCode' | 'hasCounter'
type SortDirection = 'asc' | 'desc'

/* ------------------------------------------------------------------ */
/*  Componente principal                                                */
/* ------------------------------------------------------------------ */

export default function StandardAssetsPage() {
  const [items, setItems] = useState<StandardAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('family')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedItem, setSelectedItem] = useState<StandardAsset | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [editingItem, setEditingItem] = useState<StandardAsset | null>(null)
  const isMobile = useIsMobile()

  const hasSidePanel = !isMobile && (!!selectedItem || isCreating || !!editingItem)

  useEffect(() => {
    loadData()
  }, [])

  /* ---------------------------------------------------------------- */
  /*  Data loading                                                     */
  /* ---------------------------------------------------------------- */

  const loadData = async () => {
    try {
      const res = await fetch('/api/standard-assets')
      const data = await res.json()
      setItems(data.data || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  const handleNew = () => {
    setSelectedItem(null)
    setEditingItem(null)
    setIsCreating(true)
  }

  const handleEdit = (item: StandardAsset) => {
    setSelectedItem(null)
    setIsCreating(false)
    setEditingItem(item)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este Bem Padrão?')) return
    try {
      const res = await fetch(`/api/standard-assets/${id}`, { method: 'DELETE' })
      if (res.ok) {
        if (selectedItem?.id === id) setSelectedItem(null)
        if (editingItem?.id === id) setEditingItem(null)
        loadData()
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao excluir')
      }
    } catch {
      alert('Erro ao conectar ao servidor')
    }
  }

  const handleCloseDetail = () => setSelectedItem(null)

  const handleEditFromPanel = (item: StandardAsset) => {
    setSelectedItem(null)
    handleEdit(item)
  }

  const handleDeleteFromPanel = async (id: string) => {
    await handleDelete(id)
    setSelectedItem(null)
  }

  /* ---------------------------------------------------------------- */
  /*  Ordenação e filtro                                               */
  /* ---------------------------------------------------------------- */

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(current => current === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortField(field)
    setSortDirection('asc')
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <Icon name="unfold_more" className="text-sm text-muted-foreground" />
    }
    return <Icon name={sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'} className="text-sm text-foreground" />
  }

  const filteredItems = items.filter(item => {
    const familyName = item.family ? `${item.family.code} - ${item.family.name}` : ''
    return (
      familyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.manufacturer || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const sortedItems = [...filteredItems].sort((a, b) => {
    const modifier = sortDirection === 'asc' ? 1 : -1
    const getValue = (item: StandardAsset) => {
      switch (sortField) {
        case 'family': return item.family ? `${item.family.code} - ${item.family.name}` : ''
        case 'name': return item.name || ''
        case 'manufacturer': return item.manufacturer || ''
        case 'modelType': return item.modelType || ''
        case 'priority': return item.priority || ''
        case 'shiftCode': return item.shiftCode || ''
        case 'hasCounter': return item.hasCounter ? 'Sim' : 'Não'
        default: return ''
      }
    }
    return getValue(a).toLowerCase().localeCompare(getValue(b).toLowerCase()) * modifier
  })

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          title="Bens Padrão"
          description="Cadastro de bens padrão para pré-preenchimento"
          className="mb-0"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-64">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por família, nome, fabricante..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <ExportButton data={sortedItems} entity="standard-assets" />
              <Button onClick={handleNew} className="whitespace-nowrap">
                <Icon name="add" className="mr-2 text-base" />
                Novo Bem Padrão
              </Button>
            </div>
          }
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          {/* Coluna esquerda: tabela */}
          <div className={`${hasSidePanel ? 'w-1/2 min-w-0' : 'w-full'} transition-all overflow-hidden flex flex-col`}>
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant" />
                  <p className="mt-2 text-muted-foreground">Carregando...</p>
                </div>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <Icon name="inventory_2" className="text-5xl mb-3" />
                <p className="text-lg font-medium">Nenhum Bem Padrão cadastrado</p>
                <p className="text-sm">Cadastre um bem padrão para pré-preencher automaticamente os bens individuais.</p>
              </div>
            ) : (
              <div className="h-full flex flex-col bg-card overflow-hidden">
                <div className="flex-1 overflow-auto min-h-0">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="sticky top-0 bg-secondary z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          <button type="button" onClick={() => handleSort('family')} className="flex items-center gap-1">
                            Família {renderSortIcon('family')}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          <button type="button" onClick={() => handleSort('name')} className="flex items-center gap-1">
                            Nome {renderSortIcon('name')}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                          <button type="button" onClick={() => handleSort('modelType')} className="flex items-center gap-1">
                            Modelo {renderSortIcon('modelType')}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                          <button type="button" onClick={() => handleSort('priority')} className="flex items-center gap-1">
                            Criticidade {renderSortIcon('priority')}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                          <button type="button" onClick={() => handleSort('hasCounter')} className="flex items-center gap-1">
                            Contador {renderSortIcon('hasCounter')}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-gray-200">
                      {sortedItems.map(item => (
                        <tr
                          key={item.id}
                          onClick={() => {
                            setIsCreating(false)
                            setEditingItem(null)
                            setSelectedItem(item)
                          }}
                          className={`transition-colors cursor-pointer ${
                            selectedItem?.id === item.id || editingItem?.id === item.id
                              ? 'bg-secondary'
                              : 'hover:bg-secondary'
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground text-sm">
                            {item.family ? `${item.family.code} - ${item.family.name}` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{item.name || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground hidden md:table-cell">{item.modelType || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground hidden lg:table-cell">{item.priority || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground hidden lg:table-cell">{item.hasCounter ? 'Sim' : 'Não'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Coluna direita: painel lateral (desktop) */}
          {hasSidePanel && (
            <div className="w-1/2 min-w-0">
              {isCreating ? (
                <StandardAssetFormPanel
                  inPage
                  allItems={items}
                  onClose={() => setIsCreating(false)}
                  onSuccess={() => { setIsCreating(false); loadData() }}
                />
              ) : editingItem ? (
                <StandardAssetFormPanel
                  inPage
                  editingItem={editingItem}
                  allItems={items}
                  onClose={() => setEditingItem(null)}
                  onSuccess={() => { setEditingItem(null); loadData() }}
                />
              ) : selectedItem ? (
                <StandardAssetDetailPanel
                  item={selectedItem}
                  onClose={handleCloseDetail}
                  onEdit={handleEditFromPanel}
                  onDelete={handleDeleteFromPanel}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: detail como modal */}
      {isMobile && selectedItem && !isCreating && !editingItem && (
        <Modal isOpen onClose={handleCloseDetail} title={selectedItem.name || selectedItem.family?.name || 'Bem Padrão'} hideHeader noPadding>
          <StandardAssetDetailPanel
            item={selectedItem}
            onClose={handleCloseDetail}
            onEdit={handleEditFromPanel}
            onDelete={handleDeleteFromPanel}
          />
        </Modal>
      )}

      {/* Mobile: criar */}
      {isMobile && isCreating && (
        <StandardAssetFormPanel
          allItems={items}
          onClose={() => setIsCreating(false)}
          onSuccess={() => { setIsCreating(false); loadData() }}
        />
      )}

      {/* Mobile: editar */}
      {isMobile && editingItem && (
        <StandardAssetFormPanel
          editingItem={editingItem}
          allItems={items}
          onClose={() => setEditingItem(null)}
          onSuccess={() => { setEditingItem(null); loadData() }}
        />
      )}
    </PageContainer>
  )
}
