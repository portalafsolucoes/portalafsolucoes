'use client'

import { UserMenu } from './UserMenu'
import { UnitSelector } from './UnitSelector'
import { useSidebar } from '@/contexts/SidebarContext'
import { Icon } from '@/components/ui/Icon'

export function Header() {
  const { isCollapsed, mobileMenuOpen, setMobileMenuOpen } = useSidebar()

  return (
    <header className={`fixed top-0 right-0 h-16 glass z-40 shadow-sm border-b border-gray-200 transition-all duration-300 ${
      isCollapsed ? 'left-0 xl:left-16' : 'left-0 xl:left-64'
    }`}>
      <div className="h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Esquerda — hamburguer no mobile/tablet */}
        <div className="flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 text-foreground hover:bg-gray-100 rounded-[4px] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Abrir menu"
          >
            <Icon name={mobileMenuOpen ? 'close' : 'menu'} className="text-xl" />
          </button>
        </div>

        {/* Direita — Unidade + Usuário */}
        <div className="flex items-center gap-2 sm:gap-3">
          <UnitSelector />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
