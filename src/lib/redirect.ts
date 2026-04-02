import { type UserRole, hasPermission } from './permissions'

export function getDefaultRedirectPath(role: UserRole): string {
  // Se tem acesso ao dashboard, redireciona para lá
  if (hasPermission(role, 'dashboard', 'view')) {
    return '/dashboard'
  }
  
  // MECANICO e ELETRICISTA -> work-orders
  if (role === 'MECANICO' || role === 'ELETRICISTA') {
    return '/work-orders'
  }

  // OPERADOR -> requests
  if (role === 'OPERADOR') {
    return '/requests'
  }
  
  // Fallback
  return '/dashboard'
}
