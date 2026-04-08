'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import { CrudTable, FieldConfig } from '@/components/basic-registrations/CrudTable'
import { CalendarModal } from '@/components/basic-registrations/CalendarModal'
import { AssetFamilyModal } from '@/components/basic-registrations/AssetFamilyModal'
import { ResourceModal } from '@/components/basic-registrations/ResourceModal'
import { GenericStepModal } from '@/components/basic-registrations/GenericStepModal'
import { Icon } from '@/components/ui/Icon'

import { hasPermission, type UserRole } from '@/lib/permissions'

const dependencyCache = new Map<string, any[]>()
const dependencyPromiseCache = new Map<string, Promise<any[]>>()

async function fetchCachedList(url: string) {
  if (dependencyCache.has(url)) {
    return dependencyCache.get(url)
  }

  if (dependencyPromiseCache.has(url)) {
    return dependencyPromiseCache.get(url)
  }

  const request = fetch(url)
    .then(async response => {
      if (!response.ok) {
        throw new Error(`Falha ao carregar ${url}: ${response.status}`)
      }

      const payload = await response.json()
      const data = payload.data || []
      dependencyCache.set(url, data)
      return data
    })
    .finally(() => {
      dependencyPromiseCache.delete(url)
    })

  dependencyPromiseCache.set(url, request)
  return request
}

interface TabConfig {
  key: string
  label: string
  entity: string
  unitScoped?: boolean
  fields: FieldConfig[]
  columns: { key: string; label: string; render?: (value: any, row: any) => React.ReactNode }[]
  apiQueryParams?: string
  customModalRender?: (props: { editingItem: any | null; onClose: () => void; onSaved: () => void }) => React.ReactNode
  customSectionRender?: () => React.ReactNode
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  GESTOR: 'Gestor',
  PLANEJADOR: 'Planejador',
  MECANICO: 'Mecânico',
  ELETRICISTA: 'Eletricista',
  OPERADOR: 'Operador',
  CONSTRUTOR_CIVIL: 'Construtor Civil',
}

function PeopleSummarySection({ users }: { users: any[] }) {
  const [searchTerm, setSearchTerm] = useState('')

  const enabledUsers = useMemo(() => {
    return users.filter(u => u.enabled !== false)
  }, [users])

  const filtered = useMemo(() => {
    if (!searchTerm) return enabledUsers
    const s = searchTerm.toLowerCase()
    return enabledUsers.filter(u => {
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase()
      const role = (ROLE_LABELS[u.role] || u.role || '').toLowerCase()
      const job = (u.jobTitle || '').toLowerCase()
      return fullName.includes(s) || role.includes(s) || job.includes(s)
    })
  }, [enabledUsers, searchTerm])

  // Agrupar por role
  const groupedByRole = useMemo(() => {
    const groups: Record<string, any[]> = {}
    for (const user of filtered) {
      const role = user.role || 'SEM_CARGO'
      if (!groups[role]) groups[role] = []
      groups[role].push(user)
    }
    return groups
  }, [filtered])

  const roleOrder = ['MECANICO', 'ELETRICISTA', 'OPERADOR', 'CONSTRUTOR_CIVIL', 'PLANEJADOR', 'GESTOR', 'SUPER_ADMIN']
  const sortedRoles = Object.keys(groupedByRole).sort((a, b) => {
    const ia = roleOrder.indexOf(a)
    const ib = roleOrder.indexOf(b)
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })

  const [expanded, setExpanded] = useState(true)

  return (
    <div className="mb-6 rounded-[4px] bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {expanded ? <Icon name="expand_more" className="text-base text-muted-foreground" /> : <Icon name="chevron_right" className="text-base text-muted-foreground" />}
          <Icon name="group" className="text-xl text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Mão de Obra & Especialidades</h2>
          <span className="text-xs text-muted-foreground">({enabledUsers.length} pessoas)</span>
        </div>
        <Link
          href="/people-teams"
          onClick={e => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          Gerenciar em Pessoas/Equipes
          <Icon name="open_in_new" className="text-sm" />
        </Link>
      </button>

      {expanded && (
        <>
          {/* Busca */}
          <div className="p-3 border-t border-border">
            <div className="relative max-w-xs">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nome, cargo ou especialidade..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              {enabledUsers.length === 0
                ? 'Nenhuma pessoa cadastrada. Acesse Pessoas/Equipes para cadastrar.'
                : 'Nenhuma pessoa encontrada para a busca.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-foreground">Nome</th>
                    <th className="text-left px-4 py-2.5 font-medium text-foreground">Cargo</th>
                    <th className="text-left px-4 py-2.5 font-medium text-foreground">Especialidade</th>
                    <th className="text-left px-4 py-2.5 font-medium text-foreground">Taxa/Hora (R$)</th>
                    <th className="text-left px-4 py-2.5 font-medium text-foreground">Calendário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedRoles.map(role => (
                    groupedByRole[role].map(user => (
                      <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 text-foreground font-medium">
                          {user.firstName} {user.lastName}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {user.jobTitle || '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                            {ROLE_LABELS[user.role] || user.role}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {user.rate ? `R$ ${Number(user.rate).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {user.calendarName || '—'}
                        </td>
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-4 py-2 border-t border-border bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {enabledUsers.length} pessoa(s) ativa(s) — Para adicionar ou editar mão de obra, acesse{' '}
              <Link href="/people-teams" className="text-primary hover:underline">Pessoas/Equipes</Link>.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

export default function BasicRegistrationEntityPage() {
  const params = useParams()
  const router = useRouter()
  const entity = params.entity as string

  const { user, isLoading: authLoading, unitId: activeUnitId } = useAuth()
  const role = user?.role ?? ''

  // Listas para selects dinâmicos
  const [maintenanceTypes, setMaintenanceTypes] = useState<any[]>([])
  const [maintenanceAreas, setMaintenanceAreas] = useState<any[]>([])
  const [assetFamilyModels, setAssetFamilyModels] = useState<any[]>([])
  const [calendars, setCalendars] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [resourcesTableExpanded, setResourcesTableExpanded] = useState(true)

  // Redirect if not authenticated or no permission
  useEffect(() => {
    if (authLoading || !user) return
    if (!hasPermission(role as UserRole, 'basic-registrations', 'view')) {
      router.push('/dashboard')
      return
    }
    loadDependencies(entity)
  }, [authLoading, user, role, entity])

  const loadDependencies = async (currentEntity: string) => {
    const loaders: Array<Promise<void>> = []

    const runLoader = async (load: () => Promise<any[]>, setter: (value: any[]) => void) => {
      try {
        setter(await load())
      } catch (error) {
        console.error(`Erro ao carregar dependência de ${currentEntity}:`, error)
        setter([])
      }
    }

    const needsMaintenanceRefs = currentEntity === 'service-types'
    const needsAssetFamilyModels = currentEntity === 'asset-families'
    const needsCalendars = new Set(['work-centers', 'resources'])
    const needsUsers = currentEntity === 'resources'

    if (needsMaintenanceRefs) {
      loaders.push(runLoader(() => fetchCachedList('/api/basic-registrations/maintenance-types'), setMaintenanceTypes))
      loaders.push(runLoader(() => fetchCachedList('/api/basic-registrations/maintenance-areas'), setMaintenanceAreas))
    } else {
      setMaintenanceTypes([])
      setMaintenanceAreas([])
    }

    if (needsAssetFamilyModels) {
      loaders.push(runLoader(() => fetchCachedList('/api/basic-registrations/asset-family-models'), setAssetFamilyModels))
    } else {
      setAssetFamilyModels([])
    }

    if (needsCalendars.has(currentEntity)) {
      loaders.push(runLoader(() => fetchCachedList('/api/basic-registrations/calendars'), setCalendars))
    } else {
      setCalendars([])
    }

    if (needsUsers) {
      loaders.push(runLoader(() => fetchCachedList('/api/users?enabled=true&brief=resource'), setUsers))
    } else {
      setUsers([])
    }

    await Promise.all(loaders)
  }

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
      fields: [],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'type', label: 'Tipo', render: (v: string) => v === 'WORK' ? 'Mão de Obra' : 'Equipamento' },
        { key: 'protheusCode', label: 'Cód. Protheus' },
      ],
      customModalRender: (props) => <CalendarModal {...props} />,
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
        { key: 'calendarId', label: 'Calendário', type: 'select', options: [
          { value: '', label: 'Nenhum' },
          ...calendars.map(c => ({ value: c.id, label: c.name })),
        ]},
        { key: 'protheusCode', label: 'Código Protheus', type: 'text', placeholder: 'Ex: UTI001' },
      ],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'calendarName', label: 'Calendário' },
        { key: 'protheusCode', label: 'Cód. Protheus' },
      ],
    },
    {
      key: 'asset-family-models', label: 'Tipos Modelo', entity: 'asset-family-models',
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: TC-2200x30m' },
        { key: 'description', label: 'Descrição', type: 'textarea', placeholder: 'Descrição do tipo modelo' },
        { key: 'protheusCode', label: 'Código Protheus', type: 'text', placeholder: 'Ex: TC2200' },
      ],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'description', label: 'Descrição' },
        { key: 'protheusCode', label: 'Cód. Protheus' },
      ],
    },
    {
      key: 'asset-families', label: 'Famílias de Bens', entity: 'asset-families',
      fields: [],
      columns: [
        { key: 'code', label: 'Código' },
        { key: 'name', label: 'Nome' },
        { key: 'familyType', label: 'Tipo' },
        { key: 'modelNames', label: 'Tipos Modelo' },
        { key: 'protheusCode', label: 'Cód. Protheus' },
      ],
      customModalRender: (props) => (
        <AssetFamilyModal {...props} assetFamilyModels={assetFamilyModels} onModelsChanged={() => loadDependencies(entity)} />
      ),
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
      apiQueryParams: 'types=MATERIAL,TOOL',
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: Graxa Industrial' },
        { key: 'type', label: 'Tipo', type: 'select', required: true, options: [
          { value: 'MATERIAL', label: 'Material' },
          { value: 'TOOL', label: 'Ferramenta' },
        ]},
        { key: 'unit', label: 'Unidade', type: 'text', placeholder: 'Ex: kg, litros, un' },
        { key: 'unitCost', label: 'Custo Unitário (R$)', type: 'number', defaultValue: 0 },
        { key: 'protheusCode', label: 'Código Protheus', type: 'text', placeholder: 'Ex: E01' },
      ],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'type', label: 'Tipo', render: (v: string) => {
          const typeLabels: Record<string, string> = {
            MATERIAL: 'Material',
            TOOL: 'Ferramenta',
          }
          return typeLabels[v] || v
        }},
        { key: 'calendarName', label: 'Calendário' },
        { key: 'unit', label: 'Unidade' },
        { key: 'unitCost', label: 'Custo (R$)', render: (v: any) => v ? `R$ ${Number(v).toFixed(2)}` : '—' },
        { key: 'protheusCode', label: 'Cód. Protheus' },
      ],
      customModalRender: (props) => (
        <ResourceModal {...props} calendars={calendars} />
      ),
      customSectionRender: () => <PeopleSummarySection users={users} />,
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
        { key: 'optionType', label: 'Tipo', render: (value: string, row: any) => {
          const labels: Record<string, string> = { NONE: 'Nenhuma', RESPONSE: 'Resposta', OPTION: 'Opção' }
          const label = labels[value] || value
          const optCount = row.options?.length || 0
          return value === 'OPTION' && optCount > 0 ? `${label} (${optCount})` : label
        }},
        { key: 'protheusCode', label: 'Cód. Protheus' },
      ],
      customModalRender: (props) => (
        <GenericStepModal {...props} />
      ),
    },
    {
      key: 'characteristics', label: 'Características', entity: 'characteristics',
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: ACIONAMENTO' },
        { key: 'infoType', label: 'Tipo de Informação', type: 'select', defaultValue: 'Caractere', options: [
          { value: 'Caractere', label: 'Caractere' },
          { value: 'Numerico', label: 'Numérico' },
        ]},
        { key: 'unit', label: 'Unidade de Medida', type: 'combobox', placeholder: 'Selecione ou digite...', visibleWhen: { field: 'infoType', value: 'Numerico' }, options: [
          { value: 'CV', label: 'CV (Cavalo-Vapor)' },
          { value: 'kW', label: 'kW (Quilowatt)' },
          { value: 'HP', label: 'HP (Horse Power)' },
          { value: 'W', label: 'W (Watt)' },
          { value: 'V', label: 'V (Volt)' },
          { value: 'kV', label: 'kV (Quilovolt)' },
          { value: 'mV', label: 'mV (Milivolt)' },
          { value: 'A', label: 'A (Ampère)' },
          { value: 'mA', label: 'mA (Miliampère)' },
          { value: 'm', label: 'm (Metro)' },
          { value: 'mm', label: 'mm (Milímetro)' },
          { value: 'cm', label: 'cm (Centímetro)' },
          { value: 'pol', label: 'pol (Polegada)' },
          { value: 'kg', label: 'kg (Quilograma)' },
          { value: 'g', label: 'g (Grama)' },
          { value: 't', label: 't (Tonelada)' },
          { value: 'lb', label: 'lb (Libra)' },
          { value: 'bar', label: 'bar (Bar)' },
          { value: 'psi', label: 'psi (Pound per Square Inch)' },
          { value: 'kPa', label: 'kPa (Quilopascal)' },
          { value: 'MPa', label: 'MPa (Megapascal)' },
          { value: 'atm', label: 'atm (Atmosfera)' },
          { value: 'kgf/cm²', label: 'kgf/cm²' },
          { value: '°C', label: '°C (Celsius)' },
          { value: '°F', label: '°F (Fahrenheit)' },
          { value: 'K', label: 'K (Kelvin)' },
          { value: 'm³/h', label: 'm³/h (Metro Cúbico/Hora)' },
          { value: 'L/min', label: 'L/min (Litro/Minuto)' },
          { value: 'L/h', label: 'L/h (Litro/Hora)' },
          { value: 'GPM', label: 'GPM (Galão/Minuto)' },
          { value: 'Hz', label: 'Hz (Hertz)' },
          { value: 'kHz', label: 'kHz (Quilohertz)' },
          { value: 'RPM', label: 'RPM (Rotações/Minuto)' },
          { value: 'N·m', label: 'N·m (Newton-Metro)' },
          { value: 'kgf·m', label: 'kgf·m (Quilograma-Força Metro)' },
          { value: 'm/s', label: 'm/s (Metro/Segundo)' },
          { value: 'km/h', label: 'km/h (Quilômetro/Hora)' },
          { value: 'm²', label: 'm² (Metro Quadrado)' },
          { value: 'cm²', label: 'cm² (Centímetro Quadrado)' },
          { value: 'mm²', label: 'mm² (Milímetro Quadrado)' },
          { value: 'm³', label: 'm³ (Metro Cúbico)' },
          { value: 'L', label: 'L (Litro)' },
          { value: 'mL', label: 'mL (Mililitro)' },
          { value: '°', label: '° (Grau)' },
          { value: 'rad', label: 'rad (Radiano)' },
          { value: 'Ω', label: 'Ω (Ohm)' },
          { value: 'kΩ', label: 'kΩ (Quilo-Ohm)' },
          { value: 's', label: 's (Segundo)' },
          { value: 'min', label: 'min (Minuto)' },
          { value: 'h', label: 'h (Hora)' },
          { value: 'N', label: 'N (Newton)' },
          { value: 'kN', label: 'kN (Quilonewton)' },
          { value: 'kgf', label: 'kgf (Quilograma-Força)' },
        ]},
        { key: 'protheusCode', label: 'Código Protheus', type: 'text', placeholder: 'Ex: ACI001' },
      ],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'infoType', label: 'Tipo' },
        { key: 'unit', label: 'Unidade' },
        { key: 'protheusCode', label: 'Cód. Protheus' },
      ],
    },
    {
      key: 'counter-types', label: 'Tipos de Contador', entity: 'counter-types',
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: Horímetro' },
        { key: 'description', label: 'Descrição', type: 'text', placeholder: 'Descrição do tipo de contador' },
        { key: 'protheusCode', label: 'Código Protheus', type: 'text', placeholder: 'Ex: HOR' },
      ],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'description', label: 'Descrição' },
        { key: 'protheusCode', label: 'Cód. Protheus' },
      ],
    },
  ]

  const currentTab = tabs.find(t => t.key === entity)

  if (authLoading || !user) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-on-surface-variant border-r-transparent" />
        </div>
      </PageContainer>
    )
  }

  if (!currentTab) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Cadastro não encontrado.</p>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          title={currentTab.label}
          description="Cadastros Básicos"
        />

        {/* Seção customizada acima do CRUD (ex: resumo de pessoas para recursos) */}
        {currentTab.customSectionRender && currentTab.customSectionRender()}

        {/* Conteúdo */}
        {currentTab.key === 'resources' ? (
          <div className="rounded-[4px] bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setResourcesTableExpanded(!resourcesTableExpanded)}
              className="w-full flex items-center gap-2 px-4 py-3 bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
            >
              {resourcesTableExpanded ? <Icon name="expand_more" className="text-base text-muted-foreground" /> : <Icon name="chevron_right" className="text-base text-muted-foreground" />}
              <Icon name="construction" className="text-xl text-muted-foreground" />
              <h2 className="text-base font-semibold text-foreground">Materiais & Ferramentas</h2>
            </button>
            {resourcesTableExpanded && (
              <div className="border-t border-border p-4">
                <CrudTable
                  key={`${currentTab.key}-${activeUnitId}`}
                  entity={currentTab.entity}
                  title={currentTab.label}
                  fields={currentTab.fields}
                  columns={currentTab.columns}
                  unitScoped={currentTab.unitScoped}
                  activeUnitId={activeUnitId}
                  apiQueryParams={currentTab.apiQueryParams}
                  customModalRender={currentTab.customModalRender}
                />
              </div>
            )}
          </div>
        ) : (
          <CrudTable
            key={`${currentTab.key}-${activeUnitId}`}
            entity={currentTab.entity}
            title={currentTab.label}
            fields={currentTab.fields}
            columns={currentTab.columns}
            unitScoped={currentTab.unitScoped}
            activeUnitId={activeUnitId}
            apiQueryParams={currentTab.apiQueryParams}
            customModalRender={currentTab.customModalRender}
          />
        )}
      </div>
    </PageContainer>
  )
}
