'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'

interface PlanFormPanelProps {
  onClose: () => void
  onSaved: (generatedCount?: number) => void
  inPage?: boolean
}

export function PlanFormPanel({ onClose, onSaved, inPage = false }: PlanFormPanelProps) {
  const [formData, setFormData] = useState<Record<string, string>>({
    description: '',
    startDate: '',
    endDate: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/planning/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar')
        setSaving(false)
        return
      }
      onSaved(data.generatedCount)
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
      <ModalSection title="Plano">
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Descrição <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Plano Lubrificação Abril 2026"
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
      <div className="p-3 bg-muted rounded-[4px] text-xs text-muted-foreground">
        Ao criar o plano, o sistema emitirá automaticamente Ordens de Serviço para os ativos com manutenção prevista dentro do período selecionado.
      </div>
    </>
  )

  const formFooter = (
    <div className="flex gap-3 px-4 py-4 border-t border-border">
      <Button type="button" variant="outline" onClick={onClose} className="flex-1">
        Cancelar
      </Button>
      <Button type="submit" disabled={saving} className="flex-1">
        <Icon name="save" className="text-base mr-2" />
        {saving ? 'Processando...' : 'Salvar'}
      </Button>
    </div>
  )

  if (inPage) {
    return (
      <div className="h-full flex flex-col bg-card border-l border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Novo Plano de Manutenção</h2>
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
    <Modal isOpen onClose={onClose} title="Novo Plano de Manutenção" size="wide">
      <form onSubmit={handleSubmit}>
        <div className="p-4 space-y-3">
          {formContent}
        </div>
        {formFooter}
      </form>
    </Modal>
  )
}
