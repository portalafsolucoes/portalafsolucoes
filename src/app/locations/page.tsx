'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { AdaptiveSplitPanel } from '@/components/layout/AdaptiveSplitPanel'
import { useAuth } from '@/hooks/useAuth'
import { hasPermission } from '@/lib/permissions'
import { getDefaultCmmsPath } from '@/lib/user-roles'
import { usePermissions } from '@/hooks/usePermissions'
import { useResponsiveLayout } from '@/hooks/useMediaQuery'

const LocationDetailPanel = dynamic(
  () => import('@/components/locations/LocationDetailPanel').then(m => ({ default: m.LocationDetailPanel })),
  { ssr: false }
)
const LocationFormPanel = dynamic(
  () => import('@/components/locations/LocationFormPanel').then(m => ({ default: m.LocationFormPanel })),
  { ssr: false }
)

type ViewMode = 'table' | 'grid'
type SortField = 'name' | 'address' | 'assets' | 'orders'
type SortDirection = 'asc' | 'desc'

interface Location {
  id: string
  name: string
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  parentId?: string | null
  parent?: { id: string; name: string } | null
  _count?: {
    assets: number
    workOrders: number
  }
}

export default function LocationsPage() {
  const router = useRouter()
  const { isPhone } = useResponsiveLayout()
  const { user } = useAuth()
  const { canCreate, canEdit, canDelete } = usePermissions()

  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (!user || !hasPermission(user, 'locations', 'view')) return
    loadLocations()
  }, [user])

  useEffect(() => {
    if (!user) return
    if (!hasPermission(user, 'locations', 'view')) {
      router.replace(getDefaultCmmsPath(user))
    }
  }, [router, user])

  const loadLocations = async () => {
    try {
      const res = await fetch('/api/locations')
      const data = await res.json()
      setLocations(data.data || [])
    } catch (error) {
      console.error('Error loading locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadLocationDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/locations/${id}`)
      const data = await res.json()
      if (data.data) setSelectedLocation(data.data)
    } catch (error) {
      console.error('Error loading location details:', error)
    }
  }

  const handleSelectLocation = (location: Location) => {
    setIsEditing(false)
    setIsCreating(false)
    loadLocationDetails(location.id)
  }

  const handleAddNew = () => {
    setSelectedLocation(null)
    setIsEditing(false)
    setIsCreating(true)
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta localização? Esta ação não pode ser desfeita.')) {
      return
    }
    try {
      const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadLocations()
        setSelectedLocation(null)
        setIsEditing(false)
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao excluir localização')
      }
    } catch {
      alert('Erro ao conectar ao servidor')
    }
  }

  const handleFormSaved = () => {
    loadLocations()
    if (selectedLocation && isEditing) {
      loadLocationDetails(selectedLocation.id)
    }
    setIsEditing(false)
    setIsCreating(false)
  }

  const handleFormClose = () => {
    setIsEditing(false)
    setIsCreating(false)
  }

  const closeSidePanel = () => {
    setSelectedLocation(null)
    setIsEditing(false)
    setIsCreating(false)
  }

  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (loc.address?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  )

  const showSidePanel = !!(selectedLocation !== null || isCreating)

  const activePanel = isCreating || isEditing ? (
    <LocationFormPanel
      editingLocation={isEditing ? selectedLocation : null}
      allLocations={locations}
      onClose={handleFormClose}
      onSaved={handleFormSaved}
      inPage
    />
  ) : selectedLocation ? (
    <LocationDetailPanel
      location={selectedLocation}
      onClose={() => {
        setSelectedLocation(null)
        setIsEditing(false)
      }}
      onEdit={handleEdit}
      onDelete={() => handleDelete(selectedLocation.id)}
      canEdit={canEdit('locations')}
      canDelete={canDelete('locations')}
    />
  ) : null

  const effectiveViewMode = isPhone ? 'grid' : viewMode

  const listContent = loading ? (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
        <p className="mt-2 text-muted-foreground">Carregando...</p>
      </div>
    </div>
  ) : effectiveViewMode === 'table' ? (
    <TableView
      locations={filteredLocations}
      selectedId={selectedLocation?.id}
      onSelect={handleSelectLocation}
    />
  ) : (
    <GridView
      locations={filteredLocations}
      selectedId={selectedLocation?.id}
      onSelect={handleSelectLocation}
    />
  )

  if (!user || !hasPermission(user, 'locations', 'view')) {
    return null
  }

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          title="Localizações"
          description="Gerencie os locais físicos"
          className="mb-0"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative w-full sm:w-48 xl:w-64">
                <Icon
                  name="search"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Buscar localizações..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* View Mode Toggle */}
              <div className="hidden md:flex items-center bg-muted rounded-[4px] p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-sm font-medium transition-all ${
                    viewMode === 'table'
                      ? 'bg-background text-foreground ambient-shadow'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Visualização em Tabela"
                >
                  <Icon name="table_rows" className="text-base" />
                  <span className="hidden md:inline">Tabela</span>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-sm font-medium transition-all ${
                    viewMode === 'grid'
                      ? 'bg-background text-foreground ambient-shadow'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Visualização em Grade"
                >
                  <Icon name="grid_view" className="text-base" />
                  <span className="hidden md:inline">Grade</span>
                </button>
              </div>

              {canCreate('locations') && (
                <Button onClick={handleAddNew} className="whitespace-nowrap bg-accent-orange hover:bg-accent-orange/90 text-white font-bold shadow-md">
                  <Icon name="add" className="text-base" />
                  <span className="hidden sm:inline ml-1">Nova Localização</span>
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
            panelTitle="Localização"
            onClosePanel={closeSidePanel}
          />
        </div>
      </div>
    </PageContainer>
  )
}

// ─── Table View ────────────────────────────────────────────────────────────────

interface TableViewProps {
  locations: Location[]
  selectedId?: string
  onSelect: (location: Location) => void
}

function TableView({ locations, selectedId, onSelect }: TableViewProps) {
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

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

  const sortedLocations = [...locations].sort((a, b) => {
    const modifier = sortDirection === 'asc' ? 1 : -1
    switch (sortField) {
      case 'name':
        return modifier * (a.name || '').localeCompare(b.name || '')
      case 'address':
        return modifier * (a.address || '').localeCompare(b.address || '')
      case 'assets':
        return modifier * ((a._count?.assets ?? 0) - (b._count?.assets ?? 0))
      case 'orders':
        return modifier * ((a._count?.workOrders ?? 0) - (b._count?.workOrders ?? 0))
      default:
        return 0
    }
  })

  if (locations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12">
        <Icon name="location_off" className="text-4xl text-muted-foreground mb-3" />
        <h3 className="text-lg font-semibold text-foreground">Nenhuma localização</h3>
        <p className="text-sm text-muted-foreground mt-1">Nenhuma localização encontrada.</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      <div className="flex-1 overflow-auto min-h-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 bg-secondary z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('name')} className="flex items-center gap-1">
                  <span>Nome</span>
                  {renderSortIcon('name')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('address')} className="flex items-center gap-1">
                  <span>Endereço</span>
                  {renderSortIcon('address')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('assets')} className="flex items-center gap-1">
                  <span>Ativos</span>
                  {renderSortIcon('assets')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('orders')} className="flex items-center gap-1">
                  <span>Ordens</span>
                  {renderSortIcon('orders')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-100">
            {sortedLocations.map(location => (
              <tr
                key={location.id}
                onClick={() => onSelect(location)}
                className={`odd:bg-gray-50 even:bg-white hover:bg-secondary cursor-pointer transition-colors ${
                  selectedId === location.id ? 'bg-secondary' : ''
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <Icon name="location_on" className="text-base text-primary flex-shrink-0" />
                    {location.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {location.address || '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {location._count?.assets ?? 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {location._count?.workOrders ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Grid View ─────────────────────────────────────────────────────────────────

interface GridViewProps {
  locations: Location[]
  selectedId?: string
  onSelect: (location: Location) => void
}

function GridView({ locations, selectedId, onSelect }: GridViewProps) {
  if (locations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12">
        <Icon name="location_off" className="text-4xl text-muted-foreground mb-3" />
        <h3 className="text-lg font-semibold text-foreground">Nenhuma localização</h3>
        <p className="text-sm text-muted-foreground mt-1">Nenhuma localização encontrada.</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      <div className="overflow-auto flex-1 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map(location => (
          <button
            key={location.id}
            onClick={() => onSelect(location)}
            className={`text-left rounded-[4px] border p-5 transition-all hover:shadow-md ${
              selectedId === location.id
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card'
            }`}
          >
            <div className="flex items-start gap-3 mb-3">
              <Icon name="location_on" className="text-2xl text-primary flex-shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-foreground truncate">
                  {location.name}
                </h3>
                {location.address && (
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">
                    {location.address}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{location._count?.assets ?? 0} Ativos</span>
              <span>{location._count?.workOrders ?? 0} Ordens</span>
            </div>
          </button>
        ))}
      </div>
      </div>
    </div>
  )
}
