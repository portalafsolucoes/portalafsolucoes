import { type UserRole } from './permissions'

export function getDefaultRedirectPath(_role: UserRole): string {
  // Após login, sempre vai para o hub de seleção de módulos
  return '/hub'
}
