'use client'

import { Icon } from '@/components/ui/Icon'
import { ActionPlanStatusBadge } from './ActionPlanStatusBadge'
import type { ActionPlanStatus, RafStatusValue } from '@/types/raf'

export interface ActionPlanRow {
  // Identificacao da acao dentro da RAF
  rafId: string
  actionIndex: number
  rafNumber: string
  rafStatus: RafStatusValue
  rafCreatedAt: string | null
  occurrenceDate: string | null

  // Dados da acao
  item: number
  subject: string
  actionDescription: string
  deadline: string | null
  status: ActionPlanStatus
  overdue: boolean
  dueSoon: boolean

  // Responsavel
  responsibleUserId?: string | null
  responsibleName?: string | null

  // Vinculos
  linkedWorkOrderId?: string | null
  linkedWorkOrderNumber?: string | null
  linkedRequestId?: string | null
  linkedRequestNumber?: string | null
}

export type ActionPlanSortKey =
  | 'rafNumber'
  | 'actionDescription'
  | 'responsibleName'
  | 'rafCreatedAt'
  | 'occurrenceDate'
  | 'deadline'
  | 'linkedWorkOrderNumber'
  | 'linkedRequestNumber'
  | 'status'
  | 'rafStatus'

export type ActionPlanSortDir = 'asc' | 'desc'

export interface ActionPlanSortState {
  key: ActionPlanSortKey
  dir: ActionPlanSortDir
}

interface ActionPlanTableProps {
  rows: ActionPlanRow[]
  loading?: boolean
  onOpenRaf: (rafId: string) => void
  onChangeStatus?: (row: ActionPlanRow, next: ActionPlanStatus) => void
  canEditStatus?: boolean
  sort?: ActionPlanSortState
  onSort?: (key: ActionPlanSortKey) => void
  // Selecao para impressao em lote (opcional — fase 5 foca em export Excel)
  selected?: Set<string>
  onToggleSelect?: (rowKey: string) => void
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) {
      // Provavelmente ja vem formatado (dd/mm/yyyy)
      return String(value)
    }
    return d.toLocaleDateString('pt-BR')
  } catch {
    return String(value)
  }
}

function rowKey(row: ActionPlanRow): string {
  return `${row.rafId}:${row.actionIndex}`
}

interface SortableHeaderProps {
  label: string
  sortKey: ActionPlanSortKey
  sort?: ActionPlanSortState
  onSort?: (key: ActionPlanSortKey) => void
}

function SortableHeader({ label, sortKey, sort, onSort }: SortableHeaderProps) {
  if (!onSort) {
    return (
      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </th>
    )
  }
  const active = sort?.key === sortKey
  const icon = !active
    ? 'unfold_more'
    : sort?.dir === 'asc'
    ? 'arrow_upward'
    : 'arrow_downward'
  return (
    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-foreground transition-colors"
      >
        {label}
        <Icon
          name={icon}
          className={`text-sm ${active ? 'text-accent-orange' : 'text-muted-foreground'}`}
        />
      </button>
    </th>
  )
}

export function ActionPlanTable({
  rows,
  loading,
  onOpenRaf,
  onChangeStatus,
  canEditStatus = false,
  sort,
  onSort,
}: ActionPlanTableProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Nenhuma acao encontrada.
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      <div className="flex-1 overflow-auto min-h-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 bg-secondary z-10">
            <tr>
              <SortableHeader label="RAF" sortKey="rafNumber" sort={sort} onSort={onSort} />
              <SortableHeader label="Acao" sortKey="actionDescription" sort={sort} onSort={onSort} />
              <SortableHeader label="Responsavel" sortKey="responsibleName" sort={sort} onSort={onSort} />
              <SortableHeader label="Criacao" sortKey="rafCreatedAt" sort={sort} onSort={onSort} />
              <SortableHeader label="Ocorrencia" sortKey="occurrenceDate" sort={sort} onSort={onSort} />
              <SortableHeader label="Prazo" sortKey="deadline" sort={sort} onSort={onSort} />
              <SortableHeader label="OS" sortKey="linkedWorkOrderNumber" sort={sort} onSort={onSort} />
              <SortableHeader label="SS" sortKey="linkedRequestNumber" sort={sort} onSort={onSort} />
              <SortableHeader label="Status acao" sortKey="status" sort={sort} onSort={onSort} />
              <SortableHeader label="Status RAF" sortKey="rafStatus" sort={sort} onSort={onSort} />
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-200">
            {rows.map((r) => (
              <tr
                key={rowKey(r)}
                className="odd:bg-gray-50 even:bg-white hover:bg-secondary transition-colors"
              >
                <td className="px-4 py-3 text-sm">
                  <button
                    type="button"
                    onClick={() => onOpenRaf(r.rafId)}
                    className="font-semibold text-gray-900 hover:underline"
                    title="Abrir RAF"
                  >
                    {r.rafNumber}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-foreground max-w-md">
                  <div className="line-clamp-2" title={r.actionDescription || r.subject}>
                    {r.actionDescription || r.subject || '—'}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-foreground">
                  {r.responsibleName || <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                  {formatDate(r.rafCreatedAt)}
                </td>
                <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                  {formatDate(r.occurrenceDate)}
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <span
                    className={
                      r.overdue && r.status !== 'COMPLETED'
                        ? 'font-bold text-gray-900 border-l-2 border-gray-900 pl-2'
                        : r.dueSoon && r.status !== 'COMPLETED'
                        ? 'font-semibold text-gray-900 border-l-2 border-dashed border-gray-500 pl-2'
                        : 'text-foreground'
                    }
                  >
                    {formatDate(r.deadline)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                  {r.linkedWorkOrderNumber || <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                  {r.linkedRequestNumber || <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-sm">
                  {canEditStatus && onChangeStatus ? (
                    <select
                      value={r.status}
                      onChange={(e) => onChangeStatus(r, e.target.value as ActionPlanStatus)}
                      className="h-8 px-2 text-xs border border-input rounded-[4px] bg-white"
                    >
                      <option value="PENDING">Pendente</option>
                      <option value="IN_PROGRESS">Em andamento</option>
                      <option value="COMPLETED">Concluida</option>
                    </select>
                  ) : (
                    <ActionPlanStatusBadge status={r.status} overdue={r.overdue} dueSoon={r.dueSoon} />
                  )}
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wide ${
                      r.rafStatus === 'FINALIZADA'
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-700 border border-gray-300'
                    }`}
                  >
                    {r.rafStatus === 'FINALIZADA' ? 'Finalizada' : 'Aberta'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface ActionPlanCardsProps {
  rows: ActionPlanRow[]
  onOpenRaf: (rafId: string) => void
  onChangeStatus?: (row: ActionPlanRow, next: ActionPlanStatus) => void
  canEditStatus?: boolean
}

// Visualizacao em cards para mobile (isPhone) e toggle Grade.
export function ActionPlanCards({ rows, onOpenRaf, onChangeStatus, canEditStatus }: ActionPlanCardsProps) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        Nenhuma acao encontrada.
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {rows.map((r) => (
        <div
          key={rowKey(r)}
          className="bg-white border border-gray-200 rounded-[4px] p-3 shadow-sm min-h-[44px] cursor-pointer hover:border-gray-400 transition-colors"
          onClick={() => onOpenRaf(r.rafId)}
        >
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenRaf(r.rafId) }}
              className="font-bold text-sm text-gray-900 hover:underline truncate"
            >
              {r.rafNumber}
            </button>
            <ActionPlanStatusBadge status={r.status} overdue={r.overdue} dueSoon={r.dueSoon} />
          </div>
          <div className="mt-1 text-sm text-foreground line-clamp-2">
            {r.actionDescription || r.subject || '—'}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>
              <Icon name="event" className="text-xs align-middle" /> Prazo: {formatDate(r.deadline)}
            </span>
            <span>
              <Icon name="person" className="text-xs align-middle" />{' '}
              {r.responsibleName || 'Sem responsavel'}
            </span>
            {r.linkedWorkOrderNumber && (
              <span>
                <Icon name="build" className="text-xs align-middle" /> OS {r.linkedWorkOrderNumber}
              </span>
            )}
            {r.linkedRequestNumber && (
              <span>
                <Icon name="description" className="text-xs align-middle" /> SS {r.linkedRequestNumber}
              </span>
            )}
          </div>
          {canEditStatus && onChangeStatus && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <select
                value={r.status}
                onChange={(e) => onChangeStatus(r, e.target.value as ActionPlanStatus)}
                className="w-full min-h-[44px] px-2 text-sm border border-input rounded-[4px] bg-white"
              >
                <option value="PENDING">Pendente</option>
                <option value="IN_PROGRESS">Em andamento</option>
                <option value="COMPLETED">Concluida</option>
              </select>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
