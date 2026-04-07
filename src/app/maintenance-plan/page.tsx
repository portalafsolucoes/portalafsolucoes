'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Icon } from '@/components/ui/Icon'

import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { hasPermission, type UserRole } from '@/lib/permissions'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

type Tab = 'standard' | 'asset'

export default function MaintenancePlanPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const role = user?.role ?? ''
  const [tab, setTab] = useState<Tab>('standard')

  // Planos padrão
  const [standardPlans, setStandardPlans] = useState<any[]>([])
  // Planos do bem
  const [assetPlans, setAssetPlans] = useState<any[]>([])
  // Busca
  const [search, setSearch] = useState('')

  // Modal de criação
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Listas para selects
  const [families, setFamilies] = useState<any[]>([])
  const [familyModels, setFamilyModels] = useState<any[]>([])
  const [serviceTypes, setServiceTypes] = useState<any[]>([])
  const [calendars, setCalendars] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [maintenanceAreas, setMaintenanceAreas] = useState<any[]>([])
  const [maintenanceTypes, setMaintenanceTypes] = useState<any[]>([])

  const [depsLoaded, setDepsLoaded] = useState(false)

  // Redirect if not authenticated or no permission
  useEffect(() => {
    if (authLoading || !user) return
    if (!hasPermission(role as UserRole, 'maintenance-plan', 'view')) {
      router.push('/dashboard'); return
    }
  }, [authLoading, user, role])

  useEffect(() => {
    if (role) {
      loadData()
    }
  }, [role, tab])

  const loadData = async () => {
    if (tab === 'standard') {
      const res = await fetch('/api/maintenance-plans/standard')
      const data = await res.json()
      setStandardPlans(data.data || [])
    } else {
      const res = await fetch('/api/maintenance-plans/asset')
      const data = await res.json()
      setAssetPlans(data.data || [])
    }
  }

  const loadDependencies = async () => {
    const [famRes, stRes, calRes, assRes, maRes, mtRes] = await Promise.all([
      fetch('/api/basic-registrations/asset-families'),
      fetch('/api/basic-registrations/service-types'),
      fetch('/api/basic-registrations/calendars'),
      fetch('/api/assets?limit=1000'),
      fetch('/api/basic-registrations/maintenance-areas'),
      fetch('/api/basic-registrations/maintenance-types'),
    ])
    const [famData, stData, calData, assData, maData, mtData] = await Promise.all([
      famRes.json(), stRes.json(), calRes.json(), assRes.json(), maRes.json(), mtRes.json()
    ])
    setFamilies(famData.data || [])
    setServiceTypes(stData.data || [])
    setCalendars(calData.data || [])
    setAssets(assData.data || [])
    setMaintenanceAreas(maData.data || [])
    setMaintenanceTypes(mtData.data || [])
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
    // Carrega dependências dos selects apenas quando o modal abre (não no carregamento da página)
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
      const url = tab === 'standard' ? '/api/maintenance-plans/standard' : '/api/maintenance-plans/asset'
      const res = await fetch(url, {
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
    const url = tab === 'standard' ? `/api/maintenance-plans/standard/${id}` : `/api/maintenance-plans/asset/${id}`
    await fetch(url, { method: 'DELETE' })
    loadData()
  }

  const canEdit = role && hasPermission(role as UserRole, 'maintenance-plan', 'create')

  const filteredStandard = standardPlans.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.family?.name?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredAsset = assetPlans.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.asset?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.asset?.tag?.toLowerCase().includes(search.toLowerCase())
  )

  if (authLoading || !user) {
    return <AppLayout><div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-on-surface-variant border-r-transparent" /></div></AppLayout>
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Icon name="event_upcoming" className="text-2xl text-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Plano de Manutenção</h1>
            <p className="text-sm text-muted-foreground">Manutenção Padrão por família e Manutenção por Bem</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-0">
            <button onClick={() => setTab('standard')} className={`px-6 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'standard' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              Manutenção Padrão
            </button>
            <button onClick={() => setTab('asset')} className={`px-6 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'asset' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              Manutenção do Bem
            </button>
          </div>
        </div>

        {/* Header com busca e botão */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
            <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          {canEdit && (
            <Button onClick={openCreate} size="sm">
              <Icon name="add" className="text-base mr-1" /> {tab === 'standard' ? 'Novo Plano Padrão' : 'Novo Plano'}
            </Button>
          )}
        </div>

        {/* Tabela */}
        {tab === 'standard' ? (
          <div className="overflow-x-auto rounded-[4px]">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Família</th>
                  <th className="text-left px-4 py-3 font-medium">Tipo Modelo</th>
                  <th className="text-left px-4 py-3 font-medium">Seq.</th>
                  <th className="text-left px-4 py-3 font-medium">Tipo Serviço</th>
                  <th className="text-left px-4 py-3 font-medium">Nome da Manutenção</th>
                  <th className="text-left px-4 py-3 font-medium">Frequência</th>
                  <th className="text-left px-4 py-3 font-medium">Período</th>
                  <th className="text-right px-4 py-3 font-medium w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStandard.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Nenhum plano padrão cadastrado.</td></tr>
                ) : filteredStandard.map(p => (
                  <tr key={p.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">{p.family?.code} - {p.family?.name}</td>
                    <td className="px-4 py-3">{p.familyModel?.name || '-'}</td>
                    <td className="px-4 py-3">{p.sequence}</td>
                    <td className="px-4 py-3">{p.serviceType?.name}</td>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3">{p.maintenanceTime} {p.timeUnit}</td>
                    <td className="px-4 py-3">{p.period === 'Repetitiva' ? 'Repetitiva' : 'Única'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-danger-light rounded"><Icon name="delete" className="text-base text-danger" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[4px]">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Bem (TAG)</th>
                  <th className="text-left px-4 py-3 font-medium">Nome do Bem</th>
                  <th className="text-left px-4 py-3 font-medium">Tipo Serviço</th>
                  <th className="text-left px-4 py-3 font-medium">Seq.</th>
                  <th className="text-left px-4 py-3 font-medium">Nome Manutenção</th>
                  <th className="text-left px-4 py-3 font-medium">Frequência</th>
                  <th className="text-left px-4 py-3 font-medium">Ativa?</th>
                  <th className="text-right px-4 py-3 font-medium w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAsset.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Nenhum plano de manutenção do bem cadastrado.</td></tr>
                ) : filteredAsset.map(p => (
                  <tr key={p.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-mono">{p.asset?.tag || '-'}</td>
                    <td className="px-4 py-3">{p.asset?.name}</td>
                    <td className="px-4 py-3">{p.serviceType?.name}</td>
                    <td className="px-4 py-3">{p.sequence}</td>
                    <td className="px-4 py-3 font-medium">{p.name || '-'}</td>
                    <td className="px-4 py-3">{p.maintenanceTime ? `${p.maintenanceTime} ${p.timeUnit}` : '-'}</td>
                    <td className="px-4 py-3">{p.isActive ? 'Sim' : 'Não'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-danger-light rounded"><Icon name="delete" className="text-base text-danger" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Criação */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={tab === 'standard' ? 'Novo Plano Padrão' : 'Novo Plano do Bem'} size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {error && <div className="p-3 bg-danger-light text-danger-light-foreground rounded-[4px] text-sm">{error}</div>}

          {tab === 'standard' ? (
            <>
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
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Bem/Ativo <span className="text-danger">*</span></label>
                <select value={formData.assetId || ''} onChange={e => setFormData({...formData, assetId: e.target.value})}
                  className="w-full px-3 py-2 text-sm rounded-[4px] bg-card">
                  <option value="">Selecione...</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.tag ? `[${a.tag}] ` : ''}{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Serviço <span className="text-danger">*</span></label>
                <select value={formData.serviceTypeId || ''} onChange={e => setFormData({...formData, serviceTypeId: e.target.value})}
                  className="w-full px-3 py-2 text-sm rounded-[4px] bg-card">
                  <option value="">Selecione...</option>
                  {serviceTypes.map(st => <option key={st.id} value={st.id}>{st.code} - {st.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Área de Manutenção</label>
                  <select value={formData.maintenanceAreaId || ''} onChange={e => setFormData({...formData, maintenanceAreaId: e.target.value})}
                    className="w-full px-3 py-2 text-sm rounded-[4px] bg-card">
                    <option value="">Selecione...</option>
                    {maintenanceAreas.map(ma => <option key={ma.id} value={ma.id}>{ma.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de Manutenção</label>
                  <select value={formData.maintenanceTypeId || ''} onChange={e => setFormData({...formData, maintenanceTypeId: e.target.value})}
                    className="w-full px-3 py-2 text-sm rounded-[4px] bg-card">
                    <option value="">Selecione...</option>
                    {maintenanceTypes.map(mt => <option key={mt.id} value={mt.id}>{mt.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nome da Manutenção</label>
                <input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 text-sm rounded-[4px] bg-card" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tempo</label>
                  <input type="number" value={formData.maintenanceTime || ''} onChange={e => setFormData({...formData, maintenanceTime: Number(e.target.value)})}
                    className="w-full px-3 py-2 text-sm rounded-[4px] bg-card" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unidade</label>
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
                  <label className="block text-sm font-medium mb-1">Período</label>
                  <select value={formData.period || ''} onChange={e => setFormData({...formData, period: e.target.value})}
                    className="w-full px-3 py-2 text-sm rounded-[4px] bg-card">
                    <option value="">Selecione...</option>
                    <option value="Repetitiva">Repetitiva</option>
                    <option value="Unica">Única</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Data da Última Manutenção</label>
                <input type="date" value={formData.lastMaintenanceDate || ''} onChange={e => setFormData({...formData, lastMaintenanceDate: e.target.value})}
                  className="w-full px-3 py-2 text-sm rounded-[4px] bg-card" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={formData.isStandard || false} onChange={e => setFormData({...formData, isStandard: e.target.checked})} className="rounded border-border" />
                <label className="text-sm">Manutenção Padrão?</label>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setShowCreateModal(false)} size="sm">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} size="sm">{saving ? 'Salvando...' : 'Criar'}</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
