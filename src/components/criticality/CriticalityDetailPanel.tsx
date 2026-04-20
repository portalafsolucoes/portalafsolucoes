'use client'

import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { PanelCloseButton } from '@/components/ui/PanelCloseButton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { formatDate } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'

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

interface RequestItem {
  id: string
  requestNumber: string | null
  title: string
  status: string
  priority: string
  createdAt: string | null
  dueDate: string | null
}

interface WorkOrderItem {
  id: string
  internalId: string | null
  externalId: string | null
  title: string
  status: string
  priority: string
  createdAt: string | null
  dueDate: string | null
}

type RafOriginKind = 'work_order' | 'request' | 'legacy_name_match'

interface RafItem {
  id: string
  rafNumber: string
  failureType: string | null
  occurrenceDate: string | null
  createdAt: string | null
  originKind: RafOriginKind
  originLabel: string | null
}

export type PrintKind = 'request' | 'work-order' | 'raf'

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

const requestStatusLabel = (s: string) => {
  if (s === 'APPROVED') return 'Aprovada'
  return 'Pendente'
}
const workOrderStatusLabel = (s: string) => {
  switch (s) {
    case 'PENDING': return 'Pendente'
    case 'RELEASED': return 'Liberada'
    case 'IN_PROGRESS': return 'Em Progresso'
    case 'ON_HOLD': return 'Em Espera'
    default: return s
  }
}
const rafOriginLabel = (kind: RafOriginKind) => {
  if (kind === 'work_order') return 'OS'
  if (kind === 'request') return 'SS'
  return 'Legado'
}

interface Props {
  asset: AssetCriticality
  onClose: () => void
  onEdit: () => void
  canEdit: boolean
  onPrintSingle?: (kind: PrintKind, id: string) => void
  onPrintBatch?: (kind: PrintKind, ids: string[]) => void
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

export function CriticalityDetailPanel({ asset, onClose, onEdit, canEdit, onPrintSingle, onPrintBatch }: Props) {
  const config = classificationConfig[asset.classification]
  const { canView } = usePermissions()

  const canViewRequests = canView('requests')
  const canViewWorkOrders = canView('work-orders')
  const canViewRafs = canView('rafs')
  const hasAnyDrilldown = canViewRequests || canViewWorkOrders || canViewRafs

  const [activeTab, setActiveTab] = useState<string>('overview')
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>([])
  const [rafs, setRafs] = useState<RafItem[]>([])
  const [drilldownLoading, setDrilldownLoading] = useState(false)

  const [selectedSS, setSelectedSS] = useState<Set<string>>(new Set())
  const [selectedOS, setSelectedOS] = useState<Set<string>>(new Set())
  const [selectedRAF, setSelectedRAF] = useState<Set<string>>(new Set())

  // Reset selection and fetch drilldown when asset changes
  useEffect(() => {
    setSelectedSS(new Set())
    setSelectedOS(new Set())
    setSelectedRAF(new Set())
    setActiveTab('overview')

    if (!hasAnyDrilldown) return
    let cancelled = false
    const load = async () => {
      setDrilldownLoading(true)
      try {
        const res = await fetch(`/api/criticality/${asset.id}/open-items`)
        if (res.ok) {
          const json = await res.json()
          if (!cancelled && json.data) {
            setRequests(json.data.requests || [])
            setWorkOrders(json.data.workOrders || [])
            setRafs(json.data.rafs || [])
          }
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setDrilldownLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [asset.id, hasAnyDrilldown])

  const toggleInSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllInSet = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    ids: string[],
    allSelected: boolean
  ) => {
    setter(() => (allSelected ? new Set() : new Set(ids)))
  }

  const allSSSelected = useMemo(
    () => requests.length > 0 && requests.every((r) => selectedSS.has(r.id)),
    [requests, selectedSS]
  )
  const allOSSelected = useMemo(
    () => workOrders.length > 0 && workOrders.every((w) => selectedOS.has(w.id)),
    [workOrders, selectedOS]
  )
  const allRAFSelected = useMemo(
    () => rafs.length > 0 && rafs.every((r) => selectedRAF.has(r.id)),
    [rafs, selectedRAF]
  )

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

      {/* Tabs */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="w-full justify-start border-b rounded-none px-4 flex-shrink-0 overflow-x-auto">
            <TabsTrigger value="overview" className="flex items-center gap-1.5">
              <Icon name="analytics" className="text-base" />
              Visão Geral
            </TabsTrigger>
            {canViewRequests && (
              <TabsTrigger value="ss" className="flex items-center gap-1.5">
                <Icon name="assignment" className="text-base" />
                SS ({asset.openRequestsCount})
              </TabsTrigger>
            )}
            {canViewWorkOrders && (
              <TabsTrigger value="os" className="flex items-center gap-1.5">
                <Icon name="construction" className="text-base" />
                OS ({asset.openWorkOrdersCount})
              </TabsTrigger>
            )}
            {canViewRafs && (
              <TabsTrigger value="raf" className="flex items-center gap-1.5">
                <Icon name="warning" className="text-base" />
                RAF ({asset.rafCount})
              </TabsTrigger>
            )}
          </TabsList>

          {/* Tab: Visão Geral */}
          <TabsContent value="overview" className="flex-1 overflow-y-auto mt-0">
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
                          asset.status === 'INACTIVE' ? 'INATIVO' : asset.status}
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
                <button
                  type="button"
                  onClick={() => canViewRequests && setActiveTab('ss')}
                  disabled={!canViewRequests}
                  className="p-3 bg-surface rounded-[4px] border border-border text-center disabled:cursor-not-allowed enabled:hover:border-primary enabled:hover:bg-primary/5 transition-colors"
                >
                  <Icon name="assignment" className="text-xl text-muted-foreground mx-auto mb-1" />
                  <p className="text-2xl font-bold text-foreground">{asset.openRequestsCount}</p>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">SS abertas</p>
                </button>
                <button
                  type="button"
                  onClick={() => canViewWorkOrders && setActiveTab('os')}
                  disabled={!canViewWorkOrders}
                  className="p-3 bg-surface rounded-[4px] border border-border text-center disabled:cursor-not-allowed enabled:hover:border-primary enabled:hover:bg-primary/5 transition-colors"
                >
                  <Icon name="construction" className="text-xl text-muted-foreground mx-auto mb-1" />
                  <p className="text-2xl font-bold text-foreground">{asset.openWorkOrdersCount}</p>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">OS abertas</p>
                </button>
                <button
                  type="button"
                  onClick={() => canViewRafs && setActiveTab('raf')}
                  disabled={!canViewRafs}
                  className="p-3 bg-surface rounded-[4px] border border-border text-center disabled:cursor-not-allowed enabled:hover:border-primary enabled:hover:bg-primary/5 transition-colors"
                >
                  <Icon name="warning" className="text-xl text-muted-foreground mx-auto mb-1" />
                  <p className="text-2xl font-bold text-foreground">{asset.rafCount}</p>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">RAFs</p>
                </button>
              </div>
            </div>
          </TabsContent>

          {/* Tab: SS */}
          {canViewRequests && (
            <TabsContent value="ss" className="flex-1 overflow-y-auto mt-0">
              <DrilldownList
                label="Solicitações de Serviço abertas"
                loading={drilldownLoading}
                emptyText="Nenhuma SS aberta para este ativo."
                items={requests}
                selected={selectedSS}
                onToggle={(id) => toggleInSet(setSelectedSS, id)}
                allSelected={allSSSelected}
                onToggleAll={() =>
                  toggleAllInSet(
                    setSelectedSS,
                    requests.map((r) => r.id),
                    allSSSelected
                  )
                }
                onPrintSingle={onPrintSingle ? (id) => onPrintSingle('request', id) : undefined}
                onPrintBatch={
                  onPrintBatch && selectedSS.size > 0
                    ? () => onPrintBatch('request', Array.from(selectedSS))
                    : undefined
                }
                renderPrimary={(r: RequestItem) => r.requestNumber || r.id.slice(0, 8)}
                renderSecondary={(r: RequestItem) => r.title}
                renderBadge={(r: RequestItem) => requestStatusLabel(r.status)}
                renderDue={(r: RequestItem) => r.dueDate}
              />
            </TabsContent>
          )}

          {/* Tab: OS */}
          {canViewWorkOrders && (
            <TabsContent value="os" className="flex-1 overflow-y-auto mt-0">
              <DrilldownList
                label="Ordens de Serviço abertas"
                loading={drilldownLoading}
                emptyText="Nenhuma OS aberta para este ativo."
                items={workOrders}
                selected={selectedOS}
                onToggle={(id) => toggleInSet(setSelectedOS, id)}
                allSelected={allOSSelected}
                onToggleAll={() =>
                  toggleAllInSet(
                    setSelectedOS,
                    workOrders.map((w) => w.id),
                    allOSSelected
                  )
                }
                onPrintSingle={onPrintSingle ? (id) => onPrintSingle('work-order', id) : undefined}
                onPrintBatch={
                  onPrintBatch && selectedOS.size > 0
                    ? () => onPrintBatch('work-order', Array.from(selectedOS))
                    : undefined
                }
                renderPrimary={(w: WorkOrderItem) => w.externalId || w.internalId || w.id.slice(0, 8)}
                renderSecondary={(w: WorkOrderItem) => w.title}
                renderBadge={(w: WorkOrderItem) => workOrderStatusLabel(w.status)}
                renderDue={(w: WorkOrderItem) => w.dueDate}
              />
            </TabsContent>
          )}

          {/* Tab: RAF */}
          {canViewRafs && (
            <TabsContent value="raf" className="flex-1 overflow-y-auto mt-0">
              <DrilldownList
                label="Relatórios de Análise de Falha"
                loading={drilldownLoading}
                emptyText="Nenhuma RAF encontrada para este ativo."
                items={rafs}
                selected={selectedRAF}
                onToggle={(id) => toggleInSet(setSelectedRAF, id)}
                allSelected={allRAFSelected}
                onToggleAll={() =>
                  toggleAllInSet(
                    setSelectedRAF,
                    rafs.map((r) => r.id),
                    allRAFSelected
                  )
                }
                onPrintSingle={onPrintSingle ? (id) => onPrintSingle('raf', id) : undefined}
                onPrintBatch={
                  onPrintBatch && selectedRAF.size > 0
                    ? () => onPrintBatch('raf', Array.from(selectedRAF))
                    : undefined
                }
                renderPrimary={(r: RafItem) => r.rafNumber}
                renderSecondary={(r: RafItem) => {
                  const origin = r.originLabel
                    ? `${rafOriginLabel(r.originKind)} ${r.originLabel}`
                    : rafOriginLabel(r.originKind)
                  return origin
                }}
                renderBadge={(r: RafItem) =>
                  r.failureType === 'REPETITIVE' ? 'Repetitiva' : 'Aleatória'
                }
                renderDue={(r: RafItem) => r.occurrenceDate}
                dueLabel="Ocorrência"
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}

interface DrilldownListProps<T extends { id: string }> {
  label: string
  loading: boolean
  emptyText: string
  items: T[]
  selected: Set<string>
  onToggle: (id: string) => void
  allSelected: boolean
  onToggleAll: () => void
  onPrintSingle?: (id: string) => void
  onPrintBatch?: () => void
  renderPrimary: (item: T) => string
  renderSecondary: (item: T) => string
  renderBadge: (item: T) => string
  renderDue: (item: T) => string | null
  dueLabel?: string
}

function DrilldownList<T extends { id: string }>({
  label,
  loading,
  emptyText,
  items,
  selected,
  onToggle,
  allSelected,
  onToggleAll,
  onPrintSingle,
  onPrintBatch,
  renderPrimary,
  renderSecondary,
  renderBadge,
  renderDue,
  dueLabel = 'Prazo',
}: DrilldownListProps<T>) {
  if (loading) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-on-surface-variant mb-2" />
        <p>Carregando...</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    )
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleAll}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary flex-shrink-0"
            aria-label="Selecionar todos"
          />
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide truncate">
            {label} ({items.length})
          </span>
        </div>
        {onPrintBatch && (
          <button
            type="button"
            onClick={onPrintBatch}
            disabled={selected.size === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[4px] bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Icon name="print" className="text-sm" />
            Imprimir ({selected.size})
          </button>
        )}
      </div>

      <ul className="divide-y divide-gray-100">
        {items.map((item) => {
          const isSelected = selected.has(item.id)
          const due = renderDue(item)
          return (
            <li
              key={item.id}
              className={`px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                isSelected ? 'bg-primary/5' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(item.id)}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary flex-shrink-0"
                aria-label={`Selecionar ${renderPrimary(item)}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground font-mono">{renderPrimary(item)}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-foreground border border-border">
                    {renderBadge(item)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{renderSecondary(item)}</p>
                {due && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {dueLabel}: {formatDate(due)}
                  </p>
                )}
              </div>
              {onPrintSingle && (
                <button
                  type="button"
                  onClick={() => onPrintSingle(item.id)}
                  className="flex-shrink-0 p-2 text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-[4px] transition-colors"
                  title="Imprimir"
                >
                  <Icon name="print" className="text-base" />
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
