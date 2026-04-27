'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdaptiveSplitPanel } from '@/components/layout/AdaptiveSplitPanel'
import { Icon } from '@/components/ui/Icon'
import { ExportButton } from '@/components/ui/ExportButton'
import { useAuth } from '@/hooks/useAuth'
import { useResponsiveLayout } from '@/hooks/useMediaQuery'
import { hasPermission } from '@/lib/permissions'
import { getDefaultCmmsPath } from '@/lib/user-roles'
import type { AuditEntry, AuditPageResponse } from '@/lib/audit/types'
import {
  AuditFilters,
  DEFAULT_AUDIT_FILTERS,
  type AuditFiltersState,
} from '@/components/audit/AuditFilters'
import { AuditTable, AuditCards, type AuditSortKey, type AuditSortState } from '@/components/audit/AuditList'
import { AuditDetailPanel } from '@/components/audit/AuditDetailPanel'

const PAGE_SIZE = 50

export default function AuditPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { isPhone } = useResponsiveLayout()

  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [approximate, setApproximate] = useState(false)
  const [resolvedRefs, setResolvedRefs] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<AuditFiltersState>(DEFAULT_AUDIT_FILTERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sort, setSort] = useState<AuditSortState>({ key: 'createdAt', dir: 'desc' })

  const hasAccess = !!user && hasPermission(user, 'audit', 'view')

  useEffect(() => {
    if (authLoading || !user) return
    if (!hasAccess) router.push(getDefaultCmmsPath(user))
  }, [authLoading, user, hasAccess, router])

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.action !== 'ALL') params.append('action', filters.action)
    if (filters.entity !== 'ALL') params.append('entity', filters.entity)
    if (filters.source !== 'all') params.append('source', filters.source)
    if (filters.userId !== 'ALL') params.append('userId', filters.userId)
    if (filters.dateFrom) params.append('dateFrom', new Date(filters.dateFrom).toISOString())
    if (filters.dateTo) {
      const end = new Date(filters.dateTo)
      end.setHours(23, 59, 59, 999)
      params.append('dateTo', end.toISOString())
    }
    if (filters.search.trim()) params.append('q', filters.search.trim())
    params.append('page', String(page))
    params.append('pageSize', String(PAGE_SIZE))
    return params.toString()
  }, [filters, page])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/audit?${queryString}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as AuditPageResponse
      setEntries(Array.isArray(json.data) ? json.data : [])
      setTotal(typeof json.total === 'number' ? json.total : 0)
      setApproximate(!!json.approximate)
      setResolvedRefs(json.resolvedRefs ?? {})
    } catch (e) {
      console.error('audit load:', e)
      setEntries([])
      setTotal(0)
      setResolvedRefs({})
    } finally {
      setLoading(false)
    }
  }, [queryString])

  useEffect(() => {
    if (!authLoading && hasAccess) load()
  }, [authLoading, hasAccess, load])

  // Reset de pagina quando filtros mudam.
  useEffect(() => {
    setPage(1)
  }, [filters])

  // Lista de entidades distintas presentes no resultado, para alimentar o select.
  const entitiesInResult = useMemo(() => {
    const set = new Set<string>()
    for (const e of entries) set.add(e.entity)
    return Array.from(set).sort()
  }, [entries])

  // Lista de usuarios presentes no resultado.
  const usersInResult = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of entries) {
      if (e.userId && e.userName) map.set(e.userId, e.userName)
    }
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  }, [entries])

  const sortedEntries = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1
    const arr = [...entries]
    arr.sort((a, b) => {
      const valueOf = (e: AuditEntry, key: AuditSortKey): string => {
        switch (key) {
          case 'createdAt': return e.createdAt
          case 'userName': return (e.userName ?? '').toLowerCase()
          case 'action': return e.action
          case 'entity': return e.entity.toLowerCase()
          case 'entityLabel': return (e.entityLabel ?? '').toLowerCase()
        }
      }
      const av = valueOf(a, sort.key)
      const bv = valueOf(b, sort.key)
      if (!av && !bv) return 0
      if (!av) return 1
      if (!bv) return -1
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
    return arr
  }, [entries, sort])

  const onSort = useCallback((key: AuditSortKey) => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }, [])

  const selectedEntry = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId]
  )

  const exportData = useMemo(() => {
    return sortedEntries.map((e) => ({
      createdAt: e.createdAt,
      userName: e.userName ?? '',
      userRole: e.userRole ?? '',
      action: e.action,
      entity: e.entity,
      entityLabel: e.entityLabel ?? '',
      summary: e.summary,
      source: e.source,
    }))
  }, [sortedEntries])

  if (authLoading || !user) {
    return (
      <PageContainer variant="full" className="overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
        </div>
      </PageContainer>
    )
  }
  if (!hasAccess) return null

  const showSidePanel = !!selectedEntry
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const headerActions = (
    <ExportButton entity="audit" data={exportData as unknown as Record<string, unknown>[]} />
  )

  const filtersBlock = (
    <div className="flex flex-col gap-3">
      <AuditFilters value={filters} onChange={setFilters} entities={entitiesInResult} users={usersInResult} />
      {approximate && (
        <div className="flex items-start gap-2 text-[12px] text-muted-foreground bg-gray-50 border border-gray-200 rounded-[4px] p-2">
          <Icon name="info" className="text-base mt-0.5" />
          <span>
            Resultado parcial: as fontes legadas foram amostradas em até 500 itens cada para manter o tempo de resposta. Refine
            os filtros (data, entidade, fonte) para ver mais.
          </span>
        </div>
      )}
    </div>
  )

  const paginator = (
    <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-2 border-t border-border bg-card text-sm">
      <span className="text-muted-foreground">
        {total} {total === 1 ? 'registro' : 'registros'} · página {page} de {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
          className="h-8 px-3 text-sm border border-input rounded-[4px] bg-background hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Anterior
        </button>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || loading}
          className="h-8 px-3 text-sm border border-input rounded-[4px] bg-background hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Próxima
        </button>
      </div>
    </div>
  )

  if (isPhone) {
    return (
      <PageContainer variant="full" className="p-0 h-auto min-h-full">
        <div className="border-b border-border px-4 py-3 flex-shrink-0">
          <PageHeader
            title="Auditoria"
            description="Relatório de alterações realizadas no sistema"
            className="mb-0"
            actions={headerActions}
          />
        </div>
        <div className="px-4 py-3 border-b border-border bg-card">{filtersBlock}</div>
        <div className="border-t border-border bg-card">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
            </div>
          ) : (
            <AuditCards
              entries={sortedEntries}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id)}
              sort={sort}
              onSort={onSort}
            />
          )}
        </div>
        {paginator}
        {showSidePanel && selectedEntry && (
          <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setSelectedId(null)}>
            <div className="absolute inset-0 bg-card overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <AuditDetailPanel entry={selectedEntry} onClose={() => setSelectedId(null)} resolvedRefs={resolvedRefs} />
            </div>
          </div>
        )}
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          title="Auditoria"
          description="Relatório de alterações realizadas no sistema"
          className="mb-0"
          actions={headerActions}
        />
      </div>

      <div className="px-4 md:px-6 py-3 border-b border-border bg-card">{filtersBlock}</div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          <AdaptiveSplitPanel
            list={
              loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
                    <p className="mt-2 text-muted-foreground">Carregando...</p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col overflow-hidden">
                  <AuditTable
                    entries={sortedEntries}
                    selectedId={selectedId}
                    onSelect={(id) => setSelectedId(id)}
                    sort={sort}
                    onSort={onSort}
                  />
                </div>
              )
            }
            panel={
              showSidePanel && selectedEntry ? (
                <AuditDetailPanel
                  entry={selectedEntry}
                  onClose={() => setSelectedId(null)}
                  resolvedRefs={resolvedRefs}
                  inPage
                />
              ) : null
            }
            showPanel={showSidePanel}
            panelTitle="Detalhe do evento"
            onClosePanel={() => setSelectedId(null)}
          />
        </div>
      </div>

      {paginator}
    </PageContainer>
  )
}
