'use client'

import { useState, useEffect } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { hasPermission, type UserRole } from '@/lib/permissions'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function StandardMaintenancePlanPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const role = user?.role ?? ''

  const [standardPlans, setStandardPlans] = useState<any[]>([])
  const [search, setSearch] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [families, setFamilies] = useState<any[]>([])
  const [familyModels, setFamilyModels] = useState<any[]>([])
  const [serviceTypes, setServiceTypes] = useState<any[]>([])
  const [calendars, setCalendars] = useState<any[]>([])
  const [depsLoaded, setDepsLoaded] = useState(false)

  useEffect(() => {
    if (authLoading || !user) return
    if (!hasPermission(role as UserRole, 'maintenance-plan', 'view')) {
      router.push('/dashboard'); return
    }
  }, [authLoading, user, role])

  useEffect(() => {
    if (role) loadData()
  }, [role])

  const loadData = async () => {
    const res = await fetch('/api/maintenance-plans/standard')
    const data = await res.json()
    setStandardPlans(data.data || [])
  }

  const loadDependencies = async () => {
    const [famRes, stRes, calRes] = await Promise.all([
      fetch('/api/basic-registrations/asset-families'),
      fetch('/api/basic-registrations/service-types'),
      fetch('/api/basic-registrations/calendars'),
    ])
    const [famData, stData, calData] = await Promise.all([
      famRes.json(), stRes.json(), calRes.json()
    ])
    setFamilies(famData.data || [])
    setServiceTypes(stData.data || [])
    setCalendars(calData.data || [])
  }

  const loadModels = async (familyId: string) => {
    const res = await fetch(`/api/basic-registrations/asset-family-model-mappings?familyId=${familyId}`)
    const data = await res.json()
    const models = (data.data || []).map((m: any) => m.model).filter(Boolean)
    setFamilyModels(models)
  }

  const openCreate = () => {
    setFormData({})
    setError('')
    if (!depsLoaded) {
      loadDependencies()
      setDepsLoaded(true)
    }
    setShowCreateModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/maintenance-plans/standard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const result = await res.json()
      if (!res.ok) { setError(result.error || 'Erro ao salvar'); setSaving(false); return }
      setShowCreateModal(false)
      loadData()
    } catch { setError('Erro de conexão') }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este plano?')) return
    await fetch(`/api/maintenance-plans/standard/${id}`, { method: 'DELETE' })
    loadData()
  }

  const canEdit = role && hasPermission(role as UserRole, 'maintenance-plan', 'create')

  const filteredStandard = standardPlans.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.family?.name?.toLowerCase().includes(search.toLowerCase())
  )

  if (authLoading || !user) {
    return (
      <PageContainer variant="full" className="overflow-hidden p-0">
        <div className="flex items-center justify-center flex-1">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          className="mb-0"
          title="Manutenção Padrão"
          description="Planos de manutenção padrão por família"
          actions={
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
                <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              {canEdit && (
                <Button onClick={openCreate} size="sm">
                  <Icon name="add" className="text-base mr-1" /> Novo Plano Padrão
                </Button>
              )}
            </div>
          }
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          <div className="w-full transition-all overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="sticky top-0 bg-secondary z-10">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Família</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo Modelo</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Seq.</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo Serviço</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome da Manutenção</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Frequência</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Período</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-gray-200">
                  {filteredStandard.length === 0 ? (
                    <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">Nenhum plano padrão cadastrado.</td></tr>
                  ) : filteredStandard.map(p => (
                    <tr key={p.id} className="hover:bg-secondary cursor-pointer">
                      <td className="px-6 py-3 text-sm">{p.family?.code} - {p.family?.name}</td>
                      <td className="px-6 py-3 text-sm">{p.familyModel?.name || '-'}</td>
                      <td className="px-6 py-3 text-sm">{p.sequence}</td>
                      <td className="px-6 py-3 text-sm">{p.serviceType?.name}</td>
                      <td className="px-6 py-3 text-sm font-medium">{p.name}</td>
                      <td className="px-6 py-3 text-sm">{p.maintenanceTime} {p.timeUnit}</td>
                      <td className="px-6 py-3 text-sm">{p.period === 'Repetitiva' ? 'Repetitiva' : 'Única'}</td>
                      <td className="px-6 py-3 text-sm text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-danger-light rounded"><Icon name="delete" className="text-base text-danger" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Novo Plano Padrão">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {error && <div className="p-3 bg-danger-light text-danger-light-foreground rounded-[4px] text-sm">{error}</div>}

          <ModalSection title="Classificação">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Família <span className="text-danger">*</span></label>
                <select value={formData.familyId || ''} onChange={e => { setFormData({...formData, familyId: e.target.value, familyModelId: ''}); if(e.target.value) loadModels(e.target.value); }}
                  className="w-full px-3 py-2 text-sm rounded-[4px] bg-card">
                  <option value="">Selecione...</option>
                  {families.map(f => <option key={f.id} value={f.id}>{f.code} - {f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo Modelo</label>
                <select value={formData.familyModelId || ''} onChange={e => setFormData({...formData, familyModelId: e.target.value})}
                  className="w-full px-3 py-2 text-sm rounded-[4px] bg-card">
                  <option value="">Genérico</option>
                  {familyModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Serviço <span className="text-danger">*</span></label>
              <select value={formData.serviceTypeId || ''} onChange={e => setFormData({...formData, serviceTypeId: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-[4px] bg-card">
                <option value="">Selecione...</option>
                {serviceTypes.map(st => <option key={st.id} value={st.id}>{st.code} - {st.name}</option>)}
              </select>
            </div>
          </ModalSection>

          <ModalSection title="Manutenção">
            <div>
              <label className="block text-sm font-medium mb-1">Nome da Manutenção <span className="text-danger">*</span></label>
              <input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Manutenção Prev. Mec. 28 Dias" className="w-full px-3 py-2 text-sm rounded-[4px] bg-card" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tempo <span className="text-danger">*</span></label>
                <input type="number" value={formData.maintenanceTime || ''} onChange={e => setFormData({...formData, maintenanceTime: Number(e.target.value)})}
                  placeholder="Ex: 28" className="w-full px-3 py-2 text-sm rounded-[4px] bg-card" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unidade <span className="text-danger">*</span></label>
                <select value={formData.timeUnit || ''} onChange={e => setFormData({...formData, timeUnit: e.target.value})}
                  className="w-full px-3 py-2 text-sm rounded-[4px] bg-card">
                  <option value="">Selecione...</option>
                  <option value="Dia(s)">Dia(s)</option>
                  <option value="Semana(s)">Semana(s)</option>
                  <option value="Mês(es)">Mês(es)</option>
                  <option value="Hora(s)">Hora(s)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Período <span className="text-danger">*</span></label>
                <select value={formData.period || ''} onChange={e => setFormData({...formData, period: e.target.value})}
                  className="w-full px-3 py-2 text-sm rounded-[4px] bg-card">
                  <option value="">Selecione...</option>
                  <option value="Repetitiva">Repetitiva</option>
                  <option value="Unica">Única</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Calendário</label>
              <select value={formData.calendarId || ''} onChange={e => setFormData({...formData, calendarId: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-[4px] bg-card">
                <option value="">Nenhum</option>
                {calendars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </ModalSection>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Icon name="save" className="text-base mr-2" />
              {saving ? 'Salvando...' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  )
}
