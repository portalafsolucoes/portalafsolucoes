'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'

interface AssetCriticality {
  id: string
  name: string
  gutGravity: number
  gutUrgency: number
  gutTendency: number
  gutScore: number
}

interface Props {
  asset: AssetCriticality
  onClose: () => void
  onSuccess: () => void
}

const gravityLabels: Record<number, string> = {
  1: 'Sem gravidade',
  2: 'Pouco grave',
  3: 'Grave',
  4: 'Muito grave',
  5: 'Extremamente grave',
}

const urgencyLabels: Record<number, string> = {
  1: 'Pode esperar',
  2: 'Pouco urgente',
  3: 'Urgente',
  4: 'Muito urgente',
  5: 'Ação imediata',
}

const tendencyLabels: Record<number, string> = {
  1: 'Não piora',
  2: 'Piora a longo prazo',
  3: 'Piora a médio prazo',
  4: 'Piora a curto prazo',
  5: 'Piora rapidamente',
}

function GutSelector({
  label,
  value,
  activeClass,
  onChange,
  hint,
}: {
  label: string
  value: number
  activeClass: string
  onChange: (v: number) => void
  hint: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {label}
      </label>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-10 h-10 rounded-[4px] font-bold transition-all ${
              value === n
                ? `${activeClass} text-white ring-2 ring-gray-400`
                : 'bg-secondary hover:bg-surface-high text-muted-foreground'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

export function CriticalityEditPanel({ asset, onClose, onSuccess }: Props) {
  const [gutGravity, setGutGravity] = useState(asset.gutGravity)
  const [gutUrgency, setGutUrgency] = useState(asset.gutUrgency)
  const [gutTendency, setGutTendency] = useState(asset.gutTendency)
  const [saving, setSaving] = useState(false)

  const newScore = gutGravity * gutUrgency * gutTendency

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', asset.name)
      formData.append('gutGravity', gutGravity.toString())
      formData.append('gutUrgency', gutUrgency.toString())
      formData.append('gutTendency', gutTendency.toString())

      const response = await fetch(`/api/assets/${asset.id}`, {
        method: 'PATCH',
        body: formData,
      })

      if (response.ok) {
        onSuccess()
      } else {
        const data = await response.json()
        alert(data.error || 'Erro ao salvar valores GUT')
      }
    } catch {
      alert('Erro ao conectar ao servidor')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-xl font-bold text-foreground truncate">Editar GUT</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded transition-colors flex-shrink-0 ml-2"
        >
          <Icon name="close" className="text-xl text-muted-foreground" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 min-h-0 flex-col">
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="mb-2">
            <p className="text-xs text-muted-foreground">Ativo</p>
            <p className="text-sm font-semibold text-foreground">{asset.name}</p>
          </div>

          <GutSelector
            label="Gravidade (G) — Impacto se falhar"
            value={gutGravity}
            activeClass="bg-primary-graphite"
            onChange={setGutGravity}
            hint={gravityLabels[gutGravity]}
          />

          <GutSelector
            label="Urgência (U) — Tempo para resolver"
            value={gutUrgency}
            activeClass="bg-on-surface-variant"
            onChange={setGutUrgency}
            hint={urgencyLabels[gutUrgency]}
          />

          <GutSelector
            label="Tendência (T) — Piora se não tratado"
            value={gutTendency}
            activeClass="bg-on-surface-variant"
            onChange={setGutTendency}
            hint={tendencyLabels[gutTendency]}
          />

          {/* Score preview */}
          <div className="p-3 bg-muted rounded-[4px]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Novo Score GUT:</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-foreground">{newScore}</span>
                <span className="text-xs text-muted-foreground">
                  ({gutGravity}×{gutUrgency}×{gutTendency})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 py-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            <Icon name="save" className="text-base mr-2" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </div>
  )
}
