'use client'

import { useState, useEffect } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { hasPermission, type UserRole } from '@/lib/permissions'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function AssetMaintenancePlanPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const role = user?.role ?? ''

  const [assetPlans, setAssetPlans] = useState<any[]>([])
  const [search, setSearch] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [serviceTypes, setServiceTypes] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [maintenanceAreas, setMaintenanceAreas] = useState<any[]>([])
  const [maintenanceTypes, setMaintenanceTypes] = useState<any[]>([])
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
    const res = await fetch('/api/maintenance-plans/asset')
    const data = await res.json()
    setAssetPlans(data.data || [])
  }

  const loadDependencies = async () => {
    const [stRes, assRes, maRes, mtRes] = await Promise.all([
      fetch('/api/basic-registrations/service-types'),
      fetch('/api/assets?limit=1000'),
      fetch('/api/basic-registrations/maintenance-areas'),
      fetch('/api/basic-registrations/maintenance-types'),
    ])
    const [stData, assData, maData, mtData] = await Promise.all([
      stRes.json(), assRes.json(), maRes.json(), mtRes.json()
    ])
    setServiceTypes(stData.data || [])
    setAssets(assData.data || [])
    setMaintenanceAreas(maData.data || [])
    setMaintenanceTypes(mtData.data || [])
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
      const res = await fetch('/api/maintenance-plans/asset', {
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
    await fetch(`/api/maintenance-plans/asset/${id}`, { method: 'DELETE' })
    loadData()
  }

  const canEdit = role && hasPermission(role as UserRole, 'maintenance-plan', 'create')

  const filteredAsset = assetPlans.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.asset?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.asset?.tag?.toLowerCase().includes(search.toLowerCase())
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
          title="Manutenção do Bem"
          description="Planos de manutenção por bem/ativo individual"
          actions={
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
                <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring" />
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
            <div className="flex-1 overflow-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="sticky top-0 bg-secondary z-10">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Bem (TAG)</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome do Bem</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo Serviço</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Seq.</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome Manutenção</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Frequência</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Ativa?</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-gray-200">
                  {filteredAsset.length === 0 ? (
                    <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">Nenhum plano de manutenção do bem cadastrado.</td></tr>
                  ) : filteredAsset.map(p => (
                    <tr key={p.id} className="hover:bg-secondary cursor-pointer">
                      <td className="px-6 py-3 text-sm font-mono">{p.asset?.tag || '-'}</td>
                      <td className="px-6 py-3 text-sm">{p.asset?.name}</td>
                      <td className="px-6 py-3 text-sm">{p.serviceType?.name}</td>
                      <td className="px-6 py-3 text-sm">{p.sequence}</td>
                      <td className="px-6 py-3 text-sm font-medium">{p.name || '-'}</td>
                      <td className="px-6 py-3 text-sm">{p.maintenanceTime ? `${p.maintenanceTime} ${p.timeUnit}` : '-'}</td>
                      <td className="px-6 py-3 text-sm">{p.isActive ? 'Sim' : 'Não'}</td>
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

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Novo Plano do Bem" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {error && <div className="p-3 bg-danger-light text-danger-light-foreground rounded-[4px] text-sm">{error}</div>}

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

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setShowCreateModal(false)} size="sm">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} size="sm">{saving ? 'Salvando...' : 'Criar'}</Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  )
}
