'use client'

import { Icon } from '@/components/ui/Icon'
import type { RafActionPlanStats } from '@/types/raf'

interface ActionPlanDashboardCardsProps {
  stats: RafActionPlanStats | null
  loading?: boolean
}

// Quatro KPIs do PA das RAFs.
// Monocromatico: fundo branco, borda cinza, numero grande em cinza-900.
// OVERDUE recebe borda preta em negrito para sinalizar urgencia sem cor.
export function ActionPlanDashboardCards({ stats, loading }: ActionPlanDashboardCardsProps) {
  const items: Array<{
    key: keyof RafActionPlanStats
    label: string
    icon: string
    emphasize?: boolean
  }> = [
    { key: 'openRafs', label: 'RAFs abertas', icon: 'folder_open' },
    { key: 'finalizedRafs', label: 'RAFs finalizadas', icon: 'verified' },
    { key: 'onTimeActions', label: 'Ações no prazo', icon: 'schedule' },
    { key: 'overdueActions', label: 'Ações atrasadas', icon: 'warning', emphasize: true },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {items.map((it) => {
        const value = stats ? stats[it.key] : 0
        const border = it.emphasize ? 'border-2 border-gray-900' : 'border border-gray-200'
        return (
          <div
            key={it.key}
            className={`bg-white ${border} rounded-[4px] p-4 shadow-sm flex items-center gap-3`}
          >
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                it.emphasize ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <Icon name={it.icon} className="text-xl" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 truncate">
                {it.label}
              </div>
              <div className="text-2xl font-black text-gray-900 leading-tight">
                {loading ? '—' : value}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
