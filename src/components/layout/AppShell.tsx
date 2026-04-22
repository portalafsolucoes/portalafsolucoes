'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext'
import { useAuth } from '@/hooks/useAuth'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

function ForcedPasswordChangeGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (user?.mustChangePassword && pathname !== '/change-password') {
      router.replace('/change-password')
    }
  }, [user?.mustChangePassword, pathname, router])

  return <>{children}</>
}

function ShellFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { isCollapsed } = useSidebar()

  const publicRoutes = ['/hub', '/login', '/register', '/admin/select-company', '/change-password']
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))

  if (isPublicRoute) {
    return <>{children}</>
  }

  return (
    <ForcedPasswordChangeGuard>
      <div className="h-screen overflow-hidden bg-background">
        <Sidebar />
        <Header />
        <main className={`h-[calc(100vh-64px)] mt-16 overflow-hidden transition-all duration-300 ${isCollapsed ? 'xl:pl-16' : 'xl:pl-64'}`}>
          <div className="h-full overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
    </ForcedPasswordChangeGuard>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <ShellFrame>{children}</ShellFrame>
    </SidebarProvider>
  )
}
