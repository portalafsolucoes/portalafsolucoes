'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { ResourceSelector, type TaskResourceItem } from '@/components/ui/ResourceSelector'

interface AssetItem {
  id: string
  name: string
  locationId?: string | null
  parentAssetId?: string | null
  parentAsset?: { id: string; protheusCode?: string; name: string } | null
}

interface WorkOrderFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  inPage?: boolean
}

export function WorkOrderFormModal({
  isOpen,
  onClose,
  onSuccess,
  inPage = false
}: WorkOrderFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([])
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [woResources, setWoResources] = useState<TaskResourceItem[]>([])
  const [maintenanceAreas, setMaintenanceAreas] = useState<{ id: string; name: string; code?: string }[]>([])
  const [serviceTypes, setServiceTypes] = useState<{ id: string; code: string; name: string; maintenanceAreaId: string }[]>([])
  const [allServiceTypes, setAllServiceTypes] = useState<{ id: string; code: string; name: string; maintenanceAreaId: string }[]>([])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'CORRECTIVE',
    osType: '',
    priority: 'NONE',
    dueDate: '',
    assetId: '',
    locationId: '',
    assignedTeamIds: [] as string[],
    assignedToId: '',
    externalId: '',
    maintenanceFrequency: '',
    frequencyValue: '1',
    estimatedDuration: '',
    maintenanceAreaId: '',
    serviceTypeId: ''
  })

  useEffect(() => {
    if (isOpen) {
      loadData()
      resetForm()
    }
  }, [isOpen])

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'CORRECTIVE',
      osType: '',
      priority: 'NONE',
      dueDate: '',
      assetId: '',
      locationId: '',
      assignedTeamIds: [],
      assignedToId: '',
      externalId: '',
      maintenanceFrequency: '',
      frequencyValue: '1',
      estimatedDuration: '',
      maintenanceAreaId: '',
      serviceTypeId: ''
    })
    setTeamMembers([])
    setWoResources([])
  }

  const loadData = async () => {
    try {
      const [assetsRes, locationsRes, teamsRes, areasRes, stRes] = await Promise.all([
        fetch('/api/assets?summary=true'),
        fetch('/api/locations'),
        fetch('/api/teams'),
        fetch('/api/basic-registrations/maintenance-areas'),
        fetch('/api/basic-registrations/service-types')
      ])

      const [assetsData, locationsData, teamsData, areasData, stData] = await Promise.all([
        assetsRes.json(),
        locationsRes.json(),
        teamsRes.json(),
        areasRes.json(),
        stRes.json()
      ])

      setAssets(assetsData.data || [])
      setLocations(locationsData.data || [])
      setTeams(teamsData.data || [])
      setMaintenanceAreas(areasData.data || [])
      setAllServiceTypes(stData.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const loadTeamMembers = async (teamId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/members`)
      if (res.ok) {
        const data = await res.json()
        setTeamMembers(data.data || [])
      }
    } catch (error) {
      console.error('Error loading team members:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          estimatedDuration: formData.estimatedDuration ? Number(formData.estimatedDuration) : null,
          resources: woResources.map(r => ({
            resourceType: r.resourceType,
            resourceId: r.resourceId || null,
            jobTitleId: r.jobTitleId || null,
            userId: r.userId || null,
            quantity: r.quantity ?? null,
            hours: r.hours ?? null,
            unit: r.unit || null,
          })),
        })
      })

      if (res.ok) {
        onSuccess()
        onClose()
      } else {
        alert('Erro ao criar ordem de servico')
      }
    } catch {
      alert('Erro ao conectar ao servidor')
    } finally {
      setLoading(false)
    }
  }

  const getAssetHierarchy = (assetId: string): string[] => {
    const chain: string[] = []
    const assetMap = new Map(assets.map(a => [a.id, a]))
    let current = assetMap.get(assetId)
    const visited = new Set<string>()
    while (current && !visited.has(current.id)) {
      visited.add(current.id)
      chain.unshift(current.name)
      current = current.parentAssetId ? assetMap.get(current.parentAssetId) : undefined
    }
    return chain
  }

  const handleAssetChange = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId)
    setFormData(prev => ({
      ...prev,
      assetId,
      locationId: asset?.locationId || prev.locationId
    }))
  }

  // Filtrar tipos de serviço pela área selecionada
  useEffect(() => {
    if (formData.maintenanceAreaId) {
      setServiceTypes(allServiceTypes.filter(st => st.maintenanceAreaId === formData.maintenanceAreaId))
    } else {
      setServiceTypes(allServiceTypes)
    }
  }, [formData.maintenanceAreaId, allServiceTypes])

  const selectedAssetHierarchy = formData.assetId ? getAssetHierarchy(formData.assetId) : []

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nova Ordem de Servico" size="wide" inPage={inPage}>
      <form onSubmit={handleSubmit}>
        <div className="p-4 space-y-3">
          <ModalSection title="Identificacao">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Numero Protheus (6 digitos)
                </label>
                <input
                  value={formData.externalId}
                  onChange={(e) => setFormData({ ...formData, externalId: e.target.value })}
                  placeholder="Ex: 123456"
                  maxLength={6}
                  pattern="\d{6}"
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Se deixar em branco, sera gerado automaticamente (MAN-XXXXXX)
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Titulo *
                </label>
                <input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Descricao
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </ModalSection>

          <ModalSection title="Classificacao">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Tipo de OS
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value, osType: '' })}
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="CORRECTIVE">Corretiva</option>
                  <option value="PREVENTIVE">Preventiva</option>
                  <option value="PREDICTIVE">Preditiva</option>
                  <option value="REACTIVE">Reativa</option>
                </select>
              </div>
              {formData.type === 'CORRECTIVE' && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Sub-tipo Corretiva
                  </label>
                  <select
                    value={formData.osType}
                    onChange={(e) => setFormData({ ...formData, osType: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Selecione</option>
                    <option value="CORRECTIVE_PLANNED">Corretiva Planejada</option>
                    <option value="CORRECTIVE_IMMEDIATE">Corretiva Imediata</option>
                  </select>
                  {formData.osType === 'CORRECTIVE_IMMEDIATE' && (
                    <p className="text-xs text-amber-600 mt-1">
                      Uma RAF sera gerada automaticamente para esta OS
                    </p>
                  )}
                </div>
              )}
              {formData.type === 'PREVENTIVE' && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Sub-tipo Preventiva
                  </label>
                  <select
                    value={formData.osType}
                    onChange={(e) => setFormData({ ...formData, osType: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Selecione</option>
                    <option value="PREVENTIVE_MANUAL">Preventiva Manual</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Prioridade
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="NONE">Nenhuma</option>
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                  <option value="CRITICAL">Critica</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Area de Manutencao
                </label>
                <select
                  value={formData.maintenanceAreaId}
                  onChange={(e) => setFormData({ ...formData, maintenanceAreaId: e.target.value, serviceTypeId: '' })}
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione</option>
                  {maintenanceAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.code ? `${area.code} - ${area.name}` : area.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Tipo de Servico
                </label>
                <select
                  value={formData.serviceTypeId}
                  onChange={(e) => setFormData({ ...formData, serviceTypeId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione</option>
                  {serviceTypes.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.code} - {st.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Data de Vencimento
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </ModalSection>

          <ModalSection title="Ativo e Localizacao">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Ativo
                </label>
                <select
                  value={formData.assetId}
                  onChange={(e) => handleAssetChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione um ativo</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Localizacao
                </label>
                <select
                  value={formData.locationId}
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione uma localizacao</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {selectedAssetHierarchy.length > 1 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground bg-gray-50 border border-gray-200 rounded-[4px] px-3 py-2">
                <Icon name="account_tree" className="text-sm text-gray-400 mr-1" />
                {selectedAssetHierarchy.map((name, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <Icon name="chevron_right" className="text-sm text-gray-400" />}
                    <span className={i === selectedAssetHierarchy.length - 1 ? 'font-semibold text-gray-700' : ''}>
                      {name}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </ModalSection>

          <ModalSection title="Atribuicao">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Equipe Responsavel
                </label>
                <select
                  value={formData.assignedTeamIds[0] || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, assignedTeamIds: e.target.value ? [e.target.value] : [], assignedToId: '' })
                    if (e.target.value) {
                      loadTeamMembers(e.target.value)
                    } else {
                      setTeamMembers([])
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione uma equipe</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Executante (Opcional)
                </label>
                <select
                  value={formData.assignedToId}
                  onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={teamMembers.length === 0}
                >
                  <option value="">
                    {teamMembers.length === 0 ? 'Selecione uma equipe primeiro' : 'Nenhum (lider atribuira)'}
                  </option>
                  {teamMembers.map((member: any) => (
                    <option key={member.user.id} value={member.user.id}>
                      {member.user.firstName} {member.user.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </ModalSection>

          {formData.type === 'PREVENTIVE' && (
            <ModalSection title="Periodicidade">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Frequencia
                  </label>
                  <select
                    value={formData.maintenanceFrequency}
                    onChange={(e) => setFormData({ ...formData, maintenanceFrequency: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Selecione a frequencia</option>
                    <option value="DAILY">Diaria</option>
                    <option value="WEEKLY">Semanal</option>
                    <option value="BIWEEKLY">Quinzenal</option>
                    <option value="MONTHLY">Mensal</option>
                    <option value="QUARTERLY">Trimestral</option>
                    <option value="SEMI_ANNUAL">Semestral</option>
                    <option value="ANNUAL">Anual</option>
                    <option value="CUSTOM">Personalizada</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    A cada (numero de periodos)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.frequencyValue}
                    onChange={(e) => setFormData({ ...formData, frequencyValue: e.target.value })}
                    placeholder="Ex: 2 (para a cada 2 semanas)"
                    className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </ModalSection>
          )}

          <ModalSection title="Recursos">
            <div className="mb-3">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Tempo de Execucao (min)
              </label>
              <input
                type="number"
                min={1}
                value={formData.estimatedDuration}
                onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                placeholder="Ex: 30"
                className="w-full sm:w-40 px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tempo que cada recurso de pessoa/ferramenta levara para executar a OS
              </p>
            </div>
            <ResourceSelector
              resources={woResources}
              onChange={setWoResources}
            />
          </ModalSection>
        </div>

        <div className="flex gap-3 px-4 py-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            <Icon name="save" className="text-base mr-2" />
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
