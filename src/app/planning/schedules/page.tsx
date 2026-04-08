'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
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

  if (authLoading || !user) {
    return <AppLayout><div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-on-surface-variant border-r-transparent" /></div></AppLayout>
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Icon name="calendar_month" className="text-2xl text-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Programação de OSs</h1>
            <p className="text-sm text-muted-foreground">Programação e confirmação de ordens de serviço</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
            <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          {canEdit && (
            <Button onClick={openCreate} size="sm">
              <Icon name="add" className="text-base mr-1" /> Nova Programação
            </Button>
          )}
        </div>

        <div className="overflow-x-auto rounded-[4px]">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Prog.</th>
                <th className="text-left px-4 py-3 font-medium">Descrição</th>
                <th className="text-left px-4 py-3 font-medium">Data</th>
                <th className="text-left px-4 py-3 font-medium">Período</th>
                <th className="text-left px-4 py-3 font-medium">Usuário</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium w-28">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {schedules.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhuma programação criada.</td></tr>
              ) : schedules.map(s => (
                <tr key={s.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-mono">#{s.scheduleNumber}</td>
                  <td className="px-4 py-3 font-medium">{s.description}</td>
                  <td className="px-4 py-3">{formatDate(s.scheduleDate)}</td>
                  <td className="px-4 py-3">{formatDate(s.startDate)} - {formatDate(s.endDate)}</td>
                  <td className="px-4 py-3">{s.createdBy?.firstName} {s.createdBy?.lastName}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${s.status === 'CONFIRMED' ? 'bg-success-light text-success-light-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {s.status === 'CONFIRMED' ? 'Confirmada' : 'Rascunho'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.status === 'DRAFT' && canEdit && (
                      <Button size="sm" variant="outline" onClick={() => confirmSchedule(s.id)}>
                        <Icon name="check" className=".5 text-sm.5 mr-1" /> Confirmar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nova Programação de OSs" size="md">
        <div className="space-y-4">
          {error && <div className="p-3 bg-danger-light text-danger-light-foreground rounded-[4px] text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium mb-1">Descrição <span className="text-danger">*</span></label>
            <input type="text" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Ex: Programação Mecânica Semana 15"
              className="w-full px-3 py-2 text-sm rounded-[4px] bg-card" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Data Início <span className="text-danger">*</span></label>
              <input type="date" value={formData.startDate || ''} onChange={e => setFormData({...formData, startDate: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-[4px] bg-card" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data Fim <span className="text-danger">*</span></label>
              <input type="date" value={formData.endDate || ''} onChange={e => setFormData({...formData, endDate: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-[4px] bg-card" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setShowModal(false)} size="sm">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} size="sm">{saving ? 'Processando...' : 'Criar'}</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
