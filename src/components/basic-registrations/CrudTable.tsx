'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Search, X, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { exportToExcel } from '@/lib/exportExcel'

export interface FieldConfig {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'checkbox'
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
  defaultValue?: string | number | boolean
  readOnly?: boolean
  width?: string // classe CSS de largura
}

interface CrudTableProps {
  entity: string
  title: string
  fields: FieldConfig[]
  columns: { key: string; label: string; render?: (value: any, row: any) => React.ReactNode }[]
  unitScoped?: boolean // Se precisa de unitId
  selectedUnitId?: string
  customModalRender?: (props: { editingItem: any | null; onClose: () => void; onSaved: () => void }) => React.ReactNode
}

export function CrudTable({ entity, title, fields, columns, unitScoped, selectedUnitId, customModalRender }: CrudTableProps) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      let url = `/api/basic-registrations/${entity}`
      if (unitScoped && selectedUnitId) {
        url += `?unitId=${selectedUnitId}`
      }
      const res = await fetch(url)
      const data = await res.json()
      setItems(data.data || [])
    } catch {
      setItems([])
    }
    setLoading(false)
  }, [entity, unitScoped, selectedUnitId])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const openCreate = () => {
    const defaults: Record<string, any> = {}
    fields.forEach(f => {
      if (f.defaultValue !== undefined) defaults[f.key] = f.defaultValue
      else if (f.type === 'checkbox') defaults[f.key] = false
      else if (f.type === 'number') defaults[f.key] = 0
      else defaults[f.key] = ''
    })
    if (unitScoped && selectedUnitId) {
      defaults.unitId = selectedUnitId
    }
    setFormData(defaults)
    setEditingItem(null)
    setError('')
    setShowModal(true)
  }

  const openEdit = (item: any) => {
    const data: Record<string, any> = {}
    fields.forEach(f => {
      data[f.key] = item[f.key] ?? (f.type === 'checkbox' ? false : '')
    })
    setFormData(data)
    setEditingItem(item)
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const url = editingItem
        ? `/api/basic-registrations/${entity}/${editingItem.id}`
        : `/api/basic-registrations/${entity}`
      const method = editingItem ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'Erro ao salvar')
        setSaving(false)
        return
      }

      setShowModal(false)
      fetchItems()
    } catch {
      setError('Erro de conexão')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este registro?')) return
    try {
      const res = await fetch(`/api/basic-registrations/${entity}/${id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!res.ok) {
        alert(result.error || 'Erro ao excluir')
        return
      }
      fetchItems()
    } catch {
      alert('Erro de conexão')
    }
  }

  const filtered = items.filter(item => {
    if (!search) return true
    const s = search.toLowerCase()
    return columns.some(col => {
      const val = item[col.key]
      return val && String(val).toLowerCase().includes(s)
    })
  })

  const noUnitSelected = unitScoped && !selectedUnitId

  return (
    <div>
      {noUnitSelected && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg text-sm">
          Selecione uma unidade para visualizar e gerenciar os registros desta aba.
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (filtered.length === 0) { alert('Nenhum dado para exportar'); return }
              const cols = columns.map(c => ({ key: c.key, header: c.label }))
              const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
              exportToExcel(filtered, cols, `${entity}_${date}`, title)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg bg-card hover:bg-muted transition-colors"
            title="Exportar para Excel"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <Button onClick={openCreate} size="sm" disabled={noUnitSelected}>
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        </div>
      </div>

      {/* Table */}
      {noUnitSelected ? null : loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border border-border rounded-lg bg-card">
          Nenhum registro encontrado.
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                {columns.map(col => (
                  <th key={col.key} className="text-left px-4 py-3 font-medium text-foreground">
                    {col.label}
                  </th>
                ))}
                <th className="text-right px-4 py-3 font-medium text-foreground w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 text-foreground">
                      {col.render ? col.render(item[col.key], item) : (item[col.key] ?? '-')}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 hover:bg-accent/20 rounded transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 hover:bg-danger-light rounded transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Criação/Edição */}
      {customModalRender ? (
        showModal && customModalRender({
          editingItem,
          onClose: () => setShowModal(false),
          onSaved: fetchItems,
        })
      ) : (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingItem ? `Editar ${title}` : `Novo ${title}`}
          size="md"
        >
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-danger-light text-danger-light-foreground rounded-lg text-sm">
                {error}
              </div>
            )}
            {fields.filter(f => !f.readOnly || editingItem).map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {field.label} {field.required && <span className="text-danger">*</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={formData[field.key] || ''}
                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={field.readOnly}
                  >
                    <option value="">Selecione...</option>
                    {field.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.key] || ''}
                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                    readOnly={field.readOnly}
                  />
                ) : field.type === 'checkbox' ? (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!formData[field.key]}
                      onChange={e => setFormData({ ...formData, [field.key]: e.target.checked })}
                      className="rounded border-border"
                      disabled={field.readOnly}
                    />
                    <span className="text-sm text-muted-foreground">{field.placeholder || 'Sim'}</span>
                  </label>
                ) : (
                  <input
                    type={field.type}
                    value={formData[field.key] ?? ''}
                    onChange={e => setFormData({
                      ...formData,
                      [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value
                    })}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                    readOnly={field.readOnly}
                  />
                )}
              </div>
            ))}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setShowModal(false)} size="sm">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? 'Salvando...' : (editingItem ? 'Salvar' : 'Criar')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
