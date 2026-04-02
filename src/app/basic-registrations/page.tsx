'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { CrudTable, FieldConfig } from '@/components/basic-registrations/CrudTable'
import { Settings2 } from 'lucide-react'
import { hasPermission, type UserRole } from '@/lib/permissions'
import { useRouter } from 'next/navigation'

type TabKey = 'maintenance-types' | 'maintenance-areas' | 'service-types' | 'calendars' |
  'cost-centers' | 'work-centers' | 'asset-families' | 'positions' | 'resources' |
  'generic-tasks' | 'generic-steps' | 'characteristics' | 'areas'

interface TabConfig {
  key: TabKey
  label: string
  entity: string
  unitScoped?: boolean
  fields: FieldConfig[]
  columns: { key: string; label: string; render?: (value: any, row: any) => React.ReactNode }[]
}

export default function BasicRegistrationsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('maintenance-types')
  const [userRole, setUserRole] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [units, setUnits] = useState<any[]>([])
  const [selectedUnitId, setSelectedUnitId] = useState<string>('')

  // Listas para selects dinâmicos
  const [maintenanceTypes, setMaintenanceTypes] = useState<any[]>([])
  const [maintenanceAreas, setMaintenanceAreas] = useState<any[]>([])
  const [assetFamilies, setAssetFamilies] = useState<any[]>([])

  useEffect(() => {
    checkAccess()
    loadDependencies()
  }, [])

  const checkAccess = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (!data.user) { router.push('/login'); return }
      setUserRole(data.user.role)
      if (!hasPermission(data.user.role as UserRole, 'basic-registrations', 'view')) {
        router.push('/dashboard')
        return
      }
      setLoading(false)
    } catch {
      router.push('/login')
    }
  }

  const loadDependencies = async () => {
    try {
      const [unitsRes, mtRes, maRes, afRes] = await Promise.all([
        fetch('/api/units'),
        fetch('/api/basic-registrations/maintenance-types'),
        fetch('/api/basic-registrations/maintenance-areas'),
        fetch('/api/basic-registrations/asset-families'),
      ])
      const [unitsData, mtData, maData, afData] = await Promise.all([
        unitsRes.json(), mtRes.json(), maRes.json(), afRes.json()
      ])
      setUnits(unitsData.data || [])
      setMaintenanceTypes(mtData.data || [])
      setMaintenanceAreas(maData.data || [])
      setAssetFamilies(afData.data || [])
    } catch { /* ignore */ }
  }

  const canEdit = userRole && hasPermission(userRole as UserRole, 'basic-registrations', 'create')

  const tabs: TabConfig[] = [
    {
      key: 'maintenance-types', label: 'Tipos de Manutenção', entity: 'maintenance-types',
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: Preventiva' },
        { key: 'characteristic', label: 'Característica', type: 'select', options: [
          { value: 'Preventiva', label: 'Preventiva' },
          { value: 'Corretiva', label: 'Corretiva' },
        ]},
        { key: 'protheusCode', label: 'Código Protheus', type: 'text', placeholder: 'Ex: PRV' },
      ],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'characteristic', label: 'Característica' },
        { key: 'protheusCode', label: 'Cód. Protheus' },
      ],
    },
    {
      key: 'maintenance-areas', label: 'Áreas de Manutenção', entity: 'maintenance-areas',
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: Mecânica' },
        { key: 'protheusCode', label: 'Código Protheus', type: 'text', placeholder: 'Ex: MEC' },
      ],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'protheusCode', label: 'Cód. Protheus' },
      ],
    },
    {
      key: 'service-types', label: 'Tipos de Serviço', entity: 'service-types',
      fields: [
        { key: 'code', label: 'Código', type: 'text', required: true, placeholder: 'Ex: MECPRV' },
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: Mecânica Preventiva' },
        { key: 'maintenanceTypeId', label: 'Tipo de Manutenção', type: 'select', required: true,
          options: maintenanceTypes.map((mt: any) => ({ value: mt.id, label: mt.name }))
        },
        { key: 'maintenanceAreaId', label: 'Área de Manutenção', type: 'select', required: true,
          options: maintenanceAreas.map((ma: any) => ({ value: ma.id, label: ma.name }))
        },
        { key: 'isLubrication', label: 'Lubrificação?', type: 'checkbox' },
        { key: 'protheusCode', label: 'Código Protheus', type: 'text', placeholder: 'Ex: MECPRV' },
      ],
      columns: [
        { key: 'code', label: 'Código' },
        { key: 'name', label: 'Nome' },
        { key: 'protheusCode', label: 'Cód. Protheus' },
      ],
    },
    {
      key: 'calendars', label: 'Calendários', entity: 'calendars',
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: Calendário Operacional' },
        { key: 'description', label: 'Descrição', type: 'textarea' },
        { key: 'type', label: 'Tipo', type: 'select', defaultValue: 'WORK', options: [
          { value: 'WORK', label: 'Trabalho' },
          { value: 'EQUIPMENT', label: 'Equipamento' },
        ]},
        { key: 'protheusCode', label: 'Código Protheus', type: 'text', placeholder: 'Ex: M03' },
      ],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'type', label: 'Tipo', render: (v: string) => v === 'WORK' ? 'Trabalho' : 'Equipamento' },
        { key: 'protheusCode', label: 'Cód. Protheus' },
      ],
    },
    {
      key: 'cost-centers', label: 'Centros de Custos', entity: 'cost-centers',
      fields: [
        { key: 'code', label: 'Código', type: 'text', required: true, placeholder: 'Ex: 3002' },
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: Manutenção Industrial' },
        { key: 'protheusCode', label: 'Código Protheus', type: 'text', placeholder: 'Ex: 3002' },
      ],
      columns: [
        { key: 'code', label: 'Código' },
        { key: 'name', label: 'Nome' },
        { key: 'protheusCode', label: 'Cód. Protheus' },
      ],
    },
    {
      key: 'areas', label: 'Áreas', entity: 'areas', unitScoped: true,
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: Britagem Primária' },
        { key: 'description', label: 'Descrição', type: 'textarea' },
      ],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'description', label: 'Descrição' },
      ],
    },
    {
      key: 'work-centers', label: 'Centros de Trabalho', entity: 'work-centers', unitScoped: true,
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: Britagem - Grupo A' },
        { key: 'description', label: 'Descrição', type: 'textarea' },
        { key: 'hoursPerDay', label: 'Horas/Dia', type: 'number', defaultValue: 8 },
        { key: 'hoursPerSat', label: 'Horas/Sábado', type: 'number', defaultValue: 0 },
        { key: 'hoursPerSun', label: 'Horas/Domingo', type: 'number', defaultValue: 0 },
        { key: 'protheusCode', label: 'Código Protheus', type: 'text', placeholder: 'Ex: UTI001' },
      ],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'hoursPerDay', label: 'H/Dia' },
        { key: 'protheusCode', label: 'Cód. Protheus' },
      ],
    },
    {
      key: 'asset-families', label: 'Famílias de Bens', entity: 'asset-families',
      fields: [
        { key: 'code', label: 'Código', type: 'text', required: true, placeholder: 'Ex: COMAR' },
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: Compressores de Ar' },
        { key: 'familyType', label: 'Tipo', type: 'select', defaultValue: 'BEM', options: [
          { value: 'BEM', label: 'Bem' },
          { value: 'FERRAMENTA', label: 'Ferramenta' },
        ]},
        { key: 'protheusCode', label: 'Código Protheus', type: 'text', placeholder: 'Ex: COMAR' },
      ],
      columns: [
        { key: 'code', label: 'Código' },
        { key: 'name', label: 'Nome' },
        { key: 'familyType', label: 'Tipo' },
        { key: 'protheusCode', label: 'Cód. Protheus' },
      ],
    },
    {
      key: 'positions', label: 'Posições', entity: 'positions',
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: Posição 1' },
        { key: 'description', label: 'Descrição', type: 'textarea' },
        { key: 'protheusCode', label: 'Código Protheus', type: 'text', placeholder: 'Ex: M1' },
      ],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'protheusCode', label: 'Cód. Protheus' },
      ],
    },
    {
      key: 'resources', label: 'Recursos', entity: 'resources',
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: Eletricista Prev.' },
        { key: 'type', label: 'Tipo', type: 'select', required: true, options: [
          { value: 'LABOR', label: 'Mão de Obra' },
          { value: 'MATERIAL', label: 'Material' },
          { value: 'SPECIALTY', label: 'Especialidade' },
        ]},
        { key: 'unit', label: 'Unidade', type: 'text', placeholder: 'Ex: H, kg, litros' },
        { key: 'unitCost', label: 'Custo Unitário (R$)', type: 'number', defaultValue: 0 },
        { key: 'availability', label: 'Disponibilidade (%)', type: 'number', defaultValue: 100 },
        { key: 'protheusCode', label: 'Código Protheus', type: 'text', placeholder: 'Ex: E01' },
      ],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'type', label: 'Tipo', render: (v: string) =>
          v === 'LABOR' ? 'Mão de Obra' : v === 'MATERIAL' ? 'Material' : 'Especialidade'
        },
        { key: 'unit', label: 'Unidade' },
        { key: 'protheusCode', label: 'Cód. Protheus' },
      ],
    },
    {
      key: 'generic-tasks', label: 'Tarefas Genéricas', entity: 'generic-tasks',
      fields: [
        { key: 'code', label: 'Código', type: 'number', required: true },
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: LUBRIFICAR' },
        { key: 'characteristic', label: 'Característica', type: 'text', placeholder: 'Ex: Todos' },
        { key: 'protheusCode', label: 'Código Protheus', type: 'text' },
      ],
      columns: [
        { key: 'code', label: 'Código' },
        { key: 'name', label: 'Nome' },
        { key: 'protheusCode', label: 'Cód. Protheus' },
      ],
    },
    {
      key: 'generic-steps', label: 'Etapas Genéricas', entity: 'generic-steps',
      fields: [
        { key: 'name', label: 'Descrição', type: 'text', required: true, placeholder: 'Ex: Abastecer redutor com óleo novo' },
        { key: 'optionType', label: 'Tipo de Opção', type: 'select', defaultValue: 'NONE', options: [
          { value: 'NONE', label: 'Nenhuma' },
          { value: 'RESPONSE', label: 'Resposta' },
          { value: 'OPTION', label: 'Opção' },
        ]},
        { key: 'protheusCode', label: 'Código Protheus', type: 'text', placeholder: 'Ex: ABA001' },
      ],
      columns: [
        { key: 'name', label: 'Descrição' },
        { key: 'optionType', label: 'Tipo' },
        { key: 'protheusCode', label: 'Cód. Protheus' },
      ],
    },
    {
      key: 'characteristics', label: 'Características', entity: 'characteristics',
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: ACIONAMENTO' },
        { key: 'infoType', label: 'Tipo de Informação', type: 'select', defaultValue: 'Caractere', options: [
          { value: 'Caractere', label: 'Caractere' },
          { value: 'Numerico', label: 'Numérico' },
        ]},
        { key: 'protheusCode', label: 'Código Protheus', type: 'text', placeholder: 'Ex: ACI001' },
      ],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'infoType', label: 'Tipo' },
        { key: 'protheusCode', label: 'Cód. Protheus' },
      ],
    },
  ]

  const currentTab = tabs.find(t => t.key === activeTab)

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-gray-600 border-r-transparent" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Settings2 className="h-7 w-7 text-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cadastros Básicos</h1>
            <p className="text-sm text-muted-foreground">Gerencie os cadastros base do sistema de manutenção</p>
          </div>
        </div>

        {/* Seletor de Unidade (para abas com escopo de unidade) */}
        {currentTab?.unitScoped && (
          <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
            <label className="text-sm font-medium text-foreground">Unidade:</label>
            <select
              value={selectedUnitId}
              onChange={e => setSelectedUnitId(e.target.value)}
              className="flex-1 max-w-xs px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecione a unidade...</option>
              {units.map((u: any) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-border overflow-x-auto">
          <div className="flex gap-0 min-w-max">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo da aba ativa */}
        {currentTab && (
          <CrudTable
            key={`${currentTab.key}-${selectedUnitId}`}
            entity={currentTab.entity}
            title={currentTab.label}
            fields={currentTab.fields}
            columns={currentTab.columns}
            unitScoped={currentTab.unitScoped}
            selectedUnitId={selectedUnitId}
          />
        )}
      </div>
    </AppLayout>
  )
}
