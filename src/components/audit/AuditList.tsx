'use client'

import { Icon } from '@/components/ui/Icon'
import type { AuditEntry, AuditEntryAction, AuditSource } from '@/lib/audit/types'
import { entityLabel } from '@/lib/audit/labels'

export type AuditSortKey = 'createdAt' | 'userName' | 'action' | 'entity' | 'entityLabel'
export interface AuditSortState { key: AuditSortKey; dir: 'asc' | 'desc' }

interface AuditListProps {
  entries: AuditEntry[]
  selectedId: string | null
  onSelect: (id: string) => void
  sort: AuditSortState
  onSort: (key: AuditSortKey) => void
}

const ACTION_LABELS: Record<AuditEntryAction, string> = {
  CREATE: 'Criação',
  UPDATE: 'Edição',
  DELETE: 'Exclusão',
}

const SOURCE_LABELS: Record<AuditSource, string> = {
  audit_log: 'Auditoria',
  asset_history: 'Ativo',
  wo_reschedule: 'OS reprog.',
  company_rejection: 'Empresa',
}

function formatDateTime(iso: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function ActionBadge({ action }: { action: AuditEntryAction }) {
  const tone =
    action === 'CREATE'
      ? 'bg-gray-100 text-gray-900 border-gray-300'
      : action === 'DELETE'
      ? 'bg-gray-900 text-white border-gray-900'
      : 'bg-white text-gray-700 border-gray-400'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider border ${tone}`}>
      {ACTION_LABELS[action]}
    </span>
  )
}

function SortableHeader({
  label, sortKey, sort, onSort, className,
}: { label: string; sortKey: AuditSortKey; sort: AuditSortState; onSort: (k: AuditSortKey) => void; className?: string }) {
  const active = sort.key === sortKey
  const icon = !active ? 'unfold_more' : sort.dir === 'asc' ? 'arrow_upward' : 'arrow_downward'
  return (
    <th
      className={`px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none ${className ?? ''}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon name={icon} className={`text-base ${active ? 'text-accent-orange' : ''}`} />
      </span>
    </th>
  )
}

export function AuditTable({ entries, selectedId, onSelect, sort, onSort }: AuditListProps) {
  return (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      <div className="flex-1 overflow-auto min-h-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 bg-secondary z-10">
            <tr>
              <SortableHeader label="Data/Hora" sortKey="createdAt" sort={sort} onSort={onSort} />
              <SortableHeader label="Usuário" sortKey="userName" sort={sort} onSort={onSort} />
              <SortableHeader label="Ação" sortKey="action" sort={sort} onSort={onSort} />
              <SortableHeader label="Entidade" sortKey="entity" sort={sort} onSort={onSort} />
              <SortableHeader label="Identificador" sortKey="entityLabel" sort={sort} onSort={onSort} />
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Resumo</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-200">
            {entries.map((e) => {
              const isSelected = selectedId === e.id
              return (
                <tr
                  key={e.id}
                  onClick={() => onSelect(e.id)}
                  className={`${isSelected ? 'bg-secondary' : 'odd:bg-gray-50 even:bg-white hover:bg-secondary'} cursor-pointer transition-colors`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{formatDateTime(e.createdAt)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{e.userName ?? '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm"><ActionBadge action={e.action} /></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{entityLabel(e.entity)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{e.entityLabel ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-foreground max-w-[400px] truncate" title={e.summary}>
                    <span className="text-[11px] text-muted-foreground mr-2 uppercase">[{SOURCE_LABELS[e.source]}]</span>
                    {e.summary}
                  </td>
                </tr>
              )
            })}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-muted-foreground">
                  Nenhum evento de auditoria encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AuditCards({ entries, selectedId, onSelect }: AuditListProps) {
  if (entries.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted-foreground">
        Nenhum evento de auditoria encontrado.
      </div>
    )
  }
  return (
    <div className="overflow-auto flex-1 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {entries.map((e) => {
          const isSelected = selectedId === e.id
          return (
            <button
              key={e.id}
              onClick={() => onSelect(e.id)}
              className={`text-left bg-card border ${isSelected ? 'border-gray-900' : 'border-gray-200'} rounded-[4px] p-3 hover:bg-secondary transition-colors`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-[12px] font-bold text-gray-900 truncate">{entityLabel(e.entity)} {e.entityLabel ? `· ${e.entityLabel}` : ''}</span>
                <ActionBadge action={e.action} />
              </div>
              <div className="text-[12px] text-foreground line-clamp-2 mb-2">{e.summary}</div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span><Icon name="schedule" className="text-xs align-middle" /> {formatDateTime(e.createdAt)}</span>
                <span><Icon name="person" className="text-xs align-middle" /> {e.userName ?? '—'}</span>
                <span className="uppercase">[{SOURCE_LABELS[e.source]}]</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
