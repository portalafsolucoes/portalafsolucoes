export type CanonicalUserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'TECHNICIAN'
  | 'LIMITED_TECHNICIAN'
  | 'REQUESTER'
  | 'VIEW_ONLY'

export type LegacyUserRole =
  | 'SUPER_ADMIN'
  | 'GESTOR'
  | 'PLANEJADOR'
  | 'MECANICO'
  | 'ELETRICISTA'
  | 'OPERADOR'
  | 'CONSTRUTOR_CIVIL'

export type UserRole = CanonicalUserRole | LegacyUserRole

export const CANONICAL_ROLE_OPTIONS: Array<{ value: CanonicalUserRole; label: string }> = [
  { value: 'SUPER_ADMIN', label: 'Super Administrador' },
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'TECHNICIAN', label: 'Técnico' },
  { value: 'LIMITED_TECHNICIAN', label: 'Técnico Limitado' },
  { value: 'REQUESTER', label: 'Solicitante' },
  { value: 'VIEW_ONLY', label: 'Somente Consulta' },
]

export interface RoleContext {
  role?: string | null
  canonicalRole?: string | null
  email?: string | null
  username?: string | null
  jobTitle?: string | null
}

function normalizeText(value?: string | null): string {
  return value?.trim().toLowerCase() ?? ''
}

function inferLegacyRole(rawRole?: string | null): LegacyUserRole | null {
  switch (rawRole) {
    case 'SUPER_ADMIN':
    case 'GESTOR':
    case 'PLANEJADOR':
    case 'MECANICO':
    case 'ELETRICISTA':
    case 'OPERADOR':
    case 'CONSTRUTOR_CIVIL':
      return rawRole
    default:
      return null
  }
}

export function normalizeUserRole(input: RoleContext | string | null | undefined): CanonicalUserRole {
  if (!input) return 'REQUESTER'

  if (typeof input === 'string') {
    switch (input) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
      case 'TECHNICIAN':
      case 'LIMITED_TECHNICIAN':
      case 'REQUESTER':
      case 'VIEW_ONLY':
        return input
      case 'GESTOR':
        return 'ADMIN'
      case 'PLANEJADOR':
        return 'ADMIN'
      case 'MECANICO':
        return 'TECHNICIAN'
      case 'ELETRICISTA':
      case 'CONSTRUTOR_CIVIL':
        return 'LIMITED_TECHNICIAN'
      case 'OPERADOR':
      default:
        return 'REQUESTER'
    }
  }

  if (input.canonicalRole) {
    return normalizeUserRole(input.canonicalRole)
  }

  const role = inferLegacyRole(input.role)
  const email = normalizeText(input.email)
  const username = normalizeText(input.username)
  const jobTitle = normalizeText(input.jobTitle)

  if (role === 'SUPER_ADMIN' || email.includes('super.admin') || username.includes('super.admin')) {
    return 'SUPER_ADMIN'
  }

  if (
    role === 'GESTOR' ||
    role === 'PLANEJADOR' ||
    email.startsWith('admin@') ||
    username.startsWith('admin') ||
    jobTitle.includes('administrador')
  ) {
    return 'ADMIN'
  }

  if (email.includes('consulta@') || username.includes('consulta') || jobTitle.includes('visualizador')) {
    return 'VIEW_ONLY'
  }

  if (email.includes('solicitante@') || username.includes('solicitante') || jobTitle.includes('solicitante')) {
    return 'REQUESTER'
  }

  if (
    role === 'ELETRICISTA' ||
    role === 'CONSTRUTOR_CIVIL' ||
    email.includes('tecnico.limitado') ||
    username.includes('tecnico.limitado') ||
    jobTitle.includes('limitad')
  ) {
    return 'LIMITED_TECHNICIAN'
  }

  if (role === 'MECANICO' || email.includes('tecnico@') || username.includes('tecnico') || jobTitle.includes('tecnico')) {
    return 'TECHNICIAN'
  }

  if (role === 'OPERADOR') {
    return 'REQUESTER'
  }

  return 'REQUESTER'
}

export function toPersistedUserRole(input: RoleContext | string | null | undefined): LegacyUserRole {
  if (typeof input === 'string') {
    switch (input) {
      case 'SUPER_ADMIN':
      case 'GESTOR':
      case 'PLANEJADOR':
      case 'MECANICO':
      case 'ELETRICISTA':
      case 'OPERADOR':
      case 'CONSTRUTOR_CIVIL':
        return input
      default:
        break
    }
  }

  switch (normalizeUserRole(input)) {
    case 'SUPER_ADMIN':
      return 'SUPER_ADMIN'
    case 'ADMIN':
      return 'GESTOR'
    case 'TECHNICIAN':
      return 'MECANICO'
    case 'LIMITED_TECHNICIAN':
      return 'ELETRICISTA'
    case 'REQUESTER':
      return 'OPERADOR'
    case 'VIEW_ONLY':
      return 'CONSTRUTOR_CIVIL'
    default:
      return 'OPERADOR'
  }
}

export function isSuperAdminRole(input: RoleContext | string | null | undefined): boolean {
  return normalizeUserRole(input) === 'SUPER_ADMIN'
}

export function isAdminRole(input: RoleContext | string | null | undefined): boolean {
  const role = normalizeUserRole(input)
  return role === 'SUPER_ADMIN' || role === 'ADMIN'
}

export function isOperationalRole(input: RoleContext | string | null | undefined): boolean {
  const role = normalizeUserRole(input)
  return role === 'TECHNICIAN' || role === 'LIMITED_TECHNICIAN'
}

export function isApproverRole(input: RoleContext | string | null | undefined): boolean {
  return isAdminRole(input)
}

export function canSwitchUnits(input: RoleContext | string | null | undefined): boolean {
  return isAdminRole(input)
}

export function getDefaultCmmsPath(input: RoleContext | string | null | undefined): string {
  return isOperationalRole(input) ? '/work-orders' : '/dashboard'
}

export function getRoleDisplayName(input: RoleContext | string | null | undefined): string {
  switch (normalizeUserRole(input)) {
    case 'SUPER_ADMIN':
      return 'Super Administrador'
    case 'ADMIN':
      return 'Administrador'
    case 'TECHNICIAN':
      return 'Técnico'
    case 'LIMITED_TECHNICIAN':
      return 'Técnico Limitado'
    case 'REQUESTER':
      return 'Solicitante'
    case 'VIEW_ONLY':
      return 'Somente Consulta'
    default:
      return 'Usuário'
  }
}

export function getRoleIcon(input: RoleContext | string | null | undefined): string {
  switch (normalizeUserRole(input)) {
    case 'SUPER_ADMIN':
      return 'shield'
    case 'ADMIN':
      return 'manage_accounts'
    case 'TECHNICIAN':
      return 'construction'
    case 'LIMITED_TECHNICIAN':
      return 'engineering'
    case 'REQUESTER':
      return 'assignment'
    case 'VIEW_ONLY':
      return 'visibility'
    default:
      return 'person'
  }
}

export function getRoleColor(input: RoleContext | string | null | undefined): string {
  switch (normalizeUserRole(input)) {
    case 'SUPER_ADMIN':
      return 'bg-on-surface'
    case 'ADMIN':
      return 'bg-primary-graphite'
    case 'TECHNICIAN':
      return 'bg-on-surface-variant'
    case 'LIMITED_TECHNICIAN':
      return 'bg-muted-foreground'
    case 'REQUESTER':
      return 'bg-primary-dim'
    case 'VIEW_ONLY':
      return 'bg-surface-high'
    default:
      return 'bg-muted'
  }
}
