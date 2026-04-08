export type UserRole = 'SUPER_ADMIN' | 'GESTOR' | 'PLANEJADOR' | 'MECANICO' | 'ELETRICISTA' | 'OPERADOR' | 'CONSTRUTOR_CIVIL'

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

// Roles operacionais que só visualizam e editam SSs/OSs
const OPERATIONAL_ROLES: UserRole[] = ['MECANICO', 'ELETRICISTA', 'OPERADOR', 'CONSTRUTOR_CIVIL']

function buildOperationalPermissions(): Permission[] {
  return [
    { module: 'dashboard', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'tree', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'people-teams', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'basic-registrations', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'assets', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'criticality', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'maintenance-plan', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'planning', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'work-orders', actions: { view: true, create: true, edit: true, delete: false, approve: false, execute: true } },
    { module: 'requests', actions: { view: true, create: true, edit: true, delete: false, approve: false } },
    { module: 'approvals', actions: { view: false, create: false, edit: false, delete: false } },
    { module: 'rafs', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'locations', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'kpi', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'gep', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'analytics', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'settings', actions: { view: false, create: false, edit: false, delete: false } },
  ]
}

function buildFullAccessPermissions(): Permission[] {
  return [
    { module: 'dashboard', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'tree', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'people-teams', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'basic-registrations', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'assets', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'criticality', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'maintenance-plan', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'planning', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'work-orders', actions: { view: true, create: true, edit: true, delete: true, approve: true, execute: true } },
    { module: 'requests', actions: { view: true, create: true, edit: true, delete: true, approve: true } },
    { module: 'approvals', actions: { view: true, create: false, edit: false, delete: false, approve: true } },
    { module: 'rafs', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'locations', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'kpi', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'gep', actions: { view: true, create: true, edit: true, delete: true } },
    { module: 'analytics', actions: { view: true, create: false, edit: false, delete: false } },
    { module: 'settings', actions: { view: true, create: true, edit: true, delete: true } },
  ]
}

export const PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: buildFullAccessPermissions(),
  GESTOR: buildFullAccessPermissions(),
  PLANEJADOR: buildFullAccessPermissions().map(p =>
    p.module === 'people-teams' || p.module === 'settings'
      ? { ...p, actions: { ...p.actions, create: false, edit: false, delete: false } }
      : p
  ),
  MECANICO: buildOperationalPermissions(),
  ELETRICISTA: buildOperationalPermissions(),
  OPERADOR: buildOperationalPermissions(),
  CONSTRUTOR_CIVIL: buildOperationalPermissions(),
}

export function hasPermission(
  role: UserRole,
  module: string,
  action: keyof Permission['actions']
): boolean {
  const rolePermissions = PERMISSIONS[role]
  const modulePermission = rolePermissions.find(p => p.module === module)
  if (!modulePermission) return false
  return modulePermission.actions[action] === true
}

export function canAccessModule(role: UserRole, module: string): boolean {
  return hasPermission(role, module, 'view')
}

export function getModulePermissions(role: UserRole, module: string): Permission['actions'] | null {
  const rolePermissions = PERMISSIONS[role]
  const modulePermission = rolePermissions.find(p => p.module === module)
  return modulePermission ? modulePermission.actions : null
}

export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    SUPER_ADMIN: 'Super Administrador',
    GESTOR: 'Gestor de Manutenção',
    PLANEJADOR: 'Planejador de Manutenção',
    MECANICO: 'Mecânico',
    ELETRICISTA: 'Eletricista / Instrumentista',
    OPERADOR: 'Operador de Máquinas',
    CONSTRUTOR_CIVIL: 'Construtor Civil',
  }
  return names[role] || role
}

export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    SUPER_ADMIN: 'Acesso total ao sistema com dashboard corporativo de todas as unidades',
    GESTOR: 'Gestor de Manutenção com acesso total à unidade',
    PLANEJADOR: 'Planejador de Manutenção com acesso total exceto gestão de usuários',
    MECANICO: 'Visualiza tudo, edita somente Solicitações e Ordens de Serviço',
    ELETRICISTA: 'Visualiza tudo, edita somente Solicitações e Ordens de Serviço',
    OPERADOR: 'Visualiza tudo, edita somente Solicitações e Ordens de Serviço',
    CONSTRUTOR_CIVIL: 'Visualiza tudo, edita somente Solicitações e Ordens de Serviço',
  }
  return descriptions[role] || ''
}

export function isOperationalRole(role: UserRole): boolean {
  return OPERATIONAL_ROLES.includes(role)
}

/**
 * Mapeia módulo da URL para módulo do sistema de permissões.
 */
const API_MODULE_MAP: Record<string, string> = {
  'work-orders': 'work-orders',
  'requests': 'requests',
  'assets': 'assets',
  'basic-registrations': 'basic-registrations',
  'planning': 'planning',
  'plans': 'maintenance-plan',
  'schedules': 'planning',
  'rafs': 'rafs',
  'kpi': 'kpi',
  'gep': 'gep',
  'tree': 'tree',
  'locations': 'locations',
  'people-teams': 'people-teams',
}

/**
 * Mapeia método HTTP para ação de permissão.
 */
function httpMethodToAction(method: string): keyof Permission['actions'] {
  switch (method.toUpperCase()) {
    case 'POST': return 'create'
    case 'PUT':
    case 'PATCH': return 'edit'
    case 'DELETE': return 'delete'
    default: return 'view'
  }
}

/**
 * Verifica se o role tem permissão para executar a ação no módulo.
 * Retorna null se permitido, ou uma mensagem de erro se negado.
 */
export function checkApiPermission(
  role: string,
  module: string,
  method: string
): string | null {
  const userRole = role as UserRole
  if (!PERMISSIONS[userRole]) {
    return 'Perfil de acesso inválido'
  }

  const mappedModule = API_MODULE_MAP[module] || module
  const action = httpMethodToAction(method)

  if (!hasPermission(userRole, mappedModule, action)) {
    return `Sem permissão para ${action} em ${mappedModule}`
  }

  return null
}
