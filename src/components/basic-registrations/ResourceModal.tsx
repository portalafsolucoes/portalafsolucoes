'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

const UNIT_OPTIONS: Record<string, { value: string; label: string }[]> = {
  TOOL: [
    { value: 'H', label: 'Horas (H)' },
    { value: 'un', label: 'Unidade (un)' },
  ],
  MATERIAL: [
    { value: 'un', label: 'Unidade (un)' },
    { value: 'kg', label: 'Quilograma (kg)' },
    { value: 'L', label: 'Litro (L)' },
    { value: 'm', label: 'Metro (m)' },
    { value: 'm²', label: 'Metro² (m²)' },
    { value: 'm³', label: 'Metro³ (m³)' },
    { value: 'pç', label: 'Peça (pç)' },
    { value: 'cx', label: 'Caixa (cx)' },
    { value: 'gl', label: 'Galão (gl)' },
    { value: 't', label: 'Tonelada (t)' },
  ],
}

interface ResourceModalProps {
  editingItem: Record<string, unknown> | null
  onClose: () => void
  onSaved: () => void
  calendars: { id: string; name: string }[]
  inPage?: boolean
}

export function ResourceModal({ editingItem, onClose, onSaved, calendars, inPage = false }: ResourceModalProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [unit, setUnit] = useState('')
  const [unitCost, setUnitCost] = useState(0)
  const [calendarId, setCalendarId] = useState('')
  const [protheusCode, setProtheusCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name || '')
      setType(editingItem.type || '')
      setUnit(editingItem.unit || '')
      setUnitCost(editingItem.unitCost ?? 0)
      setCalendarId(editingItem.calendarId || '')
      setProtheusCode(editingItem.protheusCode || '')
    } else {
      setName('')
      setType('')
      setUnit('')
      setUnitCost(0)
      setCalendarId('')
      setProtheusCode('')
    }
    setError('')
  }, [editingItem])

  const unitOptions = type ? (UNIT_OPTIONS[type] || []) : []

  const handleTypeChange = (newType: string) => {
    setType(newType)
    setUnit('')
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Nome é obrigatório')
      return
    }
    if (!type) {
      setError('Tipo é obrigatório')
      return
    }
    if (!unit) {
      setError('Selecione uma unidade')
      return
    }

    setSaving(true)
    setError('')

    try {
      const url = editingItem
        ? `/api/basic-registrations/resources/${editingItem.id}`
        : `/api/basic-registrations/resources`
      const method = editingItem ? 'PUT' : 'POST'

      const body: Record<string, unknown> = {
        name,
        type,
        unit: unit || null,
        unitCost,
        calendarId: calendarId || null,
        protheusCode: protheusCode || null,
        userId: null,
        availableCount: null,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'Erro ao salvar')
        setSaving(false)
        return
      }

      onSaved()
      onClose()
    } catch {
      setError('Erro de conexão')
    }
    setSaving(false)
  }

  const title = editingItem ? 'Editar Recurso' : 'Novo Recurso'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSave()
  }

  const formContent = (
    <>
      {error && (
        <div className="p-3 bg-danger-light text-danger-light-foreground rounded-[4px] text-sm">
          {error}
        </div>
      )}

      <ModalSection title="Recurso">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Tipo <span className="text-danger">*</span>
            </label>
            <select
              value={type}
              onChange={e => handleTypeChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecione...</option>
              <option value="MATERIAL">Material</option>
              <option value="TOOL">Ferramenta</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Nome <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={type === 'TOOL' ? 'Ex: Chave de Torque' : 'Ex: Graxa Industrial'}
              className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Unidade <span className="text-danger">*</span>
            </label>
            <select
              value={unit}
              onChange={e => setUnit(e.target.value)}
              disabled={!type}
              className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {!type ? (
                <option value="">Selecione um tipo primeiro</option>
              ) : (
                <>
                  <option value="">Selecione a unidade...</option>
                  {unitOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </>
              )}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Custo Unitário (R$)
            </label>
            <input
              type="number"
              value={unitCost}
              onChange={e => setUnitCost(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Calendário
            </label>
            <select
              value={calendarId}
              onChange={e => setCalendarId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Nenhum</option>
              {calendars.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Código Protheus
            </label>
            <input
              type="text"
              value={protheusCode}
              onChange={e => setProtheusCode(e.target.value)}
              placeholder="Ex: E01"
              className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </ModalSection>
    </>
  )

  if (inPage) {
    return (
      <div className="h-full flex flex-col bg-card border-l border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
            <Icon name="close" className="text-xl text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 min-h-0 flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {formContent}
          </div>
          <div className="flex gap-3 px-4 py-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={saving} className="flex-1">
              <Icon name="save" className="text-base mr-2" />
              {saving ? 'Salvando...' : (editingItem ? 'Salvar Alterações' : 'Salvar')}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={title}
    >
      <div className="p-4 space-y-3 overflow-y-auto">
        {formContent}

        <div className="flex gap-3 px-4 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            <Icon name="save" className="text-base mr-2" />
            {saving ? 'Salvando...' : (editingItem ? 'Salvar Alterações' : 'Salvar')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
