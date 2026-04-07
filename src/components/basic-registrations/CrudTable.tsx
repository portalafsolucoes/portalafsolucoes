'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { exportToExcel } from '@/lib/exportExcel'

const crudDataCache = new Map<string, any[]>()
const crudPromiseCache = new Map<string, Promise<any[]>>()

async function fetchCrudData(url: string) {
  if (crudDataCache.has(url)) {
    return crudDataCache.get(url) || []
  }

  if (crudPromiseCache.has(url)) {
    return crudPromiseCache.get(url) || []
  }

  const request = fetch(url)
    .then(async res => {
      const data = await res.json()
      const items = data.data || []
      crudDataCache.set(url, items)
      return items
    })
    .catch(() => [])
    .finally(() => {
      crudPromiseCache.delete(url)
    })

  crudPromiseCache.set(url, request)
  return request
}

function invalidateCrudData(url: string) {
  crudDataCache.delete(url)
  crudPromiseCache.delete(url)
}

export interface FieldConfig {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'checkbox' | 'combobox'
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
  defaultValue?: string | number | boolean
  readOnly?: boolean
  width?: string // classe CSS de largura
  visibleWhen?: { field: string; value: string | string[] }
}

function ComboboxField({ value, onChange, options, placeholder }: {
  value: string
  onChange: (val: string) => void
  options: { value: string; label: string }[]
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setInputValue(value) }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter(o =>
    !inputValue || o.label.toLowerCase().includes(inputValue.toLowerCase())
  )

  const isCustom = inputValue && !options.some(o => o.value === inputValue)

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={e => {
            setInputValue(e.target.value)
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-8 text-sm rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <Icon name="expand_more" className="text-base" />
        </button>
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-card rounded-[4px] ambient-shadow">
          {filtered.length > 0 ? filtered.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setInputValue(opt.value)
                onChange(opt.value)
                setOpen(false)
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${
                opt.value === value ? 'bg-muted font-medium' : ''
              }`}
            >
              {opt.label}
            </button>
          )) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Nenhuma opção encontrada
            </div>
          )}
          {isCustom && filtered.length > 0 && (
            <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              Valor personalizado: <span className="font-medium text-foreground">{inputValue}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface CrudTableProps {
  entity: string
  title: string
  fields: FieldConfig[]
  columns: { key: string; label: string; render?: (value: any, row: any) => React.ReactNode }[]
  unitScoped?: boolean // Se precisa de unitId
  selectedUnitId?: string
  apiQueryParams?: string // Query params extras para a API (ex: "types=MATERIAL,TOOL")
  customModalRender?: (props: { editingItem: any | null; onClose: () => void; onSaved: () => void }) => React.ReactNode
}

export function CrudTable({ entity, title, fields, columns, unitScoped, selectedUnitId, apiQueryParams, customModalRender }: CrudTableProps) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [requestUrl, setRequestUrl] = useState('')

  const fetchItems = useCallback(async () => {
    setLoading(true)
    let url = `/api/basic-registrations/${entity}`
    const params: string[] = []
    if (unitScoped && selectedUnitId) {
      params.push(`unitId=${selectedUnitId}`)
    }
    if (apiQueryParams) {
      params.push(apiQueryParams)
    }
    if (params.length > 0) {
      url += `?${params.join('&')}`
    }
    setRequestUrl(url)

    try {
      setItems(await fetchCrudData(url))
    } catch {
      setItems([])
    }
    setLoading(false)
  }, [entity, unitScoped, selectedUnitId, apiQueryParams])

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

      invalidateCrudData(requestUrl)
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
      invalidateCrudData(requestUrl)
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
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-warning-light-foreground rounded-[4px] text-sm">
          Selecione uma unidade para visualizar e gerenciar os registros desta aba.
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
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
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-[4px] bg-card hover:bg-muted transition-colors"
            title="Exportar para Excel"
          >
            <Icon name="download" className="text-base" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <Button onClick={openCreate} size="sm" disabled={noUnitSelected}>
            <Icon name="add" className="text-base mr-1" /> Novo
          </Button>
        </div>
      </div>

      {/* Table */}
      {noUnitSelected ? null : loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground rounded-[4px] bg-card">
          Nenhum registro encontrado.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[4px]">
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
                        <Icon name="edit" className="text-base text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 hover:bg-danger-light rounded transition-colors"
                        title="Excluir"
                      >
                        <Icon name="delete" className="text-base text-danger" />
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
              <div className="p-3 bg-danger-light text-danger-light-foreground rounded-[4px] text-sm">
                {error}
              </div>
            )}
            {fields.filter(f => {
              if (f.readOnly && !editingItem) return false
              if (f.visibleWhen) {
                const depValue = formData[f.visibleWhen.field]
                const expected = f.visibleWhen.value
                if (Array.isArray(expected)) {
                  if (!expected.includes(depValue)) return false
                } else {
                  if (depValue !== expected) return false
                }
              }
              return true
            }).map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {field.label} {field.required && <span className="text-danger">*</span>}
                </label>
                {field.type === 'combobox' ? (
                  <ComboboxField
                    value={formData[field.key] || ''}
                    onChange={(val) => setFormData({ ...formData, [field.key]: val })}
                    options={field.options || []}
                    placeholder={field.placeholder || 'Selecione ou digite...'}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={formData[field.key] || ''}
                    onChange={e => {
                      const newVal = e.target.value
                      const updated = { ...formData, [field.key]: newVal }
                      // Limpar campos que dependem deste via visibleWhen
                      fields.forEach(f => {
                        if (f.visibleWhen?.field === field.key) {
                          const expected = f.visibleWhen.value
                          const visible = Array.isArray(expected) ? expected.includes(newVal) : newVal === expected
                          if (!visible) updated[f.key] = ''
                        }
                      })
                      setFormData(updated)
                    }}
                    className="w-full px-3 py-2 text-sm rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
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
                    className="w-full px-3 py-2 text-sm rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
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
                    className="w-full px-3 py-2 text-sm rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                    readOnly={field.readOnly}
                  />
                )}
              </div>
            ))}
            <div className="flex justify-end gap-3 pt-4 border-t border-on-surface-variant/10">
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
