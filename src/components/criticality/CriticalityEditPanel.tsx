'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { PanelCloseButton } from '@/components/ui/PanelCloseButton'
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
  1: 'SEM GRAVIDADE',
  2: 'POUCO GRAVE',
  3: 'GRAVE',
  4: 'MUITO GRAVE',
  5: 'EXTREMAMENTE GRAVE',
}

const urgencyLabels: Record<number, string> = {
  1: 'PODE ESPERAR',
  2: 'POUCO URGENTE',
  3: 'URGENTE',
  4: 'MUITO URGENTE',
  5: 'ACAO IMEDIATA',
}

const tendencyLabels: Record<number, string> = {
  1: 'NAO PIORA',
  2: 'PIORA A LONGO PRAZO',
  3: 'PIORA A MEDIO PRAZO',
  4: 'PIORA A CURTO PRAZO',
  5: 'PIORA RAPIDAMENTE',
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
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">
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
    <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
        <h2 className="text-lg font-black text-gray-900 truncate">Editar GUT</h2>
        <PanelCloseButton onClick={onClose} className="flex-shrink-0 ml-2" />
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
        <div className="flex gap-3 px-4 py-4 border-t border-gray-200 bg-gray-50">
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
