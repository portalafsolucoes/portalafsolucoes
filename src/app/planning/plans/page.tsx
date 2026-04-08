'use client'

import { useState, useEffect } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import { hasPermission, type UserRole } from '@/lib/permissions'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function PlansPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const role = user?.role ?? ''

  const [plans, setPlans] = useState<any[]>([])
  const [search, setSearch] = useState('')

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')

  useEffect(() => {
    if (authLoading || !user) return
    if (!hasPermission(role as UserRole, 'planning', 'view')) { router.push('/dashboard'); return }
  }, [authLoading, user, role])

  useEffect(() => { if (role) loadData() }, [role])

  const loadData = async () => {
    const res = await fetch('/api/planning/plans')
    const data = await res.json()
    setPlans(data.data || [])
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
      const res = await fetch('/api/planning/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro'); setSaving(false); return }
      if (data.generatedCount !== undefined) {
        setResult(`Plano criado! ${data.generatedCount} OS(s) gerada(s).`)
      }
      setShowModal(false)
      loadData()
    } catch { setError('Erro de conexão') }
    setSaving(false)
  }

  const canEdit = role && hasPermission(role as UserRole, 'planning', 'create')

  if (authLoading || !user) {
    return <PageContainer><div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-on-surface-variant border-r-transparent" /></div></PageContainer>
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          title="Plano de Manutenção"
          description="Emissão de planos de manutenção preventiva e preditiva"
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
            <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          {canEdit && (
            <Button onClick={openCreate} size="sm">
              <Icon name="add" className="text-base mr-1" /> Novo Plano
            </Button>
          )}
        </div>

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
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Novo Plano de Manutenção" size="md">
        <div className="space-y-4">
          {error && <div className="p-3 bg-danger-light text-danger-light-foreground rounded-[4px] text-sm">{error}</div>}
          {result && <div className="p-3 bg-success-light text-success-light-foreground rounded-[4px] text-sm">{result}</div>}

          <div>
            <label className="block text-sm font-medium mb-1">Descrição <span className="text-danger">*</span></label>
            <input type="text" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Ex: Plano Lubrificação Abril 2026"
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

          <div className="p-3 bg-muted rounded-[4px] text-xs text-muted-foreground">
            Ao criar o plano, o sistema emitirá automaticamente Ordens de Serviço para os ativos com manutenção prevista dentro do período selecionado.
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setShowModal(false)} size="sm">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} size="sm">{saving ? 'Processando...' : 'Criar'}</Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  )
}
