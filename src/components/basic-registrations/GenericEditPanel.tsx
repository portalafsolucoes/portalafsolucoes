'use client'

import { useState, useEffect, useRef } from 'react'
import { Icon } from '@/components/ui/Icon'
import { PanelCloseButton } from '@/components/ui/PanelCloseButton'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'

const crudDataCache = new Map<string, any[]>()
const crudPromiseCache = new Map<string, Promise<any[]>>()

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
  width?: string
  visibleWhen?: { field: string; value: string | string[] }
}

interface GenericEditPanelProps {
  editingItem: any | null
  entity: string
  title: string
  fields: FieldConfig[]
  unitScoped?: boolean
  activeUnitId?: string | null
  apiQueryParams?: string
  onClose: () => void
  onSaved: () => void
  inPage?: boolean
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
          className="w-full px-3 py-2 pr-8 text-sm border border-input rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
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

function renderFields(
  fields: FieldConfig[],
  formData: Record<string, any>,
  setFormData: (data: Record<string, any>) => void,
  editingItem: any | null,
  allFields: FieldConfig[]
) {
  return fields.filter(f => {
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
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">
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
            allFields.forEach(f => {
              if (f.visibleWhen?.field === field.key) {
                const expected = f.visibleWhen.value
                const visible = Array.isArray(expected) ? expected.includes(newVal) : newVal === expected
                if (!visible) updated[f.key] = ''
              }
            })
            setFormData(updated)
          }}
          className="w-full px-3 py-2 text-sm border border-input rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
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
          className="w-full px-3 py-2 text-sm border border-input rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
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
          className="w-full px-3 py-2 text-sm border border-input rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
          readOnly={field.readOnly}
        />
      )}
    </div>
  ))
}

export function GenericEditPanel({
  editingItem,
  entity,
  title,
  fields,
  unitScoped,
  activeUnitId,
  apiQueryParams,
  onClose,
  onSaved,
  inPage = false,
}: GenericEditPanelProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editingItem) {
      const data: Record<string, any> = {}
      fields.forEach(f => {
        data[f.key] = editingItem[f.key] ?? (f.type === 'checkbox' ? false : '')
      })
      setFormData(data)
    } else {
      const defaults: Record<string, any> = {}
      fields.forEach(f => {
        if (f.defaultValue !== undefined) defaults[f.key] = f.defaultValue
        else if (f.type === 'checkbox') defaults[f.key] = false
        else if (f.type === 'number') defaults[f.key] = 0
        else defaults[f.key] = ''
      })
      if (unitScoped && activeUnitId) {
        defaults.unitId = activeUnitId
      }
      setFormData(defaults)
    }
    setError('')
  }, [editingItem, fields, unitScoped, activeUnitId])

  const buildRequestUrl = () => {
    let url = `/api/basic-registrations/${entity}`
    const params: string[] = []
    if (unitScoped && activeUnitId) {
      params.push(`unitId=${activeUnitId}`)
    }
    if (apiQueryParams) {
      params.push(apiQueryParams)
    }
    if (params.length > 0) {
      url += `?${params.join('&')}`
    }
    return url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

      invalidateCrudData(buildRequestUrl())
      onSaved()
      onClose()
    } catch {
      setError('Erro de conexão')
    }
    setSaving(false)
  }

  const formContent = (
    <>
      {error && (
        <div className="p-3 bg-danger-light text-danger-light-foreground rounded-[4px] text-sm">
          {error}
        </div>
      )}
      <ModalSection title="Dados">
        {renderFields(fields, formData, setFormData, editingItem, fields)}
      </ModalSection>
    </>
  )

  const formFooter = (
    <div className="flex gap-3 px-4 py-4 border-t border-gray-200 bg-gray-50">
      <Button type="button" variant="outline" onClick={onClose} className="flex-1">
        Cancelar
      </Button>
      <Button type="submit" disabled={saving} className="flex-1">
        <Icon name="save" className="text-base mr-2" />
        {saving ? 'Salvando...' : (editingItem ? 'Salvar Alterações' : 'Salvar')}
      </Button>
    </div>
  )

  if (inPage) {
    return (
      <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-black text-gray-900">
            {editingItem ? `Editar ${title}` : `Novo ${title}`}
          </h2>
          <PanelCloseButton onClick={onClose} />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 min-h-0 flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {formContent}
          </div>
          {formFooter}
        </form>
      </div>
    )
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={editingItem ? `Editar ${title}` : `Novo ${title}`}>
      <form onSubmit={handleSubmit}>
        <div className="p-4 space-y-3">
          {formContent}
        </div>
        {formFooter}
      </form>
    </Modal>
  )
}
