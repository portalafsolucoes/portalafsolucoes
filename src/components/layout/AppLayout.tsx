'use client'

import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext'

interface AppLayoutProps {
  children: React.ReactNode
}

function AppLayoutContent({ children }: AppLayoutProps) {
  const { isCollapsed } = useSidebar()
  
  return (
    <div className="h-screen overflow-hidden bg-background">
      <Sidebar />
      <Header />
      <main className={`h-[calc(100vh-44px)] mt-11 overflow-hidden transition-all duration-300 ${isCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        <div className="h-full overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </SidebarProvider>
  )
}
