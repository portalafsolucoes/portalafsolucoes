'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Wrench, 
  Package, 
  MapPin, 
  Users, 
  ClipboardList, 
  BarChart3,
  LogOut,
  Menu,
  X,
  CheckCircle,
  Activity
} from 'lucide-react'
import { useState, useEffect } from 'react'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    // Buscar role do usuário e contador
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUserRole(data.user.role)
          
          // Se for admin, buscar contador
          if (data.user.role === 'SUPER_ADMIN' || data.user.role === 'GESTOR') {
            fetch('/api/requests/pending')
              .then(res => res.json())
              .then(pendingData => {
                if (pendingData.data) {
                  setPendingCount(pendingData.data.length)
                }
              })
              .catch(() => {})
          }
        }
      })
      .catch(() => {})
  }, [pathname])

  const baseNavigation = [
    { name: 'Ordens de Serviço', href: '/work-orders', icon: Wrench },
    { name: 'Ativos', href: '/assets', icon: Package },
    { name: 'Localizações', href: '/locations', icon: MapPin },
    { name: 'Solicitações', href: '/requests', icon: ClipboardList },
    { name: 'Pessoas/Equipes', href: '/people-teams', icon: Users },
    { name: 'GEP', href: '/gep', icon: Activity },
    { name: 'Relatórios', href: '/analytics', icon: BarChart3 }
  ]

  // Adicionar Aprovações para admins
  const navigation = (userRole === 'SUPER_ADMIN' || userRole === 'GESTOR')
    ? [
        ...baseNavigation.slice(0, 5),
        { name: 'Aprovações', href: '/requests/approvals', icon: CheckCircle, badge: pendingCount },
        ...baseNavigation.slice(5)
      ]
    : baseNavigation

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <nav className="bg-card border-b border-border shadow-sm">
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
                const Icon = item.icon
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
                    <Icon className="mr-2 h-4 w-4" />
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
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </button>
          </div>
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent/10 hover:text-foreground"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="sm:hidden">
          <div className="space-y-1 pb-3 pt-2">
            {navigation.map((item) => {
              const Icon = item.icon
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
                    <Icon className="mr-3 h-5 w-5" />
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
                <LogOut className="mr-3 h-5 w-5" />
                Sair
              </div>
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
