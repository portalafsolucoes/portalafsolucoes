'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { AdaptiveSplitPanel } from '@/components/layout/AdaptiveSplitPanel'
import { formatDate } from '@/lib/utils'
import { hasPermission, type UserRole } from '@/lib/permissions'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'

const ScheduleDetailPanel = dynamic(
  () => import('@/components/planning/ScheduleDetailPanel').then(m => ({ default: m.ScheduleDetailPanel })),
  { ssr: false }
)
const ScheduleFormPanel = dynamic(
  () => import('@/components/planning/ScheduleFormPanel').then(m => ({ default: m.ScheduleFormPanel })),
  { ssr: false }
)

interface Schedule {
  id: string
  scheduleNumber?: number
  description?: string
  scheduleDate?: string
  startDate?: string
  endDate?: string
  status?: string
  createdBy?: { firstName?: string; lastName?: string }
  createdAt?: string
  updatedAt?: string
}

export default function SchedulesPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { canCreate } = usePermissions()
  const role = user?.role ?? ''

  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (authLoading || !user) return
    if (!hasPermission(role as UserRole, 'planning', 'view')) {
      router.push('/dashboard')
      return
    }
    loadData()
  }, [authLoading, user, role])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/planning/schedules')
      const data = await res.json()
      setSchedules(data.data || [])
    } catch {
      setSchedules([])
    }
    setLoading(false)
  }

  const handleSelectSchedule = (schedule: Schedule) => {
    setIsCreating(false)
    setSelectedSchedule(schedule)
  }

  const handleClosePanel = () => {
    setSelectedSchedule(null)
    setIsCreating(false)
  }

  const handleCreate = () => {
    setSelectedSchedule(null)
    setIsCreating(true)
  }

  const handleSaved = () => {
    setIsCreating(false)
    loadData()
  }

  const handleConfirm = async (id: string) => {
    if (!confirm('Confirmar programação? As OSs incluídas serão liberadas.')) return
    const res = await fetch(`/api/planning/schedules/${id}/confirm`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      alert(data.message || 'Programação confirmada')
      // Refresh selected schedule data
      const updated = schedules.find(s => s.id === id)
      if (updated && selectedSchedule?.id === id) {
        setSelectedSchedule({ ...updated, status: 'CONFIRMED' })
      }
      loadData()
    } else {
      alert(data.error || 'Erro ao confirmar')
    }
  }

  const filteredSchedules = schedules.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (s.scheduleNumber && String(s.scheduleNumber).toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      (s.status && s.status.toLowerCase().includes(q))
    )
  })

  const showSidePanel = !!(selectedSchedule !== null || isCreating)
  const canEdit = !!role && hasPermission(role as UserRole, 'planning', 'create')

  if (authLoading || !user) {
    return (
      <PageContainer variant="full" className="overflow-hidden p-0">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
            <p className="mt-2 text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </PageContainer>
    )
  }

  const activePanel = isCreating ? (
    <ScheduleFormPanel
      onClose={handleClosePanel}
      onSaved={handleSaved}
      inPage
    />
  ) : selectedSchedule ? (
    <ScheduleDetailPanel
      schedule={selectedSchedule}
      onClose={handleClosePanel}
      onConfirm={handleConfirm}
      canEdit={canEdit}
    />
  ) : null

  const listContent = loading ? (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
        <p className="mt-2 text-muted-foreground">Carregando...</p>
      </div>
    </div>
  ) : (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      <div className="flex-1 overflow-auto min-h-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 bg-secondary z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Prog.</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Descrição</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Data</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Período</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Usuário</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-200">
            {filteredSchedules.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Icon name="calendar_month" className="text-4xl text-muted-foreground" />
                    <h3 className="text-sm font-medium text-foreground">Nenhuma programação encontrada</h3>
                    <p className="text-sm text-muted-foreground">Nenhuma programação criada ainda.</p>
                  </div>
                </td>
              </tr>
            ) : filteredSchedules.map(s => (
              <tr
                key={s.id}
                onClick={() => handleSelectSchedule(s)}
                className={`odd:bg-gray-50 even:bg-white hover:bg-accent-orange-light cursor-pointer transition-colors ${selectedSchedule?.id === s.id ? 'bg-secondary' : ''}`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">#{s.scheduleNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-medium">{s.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{formatDate(s.scheduleDate || '')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {formatDate(s.startDate || '')} - {formatDate(s.endDate || '')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {s.createdBy ? `${s.createdBy.firstName || ''} ${s.createdBy.lastName || ''}`.trim() : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  <span className={`px-2 py-0.5 rounded text-xs ${s.status === 'CONFIRMED' ? 'bg-success-light text-success-light-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {s.status === 'CONFIRMED' ? 'Confirmada' : 'Rascunho'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          title="Programação de OSs"
          description="Programação e confirmação de ordens de serviço"
          className="mb-0"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative w-full sm:w-48 xl:w-64">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar programações..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {/* Add button */}
              {canCreate('planning') && (
                <Button onClick={handleCreate} className="bg-accent-orange hover:bg-accent-orange/90 text-white font-bold shadow-md">
                  <Icon name="add" className="text-base" />
                  <span className="hidden sm:inline ml-1">Nova Programação</span>
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          <AdaptiveSplitPanel
            list={listContent}
            panel={activePanel}
            showPanel={showSidePanel}
            panelTitle="Programação"
            onClosePanel={handleClosePanel}
          />
        </div>
      </div>
    </PageContainer>
  )
}
