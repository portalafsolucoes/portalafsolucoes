'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'

interface ScheduleEditableFields {
  id: string
  description?: string
  startDate?: string
  endDate?: string
  status?: string
}

interface ScheduleFormPanelProps {
  onClose: () => void
  onSaved: (newScheduleId?: string, warning?: string) => void
  inPage?: boolean
  schedule?: ScheduleEditableFields | null
}

function toDateInputValue(iso?: string): string {
  if (!iso) return ''
  return iso.split('T')[0]
}

export function ScheduleFormPanel({ onClose, onSaved, inPage = false, schedule }: ScheduleFormPanelProps) {
  const isEditMode = !!schedule?.id
  const isConfirmedEdit = isEditMode && schedule?.status === 'CONFIRMED'

  const [formData, setFormData] = useState<Record<string, string>>({
    description: schedule?.description || '',
    startDate: toDateInputValue(schedule?.startDate),
    endDate: toDateInputValue(schedule?.endDate),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const url = isEditMode
        ? `/api/planning/schedules/${schedule!.id}`
        : '/api/planning/schedules'
      const method = isEditMode ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar')
        setSaving(false)
        return
      }
      onSaved(data.data?.id, data.warning)
    } catch {
      setError('Erro de conexão')
    }
    setSaving(false)
  }

  const formContent = (
    <>
      {error && (
        <div className="p-3 bg-danger/10 text-danger rounded-[4px] text-sm">{error}</div>
      )}
      {isConfirmedEdit && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-[4px] text-xs">
          <Icon name="info" className="text-sm mr-1 align-middle" />
          Programação confirmada: a edição abaixo altera apenas os dados da programação. As OSs já programadas não serão modificadas.
        </div>
      )}
      <ModalSection title="Programação">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Descrição <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Programação Mecânica Semana 15"
              required
              className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Data Início <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={e => setFormData({ ...formData, startDate: e.target.value })}
              required
              className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Data Fim <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={e => setFormData({ ...formData, endDate: e.target.value })}
              required
              className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </ModalSection>
    </>
  )

  const formFooter = (
    <div className="flex gap-3 px-4 py-4 border-t border-border">
      <Button type="button" variant="outline" onClick={onClose} className="flex-1">
        Cancelar
      </Button>
      <Button type="submit" disabled={saving} className="flex-1">
        <Icon name="save" className="text-base mr-2" />
        {saving ? 'Processando...' : (isEditMode ? 'Salvar Alterações' : 'Salvar')}
      </Button>
    </div>
  )

  if (inPage) {
    return (
      <div className="h-full flex flex-col bg-card border-l border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">{isEditMode ? 'Editar Programação' : 'Nova Programação de OSs'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
            <Icon name="close" className="text-xl text-muted-foreground" />
          </button>
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
    <Modal isOpen onClose={onClose} title={isEditMode ? 'Editar Programação' : 'Nova Programação de OSs'} size="wide">
      <form onSubmit={handleSubmit}>
        <div className="p-4 space-y-3">
          {formContent}
        </div>
        {formFooter}
      </form>
    </Modal>
  )
}
