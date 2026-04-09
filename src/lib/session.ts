import { cookies } from 'next/headers'
import { canSwitchUnits, type CanonicalUserRole } from './user-roles'

export interface SessionUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  canonicalRole: CanonicalUserRole
  companyId: string
  companyName: string
  unitId: string | null       // unidade ativa (activeUnitId)
  unitIds: string[]           // unidades que o usuário tem acesso
}

const SESSION_COOKIE_NAME = 'session'

export async function createSession(user: SessionUser): Promise<void> {
  const sessionData = JSON.stringify(user)
  const cookieStore = await cookies()
  
  // Detecta se está rodando via ngrok (HTTPS)
  const isHttps = process.env.NODE_ENV === 'production' || 
                  process.env.NEXTAUTH_URL?.startsWith('https://') ||
                  false
  
  cookieStore.set(SESSION_COOKIE_NAME, sessionData, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax', // 'none' para HTTPS cross-origin
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
  
  if (!sessionCookie) {
    return null
  }

  try {
    return JSON.parse(sessionCookie.value) as SessionUser
  } catch {
    return null
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

/**
 * Retorna o unitId efetivo para filtrar dados nas APIs.
 * - Admin (SUPER_ADMIN/ADMIN): pode usar override (query param ou body), senão usa session.unitId
 * - Demais roles: sempre usa session.unitId (não permite override)
 */
export function getEffectiveUnitId(
  session: SessionUser,
  override?: string | null
): string | null {
  if (canSwitchUnits(session) && override) {
    return override
  }
  return session.unitId
}
