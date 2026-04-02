'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ArrowLeft, Save } from 'lucide-react'

export default function EditWorkOrderPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assets, setAssets] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'CORRECTIVE',
    priority: 'NONE',
    status: 'PENDING',
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
    if (params.id) {
      loadData()
    }
  }, [params.id])

  const loadData = async () => {
    try {
      const [woRes, assetsRes, locationsRes, usersRes, teamsRes] = await Promise.all([
        fetch(`/api/work-orders/${params.id}`),
        fetch('/api/assets'),
        fetch('/api/locations'),
        fetch('/api/users'),
        fetch('/api/teams')
      ])

      const [woData, assetsData, locationsData, usersData, teamsData] = await Promise.all([
        woRes.json(),
        assetsRes.json(),
        locationsRes.json(),
        usersRes.json(),
        teamsRes.json()
      ])

      if (woRes.ok && woData.data) {
        const wo = woData.data
        setFormData({
          title: wo.title || '',
          description: wo.description || '',
          type: wo.type || 'CORRECTIVE',
          priority: wo.priority || 'NONE',
          status: wo.status || 'OPEN',
          dueDate: wo.dueDate ? new Date(wo.dueDate).toISOString().split('T')[0] : '',
          assetId: wo.assetId || '',
          locationId: wo.locationId || '',
          assignedUserIds: wo.assignedUsers?.map((u: any) => u.id) || [],
          assignedTeamIds: wo.assignedTeams?.map((t: any) => t.id) || [],
          assignedToId: wo.assignedToId || '',
          externalId: wo.externalId || '',
          maintenanceFrequency: wo.maintenanceFrequency || '',
          frequencyValue: wo.frequencyValue?.toString() || '1'
        })
      } else {
        alert('Ordem de serviço não encontrada')
        router.push('/work-orders')
      }

      setAssets(assetsData.data || [])
      setLocations(locationsData.data || [])
      setUsers(usersData.data || [])
      setTeams(teamsData.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
      alert('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch(`/api/work-orders/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          assignedUsers: formData.assignedUserIds.length > 0 ? {
            set: formData.assignedUserIds.map(id => ({ id }))
          } : undefined
        })
      })

      if (res.ok) {
        alert('Ordem de serviço atualizada com sucesso!')
        router.push('/work-orders')
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao atualizar ordem de serviço')
      }
    } catch (error) {
      alert('Erro ao conectar ao servidor')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-gray-600 border-r-transparent"></div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:px-8 lg:py-8 pt-20 lg:pt-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Voltar
        </button>

        <Card>
          <CardHeader>
            <CardTitle>Editar Ordem de Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-primary/5 border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Número da OS</h3>
                <Input
                  label="Número Proteus (6 dígitos) - Opcional"
                  placeholder="Ex: 123456"
                  value={formData.externalId}
                  onChange={(e) => setFormData({ ...formData, externalId: e.target.value })}
                  maxLength={6}
                  pattern="\d{6}"
                />
                <p className="text-xs text-primary mt-2">
                  ℹ️ Deixe em branco para manter o código interno (MAN-XXXXXX)
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
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
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
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="CORRECTIVE">Corretiva</option>
                    <option value="PREVENTIVE">Preventiva</option>
                    <option value="PREDICTIVE">Preditiva</option>
                    <option value="REACTIVE">Reativa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="PENDING">Pendente</option>
                    <option value="RELEASED">Liberada</option>
                    <option value="IN_PROGRESS">Em Progresso</option>
                    <option value="ON_HOLD">Em Espera</option>
                    <option value="COMPLETE">Completa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Prioridade
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="NONE">Nenhuma</option>
                    <option value="LOW">Baixa</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HIGH">Alta</option>
                    <option value="CRITICAL">Crítica</option>
                  </select>
                </div>

                <Input
                  label="Data de Vencimento"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>

              {formData.type === 'PREVENTIVE' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">⏰ Periodicidade (Manutenção Preventiva)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Frequência
                      </label>
                      <select
                        value={formData.maintenanceFrequency}
                        onChange={(e) => setFormData({ ...formData, maintenanceFrequency: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
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

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Ativo
                </label>
                <select
                  value={formData.assetId}
                  onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
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
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione uma localização</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-success-light border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">👥 Atribuição</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Equipe Responsável
                    </label>
                    <select
                      value={formData.assignedTeamIds[0] || ''}
                      onChange={(e) => setFormData({ ...formData, assignedTeamIds: e.target.value ? [e.target.value] : [] })}
                      className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
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
                      className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
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

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Responsáveis Adicionais
                  </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-input rounded-md p-3">
                  {users.map((user) => (
                    <label key={user.id} className="flex items-center gap-2 cursor-pointer hover:bg-secondary p-2 rounded">
                      <input
                        type="checkbox"
                        checked={formData.assignedUserIds.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              assignedUserIds: [...formData.assignedUserIds, user.id]
                            })
                          } else {
                            setFormData({
                              ...formData,
                              assignedUserIds: formData.assignedUserIds.filter(id => id !== user.id)
                            })
                          }
                        }}
                        className="rounded border-input"
                      />
                      <span className="text-sm">
                        {user.firstName} {user.lastName} ({user.email})
                      </span>
                    </label>
                  ))}
                </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
