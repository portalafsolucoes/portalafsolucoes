'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  Wrench,
  MapPin,
  Users,
  ClipboardList,
  BarChart3,
  LogOut,
  CheckCircle,
  LayoutDashboard,
  Box,
  Menu,
  X,
  FileText,
  Activity,
  AlertTriangle,
  GitBranch,
  Settings2,
  CalendarClock,
  CalendarDays,
  TrendingUp
} from 'lucide-react'
import { useState, useEffect, type ComponentType } from 'react'
import { hasPermission, type UserRole } from '@/lib/permissions'
import { useSidebar } from '@/contexts/SidebarContext'
import { APP_LOGO_PATH, APP_NAME, APP_SHORT_NAME } from '@/lib/branding'

type SidebarMenuItem = {
  name: string
  href: string
  icon: ComponentType<{ className?: string }>
  module: string
  requireApprove?: boolean
  badge?: number
  adminOnly?: boolean
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isCollapsed, setIsCollapsed } = useSidebar()
  const [userRole, setUserRole] = useState<string>('')
  const [pendingCount, setPendingCount] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUserRole(data.user.role)
          
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

  // Menu na ordem definida no documento de requisitos (15 itens)
  const allMenus: SidebarMenuItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, module: 'dashboard' },
    { name: 'Árvore', href: '/tree', icon: GitBranch, module: 'tree' },
    { name: 'Pessoas/Equipes', href: '/people-teams', icon: Users, module: 'people-teams' },
    { name: 'Cadastros Básicos', href: '/basic-registrations', icon: Settings2, module: 'basic-registrations' },
    { name: 'Ativos', href: '/assets', icon: Box, module: 'assets' },
    { name: 'Criticidade de Ativos', href: '/criticality', icon: AlertTriangle, module: 'criticality' },
    { name: 'Plano de Manutenção', href: '/maintenance-plan', icon: CalendarClock, module: 'maintenance-plan' },
    { name: 'Planejamento e Programação', href: '/planning', icon: CalendarDays, module: 'planning' },
    { name: 'Ordens de Serviço (OS)', href: '/work-orders', icon: Wrench, module: 'work-orders' },
    { name: 'Solicitações (SS)', href: '/requests', icon: ClipboardList, module: 'requests' },
    { name: 'Aprovações', href: '/requests/approvals', icon: CheckCircle, module: 'requests', requireApprove: true, badge: pendingCount },
    { name: 'RAF', href: '/rafs', icon: FileText, module: 'rafs', adminOnly: true },
    { name: 'Localizações', href: '/locations', icon: MapPin, module: 'locations' },
    { name: 'KPI - Indicadores', href: '/kpi', icon: TrendingUp, module: 'kpi' },
    { name: 'GVP', href: '/gep', icon: Activity, module: 'gep' },
  ]

  // Filtrar menus baseado nas permissões
  const navigation = allMenus.filter(menu => {
    if (!userRole) return false
    
    // Se é apenas para admin, verificar role
    if (menu.adminOnly) {
      return userRole === 'GESTOR' || userRole === 'SUPER_ADMIN'
    }
    
    // Se requer aprovação, verificar permissão de aprovar
    if (menu.requireApprove) {
      return hasPermission(userRole as UserRole, menu.module, 'approve')
    }
    
    // Caso contrário, verificar permissão de visualizar
    return hasPermission(userRole as UserRole, menu.module, 'view')
  })

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] p-2 bg-card border border-border text-foreground rounded-lg shadow-lg"
      >
        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-[60] bg-sidebar border-r border-sidebar-border shadow-2xl flex flex-col transition-all duration-300 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${isCollapsed ? 'lg:w-16' : 'lg:w-64'} w-64`}>
        {/* Header with Hamburger Button */}
        <div className="px-4 py-4 border-b border-sidebar-border">
          {/* Desktop Layout */}
          <div className="hidden lg:block">
            {!isCollapsed ? (
              <div className="space-y-3">
                {/* Hamburger e Logo na mesma linha */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors flex-shrink-0"
                    title="Recolher sidebar"
                  >
                    <Menu className="h-5 w-5 text-sidebar-foreground" />
                  </button>
                  
                  <Link href="/dashboard" className="flex items-center flex-1" onClick={() => setMobileMenuOpen(false)}>
                    <div className="relative w-full h-14">
                      <Image
                        src={APP_LOGO_PATH}
                        alt={APP_NAME}
                        fill
                        className="object-contain object-left"
                        priority
                        unoptimized
                      />
                    </div>
                  </Link>
                </div>
                
                {/* Texto embaixo */}
                <Link href="/dashboard" className="block" onClick={() => setMobileMenuOpen(false)}>
                  <div className="text-center">
                    <p className="text-xs font-medium text-sidebar-foreground leading-tight">
                      {APP_NAME}
                    </p>
                    <p className="text-xs font-bold text-sidebar-muted tracking-[0.2em]">
                      {APP_SHORT_NAME}
                    </p>
                  </div>
                </Link>
              </div>
            ) : (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors w-full flex justify-center"
                title="Expandir sidebar"
              >
                <Menu className="h-5 w-5 text-sidebar-foreground" />
              </button>
            )}
          </div>
          
          {/* Mobile Layout - sempre expandido */}
          <div className="lg:hidden space-y-3">
            <div className="flex items-center">
              <div className="relative w-full h-14">
                <Image
                  src={APP_LOGO_PATH}
                  alt={APP_NAME}
                  fill
                  className="object-contain object-left"
                  priority
                  unoptimized
                />
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-sidebar-foreground leading-tight">
                {APP_NAME}
              </p>
              <p className="text-xs font-bold text-sidebar-muted tracking-[0.2em]">
                {APP_SHORT_NAME}
              </p>
            </div>
          </div>
        </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`group flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-3'} py-2.5 text-sm font-medium rounded-lg transition-all duration-200 relative ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-foreground shadow-lg border-l-2 border-sidebar-active-accent'
                  : 'text-sidebar-muted hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'
              }`}
              title={isCollapsed ? item.name : ''}
            >
              <Icon className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0 ${
                isActive ? 'text-sidebar-foreground' : 'text-sidebar-muted group-hover:text-sidebar-foreground'
              }`} />
              {!isCollapsed && (
                <>
                  <span className="flex-1">{item.name}</span>
                  {'badge' in item && item.badge && item.badge > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-danger-foreground bg-danger rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {isCollapsed && 'badge' in item && item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-danger-foreground bg-danger rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-3'} py-2.5 text-sm font-medium text-sidebar-muted hover:bg-sidebar-accent/70 hover:text-sidebar-foreground rounded-lg transition-all duration-200`}
          title={isCollapsed ? 'Sair' : ''}
        >
          <LogOut className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 text-sidebar-muted`} />
          {!isCollapsed && 'Sair'}
        </button>
      </div>
      </aside>
    </>
  )
}
