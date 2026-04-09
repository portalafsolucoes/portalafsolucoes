'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

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
  const [assets, setAssets] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'CORRECTIVE',
    priority: 'NONE',
    dueDate: '',
    assetId: '',
    locationId: '',
    assignedTeamIds: [] as string[],
    assignedToId: '',
    externalId: '',
    maintenanceFrequency: '',
    frequencyValue: '1'
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
      priority: 'NONE',
      dueDate: '',
      assetId: '',
      locationId: '',
      assignedTeamIds: [],
      assignedToId: '',
      externalId: '',
      maintenanceFrequency: '',
      frequencyValue: '1'
    })
    setTeamMembers([])
  }

  const loadData = async () => {
    try {
      const [assetsRes, locationsRes, teamsRes] = await Promise.all([
        fetch('/api/assets'),
        fetch('/api/locations'),
        fetch('/api/teams')
      ])

      const [assetsData, locationsData, teamsData] = await Promise.all([
        assetsRes.json(),
        locationsRes.json(),
        teamsRes.json()
      ])

      setAssets(assetsData.data || [])
      setLocations(locationsData.data || [])
      setTeams(teamsData.data || [])
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
        body: JSON.stringify(formData)
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
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="CORRECTIVE">Corretiva</option>
                  <option value="PREVENTIVE">Preventiva</option>
                  <option value="PREDICTIVE">Preditiva</option>
                  <option value="REACTIVE">Reativa</option>
                </select>
              </div>
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
                  onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
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
