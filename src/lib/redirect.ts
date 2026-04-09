import { type UserRole } from './permissions'
import { getDefaultCmmsPath } from './user-roles'

export function getDefaultRedirectPath(role: UserRole): string {
  return getDefaultCmmsPath(role)
}
