'use client'

import { Icon } from '@/components/ui/Icon'
import type { AuditEntryAction, AuditSource } from '@/lib/audit/types'
import { entityLabel } from '@/lib/audit/labels'

export interface AuditFiltersState {
  search: string
  entity: 'ALL' | string
  action: 'ALL' | AuditEntryAction
  source: 'all' | AuditSource
  userId: 'ALL' | string
  dateFrom: string
  dateTo: string
}

export const DEFAULT_AUDIT_FILTERS: AuditFiltersState = {
  search: '',
  entity: 'ALL',
  action: 'ALL',
  source: 'all',
  userId: 'ALL',
  dateFrom: '',
  dateTo: '',
}

interface AuditFiltersProps {
  value: AuditFiltersState
  onChange: (next: AuditFiltersState) => void
  entities: string[]
  users: Array<{ id: string; label: string }>
}

const ACTION_OPTIONS: Array<{ value: 'ALL' | AuditEntryAction; label: string }> = [
  { value: 'ALL', label: 'Todas as ações' },
  { value: 'CREATE', label: 'Criação' },
  { value: 'UPDATE', label: 'Edição' },
  { value: 'DELETE', label: 'Exclusão' },
]

const SOURCE_OPTIONS: Array<{ value: 'all' | AuditSource; label: string }> = [
  { value: 'all', label: 'Todas as fontes' },
  { value: 'audit_log', label: 'Auditoria geral' },
  { value: 'asset_history', label: 'Histórico de ativos' },
  { value: 'wo_reschedule', label: 'Reprogramação de OS' },
  { value: 'company_rejection', label: 'Rejeição de empresa' },
]

export function AuditFilters({ value, onChange, entities, users }: AuditFiltersProps) {
  const set = <K extends keyof AuditFiltersState>(key: K, v: AuditFiltersState[K]) =>
    onChange({ ...value, [key]: v })

  return (
    <div className="flex flex-col lg:flex-row lg:flex-wrap gap-2 items-stretch lg:items-center">
      <div className="relative w-full sm:w-56 xl:w-64">
        <Icon name="search" className="absolute left-2 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
        <input
          type="text"
          value={value.search}
          onChange={(e) => set('search', e.target.value)}
          placeholder="Buscar por usuário, entidade..."
          className="w-full h-9 pl-8 pr-3 text-sm border border-input rounded-[4px] bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <select
        value={value.action}
        onChange={(e) => set('action', e.target.value as AuditFiltersState['action'])}
        className="h-9 px-3 text-sm border border-input rounded-[4px] bg-background focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
      >
        {ACTION_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={value.entity}
        onChange={(e) => set('entity', e.target.value)}
        className="h-9 px-3 text-sm border border-input rounded-[4px] bg-background focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
      >
        <option value="ALL">Todas as entidades</option>
        {entities.map((e) => (
          <option key={e} value={e}>{entityLabel(e)}</option>
        ))}
      </select>

      <select
        value={value.source}
        onChange={(e) => set('source', e.target.value as AuditFiltersState['source'])}
        className="h-9 px-3 text-sm border border-input rounded-[4px] bg-background focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
      >
        {SOURCE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={value.userId}
        onChange={(e) => set('userId', e.target.value)}
        className="h-9 px-3 text-sm border border-input rounded-[4px] bg-background focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
      >
        <option value="ALL">Todos os usuários</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.label}</option>
        ))}
      </select>

      <input
        type="date"
        value={value.dateFrom}
        onChange={(e) => set('dateFrom', e.target.value)}
        className="h-9 px-3 text-sm border border-input rounded-[4px] bg-background focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
        title="Data inicial"
      />
      <input
        type="date"
        value={value.dateTo}
        onChange={(e) => set('dateTo', e.target.value)}
        className="h-9 px-3 text-sm border border-input rounded-[4px] bg-background focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
        title="Data final"
      />
    </div>
  )
}
