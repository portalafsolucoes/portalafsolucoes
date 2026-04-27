'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { AdaptiveSplitPanel } from '@/components/layout/AdaptiveSplitPanel'
import { useResponsiveLayout } from '@/hooks/useMediaQuery'
import { hasPermission, type UserRole } from '@/lib/permissions'
import { useAuth } from '@/hooks/useAuth'

import type { StandardChecklistDetail } from '@/components/standard-checklists/StandardChecklistDetailPanel'

const StandardChecklistDetailPanel = dynamic(() => import('@/components/standard-checklists/StandardChecklistDetailPanel'), { ssr: false })
const StandardChecklistFormPanel = dynamic(() => import('@/components/standard-checklists/StandardChecklistFormPanel'), { ssr: false })

interface StandardChecklistListItem {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  workCenter?: { id: string; name: string; protheusCode?: string | null } | null
  serviceType?: { id: string; code: string | null; name: string } | null
  unit?: { id: string; name: string } | null
  createdBy?: { id: string; firstName: string | null; lastName: string | null } | null
}

type SortField = 'name' | 'workCenter' | 'serviceType' | 'status' | 'createdAt'
type SortDirection = 'asc' | 'desc'

export default function StandardChecklistsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const role = user?.role ?? ''

  const [checklists, setChecklists] = useState<StandardChecklistListItem[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const [selected, setSelected] = useState<StandardChecklistDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const { isPhone } = useResponsiveLayout()

  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const showSidePanel = !!(selected || isCreating || editingId)

  useEffect(() => {
    if (authLoading || !user) return
    if (!hasPermission(role as UserRole, 'standard-checklists', 'view')) {
      router.push('/dashboard')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, role])

  useEffect(() => {
    if (role) loadData()
  }, [role])

  const loadData = async () => {
    try {
      const res = await fetch('/api/maintenance-plans/standard-checklists')
      const json = await res.json()
      setChecklists(json.data || [])
    } catch (e) {
      console.error(e)
    }
  }

  const handleSelect = async (id: string) => {
    setIsCreating(false)
    setEditingId(null)
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/maintenance-plans/standard-checklists/${id}`)
      const json = await res.json()
      if (res.ok) setSelected(json.data)
    } catch { /* silent */ }
    setLoadingDetail(false)
  }

  const openCreate = () => {
    setSelected(null)
    setEditingId(null)
    setIsCreating(true)
  }

  const openEdit = (id: string) => {
    setSelected(null)
    setIsCreating(false)
    setEditingId(id)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este check list padrao? Esta acao nao pode ser desfeita.')) return
    const res = await fetch(`/api/maintenance-plans/standard-checklists/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      alert(json.error || 'Erro ao excluir')
      return
    }
    if (selected?.id === id) setSelected(null)
    if (editingId === id) setEditingId(null)
    loadData()
  }

  const handleToggleActive = async (id: string, nextActive: boolean) => {
    const res = await fetch(`/api/maintenance-plans/standard-checklists/${id}/archive`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: nextActive }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      alert(json.error || 'Erro ao atualizar')
      return
    }
    if (selected?.id === id) {
      const detailRes = await fetch(`/api/maintenance-plans/standard-checklists/${id}`)
      const detailJson = await detailRes.json()
      if (detailRes.ok) setSelected(detailJson.data)
    }
    loadData()
  }

  const closeSidePanel = () => {
    setSelected(null)
    setIsCreating(false)
    setEditingId(null)
  }

  const canEdit = !!role && hasPermission(role as UserRole, 'standard-checklists', 'create')
  const canDelete = !!role && hasPermission(role as UserRole, 'standard-checklists', 'delete')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortField(field)
    setSortDirection('asc')
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <Icon name="unfold_more" className="text-sm text-muted-foreground" />
    return <Icon name={sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'} className="text-sm text-accent-orange" />
  }

  const filtered = checklists.filter(c => {
    if (statusFilter === 'active' && !c.isActive) return false
    if (statusFilter === 'archived' && c.isActive) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.name?.toLowerCase().includes(q) ||
      c.workCenter?.name?.toLowerCase().includes(q) ||
      c.serviceType?.name?.toLowerCase().includes(q)
    )
  })

  const sorted = [...filtered].sort((a, b) => {
    const m = sortDirection === 'asc' ? 1 : -1
    switch (sortField) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '') * m
      case 'workCenter':
        return (a.workCenter?.name || '').localeCompare(b.workCenter?.name || '') * m
      case 'serviceType':
        return (a.serviceType?.name || '').localeCompare(b.serviceType?.name || '') * m
      case 'status':
        return (Number(a.isActive) - Number(b.isActive)) * m
      case 'createdAt':
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * m
      default:
        return 0
    }
  })

  const formatDate = (iso: string) => {
    if (!iso) return '-'
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR')
  }

  if (authLoading || !user) {
    return (
      <PageContainer variant="full" className="overflow-hidden p-0">
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant" />
            <p className="mt-2 text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </PageContainer>
    )
  }

  const activePanel = isCreating ? (
    <StandardChecklistFormPanel
      inPage
      editingId={null}
      onClose={() => setIsCreating(false)}
      onSuccess={() => { setIsCreating(false); loadData() }}
    />
  ) : editingId ? (
    <StandardChecklistFormPanel
      inPage
      editingId={editingId}
      onClose={() => setEditingId(null)}
      onSuccess={() => { setEditingId(null); loadData() }}
    />
  ) : selected ? (
    loadingDetail ? (
      <div className="h-full flex items-center justify-center bg-card border-l border-border">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant" />
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    ) : (
      <StandardChecklistDetailPanel
        checklist={selected}
        onClose={() => setSelected(null)}
        onEdit={(id) => openEdit(id)}
        onDelete={(id) => handleDelete(id)}
        onToggleActive={(id, next) => handleToggleActive(id, next)}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    )
  ) : null

  const listContent = (
    <div className="h-full flex flex-col overflow-hidden">
      {isPhone ? (
        <div className="overflow-auto flex-1 p-4">
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum check list padrao cadastrado.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {sorted.map(c => (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  className={`bg-card rounded-[4px] ambient-shadow p-4 cursor-pointer transition-all ${selected?.id === c.id || editingId === c.id ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className="flex items-start gap-2 mb-1">
                    <h3 className="text-sm font-bold text-foreground flex-1 truncate">{c.name}</h3>
                    {!c.isActive && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-gray-200 text-gray-700 border border-gray-300">
                        Arquivado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 truncate">
                    {c.workCenter?.name || '-'} / {c.serviceType?.name || '-'}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>Unidade: <span className="text-foreground">{c.unit?.name || '-'}</span></span>
                    <span>Criado em: <span className="text-foreground">{formatDate(c.createdAt)}</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="h-full flex flex-col bg-card overflow-hidden">
          <div className="flex-1 overflow-auto min-h-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="sticky top-0 bg-secondary z-10">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('name')} className="flex items-center gap-1">
                      <span>Nome</span>
                      {renderSortIcon('name')}
                    </button>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('workCenter')} className="flex items-center gap-1">
                      <span>Centro de Trabalho</span>
                      {renderSortIcon('workCenter')}
                    </button>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('serviceType')} className="flex items-center gap-1">
                      <span>Tipo de Servico</span>
                      {renderSortIcon('serviceType')}
                    </button>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Unidade</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('status')} className="flex items-center gap-1">
                      <span>Status</span>
                      {renderSortIcon('status')}
                    </button>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('createdAt')} className="flex items-center gap-1">
                      <span>Criado em</span>
                      {renderSortIcon('createdAt')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-gray-100">
                {sorted.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Nenhum check list padrao cadastrado.</td></tr>
                ) : sorted.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => handleSelect(c.id)}
                    className={`odd:bg-gray-50 even:bg-white hover:bg-secondary cursor-pointer transition-colors ${selected?.id === c.id || editingId === c.id ? 'bg-secondary' : ''}`}
                  >
                    <td className="px-6 py-3 text-sm font-medium text-foreground">{c.name}</td>
                    <td className="px-6 py-3 text-sm">{c.workCenter?.name || '-'}</td>
                    <td className="px-6 py-3 text-sm">
                      {c.serviceType?.code ? `${c.serviceType.code} - ` : ''}{c.serviceType?.name || '-'}
                    </td>
                    <td className="px-6 py-3 text-sm">{c.unit?.name || '-'}</td>
                    <td className="px-6 py-3 text-sm">
                      {c.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-success-light text-success border border-success/30">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-gray-200 text-gray-700 border border-gray-300">
                          Arquivado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          className="mb-0"
          title="Check List Padrao"
          description="Modelos de inspecao por Centro de Trabalho e tipo de servico"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-full sm:w-48 xl:w-64">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'archived')}
                className="h-9 px-3 text-sm border border-input rounded-[4px] bg-background"
              >
                <option value="active">Ativos</option>
                <option value="archived">Arquivados</option>
                <option value="all">Todos</option>
              </select>
              {canEdit && (
                <Button onClick={openCreate} className="bg-accent-orange hover:bg-accent-orange/90 text-white font-bold shadow-md">
                  <Icon name="add" className="text-base" />
                  <span className="hidden sm:inline ml-1">Novo Check List</span>
                </Button>
              )}
            </div>
          }
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          <AdaptiveSplitPanel
            list={listContent}
            panel={activePanel}
            showPanel={showSidePanel}
            panelTitle="Check List Padrao"
            onClosePanel={closeSidePanel}
          />
        </div>
      </div>
    </PageContainer>
  )
}
