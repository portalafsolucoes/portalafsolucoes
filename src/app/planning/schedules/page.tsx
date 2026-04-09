'use client'

import { useState, useEffect } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { formatDate } from '@/lib/utils'
import { hasPermission, type UserRole } from '@/lib/permissions'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function SchedulesPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const role = user?.role ?? ''

  const [schedules, setSchedules] = useState<any[]>([])
  const [search, setSearch] = useState('')

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading || !user) return
    if (!hasPermission(role as UserRole, 'planning', 'view')) { router.push('/dashboard'); return }
  }, [authLoading, user, role])

  useEffect(() => { if (role) loadData() }, [role])

  const loadData = async () => {
    const res = await fetch('/api/planning/schedules')
    const data = await res.json()
    setSchedules(data.data || [])
  }

  const openCreate = () => {
    setFormData({})
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/planning/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro'); setSaving(false); return }
      setShowModal(false)
      loadData()
    } catch { setError('Erro de conexão') }
    setSaving(false)
  }

  const confirmSchedule = async (id: string) => {
    if (!confirm('Confirmar programação? As OSs incluídas serão liberadas.')) return
    const res = await fetch(`/api/planning/schedules/${id}/confirm`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      alert(data.message || 'Programação confirmada')
      loadData()
    } else {
      alert(data.error || 'Erro ao confirmar')
    }
  }

  const canEdit = role && hasPermission(role as UserRole, 'planning', 'create')

  const filteredSchedules = schedules.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (s.scheduleNumber && String(s.scheduleNumber).toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      (s.status && s.status.toLowerCase().includes(q))
    )
  })

  if (authLoading || !user) {
    return (
      <PageContainer variant="full" className="overflow-hidden p-0">
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-b-2 border-on-surface-variant border-r-transparent" />
            <span className="text-sm text-muted-foreground">Carregando...</span>
          </div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          title="Programação de OSs"
          description="Programação e confirmação de ordens de serviço"
          className="mb-0"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-64">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 transform text-base text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar programações..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {canEdit && (
                <Button onClick={openCreate} size="sm">
                  <Icon name="add" className="text-base mr-1" /> Nova Programação
                </Button>
              )}
            </div>
          }
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          <div className="w-full transition-all overflow-hidden flex flex-col">
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
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-28">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-gray-200">
                    {filteredSchedules.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Icon name="calendar_month" className="text-4xl text-muted-foreground" />
                            <h3 className="text-sm font-medium text-foreground">Nenhuma programação encontrada</h3>
                            <p className="text-sm text-muted-foreground">Nenhuma programação criada ainda.</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredSchedules.map(s => (
                      <tr key={s.id} className="hover:bg-secondary cursor-pointer">
                        <td className="px-6 py-3 text-sm font-mono">#{s.scheduleNumber}</td>
                        <td className="px-6 py-3 text-sm font-medium">{s.description}</td>
                        <td className="px-6 py-3 text-sm">{formatDate(s.scheduleDate)}</td>
                        <td className="px-6 py-3 text-sm">{formatDate(s.startDate)} - {formatDate(s.endDate)}</td>
                        <td className="px-6 py-3 text-sm">{s.createdBy?.firstName} {s.createdBy?.lastName}</td>
                        <td className="px-6 py-3 text-sm">
                          <span className={`px-2 py-0.5 rounded text-xs ${s.status === 'CONFIRMED' ? 'bg-success-light text-success-light-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {s.status === 'CONFIRMED' ? 'Confirmada' : 'Rascunho'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-right">
                          {s.status === 'DRAFT' && canEdit && (
                            <Button size="sm" variant="outline" onClick={() => confirmSchedule(s.id)}>
                              <Icon name="check" className="text-sm mr-1" /> Confirmar
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nova Programação de OSs" size="wide">
        <div className="p-4 space-y-3">
          {error && <div className="p-3 bg-danger/10 text-danger rounded-[4px] text-sm">{error}</div>}

          <ModalSection title="Programação">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="col-span-2 md:col-span-3">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Descrição <span className="text-danger">*</span></label>
                <input type="text" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Ex: Programação Mecânica Semana 15"
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Data Início <span className="text-danger">*</span></label>
                <input type="date" value={formData.startDate || ''} onChange={e => setFormData({...formData, startDate: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Data Fim <span className="text-danger">*</span></label>
                <input type="date" value={formData.endDate || ''} onChange={e => setFormData({...formData, endDate: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
          </ModalSection>
        </div>

        <div className="flex gap-3 px-4 py-4 border-t border-border">
          <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            <Icon name="save" className="text-base mr-2" />
            {saving ? 'Processando...' : 'Salvar'}
          </Button>
        </div>
      </Modal>
    </PageContainer>
  )
}
