'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdaptiveSplitPanel } from '@/components/layout/AdaptiveSplitPanel'
import { useResponsiveLayout } from '@/hooks/useMediaQuery'
import { useAuth } from '@/hooks/useAuth'
import { Icon } from '@/components/ui/Icon'

import { formatDate } from '@/lib/utils'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'
import { useDebounce } from '@/hooks/useDebounce'
import { ExportButton } from '@/components/ui/ExportButton'
import { hasPermission } from '@/lib/permissions'
import { getDefaultCmmsPath } from '@/lib/user-roles'

const RAFViewModal = dynamic(() => import('@/components/rafs/RAFViewModal').then(m => ({ default: m.RAFViewModal })), { ssr: false })
const RAFEditModal = dynamic(() => import('@/components/rafs/RAFEditModal').then(m => ({ default: m.RAFEditModal })), { ssr: false })

interface RAFWorkOrder {
  id: string
  internalId?: string
  osType?: string
  maintenanceArea?: { id: string; name: string; code?: string }
  asset?: { id: string; name: string; tag?: string; protheusCode?: string }
}

interface RAFRequest {
  id: string
  requestNumber?: string | null
  title?: string | null
  asset?: { id: string; name: string; tag?: string; protheusCode?: string } | null
  maintenanceArea?: { id: string; name: string; code?: string } | null
}

interface RAF {
  id: string
  rafNumber: string
  occurrenceDate: string
  occurrenceTime: string
  panelOperator: string
  failureType: string
  createdAt: string
  workOrder?: RAFWorkOrder | null
  request?: RAFRequest | null
  createdBy?: {
    firstName: string
    lastName: string
  }
}

type SortField = 'number' | 'area' | 'assetCode' | 'assetName' | 'workOrderNumber' | 'occurrenceDate' | 'panelOperator' | 'type'
type SortDirection = 'asc' | 'desc'

export default function RAFsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [rafs, setRafs] = useState<RAF[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 500)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table')
  const { isPhone } = useResponsiveLayout()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [rafToDelete, setRafToDelete] = useState<string | null>(null)
  const [selectedRAF, setSelectedRAF] = useState<RAF | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [rafToEdit, setRafToEdit] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('occurrenceDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const showSidePanel = !!(!!selectedRAF || showEditModal)

  const hasAccess = !!user && hasPermission(user, 'rafs', 'view')

  useEffect(() => {
    if (authLoading || !user) return
    if (!hasPermission(user, 'rafs', 'view')) {
      router.push(getDefaultCmmsPath(user))
      return
    }
    loadRAFs()
  }, [authLoading, router, user])

  const loadRAFs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/rafs?summary=true')
      const data = await res.json()
      setRafs(data.data || [])
    } catch (error) {
      console.error('Error loading RAFs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleView = async (id: string) => {
    try {
      const res = await fetch(`/api/rafs/${id}`)
      const data = await res.json()
      if (res.ok) {
        setShowEditModal(false)
        setRafToEdit(null)
        setSelectedRAF(data.data)
      } else {
        alert(data.error || 'Erro ao carregar RAF')
      }
    } catch (error) {
      console.error('Error loading RAF:', error)
      alert('Erro ao carregar RAF')
    }
  }

  const handleEdit = (id: string) => {
    setSelectedRAF(null)
    setRafToEdit(id)
    setShowEditModal(true)
  }

  const handleDelete = (id: string) => {
    setRafToDelete(id)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!rafToDelete) return

    try {
      const res = await fetch(`/api/rafs/${rafToDelete}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        loadRAFs()
        if (selectedRAF?.id === rafToDelete) setSelectedRAF(null)
      } else {
        alert('Erro ao excluir RAF')
      }
    } catch (error) {
      console.error('Error deleting RAF:', error)
      alert('Erro ao excluir RAF')
    } finally {
      setShowDeleteModal(false)
      setRafToDelete(null)
    }
  }

  // Helpers que aceitam tanto RAF de OS quanto RAF de SS
  const getRafAssetName = (raf: RAF) =>
    raf.workOrder?.asset?.name || raf.request?.asset?.name || ''
  const getRafAssetTag = (raf: RAF) =>
    raf.workOrder?.asset?.tag
    || raf.workOrder?.asset?.protheusCode
    || raf.request?.asset?.tag
    || raf.request?.asset?.protheusCode
    || ''
  const getRafAreaLabel = (raf: RAF) => {
    const area = raf.workOrder?.maintenanceArea || raf.request?.maintenanceArea
    if (!area) return ''
    if (area.code) return `${area.code} - ${area.name}`
    return area.name || ''
  }
  const getRafOriginNumber = (raf: RAF) =>
    raf.workOrder?.internalId || raf.request?.requestNumber || ''
  const getRafOriginType = (raf: RAF): 'OS' | 'SS' | null => {
    if (raf.workOrder?.internalId) return 'OS'
    if (raf.request?.requestNumber || raf.request?.id) return 'SS'
    return null
  }

  const filteredRAFs = rafs.filter(raf => {
    if (debouncedSearchTerm === '') return true
    const term = debouncedSearchTerm.toLowerCase()
    return (
      raf.rafNumber.toLowerCase().includes(term) ||
      getRafAssetName(raf).toLowerCase().includes(term) ||
      getRafAssetTag(raf).toLowerCase().includes(term) ||
      getRafAreaLabel(raf).toLowerCase().includes(term) ||
      getRafOriginNumber(raf).toLowerCase().includes(term) ||
      raf.panelOperator.toLowerCase().includes(term)
    )
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDirection('asc')
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <Icon name="unfold_more" className="text-sm text-muted-foreground" />
    }
    return (
      <Icon
        name={sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
        className="text-sm text-accent-orange"
      />
    )
  }

  const sortedRAFs = [...filteredRAFs].sort((a, b) => {
    const modifier = sortDirection === 'asc' ? 1 : -1
    switch (sortField) {
      case 'number':
        return modifier * (a.rafNumber || '').localeCompare(b.rafNumber || '')
      case 'area':
        return modifier * getRafAreaLabel(a).localeCompare(getRafAreaLabel(b))
      case 'assetCode':
        return modifier * getRafAssetTag(a).localeCompare(getRafAssetTag(b))
      case 'assetName':
        return modifier * getRafAssetName(a).localeCompare(getRafAssetName(b))
      case 'workOrderNumber':
        return modifier * getRafOriginNumber(a).localeCompare(getRafOriginNumber(b))
      case 'occurrenceDate':
        return modifier * (a.occurrenceDate || '').localeCompare(b.occurrenceDate || '')
      case 'panelOperator':
        return modifier * (a.panelOperator || '').localeCompare(b.panelOperator || '')
      case 'type':
        return modifier * (a.failureType || '').localeCompare(b.failureType || '')
      default:
        return 0
    }
  })

  if (authLoading || !hasAccess) {
    return null
  }

  const closeSidePanel = () => {
    setSelectedRAF(null)
    setShowEditModal(false)
    setRafToEdit(null)
  }

  const activePanel = showEditModal && rafToEdit ? (
    <RAFEditModal
      isOpen={true}
      onClose={() => { setShowEditModal(false); setRafToEdit(null) }}
      rafId={rafToEdit}
      onSuccess={() => { setShowEditModal(false); setRafToEdit(null); loadRAFs() }}
      inPage
    />
  ) : selectedRAF ? (
    <RAFViewModal
      isOpen={true}
      onClose={() => setSelectedRAF(null)}
      raf={selectedRAF}
      inPage
      onEdit={(id) => handleEdit(id)}
      onDelete={(id) => handleDelete(id)}
    />
  ) : null

  const listContent = loading ? (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
        <p className="mt-2 text-muted-foreground">Carregando...</p>
      </div>
    </div>
  ) : filteredRAFs.length === 0 ? (
    <div className="flex-1 flex items-center justify-center p-12 text-center">
      <div>
        <Icon name="description" className="text-6xl text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma RAF encontrada</h3>
        <p className="text-muted-foreground">
          {searchTerm ? 'Tente ajustar sua busca' : 'RAFs podem ser geradas automaticamente em OS corretivas imediatas ou abertas diretamente a partir de uma SS aprovada'}
        </p>
      </div>
    </div>
  ) : (
    <div className="h-full flex flex-col overflow-hidden">
    {viewMode === 'cards' || isPhone ? (
    <div className="overflow-auto flex-1 p-4 md:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
        {filteredRAFs.map((raf) => (
          <div
            key={raf.id}
            onClick={() => handleView(raf.id)}
            className={`bg-card rounded-[4px] ambient-shadow p-3 hover:shadow-md transition-all cursor-pointer ${selectedRAF?.id === raf.id ? 'ring-2 ring-primary' : ''}`}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Icon name="description" className="text-base text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate">
                      {raf.rafNumber}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {getRafAssetTag(raf) || '—'} | {getRafAssetName(raf) || '—'}
                    </p>
                  </div>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${
                  raf.failureType === 'REPETITIVE'
                    ? 'bg-danger-light text-foreground'
                    : 'bg-warning-light text-foreground'
                }`}>
                  {raf.failureType === 'REPETITIVE' ? 'Rep' : 'Alea'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Icon name="calendar_today" className="text-sm" />
                  <span>{formatDate(raf.occurrenceDate)}</span>
                </div>
                {getRafOriginNumber(raf) && (
                  <div className="flex items-center gap-1">
                    <Icon name={getRafOriginType(raf) === 'SS' ? 'support' : 'assignment'} className="text-sm" />
                    <span className="font-mono">
                      {getRafOriginType(raf) === 'SS' ? 'SS ' : ''}
                      {getRafOriginNumber(raf)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1 truncate">
                  <Icon name="person" className="text-sm" />
                  <span className="truncate">{raf.panelOperator}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    ) : (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      <div className="flex-1 overflow-auto min-h-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 bg-secondary z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('number')} className="flex items-center gap-1">
                  <span>RAF</span>
                  {renderSortIcon('number')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('area')} className="flex items-center gap-1">
                  <span>Area</span>
                  {renderSortIcon('area')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('assetCode')} className="flex items-center gap-1">
                  <span>Cod. Bem</span>
                  {renderSortIcon('assetCode')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('assetName')} className="flex items-center gap-1">
                  <span>Nome do Bem</span>
                  {renderSortIcon('assetName')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('workOrderNumber')} className="flex items-center gap-1">
                  <span>Origem</span>
                  {renderSortIcon('workOrderNumber')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('occurrenceDate')} className="flex items-center gap-1">
                  <span>Data</span>
                  {renderSortIcon('occurrenceDate')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('panelOperator')} className="flex items-center gap-1">
                  <span>Operador</span>
                  {renderSortIcon('panelOperator')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('type')} className="flex items-center gap-1">
                  <span>Tipo</span>
                  {renderSortIcon('type')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-100">
            {sortedRAFs.map((raf) => (
              <tr
                key={raf.id}
                onClick={() => handleView(raf.id)}
                className={`odd:bg-gray-50 even:bg-white hover:bg-secondary cursor-pointer transition-colors ${selectedRAF?.id === raf.id ? 'bg-secondary' : ''}`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Icon name="description" className="text-base text-primary" />
                    <span className="text-sm font-semibold text-foreground">{raf.rafNumber}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {getRafAreaLabel(raf) || '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-mono">
                  {getRafAssetTag(raf) || '—'}
                </td>
                <td className="px-6 py-4 max-w-xs">
                  <div className="text-sm text-foreground truncate">{getRafAssetName(raf) || '—'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-mono">
                  {getRafOriginNumber(raf) ? (
                    <span className="inline-flex items-center gap-1">
                      {getRafOriginType(raf) === 'SS' && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">SS</span>
                      )}
                      {getRafOriginNumber(raf)}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{formatDate(raf.occurrenceDate)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{raf.panelOperator}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    raf.failureType === 'REPETITIVE'
                      ? 'bg-danger-light text-foreground'
                      : 'bg-warning-light text-foreground'
                  }`}>
                    {raf.failureType === 'REPETITIVE' ? 'REPETITIVA' : 'ALEATORIA'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    )}
    </div>
  )

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          title="Relatorios de Analise de Falha (RAF)"
          description="Geradas em OS corretivas imediatas ou diretamente a partir de uma SS aprovada"
          className="mb-0"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-full sm:w-48 xl:w-64">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 transform text-base text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar RAF, bem, area..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="hidden md:flex items-center bg-muted rounded-[4px] p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-sm font-medium transition-all ${
                    viewMode === 'table'
                      ? 'bg-background text-foreground ambient-shadow'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Visualizacao em Tabela"
                >
                  <Icon name="table" className="text-base" />
                  <span className="hidden md:inline">Tabela</span>
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-sm font-medium transition-all ${
                    viewMode === 'cards'
                      ? 'bg-background text-foreground ambient-shadow'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Visualizacao em Cartoes"
                >
                  <Icon name="grid_view" className="text-base" />
                  <span className="hidden md:inline">Grade</span>
                </button>
              </div>

              <ExportButton data={filteredRAFs} entity="rafs" />
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
            panelTitle="RAF"
            onClosePanel={closeSidePanel}
          />
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusao"
        message="Tem certeza que deseja excluir esta RAF? Esta acao nao pode ser desfeita."
      />
    </PageContainer>
  )
}
