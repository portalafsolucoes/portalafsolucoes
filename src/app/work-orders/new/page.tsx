'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function NewWorkOrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [assets, setAssets] = useState<Array<{ id: string; name: string }>>([])
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([])
  const [users, setUsers] = useState<Array<{ id: string; firstName?: string; lastName?: string }>>([])
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([])
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'CORRECTIVE',
    priority: 'NONE',
    dueDate: '',
    assetId: '',
    locationId: '',
    assignedUserIds: [] as string[],
    assignedTeamIds: [] as string[],
    assignedToId: '',
    externalId: '',
    maintenanceFrequency: '',
    frequencyValue: '1'
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [assetsRes, locationsRes, usersRes, teamsRes] = await Promise.all([
        fetch('/api/assets'),
        fetch('/api/locations'),
        fetch('/api/users'),
        fetch('/api/teams')
      ])

      const [assetsData, locationsData, usersData, teamsData] = await Promise.all([
        assetsRes.json(),
        locationsRes.json(),
        usersRes.json(),
        teamsRes.json()
      ])

      setAssets(assetsData.data || [])
      setLocations(locationsData.data || [])
      setUsers(usersData.data || [])
      setTeams(teamsData.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
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
        router.push('/work-orders')
      } else {
        alert('Erro ao criar ordem de serviço')
      }
    } catch {
      alert('Erro ao conectar ao servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer variant="form">
      <PageHeader
        title="Nova Ordem de Serviço"
        description="Cadastre uma OS com identificação, prioridade, responsáveis e contexto operacional."
      />

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6 pt-6">
              <div className="bg-primary/5 border border-blue-200 rounded-[4px] p-4 mb-6">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Número da OS</h3>
                <Input
                  label="Número Proteus (6 dígitos) - Opcional"
                  placeholder="Ex: 123456"
                  value={formData.externalId}
                  onChange={(e) => setFormData({ ...formData, externalId: e.target.value })}
                  maxLength={6}
                  pattern="\d{6}"
                />
                <p className="text-xs text-primary mt-2">
                  ℹ️ Se deixar em branco, será gerado automaticamente um código interno (MAN-XXXXXX)
                </p>
              </div>

              <Input
                label="Título"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Tipo de OS
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="CORRECTIVE">Corretiva</option>
                    <option value="PREVENTIVE">Preventiva</option>
                    <option value="PREDICTIVE">Preditiva</option>
                    <option value="REACTIVE">Reativa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Prioridade
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="NONE">Nenhuma</option>
                    <option value="LOW">Baixa</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HIGH">Alta</option>
                    <option value="CRITICAL">Crítica</option>
                  </select>
                </div>
              </div>

              <Input
                label="Data de Vencimento"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />

              {formData.type === 'PREVENTIVE' && (
                <div className="bg-purple-50 border border-purple-200 rounded-[4px] p-4">
                  <h3 className="text-sm font-semibold text-purple-900 mb-3">⏰ Periodicidade (Manutenção Preventiva)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Frequência
                      </label>
                      <select
                        value={formData.maintenanceFrequency}
                        onChange={(e) => setFormData({ ...formData, maintenanceFrequency: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Selecione a frequência</option>
                        <option value="DAILY">Diária</option>
                        <option value="WEEKLY">Semanal</option>
                        <option value="BIWEEKLY">Quinzenal</option>
                        <option value="MONTHLY">Mensal</option>
                        <option value="QUARTERLY">Trimestral</option>
                        <option value="SEMI_ANNUAL">Semestral</option>
                        <option value="ANNUAL">Anual</option>
                        <option value="CUSTOM">Personalizada</option>
                      </select>
                    </div>
                    <Input
                      label="A cada (número de períodos)"
                      type="number"
                      min="1"
                      value={formData.frequencyValue}
                      onChange={(e) => setFormData({ ...formData, frequencyValue: e.target.value })}
                      placeholder="Ex: 2 (para a cada 2 semanas)"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Ativo
                  </label>
                  <select
                    value={formData.assetId}
                    onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
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
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Localização
                  </label>
                  <select
                    value={formData.locationId}
                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Selecione uma localização</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-success-light border border-green-200 rounded-[4px] p-4">
                <h3 className="text-sm font-semibold text-green-900 mb-3">👥 Atribuição</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Equipe Responsável
                    </label>
                    <select
                      value={formData.assignedTeamIds[0] || ''}
                      onChange={(e) => setFormData({ ...formData, assignedTeamIds: e.target.value ? [e.target.value] : [] })}
                      className="w-full px-3 py-2 border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Técnico Específico (Opcional)
                    </label>
                    <select
                      value={formData.assignedToId}
                      onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Nenhum (líder atribuirá)</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Criando...' : 'Criar Ordem de Serviço'}
                </Button>
              </div>
            </form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
