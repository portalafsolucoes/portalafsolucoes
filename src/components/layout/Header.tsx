'use client'

import { UserMenu } from './UserMenu'
import { useSidebar } from '@/contexts/SidebarContext'

export function Header() {
  const { isCollapsed } = useSidebar()
  
  return (
    <header className={`fixed top-0 right-0 h-11 border-b border-border/60 bg-background/90 backdrop-blur-xl z-40 shadow-[0_4px_12px_-6px_rgba(15,23,42,0.12)] transition-all duration-300 ${
      isCollapsed ? 'left-0 lg:left-16' : 'left-0 lg:left-64'
    }`}>
      <div className="h-full px-4 sm:px-5 flex items-center justify-end">
        <UserMenu />
      </div>
    </header>
  )
}
