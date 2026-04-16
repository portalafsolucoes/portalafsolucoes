import { UserRole } from '@/types'
import { getRoleDisplayName } from './user-roles'

// Definição de permissões por papel
export const PERMISSIONS = {
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
    settings: ['read', 'update']
  },
  GESTOR: {
    users: ['create', 'read', 'update', 'archive'],
    teams: ['create', 'read', 'update', 'delete'],
    assets: ['create', 'read', 'update', 'archive'],
    workOrders: ['create', 'read', 'update', 'archive'],
    parts: ['create', 'read', 'update', 'delete'],
    locations: ['create', 'read', 'update', 'delete'],
    vendors: ['create', 'read', 'update', 'delete'],
    customers: ['create', 'read', 'update', 'delete'],
    analytics: ['read'],
    settings: ['read']
  },
  PLANEJADOR: {
    users: ['read'],
    teams: ['read'],
    assets: ['read', 'update'],
    workOrders: ['create', 'read', 'update'],
    parts: ['read', 'update'],
    locations: ['read'],
    vendors: ['read'],
    customers: ['read'],
    analytics: ['read'],
    settings: []
  },
  MECANICO: {
    users: ['read'],
    teams: ['read'],
    assets: ['read', 'update'],
    workOrders: ['create', 'read', 'update'],
    parts: ['read', 'update'],
    locations: ['read'],
    vendors: ['read'],
    customers: ['read'],
    analytics: [],
    settings: []
  },
  ELETRICISTA: {
    users: ['read'],
    teams: ['read'],
    assets: ['read'],
    workOrders: ['read', 'update'],
    parts: ['read'],
    locations: ['read'],
    vendors: [],
    customers: [],
    analytics: [],
    settings: []
  },
  OPERADOR: {
    users: [],
    teams: [],
    assets: ['read'],
    workOrders: ['create', 'read'],
    parts: [],
    locations: ['read'],
    vendors: [],
    customers: [],
    analytics: [],
    settings: []
  },
  CONSTRUTOR_CIVIL: {
    users: [],
    teams: [],
    assets: ['read'],
    workOrders: ['read'],
    parts: ['read'],
    locations: ['read'],
    vendors: [],
    customers: [],
    analytics: [],
    settings: []
  }
} as const

type Resource = keyof typeof PERMISSIONS.SUPER_ADMIN
type Action = 'create' | 'read' | 'update' | 'delete' | 'archive'

/**
 * Verifica se um papel tem permissão para executar uma ação em um recurso
 */
export function hasPermission(
  role: UserRole,
  resource: Resource,
  action: Action
): boolean {
  const permissions = (PERMISSIONS as Record<string, Record<Resource, readonly Action[]> | undefined>)[role]
  if (!permissions) return false
  
  const resourcePermissions = permissions[resource] as readonly Action[]
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
  return role === 'SUPER_ADMIN' || role === 'GESTOR'
}

/**
 * Obtém label amigável para o papel
 */
export function getRoleLabel(role: UserRole | string): string {
  return getRoleDisplayName(role)
}
