import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')
  const { pathname } = request.nextUrl

  // Registro público desabilitado - redireciona para login
  if (pathname.startsWith('/register')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/hub']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // If user is not authenticated and trying to access protected route
  if (!sessionCookie && !isPublicRoute && pathname !== '/') {
    const loginUrl = new URL('/login', request.url)
    if (pathname.startsWith('/') && !pathname.includes('://')) {
      loginUrl.searchParams.set('returnUrl', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  // If user is authenticated and trying to access login (but NOT hub)
  if (sessionCookie && pathname.startsWith('/login')) {
    const returnUrl = request.nextUrl.searchParams.get('returnUrl')
    return NextResponse.redirect(new URL(returnUrl || '/cmms', request.url))
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
