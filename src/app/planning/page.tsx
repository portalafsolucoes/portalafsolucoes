'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Icon } from '@/components/ui/Icon'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import { hasPermission, type UserRole } from '@/lib/permissions'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

type Tab = 'plans' | 'schedules'

export default function PlanningPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const role = user?.role ?? ''
  const [tab, setTab] = useState<Tab>('plans')

  const [plans, setPlans] = useState<any[]>([])
  const [schedules, setSchedules] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [units, setUnits] = useState<any[]>([])

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')

  // Redirect if not authenticated or no permission
  useEffect(() => {
    if (authLoading || !user) return
    if (!hasPermission(role as UserRole, 'planning', 'view')) { router.push('/dashboard'); return }
    // Load units
    const loadUnits = async () => {
      const unitsRes = await fetch('/api/units')
      const unitsData = await unitsRes.json()
      setUnits(unitsData.data || [])
    }
    loadUnits()
  }, [authLoading, user, role])

  useEffect(() => { if (role) loadData() }, [role, tab])

  const loadData = async () => {
    if (tab === 'plans') {
      const res = await fetch('/api/planning/plans')
      const data = await res.json()
      setPlans(data.data || [])
    } else {
      const res = await fetch('/api/planning/schedules')
      const data = await res.json()
      setSchedules(data.data || [])
    }
  }

  const openCreate = () => {
    setFormData({})
    setError('')
    setResult('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setResult('')
    try {
      const url = tab === 'plans' ? '/api/planning/plans' : '/api/planning/schedules'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro'); setSaving(false); return }
      if (tab === 'plans' && data.generatedCount !== undefined) {
        setResult(`Plano criado! ${data.generatedCount} OS(s) gerada(s).`)
      }
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
          <Icon name="date_range" className="text-2xl text-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Planejamento e Programação</h1>
            <p className="text-sm text-muted-foreground">Emissão de planos de manutenção e programação de OSs</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-0">
            <button onClick={() => setTab('plans')} className={`px-6 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'plans' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              Plano de Manutenção
            </button>
            <button onClick={() => setTab('schedules')} className={`px-6 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'schedules' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              Programação de OSs
            </button>
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
              <Icon name="add" className="text-base mr-1" /> {tab === 'plans' ? 'Novo Plano' : 'Nova Programação'}
            </Button>
          )}
        </div>

        {/* Tabela de Planos */}
        {tab === 'plans' && (
          <div className="overflow-x-auto rounded-[4px]">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Plano</th>
                  <th className="text-left px-4 py-3 font-medium">Data</th>
                  <th className="text-left px-4 py-3 font-medium">Descrição</th>
                  <th className="text-left px-4 py-3 font-medium">Data Início</th>
                  <th className="text-left px-4 py-3 font-medium">Data Fim</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Terminado?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plans.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhum plano emitido.</td></tr>
                ) : plans.map(p => (
                  <tr key={p.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-mono">#{p.planNumber}</td>
                    <td className="px-4 py-3">{formatDate(p.planDate)}</td>
                    <td className="px-4 py-3 font-medium">{p.description}</td>
                    <td className="px-4 py-3">{formatDate(p.startDate)}</td>
                    <td className="px-4 py-3">{formatDate(p.endDate)}</td>
                    <td className="px-4 py-3">{p.status}</td>
                    <td className="px-4 py-3">{p.isFinished ? 'Sim' : 'Não'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tabela de Programações */}
        {tab === 'schedules' && (
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
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={tab === 'plans' ? 'Novo Plano de Manutenção' : 'Nova Programação de OSs'} size="md">
        <div className="space-y-4">
          {error && <div className="p-3 bg-danger-light text-danger-light-foreground rounded-[4px] text-sm">{error}</div>}
          {result && <div className="p-3 bg-success-light text-success-light-foreground rounded-[4px] text-sm">{result}</div>}

          <div>
            <label className="block text-sm font-medium mb-1">Descrição <span className="text-danger">*</span></label>
            <input type="text" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder={tab === 'plans' ? 'Ex: Plano Lubrificação Abril 2026' : 'Ex: Programação Mecânica Semana 15'}
              className="w-full px-3 py-2 text-sm rounded-[4px] bg-card" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Unidade <span className="text-danger">*</span></label>
            <select value={formData.unitId || ''} onChange={e => setFormData({...formData, unitId: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-[4px] bg-card">
              <option value="">Selecione...</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
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

          {tab === 'plans' && (
            <div className="p-3 bg-muted rounded-[4px] text-xs text-muted-foreground">
              Ao criar o plano, o sistema emitirá automaticamente Ordens de Serviço para os ativos com manutenção prevista dentro do período selecionado.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setShowModal(false)} size="sm">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} size="sm">{saving ? 'Processando...' : 'Criar'}</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
