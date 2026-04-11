'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdaptiveSplitPanel } from '@/components/layout/AdaptiveSplitPanel'
import { useAuth } from '@/hooks/useAuth'
import { normalizeUserRole } from '@/lib/user-roles'
import { usePermissions } from '@/hooks/usePermissions'
import { GenericCrudTable, type ColumnConfig } from '@/components/basic-registrations/GenericCrudTable'
import { GenericDetailPanel } from '@/components/basic-registrations/GenericDetailPanel'
import { GenericEditPanel, type FieldConfig } from '@/components/basic-registrations/GenericEditPanel'
import { CalendarModal } from '@/components/basic-registrations/CalendarModal'
import { AssetFamilyModal } from '@/components/basic-registrations/AssetFamilyModal'
import { ResourceModal } from '@/components/basic-registrations/ResourceModal'
import { GenericStepModal } from '@/components/basic-registrations/GenericStepModal'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { exportToExcel } from '@/lib/exportExcel'
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
  columns: ColumnConfig[]
  apiQueryParams?: string
  customSectionRender?: () => React.ReactNode
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrador',
  ADMIN: 'Administrador',
  TECHNICIAN: 'Técnico',
  LIMITED_TECHNICIAN: 'Técnico Limitado',
  REQUESTER: 'Solicitante',
  VIEW_ONLY: 'Somente Consulta',
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

  const groupedByRole = useMemo(() => {
    const groups: Record<string, any[]> = {}
    for (const user of filtered) {
      const role = normalizeUserRole(user.role) || 'SEM_CARGO'
      if (!groups[role]) groups[role] = []
      groups[role].push(user)
    }
    return groups
  }, [filtered])

  const roleOrder = ['TECHNICIAN', 'LIMITED_TECHNICIAN', 'REQUESTER', 'VIEW_ONLY', 'ADMIN', 'SUPER_ADMIN']
  const sortedRoles = Object.keys(groupedByRole).sort((a, b) => {
    const ia = roleOrder.indexOf(a)
    const ib = roleOrder.indexOf(b)
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })

  const [expanded, setExpanded] = useState(true)

  return (
    <div className="rounded-[4px] bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {expanded ? <Icon name="expand_more" className="text-base text-muted-foreground" /> : <Icon name="chevron_right" className="text-base text-muted-foreground" />}
          <Icon name="group" className="text-xl text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Mao de Obra & Especialidades</h2>
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
                    <th className="text-left px-4 py-2.5 font-medium text-foreground">Calendario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedRoles.map(role => (
                    groupedByRole[role].map(user => (
                      <tr key={user.id} className="odd:bg-gray-50 even:bg-white hover:bg-accent-orange-light transition-colors">
                        <td className="px-4 py-2.5 text-foreground font-medium">
                          {user.firstName} {user.lastName}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {user.jobTitle || '\u2014'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                            {ROLE_LABELS[user.role] || user.role}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {user.rate ? `R$ ${Number(user.rate).toFixed(2)}` : '\u2014'}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {user.calendarName || '\u2014'}
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
              {enabledUsers.length} pessoa(s) ativa(s) — Para adicionar ou editar mao de obra, acesse{' '}
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
  const { canCreate, canEdit, canDelete } = usePermissions()
  const allowCreate = canCreate('basic-registrations')
  const allowEdit = canEdit('basic-registrations')
  const allowDelete = canDelete('basic-registrations')

  // Dependency lists for dynamic selects
  const [maintenanceTypes, setMaintenanceTypes] = useState<any[]>([])
  const [maintenanceAreas, setMaintenanceAreas] = useState<any[]>([])
  const [assetFamilyModels, setAssetFamilyModels] = useState<any[]>([])
  const [calendars, setCalendars] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  // Split-panel state
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Redirect if not authenticated or no permission
  useEffect(() => {
    if (authLoading || !user) return
    if (!hasPermission(role as UserRole, 'basic-registrations', 'view')) {
      router.push('/dashboard')
      return
    }
    loadDependencies(entity)
  }, [authLoading, user, role, entity])

  // Reset panel state on entity change
  useEffect(() => {
    setSelectedItem(null)
    setIsEditing(false)
    setIsCreating(false)
    setSearch('')
  }, [entity])

  const loadDependencies = async (currentEntity: string) => {
    const loaders: Array<Promise<void>> = []

    const runLoader = async (load: () => Promise<any[]>, setter: (value: any[]) => void) => {
      try {
        setter(await load())
      } catch (error) {
        console.error(`Erro ao carregar dependencia de ${currentEntity}:`, error)
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
      key: 'maintenance-types', label: 'Tipos de Manutencao', entity: 'maintenance-types',
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: Preventiva' },
        { key: 'characteristic', label: 'Caracteristica', type: 'select', options: [
          { value: 'Preventiva', label: 'Preventiva' },
          { value: 'Corretiva', label: 'Corretiva' },
        ]},
        { key: 'protheusCode', label: 'Codigo Protheus', type: 'text', placeholder: 'Ex: PRV' },
      ],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'characteristic', label: 'Caracteristica' },
        { key: 'protheusCode', label: 'Cod. Protheus' },
      ],
    },
    {
      key: 'maintenance-areas', label: 'Areas de Manutencao', entity: 'maintenance-areas',
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: Mecanica' },
        { key: 'protheusCode', label: 'Codigo Protheus', type: 'text', placeholder: 'Ex: MEC' },
      ],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'protheusCode', label: 'Cod. Protheus' },
      ],
    },
    {
      key: 'service-types', label: 'Tipos de Servico', entity: 'service-types',
      fields: [
        { key: 'code', label: 'Codigo', type: 'text', required: true, placeholder: 'Ex: MECPRV' },
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: Mecanica Preventiva' },
        { key: 'maintenanceTypeId', label: 'Tipo de Manutencao', type: 'select', required: true,
          options: maintenanceTypes.map((mt: any) => ({ value: mt.id, label: mt.name }))
        },
        { key: 'maintenanceAreaId', label: 'Area de Manutencao', type: 'select', required: true,
          options: maintenanceAreas.map((ma: any) => ({ value: ma.id, label: ma.name }))
        },
        { key: 'isLubrication', label: 'Lubrificacao?', type: 'checkbox' },
        { key: 'protheusCode', label: 'Codigo Protheus', type: 'text', placeholder: 'Ex: MECPRV' },
      ],
      columns: [
        { key: 'code', label: 'Codigo' },
        { key: 'name', label: 'Nome' },
        { key: 'protheusCode', label: 'Cod. Protheus' },
      ],
    },
    {
      key: 'calendars', label: 'Calendarios', entity: 'calendars',
      fields: [],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'type', label: 'Tipo', render: (v: string) => v === 'WORK' ? 'Mao de Obra' : 'Equipamento' },
        { key: 'protheusCode', label: 'Cod. Protheus' },
      ],
    },
    {
      key: 'cost-centers', label: 'Centros de Custos', entity: 'cost-centers',
      fields: [
        { key: 'code', label: 'Codigo', type: 'text', required: true, placeholder: 'Ex: 3002' },
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: Manutencao Industrial' },
        { key: 'protheusCode', label: 'Codigo Protheus', type: 'text', placeholder: 'Ex: 3002' },
      ],
      columns: [
        { key: 'code', label: 'Codigo' },
        { key: 'name', label: 'Nome' },
        { key: 'protheusCode', label: 'Cod. Protheus' },
      ],
    },
    {
      key: 'areas', label: 'Areas', entity: 'areas', unitScoped: true,
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: Britagem Primaria' },
        { key: 'description', label: 'Descricao', type: 'textarea' },
      ],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'description', label: 'Descricao' },
      ],
    },
    {
      key: 'work-centers', label: 'Centros de Trabalho', entity: 'work-centers', unitScoped: true,
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: Britagem - Grupo A' },
        { key: 'description', label: 'Descricao', type: 'textarea' },
        { key: 'calendarId', label: 'Calendario', type: 'select', options: [
          { value: '', label: 'Nenhum' },
          ...calendars.map(c => ({ value: c.id, label: c.name })),
        ]},
        { key: 'protheusCode', label: 'Codigo Protheus', type: 'text', placeholder: 'Ex: UTI001' },
      ],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'calendarName', label: 'Calendario' },
        { key: 'protheusCode', label: 'Cod. Protheus' },
      ],
    },
    {
      key: 'asset-family-models', label: 'Tipos Modelo', entity: 'asset-family-models',
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: TC-2200x30m' },
        { key: 'description', label: 'Descricao', type: 'textarea', placeholder: 'Descricao do tipo modelo' },
        { key: 'protheusCode', label: 'Codigo Protheus', type: 'text', placeholder: 'Ex: TC2200' },
      ],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'description', label: 'Descricao' },
        { key: 'protheusCode', label: 'Cod. Protheus' },
      ],
    },
    {
      key: 'asset-families', label: 'Familias de Bens', entity: 'asset-families',
      fields: [],
      columns: [
        { key: 'code', label: 'Codigo' },
        { key: 'name', label: 'Nome' },
        { key: 'familyType', label: 'Tipo' },
        { key: 'modelNames', label: 'Tipos Modelo' },
        { key: 'protheusCode', label: 'Cod. Protheus' },
      ],
    },
    {
      key: 'positions', label: 'Posicoes', entity: 'positions',
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: Posicao 1' },
        { key: 'description', label: 'Descricao', type: 'textarea' },
        { key: 'protheusCode', label: 'Codigo Protheus', type: 'text', placeholder: 'Ex: M1' },
      ],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'protheusCode', label: 'Cod. Protheus' },
      ],
    },
    {
      key: 'job-titles', label: 'Cargos', entity: 'job-titles',
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: Mecanico, Eletricista, Engenheiro' },
        { key: 'description', label: 'Descricao', type: 'textarea', placeholder: 'Descricao opcional do cargo' },
        { key: 'protheusCode', label: 'Codigo Protheus', type: 'text', placeholder: 'Ex: CARG001' },
      ],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'description', label: 'Descricao' },
        { key: 'protheusCode', label: 'Cod. Protheus' },
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
        { key: 'unitCost', label: 'Custo Unitario (R$)', type: 'number', defaultValue: 0 },
        { key: 'protheusCode', label: 'Codigo Protheus', type: 'text', placeholder: 'Ex: E01' },
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
        { key: 'calendarName', label: 'Calendario' },
        { key: 'unit', label: 'Unidade' },
        { key: 'unitCost', label: 'Custo (R$)', render: (v: any) => v ? `R$ ${Number(v).toFixed(2)}` : '\u2014' },
        { key: 'protheusCode', label: 'Cod. Protheus' },
      ],
      customSectionRender: () => <PeopleSummarySection users={users} />,
    },
    {
      key: 'generic-tasks', label: 'Tarefas Genericas', entity: 'generic-tasks',
      fields: [
        { key: 'code', label: 'Codigo', type: 'number', required: true },
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: LUBRIFICAR' },
        { key: 'characteristic', label: 'Caracteristica', type: 'text', placeholder: 'Ex: Todos' },
        { key: 'protheusCode', label: 'Codigo Protheus', type: 'text' },
      ],
      columns: [
        { key: 'code', label: 'Codigo' },
        { key: 'name', label: 'Nome' },
        { key: 'protheusCode', label: 'Cod. Protheus' },
      ],
    },
    {
      key: 'generic-steps', label: 'Etapas Genericas', entity: 'generic-steps',
      fields: [
        { key: 'name', label: 'Descricao', type: 'text', required: true, placeholder: 'Ex: Abastecer redutor com oleo novo' },
        { key: 'optionType', label: 'Tipo de Opcao', type: 'select', defaultValue: 'NONE', options: [
          { value: 'NONE', label: 'Nenhuma' },
          { value: 'RESPONSE', label: 'Resposta' },
          { value: 'OPTION', label: 'Opcao' },
        ]},
        { key: 'protheusCode', label: 'Codigo Protheus', type: 'text', placeholder: 'Ex: ABA001' },
      ],
      columns: [
        { key: 'name', label: 'Descricao' },
        { key: 'optionType', label: 'Tipo', render: (value: string, row: any) => {
          const labels: Record<string, string> = { NONE: 'Nenhuma', RESPONSE: 'Resposta', OPTION: 'Opcao' }
          const label = labels[value] || value
          const optCount = row.options?.length || 0
          return value === 'OPTION' && optCount > 0 ? `${label} (${optCount})` : label
        }},
        { key: 'protheusCode', label: 'Cod. Protheus' },
      ],
    },
    {
      key: 'characteristics', label: 'Caracteristicas', entity: 'characteristics',
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: ACIONAMENTO' },
        { key: 'infoType', label: 'Tipo de Informacao', type: 'select', defaultValue: 'Caractere', options: [
          { value: 'Caractere', label: 'Caractere' },
          { value: 'Numerico', label: 'Numerico' },
        ]},
        { key: 'unit', label: 'Unidade de Medida', type: 'combobox', placeholder: 'Selecione ou digite...', visibleWhen: { field: 'infoType', value: 'Numerico' }, options: [
          { value: 'CV', label: 'CV (Cavalo-Vapor)' },
          { value: 'kW', label: 'kW (Quilowatt)' },
          { value: 'HP', label: 'HP (Horse Power)' },
          { value: 'W', label: 'W (Watt)' },
          { value: 'V', label: 'V (Volt)' },
          { value: 'kV', label: 'kV (Quilovolt)' },
          { value: 'mV', label: 'mV (Milivolt)' },
          { value: 'A', label: 'A (Ampere)' },
          { value: 'mA', label: 'mA (Miliampere)' },
          { value: 'm', label: 'm (Metro)' },
          { value: 'mm', label: 'mm (Milimetro)' },
          { value: 'cm', label: 'cm (Centimetro)' },
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
          { value: 'kgf/cm\u00B2', label: 'kgf/cm\u00B2' },
          { value: '\u00B0C', label: '\u00B0C (Celsius)' },
          { value: '\u00B0F', label: '\u00B0F (Fahrenheit)' },
          { value: 'K', label: 'K (Kelvin)' },
          { value: 'm\u00B3/h', label: 'm\u00B3/h (Metro Cubico/Hora)' },
          { value: 'L/min', label: 'L/min (Litro/Minuto)' },
          { value: 'L/h', label: 'L/h (Litro/Hora)' },
          { value: 'GPM', label: 'GPM (Galao/Minuto)' },
          { value: 'Hz', label: 'Hz (Hertz)' },
          { value: 'kHz', label: 'kHz (Quilohertz)' },
          { value: 'RPM', label: 'RPM (Rotacoes/Minuto)' },
          { value: 'N\u00B7m', label: 'N\u00B7m (Newton-Metro)' },
          { value: 'kgf\u00B7m', label: 'kgf\u00B7m (Quilograma-Forca Metro)' },
          { value: 'm/s', label: 'm/s (Metro/Segundo)' },
          { value: 'km/h', label: 'km/h (Quilometro/Hora)' },
          { value: 'm\u00B2', label: 'm\u00B2 (Metro Quadrado)' },
          { value: 'cm\u00B2', label: 'cm\u00B2 (Centimetro Quadrado)' },
          { value: 'mm\u00B2', label: 'mm\u00B2 (Milimetro Quadrado)' },
          { value: 'm\u00B3', label: 'm\u00B3 (Metro Cubico)' },
          { value: 'L', label: 'L (Litro)' },
          { value: 'mL', label: 'mL (Mililitro)' },
          { value: '\u00B0', label: '\u00B0 (Grau)' },
          { value: 'rad', label: 'rad (Radiano)' },
          { value: '\u03A9', label: '\u03A9 (Ohm)' },
          { value: 'k\u03A9', label: 'k\u03A9 (Quilo-Ohm)' },
          { value: 's', label: 's (Segundo)' },
          { value: 'min', label: 'min (Minuto)' },
          { value: 'h', label: 'h (Hora)' },
          { value: 'N', label: 'N (Newton)' },
          { value: 'kN', label: 'kN (Quilonewton)' },
          { value: 'kgf', label: 'kgf (Quilograma-Forca)' },
        ]},
        { key: 'protheusCode', label: 'Codigo Protheus', type: 'text', placeholder: 'Ex: ACI001' },
      ],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'infoType', label: 'Tipo' },
        { key: 'unit', label: 'Unidade' },
        { key: 'protheusCode', label: 'Cod. Protheus' },
      ],
    },
    {
      key: 'counter-types', label: 'Tipos de Contador', entity: 'counter-types',
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex: Horimetro' },
        { key: 'description', label: 'Descricao', type: 'text', placeholder: 'Descricao do tipo de contador' },
        { key: 'protheusCode', label: 'Codigo Protheus', type: 'text', placeholder: 'Ex: HOR' },
      ],
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'description', label: 'Descricao' },
        { key: 'protheusCode', label: 'Cod. Protheus' },
      ],
    },
  ]

  const currentTab = tabs.find(t => t.key === entity)

  // Data fetching
  const fetchItems = useCallback(async () => {
    if (!currentTab) return
    setLoading(true)
    let url = `/api/basic-registrations/${currentTab.entity}`
    const fetchParams: string[] = []
    if (currentTab.unitScoped && activeUnitId) fetchParams.push(`unitId=${activeUnitId}`)
    if (currentTab.apiQueryParams) fetchParams.push(currentTab.apiQueryParams)
    if (fetchParams.length > 0) url += `?${fetchParams.join('&')}`
    try {
      const res = await fetch(url)
      const data = await res.json()
      setItems(data.data || [])
    } catch {
      setItems([])
    }
    setLoading(false)
  }, [currentTab?.entity, currentTab?.unitScoped, activeUnitId, currentTab?.apiQueryParams])

  useEffect(() => {
    if (!authLoading && user && currentTab) {
      fetchItems()
    }
  }, [fetchItems, authLoading, user])

  // Search filtering
  const filtered = useMemo(() => {
    if (!search || !currentTab) return items
    const s = search.toLowerCase()
    return items.filter(item =>
      currentTab.columns.some(col => {
        const val = item[col.key]
        return val && String(val).toLowerCase().includes(s)
      })
    )
  }, [items, search, currentTab])

  // Handlers
  const handleSelectItem = (item: any) => {
    setSelectedItem(item)
    setIsEditing(false)
    setIsCreating(false)
  }

  const handleClosePanel = () => {
    setSelectedItem(null)
    setIsEditing(false)
    setIsCreating(false)
  }

  const handleEdit = () => setIsEditing(true)

  const handleCreate = () => {
    setSelectedItem(null)
    setIsEditing(false)
    setIsCreating(true)
  }

  const handleSaved = () => {
    handleClosePanel()
    fetchItems()
  }

  const handleDelete = async () => {
    if (!selectedItem || !currentTab) return
    try {
      const res = await fetch(`/api/basic-registrations/${currentTab.entity}/${selectedItem.id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!res.ok) {
        alert(result.error || 'Erro ao excluir')
        return
      }
      handleClosePanel()
      fetchItems()
    } catch {
      alert('Erro de conexao')
    }
  }

  // Render form panel (dispatches to custom or generic)
  const renderFormPanel = (item: any | null) => {
    const tabKey = currentTab?.key
    const commonProps = {
      editingItem: item,
      onClose: handleClosePanel,
      onSaved: handleSaved,
      inPage: true,
    }

    switch (tabKey) {
      case 'calendars':
        return <CalendarModal {...commonProps} />
      case 'resources':
        return <ResourceModal {...commonProps} calendars={calendars} />
      case 'asset-families':
        return (
          <AssetFamilyModal
            {...commonProps}
            assetFamilyModels={assetFamilyModels}
            onModelsChanged={() => loadDependencies(entity)}
          />
        )
      case 'generic-steps':
        return <GenericStepModal {...commonProps} />
      default:
        return (
          <GenericEditPanel
            {...commonProps}
            entity={currentTab!.entity}
            title={currentTab!.label}
            fields={currentTab!.fields}
            unitScoped={currentTab?.unitScoped}
            activeUnitId={activeUnitId}
            apiQueryParams={currentTab?.apiQueryParams}
          />
        )
    }
  }

  // Loading state
  if (authLoading || !user) {
    return (
      <PageContainer variant="full" className="overflow-hidden p-0">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
            <p className="mt-2 text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </PageContainer>
    )
  }

  if (!currentTab) {
    return (
      <PageContainer variant="full" className="overflow-hidden p-0">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Cadastro nao encontrado.</p>
        </div>
      </PageContainer>
    )
  }

  const showSidePanel = !!(selectedItem !== null || isCreating)
  const noUnitSelected = currentTab.unitScoped && !activeUnitId

  const activePanel = isCreating ? (
    renderFormPanel(null)
  ) : selectedItem && isEditing ? (
    renderFormPanel(selectedItem)
  ) : selectedItem ? (
    <GenericDetailPanel
      item={selectedItem}
      entity={currentTab.entity}
      title={currentTab.label}
      columns={currentTab.columns}
      fields={currentTab.fields}
      onClose={handleClosePanel}
      onEdit={handleEdit}
      onDelete={handleDelete}
      canEdit={allowEdit}
      canDelete={allowDelete}
    />
  ) : null

  const listContent = (
    <div className="h-full flex flex-col overflow-hidden">
      {/* PeopleSummarySection for resources entity */}
      {currentTab.key === 'resources' && currentTab.customSectionRender && (
        <div className="flex-shrink-0 border-b border-border">
          {currentTab.customSectionRender()}
        </div>
      )}
      {/* Table */}
      {!noUnitSelected && (
        <GenericCrudTable
          items={filtered}
          columns={currentTab.columns}
          loading={loading}
          selectedItemId={selectedItem?.id}
          onSelectItem={handleSelectItem}
          emptyMessage="Nenhum registro encontrado."
        />
      )}
    </div>
  )

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          title={currentTab.label}
          description="Cadastros Basicos"
          className="mb-0"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative w-full sm:w-48 xl:w-64">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {/* Export */}
              <button
                onClick={() => {
                  if (filtered.length === 0) { alert('Nenhum dado para exportar'); return }
                  const cols = currentTab.columns.map(c => ({ key: c.key, header: c.label }))
                  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
                  exportToExcel(filtered, cols, `${currentTab.entity}_${date}`, currentTab.label)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-[4px] bg-card hover:bg-muted border border-input transition-colors"
                title="Exportar para Excel"
              >
                <Icon name="download" className="text-base" />
                <span className="hidden sm:inline">Excel</span>
              </button>
              {/* Add button */}
              {allowCreate && (
                <Button onClick={handleCreate} disabled={!!noUnitSelected} className="bg-accent-orange hover:bg-accent-orange/90 text-white font-bold shadow-md">
                  <Icon name="add" className="text-base" />
                  <span className="hidden sm:inline ml-1">Adicionar</span>
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* No unit warning */}
      {noUnitSelected && (
        <div className="mx-4 mt-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-[4px] text-sm">
          Selecione uma unidade para visualizar e gerenciar os registros desta aba.
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          <AdaptiveSplitPanel
            list={listContent}
            panel={activePanel}
            showPanel={showSidePanel}
            panelTitle={currentTab.label}
            onClosePanel={handleClosePanel}
          />
        </div>
      </div>
    </PageContainer>
  )
}
