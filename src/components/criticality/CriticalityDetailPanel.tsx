'use client'

import { Icon } from '@/components/ui/Icon'
import { PanelCloseButton } from '@/components/ui/PanelCloseButton'

interface AssetCriticality {
  id: string
  name: string
  customId: string | null
  area: string | null
  status: string
  location: { id: string; name: string } | null
  category: { id: string; name: string } | null
  gutGravity: number
  gutUrgency: number
  gutTendency: number
  gutScore: number
  openRequestsCount: number
  openWorkOrdersCount: number
  rafCount: number
  totalScore: number
  classification: 'critical' | 'warning' | 'ok'
}

const classificationConfig = {
  critical: { label: 'Crítico', color: 'bg-primary-graphite', textColor: 'text-foreground', icon: 'warning' },
  warning: { label: 'Alerta', color: 'bg-on-surface-variant', textColor: 'text-muted-foreground', icon: 'error' },
  ok: { label: 'OK', color: 'bg-on-surface-variant', textColor: 'text-muted-foreground', icon: 'check_circle' },
}

const gutLabels: Record<number, { gravity: string; urgency: string; tendency: string }> = {
  1: { gravity: 'Sem gravidade', urgency: 'Pode esperar', tendency: 'Não piora' },
  2: { gravity: 'Pouco grave', urgency: 'Pouco urgente', tendency: 'Piora a longo prazo' },
  3: { gravity: 'Grave', urgency: 'Urgente', tendency: 'Piora a médio prazo' },
  4: { gravity: 'Muito grave', urgency: 'Muito urgente', tendency: 'Piora a curto prazo' },
  5: { gravity: 'Extremamente grave', urgency: 'Ação imediata', tendency: 'Piora rapidamente' },
}

const recommendation: Record<AssetCriticality['classification'], string> = {
  critical: 'Ação imediata necessária. Priorizar manutenção corretiva ou preventiva.',
  warning: 'Monitorar de perto. Agendar manutenção preventiva em breve.',
  ok: 'Manter rotina de manutenção preventiva programada.',
}

interface Props {
  asset: AssetCriticality
  onClose: () => void
  onEdit: () => void
  canEdit: boolean
}

function DotBar({ value, activeClass }: { value: number; activeClass: string }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`w-4 h-4 rounded ${n <= value ? activeClass : 'bg-surface-high'}`}
        />
      ))}
      <span className="ml-2 font-bold text-sm text-foreground">{value}</span>
    </div>
  )
}

export function CriticalityDetailPanel({ asset, onClose, onEdit, canEdit }: Props) {
  const config = classificationConfig[asset.classification]

  return (
    <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${config.color}`} />
          <h2 className="text-lg font-black text-gray-900 truncate">{asset.name}</h2>
        </div>
        <PanelCloseButton onClick={onClose} className="flex-shrink-0 ml-2" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Action buttons */}
        {canEdit && (
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={onEdit}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-[4px] hover:bg-gray-800 transition-colors"
            >
              <Icon name="edit" className="text-base" />
              Editar GUT
            </button>
          </div>
        )}

        {/* Classificação e Score */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Classificação</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Classificação</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Icon name={config.icon} className={`text-base ${config.textColor}`} />
                <span className="text-sm font-semibold text-foreground">{config.label}</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Score Total</p>
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-[4px] ${config.color} text-white font-bold text-lg mt-0.5`}>
                {asset.totalScore}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Status do Ativo</p>
              <p className="text-sm text-foreground mt-0.5">
                {asset.status === 'DOWN' ? 'Parado' :
                  asset.status === 'OPERATIONAL' ? 'Operacional' :
                    asset.status === 'IN_REPAIR' ? 'Em Reparo' :
                      asset.status === 'INACTIVE' ? 'Inativo' : asset.status}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Recomendação</p>
              <p className="text-sm text-foreground mt-0.5">{recommendation[asset.classification]}</p>
            </div>
          </div>
        </div>

        {/* Identificação */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Identificação</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {asset.customId && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Código</p>
                <p className="text-sm text-foreground">{asset.customId}</p>
              </div>
            )}
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Localização</p>
              <p className="text-sm text-foreground">{asset.location?.name || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Categoria</p>
              <p className="text-sm text-foreground">{asset.category?.name || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Área</p>
              <p className="text-sm text-foreground">{asset.area || '—'}</p>
            </div>
          </div>
        </div>

        {/* Matriz GUT */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Matriz GUT</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Gravidade (G) — {gutLabels[asset.gutGravity]?.gravity}</p>
              <DotBar value={asset.gutGravity} activeClass="bg-primary-graphite" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Urgência (U) — {gutLabels[asset.gutUrgency]?.urgency}</p>
              <DotBar value={asset.gutUrgency} activeClass="bg-on-surface-variant" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tendência (T) — {gutLabels[asset.gutTendency]?.tendency}</p>
              <DotBar value={asset.gutTendency} activeClass="bg-on-surface-variant" />
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Score GUT ({asset.gutGravity}×{asset.gutUrgency}×{asset.gutTendency})</span>
              <span className="text-lg font-bold text-foreground">{asset.gutScore}</span>
            </div>
          </div>
        </div>

        {/* Contagens operacionais */}
        <div className="p-4">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Operacional</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-surface rounded-[4px] border border-border text-center">
              <Icon name="assignment" className="text-xl text-muted-foreground mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{asset.openRequestsCount}</p>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">SS abertas</p>
            </div>
            <div className="p-3 bg-surface rounded-[4px] border border-border text-center">
              <Icon name="construction" className="text-xl text-muted-foreground mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{asset.openWorkOrdersCount}</p>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">OS abertas</p>
            </div>
            <div className="p-3 bg-surface rounded-[4px] border border-border text-center">
              <Icon name="warning" className="text-xl text-muted-foreground mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{asset.rafCount}</p>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">RAFs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
