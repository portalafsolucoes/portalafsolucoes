'use client'

import { useState, useEffect } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
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

  return (
    <PageContainer>
        <PageHeader
          title="Unidades / Filiais"
          description="Gerencie as unidades da organização"
          actions={
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-[4px] hover:bg-primary-graphite transition-colors"
            >
              <Icon name="add" className="text-xl" />
              Nova Unidade
            </button>
          }
        />

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
          </div>
        ) : units.length === 0 ? (
          <div className="bg-card rounded-[4px] ambient-shadow p-12 text-center">
            <Icon name="apartment" className="text-6xl text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma unidade cadastrada</h3>
            <p className="text-muted-foreground mb-4">Adicione a primeira unidade para começar.</p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-[4px]"
            >
              <Icon name="add" className="text-xl" />
              Nova Unidade
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {units.map((unit) => (
              <div
                key={unit.id}
                className="bg-card rounded-[4px] ambient-shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[4px] bg-primary/10 flex items-center justify-center">
                      <Icon name="apartment" className="text-xl text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{unit.name}</h3>
                      {unit.address && (
                        <p className="text-sm text-muted-foreground">{unit.address}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Icon name="group" className="text-base" />
                    {unit.memberCount} membro(s)
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="inventory_2" className="text-base" />
                    {unit.assetCount} ativo(s)
                  </span>
                </div>

                <div className="flex gap-2 pt-3 border-t border-on-surface-variant/10">
                  <button
                    onClick={() => openEdit(unit)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-[4px] transition-colors"
                  >
                    <Icon name="edit" className="text-base" />
                    Editar
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(unit.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-danger hover:bg-danger/10 rounded-[4px] transition-colors"
                  >
                    <Icon name="delete" className="text-base" />
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {units.length > 0 && (
          <div className="mt-6 text-center text-muted-foreground text-sm">
            {units.length} unidade(s) cadastrada(s)
          </div>
        )}

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingUnit ? 'Editar Unidade' : 'Nova Unidade'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="p-3 bg-danger/10 text-danger rounded-[4px] text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
              Nome da Unidade <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              placeholder="Ex: Unidade São Paulo"
              className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-foreground mb-1">
              Endereço
            </label>
            <input
              type="text"
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Ex: Av. Paulista, 1000 - São Paulo/SP"
              className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-on-surface-variant/10">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 py-2 border border-input rounded-[4px] text-foreground hover:bg-secondary transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-[4px] hover:bg-primary-graphite transition-colors disabled:opacity-50"
            >
              <Icon name="save" className="text-base" />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
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
        <div className="p-6">
          <p className="text-foreground mb-6">
            Tem certeza que deseja excluir esta unidade? Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="px-4 py-2 border border-input rounded-[4px] text-foreground hover:bg-secondary transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="px-4 py-2 bg-danger text-white rounded-[4px] hover:bg-danger/90 transition-colors"
            >
              Excluir
            </button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  )
}
