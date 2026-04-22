import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Verifica se o cookie tem o formato HMAC esperado: base64url.hex64
 * Nao valida o conteudo criptografico (sem acesso ao secret no Edge),
 * mas rejeita cookies no formato antigo (JSON puro) antes de criar loops.
 */
function hasValidSessionFormat(value: string): boolean {
  const dot = value.lastIndexOf('.')
  if (dot < 1) return false
  const hmac = value.slice(dot + 1)
  return hmac.length === 64 && /^[0-9a-f]{64}$/.test(hmac)
}

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')
  const { pathname } = request.nextUrl

  // Cookie existe mas tem formato antigo (pre-HMAC) — tratar como sem sessao
  const hasSession = !!sessionCookie && hasValidSessionFormat(sessionCookie.value)

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/hub', '/register']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // If user is not authenticated and trying to access protected route
  if (!hasSession && !isPublicRoute && pathname !== '/') {
    const loginUrl = new URL('/login', request.url)
    if (pathname.startsWith('/') && !pathname.includes('://')) {
      loginUrl.searchParams.set('returnUrl', pathname)
    }
    const response = NextResponse.redirect(loginUrl)
    // Limpar cookie invalido para quebrar possivel loop
    if (sessionCookie && !hasSession) {
      response.cookies.delete('session')
    }
    return response
  }

  // If user is authenticated and trying to access login (but NOT hub)
  if (hasSession && pathname.startsWith('/login')) {
    const returnUrl = request.nextUrl.searchParams.get('returnUrl')
    return NextResponse.redirect(new URL(returnUrl || '/hub', request.url))
  }

  // Root always goes to hub (public)
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/hub', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
