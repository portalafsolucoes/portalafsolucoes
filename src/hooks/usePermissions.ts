'use client'

import { useAuth } from './useAuth'
import { hasPermission, isOperationalRole, type UserRole, type Permission } from '@/lib/permissions'

export function usePermissions() {
  const { user, role } = useAuth()
  const permissionSubject = user ?? (role || 'MANUTENTOR')
  const userRole = (role || 'MANUTENTOR') as UserRole

  return {
    /** Verifica se tem permissão para ação no módulo */
    can: (module: string, action: keyof Permission['actions']): boolean => {
      return hasPermission(permissionSubject, module, action)
    },

    /** Verifica se pode visualizar o módulo */
    canView: (module: string): boolean => {
      return hasPermission(permissionSubject, module, 'view')
    },

    /** Verifica se pode criar no módulo */
    canCreate: (module: string): boolean => {
      return hasPermission(permissionSubject, module, 'create')
    },

    /** Verifica se pode editar no módulo */
    canEdit: (module: string): boolean => {
      return hasPermission(permissionSubject, module, 'edit')
    },

    /** Verifica se pode excluir no módulo */
    canDelete: (module: string): boolean => {
      return hasPermission(permissionSubject, module, 'delete')
    },

    /** Verifica se é um perfil operacional (view-only exceto SS/OS) */
    isOperational: isOperationalRole(permissionSubject),

    /** Role atual */
    role: userRole,
  }
}
