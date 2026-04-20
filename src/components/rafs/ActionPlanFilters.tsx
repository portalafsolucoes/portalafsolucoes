'use client'

import { Icon } from '@/components/ui/Icon'
import type { ActionPlanStatus, RafStatusValue } from '@/types/raf'

export type ActionStatusFilter = ActionPlanStatus | 'ALL' | 'OVERDUE'
export type RafStatusFilter = RafStatusValue | 'ALL'

export interface ActionPlanFiltersState {
  search: string
  actionStatus: ActionStatusFilter
  rafStatus: RafStatusFilter
  responsibleId: string | 'ALL'
}

interface ResponsibleOption {
  id: string
  label: string
}

interface ActionPlanFiltersProps {
  value: ActionPlanFiltersState
  onChange: (next: ActionPlanFiltersState) => void
  responsibles: ResponsibleOption[]
}

export function ActionPlanFilters({ value, onChange, responsibles }: ActionPlanFiltersProps) {
  const patch = (partial: Partial<ActionPlanFiltersState>) => onChange({ ...value, ...partial })

  const selectClass =
    'h-9 px-3 text-sm border border-input rounded-[4px] bg-background focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-64">
        <Icon
          name="search"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground"
        />
        <input
          type="text"
          value={value.search}
          onChange={(e) => patch({ search: e.target.value })}
          placeholder="Buscar por RAF, acao ou responsavel..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring bg-white"
        />
      </div>

      <select
        value={value.actionStatus}
        onChange={(e) => patch({ actionStatus: e.target.value as ActionStatusFilter })}
        className={selectClass}
      >
        <option value="ALL">Todos status de acao</option>
        <option value="PENDING">Pendente</option>
        <option value="IN_PROGRESS">Em andamento</option>
        <option value="COMPLETED">Concluida</option>
        <option value="OVERDUE">Atrasadas</option>
      </select>

      <select
        value={value.rafStatus}
        onChange={(e) => patch({ rafStatus: e.target.value as RafStatusFilter })}
        className={selectClass}
      >
        <option value="ALL">Todas as RAFs</option>
        <option value="ABERTA">RAFs abertas</option>
        <option value="FINALIZADA">RAFs finalizadas</option>
      </select>

      <select
        value={value.responsibleId}
        onChange={(e) => patch({ responsibleId: e.target.value })}
        className={selectClass}
      >
        <option value="ALL">Todos responsaveis</option>
        <option value="">Sem responsavel</option>
        {responsibles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
    </div>
  )
}
