import {
  type CanonicalUserRole,
  type RoleContext,
  getRoleDisplayName as getCanonicalRoleDisplayName,
  isOperationalRole as isOperationalCanonicalRole,
  normalizeUserRole,
} from './user-roles'

export type { CanonicalUserRole, UserRole } from './user-roles'

export interface Permission {
  module: string
  actions: {
    view: boolean
    create: boolean
    edit: boolean
    delete: boolean
    approve?: boolean
    execute?: boolean
  }
}

type PermissionAction = keyof Permission['actions']
type PermissionInput = RoleContext | string | null | undefined

const PERMISSIONS: Record<CanonicalUserRole, Permission[]> = {
  SUPER_ADMIN: [
    { module: 'dashboard', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'tree', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'people-teams', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'basic-registrations', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'assets', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'criticality', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'maintenance-plan', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'standard-checklists', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'area-inspections', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'planning', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'work-orders', actions: { view: true, create: true, edit: true, delete: true, approve: true, execute: true } },
    { module: 'requests', actions: { view: true, create: true, edit: true, delete: true, approve: true } },
    { module: 'approvals', actions: { view: true, create: false, edit: false, delete: false, approve: true } },
    { module: 'rafs', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'locations', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'kpi', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'audit', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'analytics', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'settings', actions: { view: true, create: true, edit: true, delete: true } },
  ],
  ADMIN: [
    { module: 'dashboard', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'tree', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'people-teams', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'basic-registrations', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'assets', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'criticality', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'maintenance-plan', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'standard-checklists', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'area-inspections', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'planning', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'work-orders', actions: { view: true, create: true, edit: true, delete: true, approve: true, execute: true } },
    { module: 'requests', actions: { view: true, create: true, edit: true, delete: true, approve: true } },
    { module: 'approvals', actions: { view: true, create: false, edit: false, delete: false, approve: true } },
    { module: 'rafs', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'locations', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'kpi', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'audit', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'analytics', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'settings', actions: { view: false, create: false, edit: false, delete: false } },
  ],
  PLANEJADOR: [
    { module: 'dashboard', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'tree', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'people-teams', actions: { view: true, create: true, edit: true, delete: false } },
    { module: 'basic-registrations', actions: { view: true, create: true, edit: true, delete: false } },
    { module: 'assets', actions: { view: true, create: true, edit: true, delete: false } },
    { module: 'criticality', actions: { view: true, create: true, edit: true, delete: false } },
    { module: 'maintenance-plan', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'standard-checklists', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'area-inspections', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'planning', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'work-orders', actions: { view: true, create: true, edit: true, delete: false, approve: true, execute: true } },
    { module: 'requests', actions: { view: true, create: true, edit: true, delete: false, approve: true } },
    { module: 'approvals', actions: { view: true, create: false, edit: false, delete: false, approve: true } },
    { module: 'rafs', actions: { view: true, create: true, edit: true, delete: false } },
    { module: 'locations', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'kpi', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'audit', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'analytics', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'settings', actions: { view: false, create: false, edit: false, delete: false } },
  ],
  MANUTENTOR: [
    { module: 'dashboard', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'tree', actions: { view: false, create: false, edit: false, delete: false } },
    { module: 'people-teams', actions: { view: false, create: false, edit: false, delete: false } },
    { module: 'basic-registrations', actions: { view: false, create: false, edit: false, delete: false } },
    { module: 'assets', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'criticality', actions: { view: false, create: false, edit: false, delete: false } },
    { module: 'maintenance-plan', actions: { view: false, create: false, edit: false, delete: false } },
    { module: 'standard-checklists', actions: { view: false, create: false, edit: false, delete: false } },
    { module: 'area-inspections', actions: { view: true, create: false, edit: true, delete: false } },
    { module: 'planning', actions: { view: false, create: false, edit: false, delete: false } },
    { module: 'work-orders', actions: { view: true, create: false, edit: true, delete: false, approve: false, execute: true } },
    { module: 'requests', actions: { view: true, create: true, edit: true, delete: false, approve: false } },
    { module: 'approvals', actions: { view: false, create: false, edit: false, delete: false, approve: false } },
    { module: 'rafs', actions: { view: true, create: true, edit: true, delete: false } },
    { module: 'locations', actions: { view: false, create: false, edit: false, delete: false } },
    { module: 'kpi', actions: { view: false, create: false, edit: false, delete: false } },
    { module: 'audit', actions: { view: false, create: false, edit: false, delete: false } },
    { module: 'analytics', actions: { view: false, create: false, edit: false, delete: false } },
    { module: 'settings', actions: { view: false, create: false, edit: false, delete: false } },
  ],
}

export function hasPermission(
  subject: PermissionInput,
  module: string,
  action: PermissionAction
): boolean {
  const role = normalizeUserRole(subject)
  const rolePermissions = PERMISSIONS[role]
  const modulePermission = rolePermissions.find((permission) => permission.module === module)
  if (!modulePermission) return false
  return modulePermission.actions[action] === true
}

export function canAccessModule(subject: PermissionInput, module: string): boolean {
  return hasPermission(subject, module, 'view')
}

export function getModulePermissions(subject: PermissionInput, module: string): Permission['actions'] | null {
  const role = normalizeUserRole(subject)
  const rolePermissions = PERMISSIONS[role]
  const modulePermission = rolePermissions.find((permission) => permission.module === module)
  return modulePermission ? modulePermission.actions : null
}

export function getRoleDisplayName(subject: PermissionInput): string {
  return getCanonicalRoleDisplayName(subject)
}

export function getRoleDescription(subject: PermissionInput): string {
  const descriptions: Record<CanonicalUserRole, string> = {
    SUPER_ADMIN: 'Controle total do sistema, empresas, usuários, unidades e dashboard corporativo.',
    ADMIN: 'Gerencia a operação da empresa, aprova solicitações e mantém os cadastros operacionais.',
    PLANEJADOR: 'Planeja OSs, aprova solicitações e executa programação nas unidades autorizadas pelo ADMIN.',
    MANUTENTOR: 'Executa ordens de serviço, abre solicitações e registra análises de falha.',
  }
  return descriptions[normalizeUserRole(subject)]
}

export function isOperationalRole(subject: PermissionInput): boolean {
  return isOperationalCanonicalRole(subject)
}

const API_MODULE_MAP: Record<string, string> = {
  'work-orders': 'work-orders',
  requests: 'requests',
  assets: 'assets',
  'basic-registrations': 'basic-registrations',
  planning: 'planning',
  plans: 'maintenance-plan',
  'standard-checklists': 'standard-checklists',
  'area-inspections': 'area-inspections',
  inspections: 'area-inspections',
  schedules: 'planning',
  rafs: 'rafs',
  approvals: 'approvals',
  kpi: 'kpi',
  audit: 'audit',
  tree: 'tree',
  locations: 'locations',
  'people-teams': 'people-teams',
  criticality: 'criticality',
  settings: 'settings',
}

function httpMethodToAction(method: string): PermissionAction {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'create'
    case 'PUT':
    case 'PATCH':
      return 'edit'
    case 'DELETE':
      return 'delete'
    default:
      return 'view'
  }
}

export function checkApiPermission(
  subject: PermissionInput,
  module: string,
  method: string
): string | null {
  const mappedModule = API_MODULE_MAP[module] || module
  const action = httpMethodToAction(method)

  if (!hasPermission(subject, mappedModule, action)) {
    return `Sem permissão para ${action} em ${mappedModule}`
  }

  return null
}
