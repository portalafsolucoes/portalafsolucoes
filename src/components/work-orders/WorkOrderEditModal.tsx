'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface WorkOrderEditModalProps {
  isOpen: boolean
  onClose: () => void
  workOrderId: string
  onSuccess: () => void
}

export function WorkOrderEditModal({
  isOpen,
  onClose,
  workOrderId,
  onSuccess
}: WorkOrderEditModalProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assets, setAssets] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'CORRECTIVE',
    priority: 'NONE',
    status: 'PENDING',
    dueDate: '',
    assetId: '',
    locationId: '',
    assignedTeamIds: [] as string[],
    assignedToId: '',
    externalId: ''
  })

  useEffect(() => {
    if (isOpen && workOrderId) {
      loadData()
    }
  }, [isOpen, workOrderId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [woRes, assetsRes, locationsRes, teamsRes] = await Promise.all([
        fetch(`/api/work-orders/${workOrderId}`),
        fetch('/api/assets'),
        fetch('/api/locations'),
        fetch('/api/teams')
      ])

      if (woRes.ok) {
        const woData = await woRes.json()
        const wo = woData.data
        
        setFormData({
          title: wo.title || '',
          description: wo.description || '',
          type: wo.type || 'CORRECTIVE',
          priority: wo.priority || 'NONE',
          status: wo.status || 'OPEN',
          dueDate: wo.dueDate ? wo.dueDate.split('T')[0] : '',
          assetId: wo.assetId || '',
          locationId: wo.locationId || '',
          assignedTeamIds: wo.assignedTeams?.map((t: any) => t.id) || [],
          assignedToId: wo.assignedToId || '',
          externalId: wo.externalId || ''
        })

        // Carregar membros da equipe se houver equipe
        if (wo.assignedTeams && wo.assignedTeams.length > 0) {
          loadTeamMembers(wo.assignedTeams[0].id)
        }
      }

      if (assetsRes.ok) {
        const assetsData = await assetsRes.json()
        setAssets(assetsData.data || [])
      }

      if (locationsRes.ok) {
        const locationsData = await locationsRes.json()
        setLocations(locationsData.data || [])
      }

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json()
        setTeams(teamsData.data || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      alert('Erro ao carregar dados')
    } finally {
      setLoading(false)
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
    setSaving(true)

    try {
      const response = await fetch(`/api/work-orders/${workOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          type: formData.type,
          priority: formData.priority,
          status: formData.status,
          dueDate: formData.dueDate || null,
          assetId: formData.assetId || null,
          locationId: formData.locationId || null,
          assignedToId: formData.assignedToId || null,
          externalId: formData.externalId || null,
          assignedTeamIds: formData.assignedTeamIds
        })
      })

      if (response.ok) {
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

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Editar Ordem de Serviço" size="xl">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Ordem de Serviço" size="xl">
      <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
        {/* Título */}
        <div>
          <label className="block text-sm md:text-base font-medium text-foreground mb-1">
            Título *
          </label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm md:text-base font-medium text-foreground mb-1">
            Descrição
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 text-sm md:text-base border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Tipo, Prioridade, Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm md:text-base font-medium text-foreground mb-1">
              Tipo
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 text-sm md:text-base border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="CORRECTIVE">Corretiva</option>
              <option value="PREVENTIVE">Preventiva</option>
              <option value="PREDICTIVE">Preditiva</option>
              <option value="REACTIVE">Reativa</option>
            </select>
          </div>

          <div>
            <label className="block text-sm md:text-base font-medium text-foreground mb-1">
              Prioridade
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-3 py-2 text-sm md:text-base border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="NONE">Nenhuma</option>
              <option value="LOW">Baixa</option>
              <option value="MEDIUM">Média</option>
              <option value="HIGH">Alta</option>
            </select>
          </div>

          <div>
            <label className="block text-sm md:text-base font-medium text-foreground mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 text-sm md:text-base border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="PENDING">Pendente</option>
              <option value="RELEASED">Liberada</option>
              <option value="IN_PROGRESS">Em Progresso</option>
              <option value="ON_HOLD">Em Espera</option>
              <option value="COMPLETE">Completa</option>
            </select>
          </div>
        </div>

        {/* ID Externo e Data de Vencimento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm md:text-base font-medium text-foreground mb-1">
              ID Externo
            </label>
            <Input
              value={formData.externalId}
              onChange={(e) => setFormData({ ...formData, externalId: e.target.value })}
              placeholder="Ex: 123456"
            />
          </div>

          <div>
            <label className="block text-sm md:text-base font-medium text-foreground mb-1">
              Data de Vencimento
            </label>
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>
        </div>

        {/* Ativo e Localização */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm md:text-base font-medium text-foreground mb-1">
              Ativo
            </label>
            <select
              value={formData.assetId}
              onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
              className="w-full px-3 py-2 text-sm md:text-base border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Nenhum</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm md:text-base font-medium text-foreground mb-1">
              Localização
            </label>
            <select
              value={formData.locationId}
              onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
              className="w-full px-3 py-2 text-sm md:text-base border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Nenhuma</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Equipe */}
        <div>
          <label className="block text-sm md:text-base font-medium text-foreground mb-1">
            Equipe
          </label>
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
            className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Nenhuma equipe</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        {/* Executante */}
        <div>
          <label className="block text-sm md:text-base font-medium text-foreground mb-1">
            Executante
          </label>
          <select
            value={formData.assignedToId}
            onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={teamMembers.length === 0}
          >
            <option value="">
              {teamMembers.length === 0 ? 'Selecione uma equipe primeiro' : 'Nenhum executante'}
            </option>
            {teamMembers.map((member: any) => (
              <option key={member.user.id} value={member.user.id}>
                {member.user.firstName} {member.user.lastName}
              </option>
            ))}
          </select>
        </div>

        {/* Botões */}
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3 justify-end pt-3 md:pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
