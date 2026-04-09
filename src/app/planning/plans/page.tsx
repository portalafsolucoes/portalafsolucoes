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

  const filteredPlans = plans.filter(p => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      (p.planNumber && String(p.planNumber).toLowerCase().includes(s)) ||
      (p.description && p.description.toLowerCase().includes(s)) ||
      (p.status && p.status.toLowerCase().includes(s))
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
          title="Plano de Manutenção"
          description="Emissão de planos de manutenção preventiva e preditiva"
          className="mb-0"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-64">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 transform text-base text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar planos..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {canEdit && (
                <Button onClick={openCreate} size="sm">
                  <Icon name="add" className="text-base mr-1" /> Novo Plano
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Plano</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Data</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Descrição</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Data Início</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Data Fim</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Terminado?</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-gray-200">
                    {filteredPlans.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Icon name="assignment" className="text-4xl text-muted-foreground" />
                            <h3 className="text-sm font-medium text-foreground">Nenhum plano encontrado</h3>
                            <p className="text-sm text-muted-foreground">Nenhum plano emitido ainda.</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredPlans.map(p => (
                      <tr key={p.id} className="hover:bg-secondary cursor-pointer">
                        <td className="px-6 py-3 text-sm font-mono">#{p.planNumber}</td>
                        <td className="px-6 py-3 text-sm">{formatDate(p.planDate)}</td>
                        <td className="px-6 py-3 text-sm font-medium">{p.description}</td>
                        <td className="px-6 py-3 text-sm">{formatDate(p.startDate)}</td>
                        <td className="px-6 py-3 text-sm">{formatDate(p.endDate)}</td>
                        <td className="px-6 py-3 text-sm">{p.status}</td>
                        <td className="px-6 py-3 text-sm">{p.isFinished ? 'Sim' : 'Não'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Novo Plano de Manutenção">
        <div className="space-y-4">
          {error && <div className="p-3 bg-danger-light text-danger-light-foreground rounded-[4px] text-sm">{error}</div>}
          {result && <div className="p-3 bg-success-light text-success-light-foreground rounded-[4px] text-sm">{result}</div>}

          <ModalSection title="Plano">
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
          </ModalSection>

          <div className="p-3 bg-muted rounded-[4px] text-xs text-muted-foreground">
            Ao criar o plano, o sistema emitirá automaticamente Ordens de Serviço para os ativos com manutenção prevista dentro do período selecionado.
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Icon name="save" className="text-base mr-2" />
              {saving ? 'Processando...' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  )
}
