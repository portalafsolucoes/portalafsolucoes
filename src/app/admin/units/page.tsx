'use client'

import { useState, useEffect } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { AdaptiveSplitPanel } from '@/components/layout/AdaptiveSplitPanel'
import { useResponsiveLayout } from '@/hooks/useMediaQuery'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { isAdminRole } from '@/lib/user-roles'

interface Unit {
  id: string
  name: string
  address: string | null
  memberCount: number
  assetCount: number
  createdAt: string
}

type UnitSortField = 'name' | 'address' | 'memberCount' | 'assetCount' | 'createdAt'
type UnitSortDirection = 'asc' | 'desc'

// ─── Unit Detail Panel ────────────────────────────────────────────────────────

interface UnitDetailPanelProps {
  unit: Unit
  onClose: () => void
  onEdit: () => void
  onDelete: (unit: Unit) => void
}

function UnitDetailPanel({ unit, onClose, onEdit, onDelete }: UnitDetailPanelProps) {
  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border">
        <h2 className="text-xl font-bold text-foreground">{unit.name}</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <Icon name="close" className="text-xl text-muted-foreground" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Action buttons */}
        <div className="p-4 border-b border-border space-y-2">
          <button
            onClick={onEdit}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-[4px] hover:bg-gray-800 transition-colors"
          >
            <Icon name="edit" className="text-base" />
            Editar
          </button>
          <button
            onClick={() => onDelete(unit)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-destructive text-destructive rounded-[4px] hover:bg-destructive/10 transition-colors text-sm"
          >
            <Icon name="delete" className="text-base" />
            Excluir
          </button>
        </div>

        {/* Data */}
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">Dados</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Endereço</p>
              <p className="text-sm text-foreground">{unit.address || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Membros</p>
              <p className="text-sm text-foreground">{unit.memberCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ativos</p>
              <p className="text-sm text-foreground">{unit.assetCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Criada em</p>
              <p className="text-sm text-foreground">
                {new Date(unit.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Unit Form Panel ──────────────────────────────────────────────────────────

interface UnitFormData {
  name: string
  address: string
}

interface UnitFormPanelProps {
  inPage?: boolean
  isEdit: boolean
  formData: UnitFormData
  saving: boolean
  error: string
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  onChange: (field: keyof UnitFormData, value: string) => void
}

function UnitFormPanel({
  inPage,
  isEdit,
  formData,
  saving,
  error,
  onClose,
  onSubmit,
  onChange,
}: UnitFormPanelProps) {
  const formContent = (
    <form onSubmit={onSubmit} className={inPage ? 'flex flex-1 min-h-0 flex-col' : undefined}>
      <div className={inPage ? 'flex-1 overflow-y-auto p-4 space-y-3' : 'p-4 space-y-3'}>
        {error && (
          <div className="p-3 bg-danger/10 text-danger rounded-[4px] text-sm">
            {error}
          </div>
        )}

        <ModalSection title="Dados da Unidade">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label htmlFor="unit-name" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Nome da Unidade <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                id="unit-name"
                value={formData.name}
                onChange={(e) => onChange('name', e.target.value)}
                required
                placeholder="Ex: Unidade São Paulo"
                className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="unit-address" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Endereço
              </label>
              <input
                type="text"
                id="unit-address"
                value={formData.address}
                onChange={(e) => onChange('address', e.target.value)}
                placeholder="Ex: Av. Paulista, 1000 - São Paulo/SP"
                className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </ModalSection>
      </div>

      <div className={`flex gap-3 px-4 py-4 border-t border-border${inPage ? ' flex-shrink-0' : ''}`}>
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={saving} className="flex-1">
          <Icon name="save" className="text-base mr-2" />
          {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Salvar'}
        </Button>
      </div>
    </form>
  )

  if (inPage) {
    return (
      <div className="h-full flex flex-col bg-card border-l border-border">
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <h2 className="text-xl font-bold text-foreground">
            {isEdit ? 'Editar Unidade' : 'Nova Unidade'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <Icon name="close" className="text-xl text-muted-foreground" />
          </button>
        </div>
        {formContent}
      </div>
    )
  }

  return formContent
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUnitsPage() {
  const { role, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<UnitSortField>('name')
  const [sortDirection, setSortDirection] = useState<UnitSortDirection>('asc')

  // Split-panel state
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const { isPhone } = useResponsiveLayout()
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const showSidePanel = !!(selectedUnit !== null || isCreating)

  // Form state
  const [formData, setFormData] = useState<UnitFormData>({ name: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Delete confirmation
  const [deleteUnit, setDeleteUnit] = useState<Unit | null>(null)

  useEffect(() => {
    if (!authLoading && !isAdminRole(role)) {
      router.push('/dashboard')
    }
  }, [authLoading, role, router])

  useEffect(() => {
    fetchUnits()
  }, [])

  const fetchUnits = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/units')
      const data = await res.json()
      setUnits(data.data || [])
    } catch {
      console.error('Error loading units')
    } finally {
      setLoading(false)
    }
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setSelectedUnit(null)
    setIsEditing(false)
    setFormData({ name: '', address: '' })
    setFormError('')
    setIsCreating(true)
  }

  const handleSelectUnit = (unit: Unit) => {
    setIsCreating(false)
    setIsEditing(false)
    setFormError('')
    setSelectedUnit(unit)
  }

  const handleEditOpen = () => {
    if (!selectedUnit) return
    setFormData({ name: selectedUnit.name, address: selectedUnit.address || '' })
    setFormError('')
    setIsEditing(true)
    setIsCreating(false)
  }

  const handleCloseSidePanel = () => {
    setSelectedUnit(null)
    setIsCreating(false)
    setIsEditing(false)
    setFormError('')
  }

  const handleFormChange = (field: keyof UnitFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setFormError('Nome é obrigatório')
      return
    }

    try {
      setSaving(true)
      setFormError('')

      const url = isEditing && selectedUnit
        ? `/api/admin/units/${selectedUnit.id}`
        : '/api/admin/units'

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || 'Erro ao salvar')
        return
      }

      await fetchUnits()
      if (isEditing && selectedUnit) {
        const updated = { ...selectedUnit, name: formData.name, address: formData.address || null }
        setSelectedUnit(updated)
        setIsEditing(false)
      } else {
        setIsCreating(false)
      }
    } catch {
      setFormError('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteUnit) return
    try {
      const res = await fetch(`/api/admin/units/${deleteUnit.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Erro ao excluir')
        return
      }
      setDeleteUnit(null)
      if (selectedUnit?.id === deleteUnit.id) setSelectedUnit(null)
      fetchUnits()
    } catch {
      alert('Erro de conexão')
    }
  }

  if (authLoading) return null

  const filteredUnits = units.filter((unit) => {
    const search = searchTerm.toLowerCase()
    return (
      unit.name.toLowerCase().includes(search) ||
      (unit.address || '').toLowerCase().includes(search)
    )
  })

  const handleSort = (field: UnitSortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDirection('asc')
  }

  const renderSortIcon = (field: UnitSortField) => {
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

  const sortedUnits = [...filteredUnits].sort((a, b) => {
    const modifier = sortDirection === 'asc' ? 1 : -1
    switch (sortField) {
      case 'name':
        return a.name.localeCompare(b.name) * modifier
      case 'address':
        return (a.address || '').localeCompare(b.address || '') * modifier
      case 'memberCount':
        return (a.memberCount - b.memberCount) * modifier
      case 'assetCount':
        return (a.assetCount - b.assetCount) * modifier
      case 'createdAt':
        return a.createdAt.localeCompare(b.createdAt) * modifier
      default:
        return 0
    }
  })

  const showEditForm = isCreating || (selectedUnit !== null && isEditing)
  const showDetailPanel = selectedUnit !== null && !isEditing && !isCreating

  const activePanel = showEditForm ? (
    <UnitFormPanel
      inPage
      isEdit={isEditing}
      formData={formData}
      saving={saving}
      error={formError}
      onClose={handleCloseSidePanel}
      onSubmit={handleSubmit}
      onChange={handleFormChange}
    />
  ) : showDetailPanel && selectedUnit ? (
    <UnitDetailPanel
      unit={selectedUnit}
      onClose={handleCloseSidePanel}
      onEdit={handleEditOpen}
      onDelete={(u) => setDeleteUnit(u)}
    />
  ) : null

  const listContent = loading ? (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
        <p className="mt-2 text-muted-foreground">Carregando...</p>
      </div>
    </div>
  ) : isPhone ? (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      <div className="overflow-auto flex-1 p-4">
        {sortedUnits.length === 0 ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground py-12">
            <Icon name="apartment" className="text-4xl" />
            <p className="text-sm">Nenhuma unidade encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {sortedUnits.map((unit) => (
              <div
                key={unit.id}
                onClick={() => handleSelectUnit(unit)}
                className={`bg-card rounded-[4px] ambient-shadow p-4 cursor-pointer transition-all ${selectedUnit?.id === unit.id ? 'ring-2 ring-primary' : ''}`}
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="size-10 rounded-[4px] bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon name="apartment" className="text-xl text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate">{unit.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{unit.address || '—'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span>Membros: <span className="text-foreground">{unit.memberCount}</span></span>
                  <span>Ativos: <span className="text-foreground">{unit.assetCount}</span></span>
                  <span>Criada: <span className="text-foreground">{new Date(unit.createdAt).toLocaleDateString('pt-BR')}</span></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      <div className="flex-1 overflow-auto min-h-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 bg-secondary z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('name')} className="flex items-center gap-1">
                  <span>Unidade</span>
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
                <button type="button" onClick={() => handleSort('memberCount')} className="flex items-center gap-1">
                  <span>Membros</span>
                  {renderSortIcon('memberCount')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('assetCount')} className="flex items-center gap-1">
                  <span>Ativos</span>
                  {renderSortIcon('assetCount')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('createdAt')} className="flex items-center gap-1">
                  <span>Criada em</span>
                  {renderSortIcon('createdAt')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-100">
            {sortedUnits.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Icon name="apartment" className="text-4xl text-muted-foreground" />
                    <h3 className="text-sm font-medium text-foreground">Nenhuma unidade encontrada</h3>
                    <p className="text-sm text-muted-foreground">
                      {units.length === 0
                        ? 'Adicione a primeira unidade para começar.'
                        : 'Ajuste a busca para encontrar outra unidade.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedUnits.map((unit) => (
                <tr
                  key={unit.id}
                  onClick={() => handleSelectUnit(unit)}
                  className={`odd:bg-gray-50 even:bg-white hover:bg-secondary cursor-pointer transition-colors ${selectedUnit?.id === unit.id ? 'bg-secondary' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-[4px] bg-primary/10 flex items-center justify-center">
                        <Icon name="apartment" className="text-xl text-primary" />
                      </div>
                      <span className="font-medium">{unit.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {unit.address || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {unit.memberCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {unit.assetCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {new Date(unit.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          className="mb-0"
          title="Unidades / Filiais"
          description="Gerencie as unidades da organização"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-full sm:w-48 xl:w-64">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 transform text-base text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar unidades..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button onClick={openCreate} size="sm" className="bg-accent-orange hover:bg-accent-orange/90 text-white font-bold shadow-md">
                <Icon name="add" className="text-base" />
                <span className="hidden sm:inline ml-1">Nova Unidade</span>
              </Button>
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
            panelTitle="Unidade"
            onClosePanel={handleCloseSidePanel}
          />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteUnit}
        onClose={() => setDeleteUnit(null)}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="p-4">
          <p className="text-foreground mb-2">
            Tem certeza que deseja excluir a unidade:
          </p>
          <p className="font-semibold text-foreground mb-4">{deleteUnit?.name}</p>
          <p className="text-sm text-muted-foreground mb-6">
            Esta ação não pode ser desfeita.
          </p>
        </div>
        <div className="flex gap-3 px-4 py-4 border-t border-border">
          <Button variant="outline" onClick={() => setDeleteUnit(null)} className="flex-1">
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDelete} className="flex-1">
            Excluir
          </Button>
        </div>
      </Modal>
    </PageContainer>
  )
}
