import crypto from 'crypto'
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

function signPayload(data: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret).update(data).digest('hex')
  return `${Buffer.from(data).toString('base64url')}.${hmac}`
}

function verifyPayload(token: string, secret: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [b64data, hmac] = parts
  const data = Buffer.from(b64data, 'base64url').toString('utf8')
  const expectedHmac = crypto.createHmac('sha256', secret).update(data).digest('hex')

  if (hmac.length !== expectedHmac.length) return null

  try {
    const isValid = crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))
    return isValid ? data : null
  } catch {
    return null
  }
}

export async function createSession(user: SessionUser): Promise<void> {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    console.error('NEXTAUTH_SECRET nao configurado')
    return
  }

  const sessionData = JSON.stringify(user)
  const cookieValue = signPayload(sessionData, secret)
  const cookieStore = await cookies()

  // Detecta se está rodando via ngrok (HTTPS)
  const isHttps = process.env.NODE_ENV === 'production' ||
                  process.env.NEXTAUTH_URL?.startsWith('https://') ||
                  false

  cookieStore.set(SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 horas
    path: '/',
  })
}

export async function getSession(): Promise<SessionUser | null> {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) return null

  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie) {
    return null
  }

  const verified = verifyPayload(sessionCookie.value, secret)
  if (!verified) return null

  try {
    return JSON.parse(verified) as SessionUser
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
