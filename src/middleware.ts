import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session')
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/hub']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // If user is not authenticated and trying to access protected route
  if (!session && !isPublicRoute && pathname !== '/') {
    // Salva a rota desejada como returnUrl para redirecionar após login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('returnUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If user is authenticated and trying to access login/register (but NOT hub)
  if (session && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    // Se tem returnUrl, redireciona pra lá; senão, pro hub
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
