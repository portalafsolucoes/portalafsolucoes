export type CanonicalUserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'PLANEJADOR'
  | 'MANUTENTOR'

export type LegacyUserRole =
  | 'SUPER_ADMIN'
  | 'GESTOR'
  | 'PLANEJADOR'
  | 'MANUTENTOR'
  | 'MECANICO'
  | 'ELETRICISTA'
  | 'OPERADOR'
  | 'CONSTRUTOR_CIVIL'

export type UserRole = CanonicalUserRole | LegacyUserRole

export const CANONICAL_ROLE_OPTIONS: Array<{ value: CanonicalUserRole; label: string }> = [
  { value: 'SUPER_ADMIN', label: 'SUPER ADMINISTRADOR' },
  { value: 'ADMIN', label: 'ADMINISTRADOR' },
  { value: 'PLANEJADOR', label: 'PLANEJADOR' },
  { value: 'MANUTENTOR', label: 'MANUTENTOR' },
]

export interface RoleContext {
  role?: string | null
  canonicalRole?: string | null
  email?: string | null
  username?: string | null
  jobTitle?: string | null
}

export function normalizeUserRole(input: RoleContext | string | null | undefined): CanonicalUserRole {
  if (!input) return 'MANUTENTOR'

  if (typeof input === 'string') {
    const value = input.trim().toUpperCase()
    switch (value) {
      case 'SUPER_ADMIN':
        return 'SUPER_ADMIN'
      case 'ADMIN':
      case 'GESTOR':
        return 'ADMIN'
      case 'PLANEJADOR':
        return 'PLANEJADOR'
      case 'MANUTENTOR':
      case 'MECANICO':
      case 'ELETRICISTA':
      case 'OPERADOR':
      case 'CONSTRUTOR_CIVIL':
      case 'TECHNICIAN':
      case 'LIMITED_TECHNICIAN':
      case 'REQUESTER':
      case 'VIEW_ONLY':
        return 'MANUTENTOR'
      default:
        return 'MANUTENTOR'
    }
  }

  if (input.canonicalRole) {
    return normalizeUserRole(input.canonicalRole)
  }

  // Determinar papel apenas pelo valor de role do banco (nunca por email/username/jobTitle)
  return normalizeUserRole((input.role || '').toString())
}

export function toPersistedUserRole(input: RoleContext | string | null | undefined): LegacyUserRole {
  if (typeof input === 'string') {
    const value = input.trim().toUpperCase()
    switch (value) {
      case 'SUPER_ADMIN':
      case 'GESTOR':
      case 'PLANEJADOR':
      case 'MANUTENTOR':
      case 'MECANICO':
      case 'ELETRICISTA':
      case 'OPERADOR':
      case 'CONSTRUTOR_CIVIL':
        return value as LegacyUserRole
      default:
        break
    }
  }

  switch (normalizeUserRole(input)) {
    case 'SUPER_ADMIN':
      return 'SUPER_ADMIN'
    case 'ADMIN':
      return 'GESTOR'
    case 'PLANEJADOR':
      return 'PLANEJADOR'
    case 'MANUTENTOR':
      return 'MANUTENTOR'
    default:
      return 'MANUTENTOR'
  }
}

export function isSuperAdminRole(input: RoleContext | string | null | undefined): boolean {
  return normalizeUserRole(input) === 'SUPER_ADMIN'
}

/**
 * Identifica staff Portal AF Soluções: SUPER_ADMIN sem vínculo a uma empresa cliente
 * (companyId == null). Esse usuário opera cross-tenant.
 */
export function isPlatformStaff(session: { role?: string | null; companyId?: string | null } | null | undefined): boolean {
  if (!session) return false
  const isSuper = normalizeUserRole(session.role ?? null) === 'SUPER_ADMIN'
  // Staff Portal AF: SUPER_ADMIN sem vínculo com empresa cliente.
  // Sessões serializam companyId como string vazia ('') quando não há tenant; o banco persiste como NULL.
  return isSuper && (session.companyId == null || session.companyId === '')
}

/**
 * Garante escopo de empresa para operações de negócio. Retorna companyId quando definido;
 * caso contrário lança. Use em handlers que NÃO devem operar cross-tenant
 * (i.e., todas as rotas /api/** exceto /api/admin/**).
 */
export function requireCompanyScope(session: { companyId?: string | null } | null | undefined): string {
  const companyId = session?.companyId
  if (!companyId) {
    throw new Error('CompanyScopeRequired: esta operação exige uma empresa ativa na sessão.')
  }
  return companyId
}

export function isAdminRole(input: RoleContext | string | null | undefined): boolean {
  const role = normalizeUserRole(input)
  return role === 'SUPER_ADMIN' || role === 'ADMIN'
}

export function isOperationalRole(input: RoleContext | string | null | undefined): boolean {
  return normalizeUserRole(input) === 'MANUTENTOR'
}

export function isApproverRole(input: RoleContext | string | null | undefined): boolean {
  const role = normalizeUserRole(input)
  return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'PLANEJADOR'
}

export function canSwitchUnits(input: RoleContext | string | null | undefined): boolean {
  const role = normalizeUserRole(input)
  return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'PLANEJADOR'
}

export function getDefaultCmmsPath(input: RoleContext | string | null | undefined): string {
  // Staff Portal AF (SUPER_ADMIN sem companyId) não tem tenant: precisa selecionar empresa antes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = (input as any) ?? null
  if (ctx && typeof ctx === 'object' && normalizeUserRole(ctx.role ?? null) === 'SUPER_ADMIN') {
    if (ctx.companyId == null || ctx.companyId === '') return '/admin/select-company'
  }
  return isOperationalRole(input) ? '/work-orders' : '/dashboard'
}

export function getRoleDisplayName(input: RoleContext | string | null | undefined): string {
  switch (normalizeUserRole(input)) {
    case 'SUPER_ADMIN':
      return 'SUPER ADMINISTRADOR'
    case 'ADMIN':
      return 'ADMINISTRADOR'
    case 'PLANEJADOR':
      return 'PLANEJADOR'
    case 'MANUTENTOR':
      return 'MANUTENTOR'
    default:
      return 'USUARIO'
  }
}

export function getRoleIcon(input: RoleContext | string | null | undefined): string {
  switch (normalizeUserRole(input)) {
    case 'SUPER_ADMIN':
      return 'shield'
    case 'ADMIN':
      return 'manage_accounts'
    case 'PLANEJADOR':
      return 'event_note'
    case 'MANUTENTOR':
      return 'construction'
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
    case 'PLANEJADOR':
      return 'bg-on-surface-variant'
    case 'MANUTENTOR':
      return 'bg-muted-foreground'
    default:
      return 'bg-muted'
  }
}
