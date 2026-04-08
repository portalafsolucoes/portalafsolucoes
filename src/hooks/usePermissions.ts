'use client'

import { useAuth } from './useAuth'
import { hasPermission, isOperationalRole, type UserRole, type Permission } from '@/lib/permissions'

export function usePermissions() {
  const { role } = useAuth()
  const userRole = (role || 'OPERADOR') as UserRole

  return {
    /** Verifica se tem permissão para ação no módulo */
    can: (module: string, action: keyof Permission['actions']): boolean => {
      return hasPermission(userRole, module, action)
    },

    /** Verifica se pode visualizar o módulo */
    canView: (module: string): boolean => {
      return hasPermission(userRole, module, 'view')
    },

    /** Verifica se pode criar no módulo */
    canCreate: (module: string): boolean => {
      return hasPermission(userRole, module, 'create')
    },

    /** Verifica se pode editar no módulo */
    canEdit: (module: string): boolean => {
      return hasPermission(userRole, module, 'edit')
    },

    /** Verifica se pode excluir no módulo */
    canDelete: (module: string): boolean => {
      return hasPermission(userRole, module, 'delete')
    },

    /** Verifica se é um perfil operacional (view-only exceto SS/OS) */
    isOperational: isOperationalRole(userRole),

    /** Role atual */
    role: userRole,
  }
}
