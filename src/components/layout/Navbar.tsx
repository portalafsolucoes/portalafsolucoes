'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePendingCount } from '@/hooks/usePendingCount'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { role: userRole } = useAuth()
  const pendingCount = usePendingCount()

  const baseNavigation = [
    { name: 'Ordens de Serviço', href: '/work-orders', icon: 'construction' },
    { name: 'Ativos', href: '/assets', icon: 'inventory_2' },
    { name: 'Localizações', href: '/locations', icon: 'location_on' },
    { name: 'Solicitações', href: '/requests', icon: 'assignment' },
    { name: 'Pessoas/Equipes', href: '/people-teams', icon: 'group' },
    { name: 'GEP', href: '/gep', icon: 'monitoring' },
    { name: 'Relatórios', href: '/analytics', icon: 'bar_chart' }
  ]

  // Adicionar Aprovações para admins
  const navigation = (userRole === 'SUPER_ADMIN' || userRole === 'GESTOR')
    ? [
        ...baseNavigation.slice(0, 5),
        { name: 'Aprovações', href: '/requests/approvals', icon: 'check_circle', badge: pendingCount },
        ...baseNavigation.slice(5)
      ]
    : baseNavigation

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <nav className="bg-card border-b border-on-surface-variant/10 ambient-shadow">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link href="/dashboard" className="text-2xl font-bold text-primary">
                GMM - MIZU
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item: any) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 relative ${
                      isActive
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                    }`}
                  >
                    <Icon name={item.icon} className="mr-2 text-base" />
                    {item.name}
                    {item.badge > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-danger-foreground bg-danger rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-foreground hover:text-primary"
            >
              <Icon name="logout" className="mr-2 text-base" />
              Sair
            </button>
          </div>
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center rounded-[4px] p-2 text-muted-foreground hover:bg-accent/10 hover:text-foreground"
            >
              {mobileMenuOpen ? (
                <Icon name="close" className="text-2xl" />
              ) : (
                <Icon name="menu" className="text-2xl" />
              )}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="sm:hidden">
          <div className="space-y-1 pb-3 pt-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block border-l-4 py-2 pl-3 pr-4 text-base font-medium ${
                    isActive
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent/5 hover:text-foreground'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <Icon name={item.icon} className="mr-3 text-xl" />
                    {item.name}
                  </div>
                </Link>
              )
            })}
            <button
              onClick={handleLogout}
              className="block w-full border-l-4 border-transparent py-2 pl-3 pr-4 text-left text-base font-medium text-muted-foreground hover:border-border hover:bg-accent/5 hover:text-foreground"
            >
              <div className="flex items-center">
                <Icon name="logout" className="mr-3 text-xl" />
                Sair
              </div>
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
