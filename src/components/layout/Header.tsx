'use client'

import { UserMenu } from './UserMenu'
import { useSidebar } from '@/contexts/SidebarContext'

export function Header() {
  const { isCollapsed } = useSidebar()

  return (
    <header className={`fixed top-0 right-0 h-16 glass z-40 shadow-[0_10px_40px_rgba(0,0,0,0.04)] transition-all duration-300 ${
      isCollapsed ? 'left-0 lg:left-16' : 'left-0 lg:left-64'
    }`}>
      <div className="h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Left — Brand */}
        <div className="flex items-center gap-4">
          <span className="font-headline text-lg font-extrabold tracking-tight text-on-surface">
            CMMS
          </span>
        </div>

        {/* Right — Actions */}
        <div className="flex items-center gap-3">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
