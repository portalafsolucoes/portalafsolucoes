import { UserRole } from '@/types'
import { getRoleDisplayName, normalizeUserRole, type CanonicalUserRole } from './user-roles'

type Resource =
  | 'users'
  | 'teams'
  | 'assets'
  | 'workOrders'
  | 'parts'
  | 'locations'
  | 'vendors'
  | 'customers'
  | 'analytics'
  | 'settings'
type Action = 'create' | 'read' | 'update' | 'delete' | 'archive'

// Definição de permissões por papel canônico.
// Roles legados (GESTOR, MECANICO, ELETRICISTA, OPERADOR, CONSTRUTOR_CIVIL) são normalizados
// para o papel canônico correspondente em `hasPermission`.
export const PERMISSIONS: Record<CanonicalUserRole, Record<Resource, readonly Action[]>> = {
  SUPER_ADMIN: {
    users: ['create', 'read', 'update', 'delete', 'archive'],
    teams: ['create', 'read', 'update', 'delete'],
    assets: ['create', 'read', 'update', 'delete', 'archive'],
    workOrders: ['create', 'read', 'update', 'delete', 'archive'],
    parts: ['create', 'read', 'update', 'delete'],
    locations: ['create', 'read', 'update', 'delete'],
    vendors: ['create', 'read', 'update', 'delete'],
    customers: ['create', 'read', 'update', 'delete'],
    analytics: ['read'],
    settings: ['read', 'update'],
  },
  ADMIN: {
    users: ['create', 'read', 'update', 'archive'],
    teams: ['create', 'read', 'update', 'delete'],
    assets: ['create', 'read', 'update', 'archive'],
    workOrders: ['create', 'read', 'update', 'archive'],
    parts: ['create', 'read', 'update', 'delete'],
    locations: ['create', 'read', 'update', 'delete'],
    vendors: ['create', 'read', 'update', 'delete'],
    customers: ['create', 'read', 'update', 'delete'],
    analytics: ['read'],
    settings: ['read'],
  },
  PLANEJADOR: {
    users: ['read'],
    teams: ['read'],
    assets: ['create', 'read', 'update'],
    workOrders: ['create', 'read', 'update'],
    parts: ['read', 'update'],
    locations: ['read'],
    vendors: ['read'],
    customers: ['read'],
    analytics: ['read'],
    settings: [],
  },
  MANUTENTOR: {
    users: [],
    teams: [],
    assets: ['read'],
    workOrders: ['read', 'update'],
    parts: ['read'],
    locations: ['read'],
    vendors: [],
    customers: [],
    analytics: [],
    settings: [],
  },
}

/**
 * Verifica se um papel tem permissão para executar uma ação em um recurso
 */
export function hasPermission(
  role: UserRole,
  resource: Resource,
  action: Action
): boolean {
  const canonical = normalizeUserRole(role)
  const permissions = PERMISSIONS[canonical]
  if (!permissions) return false

  const resourcePermissions = permissions[resource]
  if (!resourcePermissions) return false

  return resourcePermissions.includes(action)
}

/**
 * Verifica se um papel pode gerenciar usuários
 */
export function canManageUsers(role: UserRole): boolean {
  return hasPermission(role, 'users', 'create') ||
         hasPermission(role, 'users', 'update')
}

/**
 * Verifica se um papel pode gerenciar equipes
 */
export function canManageTeams(role: UserRole): boolean {
  return hasPermission(role, 'teams', 'create') ||
         hasPermission(role, 'teams', 'update')
}

/**
 * Verifica se um papel tem acesso administrativo
 */
export function isAdmin(role: UserRole): boolean {
  const canonical = normalizeUserRole(role)
  return canonical === 'SUPER_ADMIN' || canonical === 'ADMIN'
}

/**
 * Obtém label amigável para o papel
 */
export function getRoleLabel(role: UserRole | string): string {
  return getRoleDisplayName(role)
}
