'use client'

import type { ActionPlanStatus } from '@/types/raf'

type VisualStatus = ActionPlanStatus | 'OVERDUE' | 'DUE_SOON'

// Mapeamento monocromatico para o status de acao do PA das RAFs.
// Usa apenas simbolos e tons de cinza/preto para caber no padrao visual do produto.
// Hierarquia visual: OVERDUE (preto solido, borda grossa) > DUE_SOON (cinza medio, borda tracejada)
// > IN_PROGRESS (cinza claro) > PENDING (branco) > COMPLETED (preto com check).
const STATUS_CONFIG: Record<VisualStatus, { symbol: string; label: string; className: string }> = {
  PENDING: {
    symbol: '○',
    label: 'Pendente',
    className: 'bg-white text-gray-700 border border-gray-300',
  },
  IN_PROGRESS: {
    symbol: '◐',
    label: 'Em andamento',
    className: 'bg-gray-200 text-gray-900 border border-gray-400',
  },
  COMPLETED: {
    symbol: '✓',
    label: 'Concluida',
    className: 'bg-gray-900 text-white border border-gray-900',
  },
  DUE_SOON: {
    symbol: '◔',
    label: 'A vencer',
    className: 'bg-white text-gray-900 border border-dashed border-gray-700 font-semibold',
  },
  OVERDUE: {
    symbol: '●',
    label: 'Atrasada',
    className: 'bg-white text-gray-900 border-2 border-gray-900 font-bold',
  },
}

interface ActionPlanStatusBadgeProps {
  status: ActionPlanStatus
  overdue?: boolean
  dueSoon?: boolean
  size?: 'sm' | 'md'
  withLabel?: boolean
}

export function ActionPlanStatusBadge({
  status,
  overdue = false,
  dueSoon = false,
  size = 'sm',
  withLabel = true,
}: ActionPlanStatusBadgeProps) {
  // Precedencia: COMPLETED mantem o proprio badge; OVERDUE > DUE_SOON > status bruto.
  let key: VisualStatus = status
  if (status !== 'COMPLETED') {
    if (overdue) key = 'OVERDUE'
    else if (dueSoon) key = 'DUE_SOON'
  }
  const cfg = STATUS_CONFIG[key]

  const sizing =
    size === 'md'
      ? 'px-2.5 py-1 text-xs'
      : 'px-2 py-0.5 text-[11px]'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${sizing} ${cfg.className}`}
      aria-label={cfg.label}
      title={cfg.label}
    >
      <span className="leading-none">{cfg.symbol}</span>
      {withLabel && <span className="uppercase tracking-wide">{cfg.label}</span>}
    </span>
  )
}
