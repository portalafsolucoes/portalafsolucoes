'use client'

import { useState, useEffect } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

interface Unit {
  id: string
  name: string
  address: string | null
  memberCount: number
  assetCount: number
  createdAt: string
}

export default function AdminUnitsPage() {
  const { role, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [formData, setFormData] = useState({ name: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!authLoading && role !== 'SUPER_ADMIN' && role !== 'GESTOR') {
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

  const openCreate = () => {
    setEditingUnit(null)
    setFormData({ name: '', address: '' })
    setError('')
    setShowForm(true)
  }

  const openEdit = (unit: Unit) => {
    setEditingUnit(unit)
    setFormData({ name: unit.name, address: unit.address || '' })
    setError('')
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError('Nome é obrigatório')
      return
    }

    try {
      setSaving(true)
      setError('')

      const url = editingUnit
        ? `/api/admin/units/${editingUnit.id}`
        : '/api/admin/units'

      const res = await fetch(url, {
        method: editingUnit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao salvar')
        return
      }

      setShowForm(false)
      fetchUnits()
    } catch {
      setError('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/units/${id}`, { method: 'DELETE' })
      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Erro ao excluir')
        return
      }

      setDeleteConfirm(null)
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

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          className="mb-0"
          title="Unidades / Filiais"
          description="Gerencie as unidades da organização"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-64">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 transform text-base text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar unidades..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button onClick={openCreate} size="sm">
                <Icon name="add" className="mr-1 text-base" />
                Nova Unidade
              </Button>
            </div>
          }
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          <div className="w-full transition-all overflow-hidden flex flex-col">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
                  <p className="mt-2 text-muted-foreground">Carregando...</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col bg-card overflow-hidden">
                <div className="flex-1 overflow-auto min-h-0">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="sticky top-0 bg-secondary z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Unidade</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Endereço</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Membros</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Ativos</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Criada em</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-gray-200">
                      {filteredUnits.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-16 text-center">
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
                        filteredUnits.map((unit) => (
                          <tr key={unit.id} className="hover:bg-secondary cursor-pointer transition-colors">
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
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-foreground">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => openEdit(unit)}>
                                  <Icon name="edit" className="mr-1 text-base" />
                                  Editar
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(unit.id)} className="text-danger hover:bg-danger/10 hover:text-danger">
                                  <Icon name="delete" className="mr-1 text-base" />
                                  Excluir
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingUnit ? 'Editar Unidade' : 'Nova Unidade'}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-3">
            {error && (
              <div className="p-3 bg-danger/10 text-danger rounded-[4px] text-sm">
                {error}
              </div>
            )}

            <ModalSection title="Dados da Unidade">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label htmlFor="name" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Nome da Unidade <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="Ex: Unidade São Paulo"
                    className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="address" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Endereço
                  </label>
                  <input
                    type="text"
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Ex: Av. Paulista, 1000 - São Paulo/SP"
                    className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </ModalSection>
          </div>

          <div className="flex gap-3 px-4 py-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              <Icon name="save" className="text-base mr-2" />
              {saving ? 'Salvando...' : editingUnit ? 'Salvar Alterações' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="p-4">
          <p className="text-foreground mb-2">
            Tem certeza que deseja excluir esta unidade? Esta ação não pode ser desfeita.
          </p>
        </div>
        <div className="flex gap-3 px-4 py-4 border-t border-border">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="flex-1">
            Excluir
          </Button>
        </div>
      </Modal>
    </PageContainer>
  )
}
