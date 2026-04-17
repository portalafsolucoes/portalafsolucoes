'use client'

import { useCallback, useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Input } from '@/components/ui/Input'
import { PanelCloseButton } from '@/components/ui/PanelCloseButton'
import { ResourceSelector, type TaskResourceItem } from '@/components/ui/ResourceSelector'

interface NamedItem {
  id: string
  name: string
}

interface AssetItem {
  id: string
  name: string
  locationId?: string | null
  parentAssetId?: string | null
  parentAsset?: { id: string; protheusCode?: string; name: string } | null
}

interface TeamMember {
  user: {
    id: string
    firstName: string
    lastName: string
  }
}

interface WorkOrderData {
  title?: string | null
  description?: string | null
  type?: string | null
  osType?: string | null
  priority?: string | null
  status?: string | null
  dueDate?: string | null
  assetId?: string | null
  locationId?: string | null
  assignedTeams?: Array<{ id: string }>
  assignedToId?: string | null
  externalId?: string | null
  estimatedDuration?: number | null
  serviceTypeId?: string | null
  maintenanceAreaId?: string | null
}

interface WorkOrderEditModalProps {
  isOpen: boolean
  onClose: () => void
  workOrderId: string
  onSuccess: () => void
  inPage?: boolean
}

export function WorkOrderEditModal({
  isOpen,
  onClose,
  workOrderId,
  onSuccess,
  inPage = false
}: WorkOrderEditModalProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [locations, setLocations] = useState<NamedItem[]>([])
  const [teams, setTeams] = useState<NamedItem[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
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
    status: 'PENDING',
    dueDate: '',
    assetId: '',
    locationId: '',
    assignedTeamIds: [] as string[],
    assignedToId: '',
    externalId: '',
    estimatedDuration: '',
    maintenanceAreaId: '',
    serviceTypeId: ''
  })

  const loadTeamMembers = useCallback(async (teamId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/members`)
      if (res.ok) {
        const data = await res.json() as { data?: TeamMember[] }
        setTeamMembers(data.data || [])
      }
    } catch (error) {
      console.error('Error loading team members:', error)
    }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [woRes, assetsRes, locationsRes, teamsRes, resRes, areasRes, stRes] = await Promise.all([
        fetch(`/api/work-orders/${workOrderId}`),
        fetch('/api/assets?summary=true'),
        fetch('/api/locations'),
        fetch('/api/teams'),
        fetch(`/api/work-orders/${workOrderId}/resources`),
        fetch('/api/basic-registrations/maintenance-areas'),
        fetch('/api/basic-registrations/service-types')
      ])

      if (areasRes.ok) {
        const areasData = await areasRes.json()
        setMaintenanceAreas(areasData.data || [])
      }
      if (stRes.ok) {
        const stData = await stRes.json()
        setAllServiceTypes(stData.data || [])
      }

      if (woRes.ok) {
        const woData = await woRes.json() as { data?: WorkOrderData }
        const wo = woData.data

        if (wo) {
          setFormData({
            title: wo.title || '',
            description: wo.description || '',
            type: wo.type || 'CORRECTIVE',
            osType: wo.osType || '',
            priority: wo.priority || 'NONE',
            status: wo.status || 'OPEN',
            dueDate: wo.dueDate ? wo.dueDate.split('T')[0] : '',
            assetId: wo.assetId || '',
            locationId: wo.locationId || '',
            assignedTeamIds: wo.assignedTeams?.map((team) => team.id) || [],
            assignedToId: wo.assignedToId || '',
            externalId: wo.externalId || '',
            estimatedDuration: wo.estimatedDuration != null ? String(wo.estimatedDuration) : '',
            maintenanceAreaId: wo.maintenanceAreaId || '',
            serviceTypeId: wo.serviceTypeId || ''
          })

          if (wo.assignedTeams && wo.assignedTeams.length > 0) {
            void loadTeamMembers(wo.assignedTeams[0].id)
          }
        }
      }

      if (assetsRes.ok) {
        const assetsData = await assetsRes.json() as { data?: AssetItem[] }
        setAssets(assetsData.data || [])
      }

      if (locationsRes.ok) {
        const locationsData = await locationsRes.json() as { data?: NamedItem[] }
        setLocations(locationsData.data || [])
      }

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json() as { data?: NamedItem[] }
        setTeams(teamsData.data || [])
      }

      if (resRes.ok) {
        interface WoResourceRow {
          resourceType: string
          resource?: { id: string } | null
          jobTitle?: { id: string } | null
          user?: { id: string } | null
          quantity: number
          hours: number
          unit: string
        }
        const resData = await resRes.json() as { data?: WoResourceRow[] }
        const mapped: TaskResourceItem[] = (resData.data || []).map((r: WoResourceRow) => ({
          resourceType: r.resourceType as TaskResourceItem['resourceType'],
          resourceId: r.resource?.id || null,
          jobTitleId: r.jobTitle?.id || null,
          userId: r.user?.id || null,
          quantity: r.quantity,
          hours: r.hours,
          unit: r.unit,
        }))
        setWoResources(mapped)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      alert('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [loadTeamMembers, workOrderId])

  useEffect(() => {
    if ((inPage || isOpen) && workOrderId) {
      void loadData()
    }
  }, [inPage, isOpen, loadData, workOrderId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/work-orders/${workOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          type: formData.type,
          osType: formData.osType || null,
          priority: formData.priority,
          status: formData.status,
          dueDate: formData.dueDate || null,
          assetId: formData.assetId || null,
          locationId: formData.locationId || null,
          assignedToId: formData.assignedToId || null,
          externalId: formData.externalId || null,
          assignedTeamIds: formData.assignedTeamIds,
          estimatedDuration: formData.estimatedDuration ? Number(formData.estimatedDuration) : null,
          maintenanceAreaId: formData.maintenanceAreaId || null,
          serviceTypeId: formData.serviceTypeId || null
        })
      })

      if (response.ok) {
        // Salvar recursos em paralelo
        await fetch(`/api/work-orders/${workOrderId}/resources`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resources: woResources.map(r => ({
              resourceType: r.resourceType,
              resourceId: r.resourceId || null,
              jobTitleId: r.jobTitleId || null,
              userId: r.userId || null,
              quantity: r.quantity ?? null,
              hours: r.hours ?? null,
              unit: r.unit || null,
            })),
          }),
        })
        onSuccess()
        onClose()
      } else {
        const data = await response.json()
        alert(data.error || 'Erro ao atualizar ordem de serviço')
      }
    } catch (error) {
      console.error('Error updating work order:', error)
      alert('Erro ao conectar ao servidor')
    } finally {
      setSaving(false)
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

  const formSections = (
    <>
      <ModalSection title="Identificação">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Título *</label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Descrição</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </ModalSection>

      <ModalSection title="Classificação">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tipo</label>
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
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Sub-tipo Corretiva</label>
              <select
                value={formData.osType}
                onChange={(e) => setFormData({ ...formData, osType: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione</option>
                <option value="CORRECTIVE_PLANNED">Corretiva Planejada</option>
                <option value="CORRECTIVE_IMMEDIATE">Corretiva Imediata</option>
              </select>
            </div>
          )}
          {formData.type === 'PREVENTIVE' && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Sub-tipo Preventiva</label>
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
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Prioridade</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="NONE">Nenhuma</option>
              <option value="LOW">Baixa</option>
              <option value="MEDIUM">Média</option>
              <option value="HIGH">Alta</option>
              <option value="CRITICAL">Critica</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="PENDING">Pendente</option>
              <option value="RELEASED">Liberada</option>
              <option value="IN_PROGRESS">Em Progresso</option>
              <option value="ON_HOLD">Em Espera</option>
              <option value="COMPLETE">Completa</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Area de Manutencao</label>
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
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tipo de Servico</label>
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
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">ID Externo</label>
            <Input
              value={formData.externalId}
              onChange={(e) => setFormData({ ...formData, externalId: e.target.value })}
              placeholder="Ex: 123456"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Data de Vencimento</label>
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>
        </div>
      </ModalSection>

      <ModalSection title="Ativo e Localização">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Ativo</label>
            <select
              value={formData.assetId}
              onChange={(e) => handleAssetChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Nenhum</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>{asset.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Localização</label>
            <select
              value={formData.locationId}
              onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Nenhuma</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
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

      <ModalSection title="Atribuição">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Equipe</label>
            <select
              value={formData.assignedTeamIds[0] || ''}
              onChange={(e) => {
                setFormData({ ...formData, assignedTeamIds: e.target.value ? [e.target.value] : [] })
                if (e.target.value) {
                  loadTeamMembers(e.target.value)
                } else {
                  setTeamMembers([])
                }
              }}
              className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Nenhuma equipe</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Executante</label>
            <select
              value={formData.assignedToId}
              onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={teamMembers.length === 0}
            >
              <option value="">
                {teamMembers.length === 0 ? 'Selecione uma equipe primeiro' : 'Nenhum executante'}
              </option>
              {teamMembers.map((member) => (
                <option key={member.user.id} value={member.user.id}>
                  {member.user.firstName} {member.user.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </ModalSection>

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
    </>
  )

  const renderFooter = (isInPage: boolean) => (
    <div className={isInPage ? 'flex gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200' : 'flex gap-3 px-4 py-4 border-t border-border'}>
      <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="flex-1">
        Cancelar
      </Button>
      <Button
        type="submit"
        disabled={saving}
        className="flex-1 bg-gray-900 text-white hover:bg-gray-800"
      >
        <Icon name="save" className="text-base mr-2" />
        {saving ? 'Salvando...' : 'Salvar Alterações'}
      </Button>
    </div>
  )

  if (loading) {
    if (inPage) {
      return (
        <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-black text-gray-900">Editar Ordem de Serviço</h2>
            <PanelCloseButton onClick={onClose} />
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
              <p className="mt-2 text-muted-foreground">Carregando...</p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Editar Ordem de Serviço">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-on-surface-variant"></div>
        </div>
      </Modal>
    )
  }

  if (inPage) {
    return (
      <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-black text-gray-900">Editar Ordem de Serviço</h2>
          <PanelCloseButton onClick={onClose} />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 min-h-0 flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {formSections}
          </div>
          {renderFooter(true)}
        </form>
      </div>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Ordem de Serviço">
      <form onSubmit={handleSubmit}>
        <div className="p-4 space-y-3">
          {formSections}
        </div>
        {renderFooter(false)}
      </form>
    </Modal>
  )
}
